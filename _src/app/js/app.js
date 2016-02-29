/* app.js
 * This file provides the detais for the map application. The purpose of this application
 * is to display a list of local breweries in a list and on a map.  The list can be filtered
 * by name, address, or area.  Each brewery will query four square for additional information, such
 * as number of likes, check ins, and photos.
 *
 * In order to keep the data persistant the app is tied to a firebase database.  Currently anyone can modify
 * data, but a TODO: is to limit changes to admin users that would be logged in.
 *
 * Within the app a brewery location can be added, edited, or deleted.
 *
 *
 * NOTE: this file may contain more comments that is necessary, but at this point I would rather over comment
 * than not comment enough.  I'm the only one that will work on this particular app, but in the real world I would
 * follow whatever commenting convention is established.  Besides, since files will be minified, most, if not all, comments
 * will be stripped away.
 *
 * TODO: user authentication for modifications
 * TODO: make use of underscore.js to make working with objects easier.
 * TODO: make use of the Location/brewery contructor prototype to attach methods and properties, help eliminate concern with closures
 * TODO: make functions more "pure"
 * TODO: find better way to check for firebase connectivity.
 * TODO: slide into view on location list when  displayed on map
 * TODO: only show edit/remove/add for admin users
 */

/**
 * Keep variables off global space
 */
(function (app, window) {
	'use strict';

	// dependencies
	var unWrap = ko.utils.unwrapObservable,
		isObservable = ko.isObservable;

	/**
	 * add new functions on the observeableArray prototype
	 * Get index for entry with 'key' having 'value' in array
	 *
	 * @parameter {string} name - key to compare
	 *
	 * @parameter {string} value - value to check against
	 *
	 * @returns {number} index of entry otherwise -1
	 */
	ko.observableArray.fn.getIndexBy = function (name, value) {
		var that = unWrap(this);
	    for (var i = 0; i < that.length; i++) {
	        if (that[i][name] === value) {
	            return i;
	        }
	    }
	    return -1;
	};

	/**
	 * add new functions on the observeableArray prototype
	 * Sort array by property
	 *
	 * @parameter {string} prop - ther property to sort array by
	 *
	 */
	ko.observableArray.fn.sortByProperty = function(prop) {
		this.sort(function(obj1, obj2) {
			if (obj1[prop] === obj2[prop]){ 
				return 0;
			} else if (obj1[prop] < obj2[prop]){
				return -1 ;
			}else { 
				return 1;
			}
		});
	};

	// global app variables ( in app namespace, not global scope)
	var map,
		infowindow,
		bounds,
		firebase = new Firebase("https://p5.firebaseIO.com/locations"),
		connectedRef = new Firebase("https://p5.firebaseio.com/.info/connected");

	/**
	 * Brewery place construstor
	 *
	 * @constructor 
	 *
	 */
	var Brewery = function (data) {
		// firebase id
		this.id = data.id;
		// editable fields below
		this.name = ko.observable(data.name);
		this.address = ko.observable(data.address);
		this.coords = ko.observable(data.coords);
		this.area = ko.observable(data.area);
		this.description = ko.observable(data.description);
		
		
		//four square related
		this.fsId = ko.observable(data.fsId) || '';
		this.fsName = ko.observable(data.fsName) || '';
		this.fsUrl = ko.observable(data.fsUrl) || '';
		this.fsCheckins = ko.observable(data.fsCheckins) || '';
		this.fsLikes = ko.observable(data.fsLikes) || '';
		this.fsRating = ko.observable(data.fsRating) || '';
		this.fsPhotos = ko.observableArray(data.photos) || '';

		// flickr related
		this.flPhotos = ko.observableArray(data.flPhotos) || '';

		// values only apply to instance, so do not 'subscribe' changes back to firebase
			// Keeps track of when the item is clicked.
		this.clicked = ko.observable(false);
			// The item is intially displayed on screen upon load.
		this.display = ko.observable(true);
			// The item is initially not in edit mode
		this.editMode = ko.observable(false);
	};

// *--------------------------------------------------------------------*
//
//			                    Model
//
// *--------------------------------------------------------------------*

	var model = {
		/**
		 * Initial model function
		 *
		 */
		init: function () {
			model.checkFirebaseConnection(model.initState);
			model.initFirebase();
			model.fromFireToKO();
		},

		/**
		 *
		 * check to see if firebase db is available
		 *
		 * @returns {bool} - true if it is connected
		 *
		 */
		checkFirebaseConnection : function (state) {
			// TODO: skip the first connect fail since will always show up on startup, or find better way to ignore initial callback
			//       from value change.
			connectedRef.on("value", function(snap) {
				if (!state){
					if (snap.val() === true) {
						toastr.success('FIREBASE DB is online!!! ');
					} else {
						toastr.error('FIREBASE DB is offline!!! ');
					}
				} else {
					state = false;
				}
				return snap.val();
			});
		},

		/**
		 *
		 * first -if firebase db is empty prepopulate with init values.
		 * then retrieve coordinates for any location that doesn't have any
		 * then display markers on map
		 *
		 */
		initFirebase : function () {
		 	firebase.once("value").then(function (snapshot) {
		 		// if firebase db is empty initialize with model.initLocations
		 		if( !snapshot.hasChildren() ){

		 			plugIns.waitMessage();
		 			model.initLocations.forEach(function (brewery) {
		 				firebase.push(brewery);
		 			});
		 		}

		 	}, function(error) {
				// Something went wrong.
				console.error(error);

		 	}).then(function () {
		 		mapRelated.retrieveCoord(vm.breweryLocations());
		 		model.fromKOtoFire();
		 	},
		 	function(error) {
				// Something went wrong.
				console.error(error);
		 	});
		},

		/**
		 * insert new brewery into firebae db
		 *
		 * @parameter {string} id - firebase ID to 'push' new brewery into
		 *
		 * @parameter {object} brewery - brewery object to add
		 */
		newBrewery : function ( id, brewery) {
			var entryRef = firebase.child(id);

		 	entryRef.set(brewery).then(function () {
 				var index = vm.breweryLocations.getIndexBy("id", id);
		 		mapRelated.getLatLng(vm.breweryLocations()[index].address, index, vm.breweryLocations());
		 		model.subscribeBrewery(vm.breweryLocations()[index]);
		 	}, function(error) {
		 	  // Something went wrong.
		 	  console.error(error);
		   	});
		},
		
		/**
		 *
		 * initial locations to start with if we don't have anything in firebase db.
		 *
		 */
		initLocations: [
			{
				name : "Stone Brewing Co.",
				address : "1999 Citracado Parkway, Escondido, CA 92029",
				coords : { lat : 33.1160146 , lng : -117.1198876},
				area : "North County",
				description : "The brewery that started it all, Stone is a monster facility with a huge restaurant, brewery tours ($3 but you keep the glass), and events such as free outdoor movie nights. Beautiful gardens, great for families. "
			},
			{
				name : "Oceanside Ale Works",
				address : "1800 Ord Way, Oceanside, CA 92056",
				coords : { lat : 33.2113331, lng : -117.2731069},
				area : "North County",
				description : "Oceanside Ale Works was founded in 2005, located in a business park in Oceanside. It's one of the few manual brew houses in the US, inspired by European brewing traditions. Fun atmosphere, food vendortypically Thurs-Sun. Come hungry and thirsty and bring friends!"
			},
			{
				name : "Ballast Point",
				address : "10051 Old Grove Rd, San Diego, CA 92131",
				coords : { lat : 32.8985298, lng : -117.1108975},
				area : "Miramar",
				description : "Off the 15 near Scripps Ranch, Ballast Point is one of the better known local beers. Take a tour of the facilities at 12, 2 and 5PM or go straight to tasting - their pale ale is a local favorite."
			},
			{
				name : "Green Flash",
				address : "6550 Mira Mesa Blvd, San Diego, CA 92121",
				coords : { lat : 32.9070566, lng : -117.1777777},
				area : "Miramar",
				description : "From the front it looks like any other giant corporation office but step inside and it opens up to the largest tasting room in San Diego. With an expansive bar and easy to understand tasting menu, it's a great place to bring a bunch of friends!"
			},
			{
				name : "Iron Fist",
				address : "1305 Hot Springs Way, Vista, CA 92081",
				coords : { lat : 33.1455509, lng : -117.2386716},
				area : "North County",
				description : "Fun and lively, Iron Fist is a popular medium sized brewery located in an industrial park. Big bold beers with tons of personality. Plenty of tables for spreading out your tasters or pints and food trucks typically on Thursdays, Friday and Saturdays."			
			},
			{
				name : "Modern Times",
				address : "3725 Greenwood St, San Diego, CA 92110",
				coords : { lat : 32.7542471, lng : -117.2062186},
				area : ""
			},
			{
				name : "Prohibition",
				address : "2004 East Vista Way, Vista, CA 92084",
				coords : { lat : 33.2304601, lng : -117.2266174},
				area : "North County",
				description : "From the front it looks like a rough bar from The Blues Brothers movie but inside its warm and friendly with some of the nicest servers you'll find in San Diego. Terrific food and even better beers, a family run business. Located far north in Vista but worth the drive - come hungry!"
			},
			{
				name : "Coronado Brewing",
				address : "170 Orange Ave, Coronado, CA 92118",
				coords : { lat : 32.6978177, lng : -117.1732552},
				area : "Central San Diego",
				description : "Coronado Brewing Company is a family friendly restaurant that just happens to make some great beers. "

			},
			{
				name : "Bagby Beer Company",
				address : "601 S COAST HWY OCEANSIDE, CA, 92054",
				coords : { lat : 33.189225, lng : -117.374257},
				area : "North County",
				description : "At Bagby Beer Company, we are extremely proud of the set of menu offerings we've developed – we work hard to ensure that they do a good job of reflecting our collective character and showcasing what we value most : Quality wins in the end, Attention to detail matters, We are inspired by all things creative and handmade, We are committed to showcasing true craftsmanship in all forms."
			},
			{
				name : "Belching Beaver Brewery",
				address : "980 Center Dr, Suite A Vista, CA 92081",
				coords : { lat : 33.1450383, lng : -117.2285578},
				area : "North County",
				description : "Hard to find industrial park location but worth it once you arrive. The tasting room is sleek and industrial and the staff warm and friendly. Off the charts IPA as well as other full bodied beers, big screen TV, this place has the potential to be one of the top breweries in North County."
			},
			{
				name : "Legacy",
				address : "363 Airport Rd, Oceanside, CA 92058",
				coords : { lat : 33.2153901, lng : -117.3507698},
				area : "North County",
				description : "Legacy Brewing has been open since October 2013. With over 55 years of combined commercial brewing experience as a patron you will not be disappointed."
			},
			{
				name : "The Lost Abbey",
				address : "155 Mata Way #104, San Marcos, CA 92069",
				coords : { lat : 33.1416847, lng : -117.1492963},
				area : "North County",
				description : "Tons of atmosphere, The Lost Abbey is the holy grail if you're looking for a fun tasting experience in a big - but not too big - brewery. Port Brewing calls this home as well so there are plenty of choices, maybe too many! Use the Vote link below to see the most popular beers- aint that easy?"
			},
			{
				name : "Mother Earth Brewing Co.",
				address : "206 Main Street, Suite H, Vista, CA 92084",
				coords : { lat : 33.2024551, lng : -117.2423369},
				area : "North County",
				description : "Serious beer lovers love Mother Earth for their beer making supplies, casual setting and great beers. They have a new tasting room and retail store with free beer making classes, it's the one stop shop for serious beer lovers."
			},
			{
				name : "Hess Brewing Co.",
				address : "7955 Silverton Rd, San Diego, CA 92126",
				coords : { lat : 32.890496, lng : -117.149662},
				area : "Miramar",
				description : "Hess is a tiny nano-brewery, meaning the make beer in very small batches. Located in an industrial park and a bit hard to find, it's worth seeking out when you're in the Miramar area. They'll will even the brewery special for you if you have a group of 5 or more."
			},
			{
				name : "AleSmith Brewing Co.",
				address : "9368 Cabot Drive San Diego, CA 92126",
				coords : { lat : 32.8924532, lng : -117.1447157},
				area : "Miramar",
				description : "Easy location right off Miramar Road, AleSmith not only has great beers but a young party atmosphere that makes it a great stop with friends. "
			},
			{
				name : "Saint Archer Brewing Co.",
				address : "9550 Distribution Ave. San Diego, CA 92121",
				coords : { lat : 32.8804822, lng : -117.1634659},
				area : "Miramar",
				description : "Saint Archer’s production facility is located in the heart of the San Diego brewery scene. Upon entering the 33,000 square foot facility, one would immediately see our 3 vessel, 30 barrel brew house amongst a forest of 120 barrel fermenters."
			},
			{
				name : "Thorn St. Brewery",
				address : "3176 Thorn St., San Diego, CA 92104",
				coords : { lat : 32.739475, lng : -117.1255158},
				area : "Central San Diego",
				description : "At Thorn Street Brewery, we are committed to bringing the neighborhood brewery back to reality and making you that better beer. We can think of no better neighborhood than North Park to begin this project."
			},
			{
				name : "Monkey Paw Brew Pub",
				address : "805 16th Street San Diego, CA 92101",
				coords : { lat : 32.7138528, lng : -117.1492565},
				area : "Central San Diego",
				description : "Monkey Paw Brewery and Pub is your quintessential neighborhood bar, but with a twist. No crummy bar food, their creative menu features waffle fries, cheesesteaks, wings, and pork shanks they call \"Drunky Monkey Bones\", perfect for pairing with their creative beers."
			},
			{
				name : "Blind Lady Ale House",
				address : "3416 Adams Ave. San Diego, CA 92116",
				coords : { lat : 32.763498, lng : -117.1203007},
				area : "Central San Diego",
				description : "Located in Normal Heights, Blind Lady Ale House is a hip brew pub that serves great pizzas and salads using the best ingredients. It's also home to Automatic Brewing Co, a small nano brewery. Plenty of local taps and late hours makes this place a popular destination at night."
			},
			{
				name : "The Beer Co.",
				address : "602 Broadway San Diego, CA 92101",
				area : "Central San Diego",
				description : "At first The Beer Co. in downtown San Diego looks like any other sports bar - hot waitresses, TV's over the big bar, happy hour food specials. But what sets them apart is that they also make their own beer. A bit like Hooters but with way better beer, a late night hot spot."
			}

		],

		/**
		 *
		 * array to keep track of properites with subscribers so we don't add
		 * multiple subscribers to the same property. values stored as:
		 *
		 * 		subscribed["<breweryID>-<property>"]
		 */
		subscribed : [],

		/**
		 *
		 * init value used to skip initial fail connection message from firebase
		 *
		 *
		 */
		 initState : true,

		/**
		 * update firebase entry
		 *
		 * @parameter {string} id - id of entry in list
		 *
		 * @parameter {string} obj  - object of changes to make
		 *
		 */
		update : function (id, obj) {
			var entryRef = firebase.child(id);

			entryRef(obj);
		},
		
		/**
		 * (FIREBASE => OBSERVABLE ARRAY)
		 *
		 *  (child_added) First need to propogate entries in firebase down to observable array, then
		 *  (value) need to propogate any property changes done on the firebase db down to the observable array 
		 *
		 */
		fromFireToKO : function () {
			firebase.orderByChild("name").on('child_added', function (snapshot) {
				var brewery = snapshot.val();
				// add ID in brewery object
				brewery.id =  snapshot.key();

				// insert new brewery object in to observable array
				vm.breweryLocations.push(new Brewery(brewery));

				var currentBreweryIndex = vm.breweryLocations.getIndexBy("id", brewery.id);
				snapshot.ref().on("value", function(valueSnap) {
					//initial read OR added new property to locations
		            if (valueSnap.val()) {
		            
		                valueSnap.forEach(function(childSnapshot) {
		                	// key will be name of key, such as name, address, etc.
		                	var key = childSnapshot.key();
		                	// val will be the value for the key, such as "stone brewery" for name, etc.
		                	var val = childSnapshot.val();

		                	// update an observable property
		                	if ( isObservable(vm.breweryLocations()[currentBreweryIndex][key]) ){
		                		vm.breweryLocations()[currentBreweryIndex][key](val);
		                	// update an NON-observable property
		                	} else {
		                		vm.breweryLocations()[currentBreweryIndex][key] = val ;
		                	}
		                });
		            //if valueSnap.val() == null means it was removed, so remove from observable array    
		            } else {
		                vm.removeLocalBrewery(brewery.id);
		            }
		        });

			});
		},

		/**
		 * (OBSERVABLE ARRAY => FIREBASE)
		 *
       	 * need to progogate any changes done on the observable array up to firebase db 
       	 * using subscribers.
       	 *
       	 *
       	 */
       	fromKOtoFire : function () {
			ko.utils.arrayForEach(vm.breweryLocations(), model.subscribeBrewery );
       	},

       	/**
       	 * subscribe to every observable property of brewery object in order to propogate changes up to firebase, excluding the 
       	 * properties 'clicked', 'display', and 'editMode' since those properties should only apply to current instance
       	 *
       	 */
       	subscribeBrewery : function (brewery) {
	        for (var property1 in brewery) {
	        	//closure, retain current value
	        	(function(property){
		            if (brewery.hasOwnProperty(property) && isObservable(brewery[property]) && property !== 'clicked'&& property !== 'display'&& property !== 'editMode'){
	           			model.subscribeProperty(brewery, property);
		            }
		        })(property1);
	        }
       	},

       	/**
       	 *
       	 * subscribe individual property
       	 */
       	subscribeProperty : function (brewery, property) {
       		// assign to var in case we need to dispose() later and to check if already have subscription.
    		if ( !(model.subscribed[ property + brewery.id]) ){
        		model.subscribed[ property + brewery.id] = brewery[property].subscribe( function(newVal){
					var obj = {};
					obj[property] = newVal;
					var brewRef = firebase.child(brewery.id);
					brewRef.update(obj);
    			});

        		// trigger change event (valuehasmutated) so properties get moved to firebase db, else would wait for next change
        		// which may not happen again ( cannot push undefined values to firebase, will error out)
        		if ( unWrap(brewery[property]) !== undefined){
    				brewery[property].valueHasMutated();
    			}
    		}
       	}
	};


// *--------------------------------------------------------------------*
//
//			                    viewModel
//
// *--------------------------------------------------------------------*

	var ViewModel = function() {

		// keep reference to viewModel even when context changes
		var self = this;

		self.searchVal = ko.observable('');
		self.searchOptions = ["name", "area", "address"];
		self.searchOptionsSelected = ko.observableArray(self.searchOptions);
		self.breweryLocations = ko.observableArray();
		//new brewery form
		self.newName = ko.observable();
		self.newAddress = ko.observable();
		self.newArea = ko.observable();
		self.newDescription = ko.observable();

       	/**
       	 * Insert new brewery
       	 *
       	 *
       	 */
       	self.submitNewBrewery = function () {
       		var brewery = {},
				newBrewRef =  firebase.push(),
				postId = newBrewRef.key();

       		if ( unWrap(self.newName) === undefined|| unWrap(self.newAddress) === undefined ){
       			toastr.error('Insert failed, did not supply all required fields');
       			return false;
       		}

			brewery.name = unWrap(self.newName);
			brewery.address = unWrap(self.newAddress);
			brewery.area = unWrap(self.newArea) || '';
			brewery.description = unWrap(self.newDescription) || '';
			model.newBrewery(postId, brewery);
		};

		/**
		 * Remove brewery from local brewery array
		 *
		 * @parameter {string} id - id of brewery to remove
		 *
		 */
       	self.removeLocalBrewery = function (id) {
       	    
       	    self.breweryLocations.remove(function(brewery) {
       	        return brewery.id === id;
       	    });

       	};

       	/**
       	 * Remove brewery from remote firebae db
       	 *
       	 * @parameter {object} brewery - brewery object
       	 *
       	 */
       	self.removeRemoteBrewery = function (brewery) {
			
			// remove marker if it has one on map (REMOVE marker BEFORE removing from db)
			if (brewery.marker){
				brewery.marker.setMap(null);
			}
			// remove from firebase
            var brewRef = firebase.child(brewery.id);
            brewRef.remove();
        };

       	/**
       	 * Determine which entry to displayed on list
       	 *
       	 * @parameter {string}  index - index of brewery in breweries array
       	 *
       	 * @returns {boolean} - true if it should be displayed
       	 */
       	self.checkSearch = function(index) {
       		var brewery = self.breweryLocations()[index];
     		var selected = unWrap(self.searchOptionsSelected);
			var searchString = self.searchVal().toLowerCase();
			var breweryName = brewery.name().toLowerCase();
			var breweryAddress = brewery.address().toLowerCase();
			var breweryArea =  brewery.area().toLowerCase() || '';
			var marker = unWrap(self.breweryLocations()[index].marker);

			mapRelated.closeInfowindow();
			// checking for name, area, and address AND only check agains field if checked off
			if( (breweryName.indexOf(searchString) > -1 && selected.indexOf('name') > -1 ) || (breweryAddress.indexOf(searchString) > -1  && selected.indexOf('address') > -1) || (breweryArea.indexOf(searchString) > -1  && selected.indexOf('area') > -1) || searchString.length === 0) {
				
				brewery.display(true);
				
				// attempt to show marker only if brewery object has one
				if(marker) {
					marker.setVisible(true);
				}
			} else {
				brewery.display(false);
				if(marker) {
					marker.setVisible(false);
				}
			}
			
			// after setting the value return value so view 'visible' binding knows whether its true or false
			return brewery.display();
		};

		self.setAutocomplete = function () {
			vm.searchVal('');
			plugIns.autocomplete();

			return true;
		};

		/**
		 * if brewery entry selected from list open infowindow
		 *
		 * @parameter {object} brewery - brewery object
		 *
		 */
        self.selected = function(brewery) {
			var index = self.breweryLocations().indexOf(brewery);
			
			if ( self.breweryLocations()[index].coords()){
				google.maps.event.trigger(self.breweryLocations()[index].marker, 'click');
			} else {
				toastr.error('Don\'t have coordinates to map it. Refresh page to see if google maps can find it again.', unWrap(brewery.name), {timeOut: 0,"preventDuplicates": false});
			}
		};

		/**
		 * slide list in and out of view
		 *
		 */
		self.toggle = function () {
			plugIns.listToggle();
		};

		self.closePopup = function  () {
			plugIns.closePopup();
		};

		// get a list of areas
		self.justAreas = ko.dependentObservable(function() {
		    var areas = ko.utils.arrayMap(self.breweryLocations(), function(brewery) {
		        return brewery.area();
		    });

		    //return unique values only
		    return ko.utils.arrayGetDistinctValues(areas.sort());
		});

		// get a list of areas
		self.justNames = ko.dependentObservable(function() {
		    var names = ko.utils.arrayMap(self.breweryLocations(), function(brewery) {
		        return brewery.name();
		    });
		    return names.sort();
		});

		// get a list of areas
		self.justAddress = ko.dependentObservable(function() {
		    var addresses = ko.utils.arrayMap(self.breweryLocations(), function(brewery) {
		        return brewery.address();
		    });
		    return addresses.sort();
		});
	};


// *--------------------------------------------------------------------*
//
//			                    mapRelated Object
//
//  TODO: geocoder NOT very accurate with bogus address lookup, find way to make it return only valid addresses, if possible.
// *--------------------------------------------------------------------*

	var mapRelated = {
		geocodeKey :"AIzaSyDPNZ81nXvNN-ZT7P97zwfmwtC398njJT4",
		geocodeUrl : "https://maps.googleapis.com/maps/api/geocode/json?",
		
		/**
		 *
		 * initial view of map. Initially we want to show ALL locations
		 * later as we filter we will simply hide/show the markers rather
		 * than removing/adding them, using the 'marker.setMap()' function
		 *
		 */
		init: function() {
			if ( this.checkMapConnections() ){
				var mapOptions = {
					center: {lat: 33.1958333, lng: -117.3786111 },
					scrollwheel:false,
					mapTypeControl: false,
					streetViewControl: false,
					zoom: 10,
					styles: [{"featureType":"administrative","elementType":"all","stylers":[{"visibility":"on"},{"saturation":-100},{"lightness":20}]},{"featureType":"road","elementType":"all","stylers":[{"visibility":"on"},{"saturation":-100},{"lightness":40}]},{"featureType":"water","elementType":"all","stylers":[{"visibility":"on"},{"saturation":-10},{"lightness":30}]},{"featureType":"landscape.man_made","elementType":"all","stylers":[{"visibility":"simplified"},{"saturation":-60},{"lightness":10}]},{"featureType":"landscape.natural","elementType":"all","stylers":[{"visibility":"simplified"},{"saturation":-60},{"lightness":60}]},{"featureType":"poi","elementType":"all","stylers":[{"visibility":"off"},{"saturation":-100},{"lightness":60}]},{"featureType":"transit","elementType":"all","stylers":[{"visibility":"off"},{"saturation":-100},{"lightness":60}]}]
				};

				map = new google.maps.Map(document.getElementById('map'), mapOptions);
				bounds = new google.maps.LatLngBounds();
				infowindow = new google.maps.InfoWindow({
					maxWidth: 250
				});			

				// EVENT LISTENERS

				// close any infowindow that may be open and stop animation if marker was clicked on
				google.maps.event.addListener(map, 'click', mapRelated.closeInfowindow);

				// same as avove if close infoWindow by clicking upper right 
				google.maps.event.addListener(infowindow, 'closeclick', mapRelated.closeInfowindow );

				// keep map centered to current view when window is resized
				google.maps.event.addDomListener(window, 'resize', function() {
					var curCenter = map.getCenter();
					google.maps.event.trigger(map, 'resize');
					map.setCenter(curCenter);
				});
			}
		},

		/**
		 *
		 * Verify Google Maps API is available
		 *
		 */
		checkMapConnections : function () {
			//make sure maps api is available
			if ( !window.google || !window.google.maps){
				 toastr.error('GOOGLE MAPS is offline!!! ');
				 return false;
			} else {
				 toastr.success('GOOGLE MAPS is online!!! ');
				return true;
			}
		},
		
		/**
		 * Get lat and lng values for given address, THEN display marker for location.
		 *
		 * @parameter {string} - address to search for
		 * @parameter {string} - index of current entry in array
		 * @parameter {array} - array that contains addresses
		 *
		 */
		getLatLng: function(address, index, array) {
			var url = this.geocodeUrl + '&address=' + unWrap(address)  + "&key="+ this.geocodeKey,
				curArray = unWrap(array), // get value regardless if observeable or not
				curLoc = curArray[index],
				xhr;
			
			xhr = $.getJSON(url, function(data) {
				if(data.status === "OK") {
					var latValue = data.results[0].geometry.location.lat, 
						lngValue =data.results[0].geometry.location.lng;
					if (  isObservable(curLoc.coords) ){
						curLoc.coords({ lat : latValue, lng: lngValue});
					} else {
						curLoc.coords = { lat : latValue, lng: lngValue};
					}
				} else {
					toastr.error('Google Geocoding api Error getting Lat and Lng of ' + unWrap(address));
				}

			}).fail(function() {
				toastr.error('ERROR, can\'t get location!!!, Google Geocoding api not available');
			});

			// wait to get ooords befor attempting to display
			xhr.then(function () {
				mapRelated.displayMarker(curLoc);
				fourSquare.getInfo(curLoc);
			});
		},

		/**
		 *  Get coordinates for address
		 *
		 *	@parameter {array} arrLocations - array of locations to look 
		 */
		retrieveCoord : function (arrLocations) {
			arrLocations.forEach(function(locObj, index) {
				// include locations array in call...must be a better way....
				if ( typeof locObj.coords() !== 'object' ){
					mapRelated.getLatLng(locObj.address, index, arrLocations); // can't use 'locations'
				} else {
					mapRelated.displayMarker(locObj);
					fourSquare.getInfo(locObj);
				}
			});
		},

		/**
		 * Display marker on map, make sure all markers are displayed in viewMode.
		 *
		 * @parameter {object} locObj - brewery object to show on map
		 *
		 */
		displayMarker : function (locObj) {
			if ( typeof locObj.coords() === 'object'){
				// mapRelated.addMarker(locObj);
				locObj.marker = mapRelated.addMarker(locObj);

				// extend map bounds to include new marker
				bounds.extend(locObj.marker.getPosition());

				//THIS WAS A PAIN, FINALLY FIGURED OUT THE CLOSURE PROBLEM!!!
				locObj.marker.addListener('click', (function(curLocation) {
	    		    
	    		    return function () {
	    		    	var curMarker = curLocation.marker,
	    		    		curContent = mapRelated.createContent(curLocation);

	    		    	// close any marker window and stop animation on any marker that may be open
	    		    	mapRelated.closeInfowindow();

	    		    	// set clicked flag
	    		    	curLocation.clicked(true);
	    		    	
	    		    	// move to clicked marker
	    		    	map.panTo(curMarker.getPosition());
	    		    	// map.setZoom(16);

	    		    	// get content for infowindow ( only using one infoWindow )
	    		    	mapRelated.attachContent(curMarker, curContent );

	    		    	// animate on click
	    		    	if (curMarker.getAnimation() === null) {
	    		    	    //open infowindow
	    		    		infowindow.open(curMarker.get('map'), curMarker);
							curMarker.setAnimation(google.maps.Animation.BOUNCE);
	    		    	}

	    		    	// have to wait for html element to exist before calling plugin
	    		    	plugIns.readyGallery();
	    		    };
	    		})(locObj));

	    		map.fitBounds(bounds);
			}
		},

		/**
		 * Loop through breweries to display marker on map
		 *
		 * @parameter {array} arrLocations - breweries objects array
		 *
		 */
		displayMarkers : function (arrLocations) {
			arrLocations.forEach(function(locObj) {
				// only add markers for those that have lat/lng coords
				mapRelated.displayMarker(locObj);
			});
		},
	
		/**
		 * Add Marker to map and to brewery object
		 * unwrap ko values so we can use both observables and none observables in function.
		 *
		 * @parameter {object} - brewery location object
		 * @returns {object} - marker for location
		 *
		 */
		addMarker: function(loc) {
			var marker,
				coords = unWrap(loc.coords),
				options = {
					position: coords,
					animation: google.maps.Animation.DROP,
					map: map,
					icon: "./img/beer-icon.png"
				};

			// add marker object to location entry
			marker = new google.maps.Marker(options);

			return marker;
		},

		createContent: function(loc) {
			var name = unWrap(loc.name),
				area = unWrap(loc.area),
				address = unWrap(loc.address),
				description = unWrap(loc.description),
				fsUrl = unWrap(loc.fsUrl),
				fsCheckins = unWrap(loc.fsCheckins),
				fsRating = unWrap(loc.fsRating),
				fsLikes = unWrap(loc.fsLikes),
				fsPhotos = unWrap(loc.fsPhotos),
				flPhotos = unWrap(loc.flPhotos),
				output='';

			output += '<div class=\'clearfix info-window\'>';
			output += name 			? '<h2>' : '';
			output += fsRating      ? '<span class="label label-default">' + fsRating + '</span> ' : '';
			output += name          ? name + '</h2>' : '';
			output += address 			? '<h5>' + address + '</h5>' : '';
			output += area 			? '<h5>' + area + '</h5>' : '';
			output += description 	? '<p>' + description + '</p>' : '';
			output += fsCheckins 	? '<h3 class="label label-info mr10">' + fsCheckins + ' Check-ins</h3>' : '';
			output += fsLikes 	    ? '<h3 class="label label-info">' + fsLikes + ' Likes</h3>' : '';
			output += fsUrl 		? '<p><a href="' + fsUrl + '" target="_blank">' + fsUrl + '</a></p>' : '';
			//check for both FourSquare and Flickr photos.
			if ( fsPhotos.length > 0 || flPhotos.length > 0){
				output += '<p>slide or click photo(s) for  gallery</p><div class="brewery-photos">';

				output += mapRelated.getPhotos(fsPhotos);
				output += mapRelated.getFlPhotos(flPhotos);

				output += '</div>';
			}
			output += '<\/div>';
			return output;
    	},

    	/**
    	 * loop through each photo info to generate img element
    	 *
    	 * @parameter {array} photos - FourSquare info for each photo
    	 *
    	 */
    	getPhotos : function (photos) {
    		var photoStr = ''; 

    		photos.forEach( function (photo) {
    			photoStr +=  '<a class="img-thumbnail" href=" '+ photo.prefix + photo.med + photo.suffix + ' "><img src=" ' + photo.prefix + photo.small + photo.suffix + '"></a>';
    		});

    		return photoStr;
    	},

    	/**
    	 * loop through each photo info to generate img element
    	 *
    	 * @parameter {array} photos - Flickr info for each photo
    	 *
    	 */
    	getFlPhotos : function (photos) {

    		var photoStr = '';

    		photos.forEach( function (photo) {
    			var link = 'https://farm' + photo.farm + '.staticflickr.com/' + photo.server + '/' + photo.id + '_' + photo.secret + '_' + photo.med + '.jpg',
    				thumb = 'https://farm' + photo.farm + '.staticflickr.com/' + photo.server + '/' + photo.id + '_' + photo.secret + '_' + photo.small + '.jpg';

    			photoStr +=  '<a class="img-thumbnail" href="' + link + '" ><img src=" ' + thumb + '"></a>';
    		});

    		return photoStr;
    	},

    	/**
    	 * attach content to each marker, only using one infowndow.
    	 *
    	 * @parameter {object} maker - google map marker object for brewery
    	 *
    	 * @parameter {string} details - content to show in infowindow for brewery
    	 */
    	attachContent: function(marker, details) {
    		infowindow.setContent( details );
    	},

    	// stop animation and close infowindow for marker
    	closeInfowindow: function() {
    		infowindow.close();
    		map.fitBounds(bounds);
    		vm.breweryLocations().forEach(function(locObj) {
    			if ( locObj.marker){
    				locObj.marker.setAnimation(null);
    				locObj.clicked(false);
    			}
    		});
    	},

    	error : function () {
    		plugIns.mapError();
    	}
	};

// *--------------------------------------------------------------------*
//
//			                   fourSquare Object
//
// *--------------------------------------------------------------------*
	var fourSquare = {
		url: 'https://api.foursquare.com/v2/venues/',
		search: 'search?v=20160110&m=swarm&limit=1',
		client_id: '&client_id=ZD4WOTN3K1HFKA1NUFAFXEFADANVJAJZNX3JBBWLXAYP5B0Y',
		client_secret: '&client_secret=QA2FPVXGUP3FPVKMVNDY3BXBKKXZGB4OOFX5DJJRD1BM2NUW',

		/**
		 * Ajax call to FourSquare to get brewery info
		 *
		 * @parameter {object} locObj - brewery object
		 *
		 */			
		getInfo : function (locObj) {
			var coords = unWrap(locObj.coords);

			// TODO: is there a better way to check if we have lat/lng??
			if ( typeof coords === 'object' && !($.isEmptyObject(coords)) ) {
				var lat = unWrap(coords.lat),
					lng = unWrap(coords.lng),
					ll = '&ll=' + lat + ',' + lng,
					query = '&query=' + unWrap(locObj.name),
					fsUrl = this.url + this.search + this.client_id + this.client_secret + ll + query;

				// only make ajax call if we need id, or name
				if ( !locObj.fsId()  || !locObj.fsName() ){
					var xhr = $.getJSON(fsUrl, function(data) {
						if (data.response.venues[0]){
							var fsId = data.response.venues[0].id,
								fsUrl = data.response.venues[0].url,
								fsName = data.response.venues[0].name;

							if ( locObj.fsId() === undefined){ locObj.fsId(fsId);}
							if ( locObj.fsUrl() === undefined){ locObj.fsUrl(fsUrl);}
							if ( locObj.fsName() === undefined){ locObj.fsName(fsName);}
						}
					}).fail(function() {
						toastr.error('Can\'t communicate properly with FourSquare API', 'FourSquare', {timeOut: 0});
					});

					xhr.then(function () {
						fourSquare.getDetails(locObj);
					});
				}
			} 
		},
 
		/**
		 * Ajax call for location with FourSquare ID to get commonly UPDATED details, such as likes, ratings, photos.
		 * This call should be made every time to make sure we get latest stats.
		 *
		 * @parameter {object}  locObj - brewery object
		 *
		 */
		getDetails : function (locObj) {
			var id = unWrap(locObj.fsId),
				fsUrl = this.url + id + '/?v=20151122' + this.client_id + this.client_secret;

			if ( id ){
				$.getJSON(fsUrl, function(data) {
					if (data.response.venue){
						var fsLikes = data.response.venue.likes.count,
							fsRating = data.response.venue.rating,
							fsCheckins = data.response.venue.stats.checkinsCount,
							fsDescription = data.response.venue.description;

						// only update if description is empty
						if ( locObj.description() === undefined){ locObj.description(fsDescription);}

						// always update stats/pics below
						locObj.fsCheckins(fsCheckins);
						locObj.fsRating(fsRating);
						locObj.fsLikes(fsLikes);

						// needed to zero out array (in case it already had photos), else would keep pushing photos to array, increasing size.
						locObj.fsPhotos().length = 0;
						if (data.response.venue.photos.count > 0){
							data.response.venue.photos.groups[0].items.forEach(function (photo) {
								locObj.fsPhotos.push({
									"prefix" : photo.prefix,
									"suffix" : photo.suffix,
									"small"  : "200x200",
									"med"    : "800x800",
									"large"  : "1600x1600"
								});
							});	
						}						
					}
				}).fail(function() {
					toastr.error('Can\'t communicate properly with FourSquare API', 'FourSquare', {timeOut: 0});
				}).then(function () {
						 flickr.getPics(locObj);
					});
			}
		}
	};

// *--------------------------------------------------------------------*
//
//			                   Flickr Object
//
// *--------------------------------------------------------------------*
	var flickr = {
		url: 'https://api.flickr.com/services/rest/?method=flickr.photos.search',
		api_key: '&api_key=cafcfda94480e3a47dcf8442b9dc954c',
		// format: '&format=json&jsoncallback=?',
		format: '&format=json&nojsoncallback=1',
		per_page : '&per_page=10',
		radius : '&radius=1',

		/**
		 * Ajax call to Flickr to get pics
		 *
		 * @parameter {object} locObj - brewery object
		 *
		 */			
		getPics : function (locObj) {
			var coords = unWrap(locObj.coords);

			// TODO: is there a better way to check if we have lat/lng??
			if ( typeof coords === 'object' && !($.isEmptyObject(coords)) ) {
				var lat = '&lat=' + unWrap(coords.lat),
					lon = '&lon=' + unWrap(coords.lng),
					text = '&text=' + unWrap(locObj.name).replace(/\ /g, '+'),
					fUrl = this.url  + this.api_key  + this.format + this.per_page + this.radius + lat + lon + text;

					$.getJSON(fUrl, function(data) {
					
						locObj.flPhotos().length = 0;
						if (data.photos.total > 0){
							data.photos.photo.forEach(function (photo) {
								locObj.flPhotos.push({
									"farm"   : photo.farm,
									"id"     : photo.id,
									"secret" : photo.secret,
									"server" : photo.server,
   									"small"  : "m",
									"med"    : "c",
									"large"  : "h"
								});
							});	
						}			

					}).fail(function() {
						toastr.error('Can\'t communicate properly with Flickr API', 'Flckr', {timeOut: 0});
					});
			} 
		},

		/**
		 * Loop through breweries to get flickr photos
		 *
		 * @parameter {array} arrLocations - breweries objects array
		 *
		 */
		getAllPics : function (arrLocations) {
			arrLocations.forEach(function(locObj) {
				// only add markers for those that have lat/lng coords
				flickr.getPics(locObj);
			});
		}
	};
	
// *--------------------------------------------------------------------*
//
//			                   Plugins Related Object
//
// *--------------------------------------------------------------------*

	var plugIns = {
		init : function  () {
			$(document).ready(function() {

				$(document).on('click', '.close-modal', function (e) {
					e.preventDefault();
				    $.magnificPopup.close();
				    this.form.reset();
			    });

			    $(document).on('click', '.cancel-modal', function (e) {
					e.preventDefault();
					// reset form before closing
					this.form.reset();
				    $.magnificPopup.close();
			    });

			    // had trouble attaching to elements with dynamic ids generated with knockout
			    // must be better way but for now this will do...
			    $(document).on('mouseenter', '.widget', function () {
					plugIns.editBrewery();
			    });
			   
			    // options for the notification plugin, not sure where to best place this since it is on global scope
			    toastr.options = {
			    	"closeButton": true,
			    	"debug": false,
			    	"newestOnTop": true,
			    	"progressBar": false,
			    	"positionClass": "toast-top-right",
			    	"preventDuplicates": false,
			    	"onclick": null,
			    	"showDuration": "300",
			    	"hideDuration": "1000",
			    	"timeOut": "5000",
			    	"extendedTimeOut": "1000",
			    	"showEasing": "swing",
			    	"hideEasing": "linear",
			    	"showMethod": "fadeIn",
			    	"hideMethod": "fadeOut"
			    };
			});
		},

		// display gallery photos with magnifPopup
		readyGallery : function () {
			$('.brewery-photos').each(function() { // the containers for all your galleries
			    $(this).magnificPopup({
			        delegate: 'a', // the selector for gallery item
			        type: 'image',
			        gallery: {
			          enabled:true
			        },
			        zoom: {
			            enabled: true, 
			            duration: 300, 
			            easing: 'ease-in-out'
			        }
			    });
			});
		},

		// show edit form in popup
		editBrewery : function () {
			$('.brewery-form').magnificPopup({
				type: 'inline',
				preloader: false,
				focus: '#name',
		        modal: false,
				// When elemened is focused, some mobile browsers in some cases zoom in
				// It looks not nice, so we disable it: (per plugin Author!)
				callbacks: {
					beforeOpen: function() {
					 	if($(window).width() < 700) {
							this.st.focus = false;
						} else {
							this.st.focus = '#name';
					  	}
					}
				}
			});
		},

		// show message on init since it takes a while to get content for all breweries
		waitMessage : function () {
			$.magnificPopup.open({
			 	items: {
			    	src: '<div class="white-popup-block">Please wait, intializing breweries for the first time, this will only take a while this first time.</div>',
			  		type: 'inline'
			  	}
			});

			window.setTimeout(function() {
			      $.magnificPopup.close();
			    }, 5000);
		},

		mapError : function () {
			$.magnificPopup.open({
			 	items: {
			    	src: '<div class="white-popup-block">ERROR, could not load Google Maps. Verify you have internet connection and try again.</div>',
			  		type: 'inline'
			  	}
			});
		},

		// close Popup
		closePopup : function () {
			$.magnificPopup.close();
		},

		// hide/show list of breweries
		listToggle : function() {
			$('.widget, .glyphicon-menu-left').toggleClass('slide-out');
		},

		// set autocomplete
		autocomplete : function () {
			var lookups = [],
				name = vm.justNames(),
				area = vm.justAreas(),
				address = vm.justAddress();

			ko.utils.arrayForEach(vm.searchOptionsSelected(), function(item) {
			        
			        if ( item === 'name'){
			        	Array.prototype.push.apply(lookups, name);
			        }
			        if ( item === 'area'){
			        	Array.prototype.push.apply(lookups, area);
			        }
			        if ( item === 'address'){
			        	Array.prototype.push.apply(lookups, address);
			        }

		   });

			$('#search-input').autocomplete({
			    lookup: lookups,
			    onSelect: function (suggestion) {
			     	vm.searchVal(suggestion.value);
			    }
			});
		}
	};

var vm = new ViewModel();
	ko.applyBindings(vm);
	model.init();
	plugIns.init();
// *****************************
	// fo testing in console, expose through app namespace // app.model = model;
	// app.fourSquare = fourSquare;
	// app.flickr = flickr;
	// app.infowindow = infowindow;
	// app.plugIns = plugIns;
	// app.vm = vm;
	// ALWAYS expose mapRelated since it will be called once google maps is loaded
	app.mapRelated = mapRelated;
	
// *******************************

})( window.app || (window.app = {}), window);
