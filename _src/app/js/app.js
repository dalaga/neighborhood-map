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
 * will be stipped away.
 *
 * TODO: user authentication for modifications
 */

/**
 * description
 *
 * @parameter {string}
 * @returns {string}
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
	 * @parameter {string} name - kye to compare
	 *
	 * @returns {string} value - value to check against
	 */
	ko.observableArray.fn.getIndexBy = function (name, value) {
		var that = unWrap(this);
	    for (var i = 0; i < that.length; i++) {
	        if (that[i][name] == value) {
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
			if (obj1[prop] == obj2[prop]) 
				return 0;
			else if (obj1[prop] < obj2[prop]) 
				return -1 ;
			else 
				return 1;
		});
	};

	// global app variables ( in app namespace, not global scope)
	var map,
		infowindow,
		bounds,
		firebase = new Firebase("https://p5.firebaseIO.com/locations"),
		connectedRef = new Firebase("https://p5.firebaseio.com/.info/connected");

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
	}

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
		this.fsId = ko.observable(data.fsId);
		this.fsName = ko.observable(data.fsName);
		this.fsUrl = ko.observable(data.fsUrl);
		this.fsCheckins = ko.observable(data.fsCheckins);
		this.fsLikes = ko.observable(data.fsLikes);
		this.fsRating = ko.observable(data.fsRating);
		this.fsPhotos = ko.observableArray(data.photos);

		// values only apply to instance, so do not 'subscribe' changes back to firebase
			// Keeps track of when the item is clicked.
		this.clicked = ko.observable(false);
			// The item is intially displayed on screen upon load.
		this.display = ko.observable(true);
			// The item is initially not in edit mode
		this.editMode = ko.observable(false);
	}

// *--------------------------------------------------------------------*
//			                    Model
// *--------------------------------------------------------------------*

	var model = {
		/**
		 * Initial model function
		 *
		 */
		init: function () {
			mapRelated.init();
			model.initFirebase();
			model.checkFirebaseConnection(model.initState);
			model.fromFireToKO().then( function () {
				console.log("breweries: %o", vm.breweryLocations());
				mapRelated.displayMarkers( vm.breweryLocations() );
			});
		},

		/**
		 *
		 * initial locations to start with if we don't have anything in firebase db.
		 *
		 */
		initLocations: [
			{
				name: "Stone Brewing Co.",
				address: "1999 Citracado Parkway, Escondido, CA 92029",
				area: "North County",
				description: "Stone Description goes here...",
				editMode: false,

			},
			{
				name: "Oceanside Ale Works",
				address: "1800 Ord Way, Oceanside, CA 92056",
				area: "test area"
			},
			{
				name: "Ballast Point",
				address: "10051 Old Grove Rd, San Diego, CA 92131",
			},
			{
				name: "Green Flash",
				address: "6550 Mira Mesa Blvd, San Diego, CA 92121",
			},
			{
				name: "Iron Fist",
				address: "1305 Hot Springs Way, Vista, CA 92081"			},
			{
				name: "Mad Lab Craft Brewing",
				address: "6120 Business Center CT,San Diego, CA 92154",
			},
			{
				name: "Modern Times",
				address: "3725 Greenwood St, San Diego, CA 92110"// two locations
			},
			{
				name: "Prohibition",
				address: "2004 East Vista Way, Vista, CA 92084"
			},
			{
				name: "Coronada Brewing",
				address: "170 Orange Ave, Coronado, CA 92118",
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
		 * if firebase db is empty prepopulate with init values.
		 *
		 */
		initFirebase : function () {
		 	firebase.once("value", function (snapshot) {
		 		// if firebase db is empty initialize with model.initLocations
		 		if( !snapshot.hasChildren()){
		 			console.log("Does not have children");
		 			model.initLocations.forEach(function (brewery) {
		 				firebase.push(brewery);
		 				console.log("pushed to firebase: %o", brewery);
		 			});
		 		}
		 	});
		},

		firstTime : function () {
			
		},

		subsequentTime : function () {
			
		},

		/**
		 *
		 * init value used to skip initial fail connection message from firebase
		 *
		 *
		 */
		 initState : true,

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
		 * update firebase entry
		 *
		 * @parameter {string} id - id of entry in list
		 *
		 * @parameter {string} obj  - object of changes to make
		 *
		 */
		update: function (id, obj) {
			var entryRef = firebase.child(id);

			return entryRef(obj);
		},
		
		// array of locations areas
		// getAreas: function (array) {
		// 	var newArray = [];
		// 	newArray = array.map(function (item) {
		// 		if (item.area){
		// 			return item.area;
		// 		}
		// 	});
		// 	return newArray;
		// },
		// getUniques: function (array) {
		// 	var newArray = [];
		// 	newArray = array.filter(function(item, i, ar){ 
		// 		return ar.indexOf(item) === i; 
		// 	});
		// 	return newArray;
		// },

		/**
		 * (FIREBASE => OBSERVABLE ARRAY)
		 *
		 *  (child_added) First need to propogate entries in firebase down to observable array, then
		 *  (value) need to propogate any property changes done on the firebase db down to the observable array 
		 *
		 */
		fromFireToKO : function () {
			console.log("from -- Fire => KO -- running...");

			// define new defer object
			var dfd = $.Deferred();

			firebase.orderByChild("name").on('child_added', function (snapshot) {
				// The callback function will get called for every location
				// console.log("top key is: ", snapshot.key());
				// snapshot.val() will be the object for each snapshot
				// console.log("top data: %o ", snapshot.val());
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
		                		console.log("updated value NOT observable...");
		                		vm.breweryLocations()[currentBreweryIndex][key] = val ;
		                	}
		                });
		            //if valueSnap.val() == null means it was removed, so remove from observable array    
		            } else {  
		            	console.log("value removed, brewery: %o", brewery);
		                vm.removeBrewery(brewery.id);
		            }
		        });
				
				// subscribe brewery back to firebase so changes will happen automatically.
				mapRelated.displayMarker(app.vm.breweryLocations()[currentBreweryIndex]);
				// model.subscribeBrewery(vm.breweryLocations()[currentBreweryIndex]);

			});
			
			dfd.resolve();

			return dfd.promise();
			
		},

		/**
		 * (OBSERVABLE ARRAY => FIREBASE)
		 *
       	 * need to progogate any changes done on the observable array up to firebase db 
       	 * using subscribers.
       	 *
       	 *
       	 */
       	fromKOtoFire :function () {
       		console.log("fromKOtoFire running...array: %o", vm.breweryLocations());
			ko.utils.arrayForEach(vm.breweryLocations(), model.subscribeBrewery );
       	},

       	/**
       	 * subscribe to every observable property of brewery object in order to propogate changes up to firebase, excluding the 
       	 * properties 'clicked' and 'display' since those properties should only apply to current instance
       	 *
       	 */
       	subscribeBrewery : function (brewery) {
	        for (var property1 in brewery) {
	        	//closure, retain current value
	        	(function(property){
		            if (brewery.hasOwnProperty(property) && isObservable(brewery[property]) 
		            									 && property !== 'clicked' 
		            									 && property !== 'display' 
		            									 && property !== 'editMode'
		            									 && property !== 'fsCheckins'
		            									 && property !== 'fsLikes'
		            									 && property !== 'fsRating'
		            									 && property !== 'fsPhotos' ) {
 						// check if current property is observable and was not inherited from prototype. only subscribe to observables since non-observables will
		            	// only be read values coming from firebase db
	            		console.log("OBSERVEABLE: "+ property + " : " + brewery[property]());

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
					// console.log("obj; %o", obj);
					var brewRef = firebase.child(brewery.id);
					brewRef.update(obj);
    			});

        		// fire change event so properties get moved to firebase db, else would wait for next change
        		// which may not happen again ( cannot push undefined values to firebase, will error out)
        		if ( unWrap(brewery[property]) !== undefined){
    				brewery[property].valueHasMutated();
    			}
    		} else {
    			console.log ("property already subscribed %s", property );
    		}
       	},

       	/**
       	 *
       	 * set Value of property regardless if observable or not
       	 *
       	 */
       	setValue : function (property, value) {

       		if ( isObservable(property) ){
       			return property(value);
       		} else {
       			return property = value;
       		}
       		
       	}
	};

// *--------------------------------------------------------------------*
//			                    viewModel
// *--------------------------------------------------------------------*

	var ViewModel = function() {

		// keep reference to viewModel even when context changes
		var self = this;

		self.addMode = ko.observable(false);
		self.searchVal = ko.observable('');
		self.breweryLocations = ko.observableArray();
		//new brewery form
		self.newName = ko.observable();
		self.newAddress = ko.observable();
		self.newArea = ko.observable();
		self.newDescription = ko.observable();


		//get a unique list of areas
		self.areaList = ko.dependentObservable(function() {
  		      	var areas = ko.utils.arrayMap(self.breweryLocations(), function(brewery){ return brewery.area})
  		     		return ko.utils.arrayGetDistinctValues(areas).sort();
 		      	});

       	// self.areaList = ko.observableArray(model.getAreas(model.locations));
       	//get areas  FROM DATA
       	// var areas = model.getAreas(model.locations);
       	// areas = model.getUniques(areas);
       	// self.areaList = ko.observableArray(areas);
       	// self.areaSelected = ko.observableArray(self.areaList());

       	self.addNewBrewery = function () {
			var brewery = {};
			brewery.name = unWrap(self.newName);
			brewery.area = unWrap(self.newArea);
			brewery.address = unWrap(self.newAddress);
			brewery.description = unWrap(self.newDescription);

			firebase.push(brewery);
		 	console.log("pushed to firebase: %o", brewery);
		};

       	self.removeBrewery = function (id) {
       	    self.breweryLocations.remove(function(brewery) {
       	        return brewery.id == id;
       	    });

       	};

       	// to be efficient we show/hide elements by using visible: binding
       	// instead of generating an array each time we search for breweries
       	self.checkSearch = function(index) {
       		var brewery = self.breweryLocations()[index];
			var searchString = self.searchVal().toLowerCase();
			var breweryName = brewery.name().toLowerCase();
			var breweryAddress = brewery.address().toLowerCase();
			var breweryArea = (brewery.area() && brewery.area().toLowerCase()) || '';
			var marker = unWrap(self.breweryLocations()[index].marker);

			// checking for both name and area since we display those on the list...
			if(breweryName.indexOf(searchString) > -1 || breweryAddress.indexOf(searchString) > -1 || breweryArea.indexOf(searchString) > -1 || searchString.length === 0) {
				brewery.display(true);
				if(marker) {
					marker.setMap(map);
					console.log("pin on map: %s", breweryName);
					// marker.setVisible(true);
				}
			} else {
				brewery.display(false);
				if(marker) {
					marker.setMap(null);
					// marker.setVisible(false);
				}
			}
			
			// after setting the value return value so view 'visible' binding knows whether its true or false
			return brewery.display();
		};

		self.getLocation = function () {
			// body...
			console.log("new address: %s", self.newAddress());

		};

		self.edit = function (brewery) {
			// var brewery = self.breweryLocations()[index];
			if ( unWrap(brewery.editMode) ){
				brewery.editMode(false);
			} else {
				brewery.editMode(true);
			}
			
			
		};

		self.add = function () {
			// var brewery = self.breweryLocations()[index];
			if ( unWrap(self.addMode) ){
				self.addMode(false);
			} else {
				self.addMode(true);
			}
		};

		self.remove = function (brewery) {
			// var brewery = self.breweryLocations()[index];
             self.breweryLocations.remove(brewery);

        };
        self.selected = function(brewery) {
			var index = self.breweryLocations().indexOf(brewery);
			
			console.log("index of clicked is: %s", index);

			// var namae = place.name;
			// self.onePlace(namae);
			// self.places()[index].clicked(!place.clicked());
			// self.infoWindows(index, namae);
		};
    	
	};


// *--------------------------------------------------------------------*
//			                    mapRelated Object
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
					zoom: 5,
					styles: [{"featureType":"administrative","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"landscape","elementType":"all","stylers":[{"visibility":"simplified"},{"hue":"#0066ff"},{"saturation":74},{"lightness":100}]},{"featureType":"poi","elementType":"all","stylers":[{"visibility":"simplified"}]},{"featureType":"road","elementType":"all","stylers":[{"visibility":"simplified"}]},{"featureType":"road.highway","elementType":"all","stylers":[{"visibility":"on"},{"weight":0.6},{"saturation":-85},{"lightness":61}]},{"featureType":"road.highway","elementType":"geometry","stylers":[{"visibility":"on"}]},{"featureType":"road.arterial","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"road.local","elementType":"all","stylers":[{"visibility":"on"}]},{"featureType":"transit","elementType":"all","stylers":[{"visibility":"simplified"}]},{"featureType":"water","elementType":"all","stylers":[{"visibility":"simplified"},{"color":"#5f94ff"},{"lightness":26},{"gamma":5.86}]}]
				};

				map = new google.maps.Map(document.getElementById('map'), mapOptions);
				bounds = new google.maps.LatLngBounds();
				infowindow = new google.maps.InfoWindow();			

				// EVENT LISTENERS

				// close any infowindow that may be closed and stop animation if marker was clicked on
				google.maps.event.addListener(map, 'click', mapRelated.closeMarkers);

				// same as avove if close infoWindow by clicking upper right 
				google.maps.event.addListener(infowindow, 'closeclick', mapRelated.closeMarkers );

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
		 * Get lat and lng values for given address
		 *
		 * @parameter {string} - address to search for
		 * @parameter {string} - index of current entry in array
		 * @parameter {array} - array that contains addresses
		 *
		 */
		getLatLng: function(address, index, array) {
			var url = this.geocodeUrl + "address=" + unWrap(address)  + "&key="+ this.geocodeKey,
				curArray = unWrap(array), // get value regardless if observeable or not
				curLoc = curArray[index];
			var xhr = $.getJSON(url, function(data) {
				console.log("status: %s", data.status);
				if(data.status === "OK") {
					var latValue = data.results[0].geometry.location.lat, 
						lngValue =data.results[0].geometry.location.lng;
					if (  isObservable(curLoc.coords) ){
						curLoc.coords({ lat : latValue, lng: lngValue});
					} else {
						curLoc.coords = { lat : latValue, lng: lngValue};
					}
					console.log("index: ", index + "  coords: ",curLoc.coords());
				} else {
					console.log("Error getting Lat and Lng of " + address);
					toastr.error('Error getting Lat and Lng of ' + address);
				}

			}).fail(function() {
				console.log("ERROR, can't get location!!!, Google Geocoding api not available");
				toastr.error('ERROR, can\'t get location!!!, Google Geocoding api not available')
			});

			// 'promise' me it will work ;)
			xhr.then(function () {
				toastr.info('Finishe ajax call for coords...!!!');
				console.log("currentLoc: %o", curLoc);
				fourSquare.getInfo(curLoc);
				
			});

		},
		/**
		 *
		 *
		 *
		 */
		retrieveCoord : function (arrLocations) {
			arrLocations.forEach(function(locObj, index, locations) {
				// include locations array in call...must be a better way....
				mapRelated.getLatLng(locObj.address, index, arrLocations); // can't use 'locations'
			});
		},
		displayMarkers : function (arrLocations) {
			arrLocations.forEach(function(locObj, index, locations) {
				// only add markers for those that have lat/lng coords
				// TODO: is there a better/more efficient way to do this check?
				// if ( typeof locObj.coords() === 'object'){
				// 	// mapRelated.addMarker(locObj);
				// 	locObj.marker = mapRelated.addMarker(locObj);

				// 	// extend map bounds to include new marker
				// 	 bounds.extend (locObj.marker.getPosition());

				// 	//THIS WAS A PAIN, FINALLY FIGURED OUT THE CLOSURE PROBLEM!!!
				// 	locObj.marker.addListener('click', (function(curLocation) {
		    		    
		  //   		    return function () {

		  //   		    	var curMarker = curLocation.marker,
		  //   		    		curContent = mapRelated.createContent(curLocation);

		  //   		    	// close any marker window and stop animation on any marker that may be open
		  //   		    	mapRelated.closeMarkers();

		  //   		    	// set clicked flag
		  //   		    	curLocation.clicked(true);
		    		    	
		  //   		    	// move to clicked marker
		  //   		    	map.setZoom(16);
		  //   		    	map.panTo(curMarker.getPosition());

		  //   		    	// get content for infowindow
		  //   		    	mapRelated.attachContent(curMarker, curContent );

		    		   		
		  //   		    	// animate on click
		  //   		    	if (curMarker.getAnimation() === null) {
		  //   		    	    //open infowindow
		  //   		    		infowindow.open(curMarker.get('map'), curMarker)
				// 				curMarker.setAnimation(google.maps.Animation.BOUNCE);
		  //   		    	}
		  //   		    };
		  //   		})(locObj));

		  //   		map.fitBounds(bounds);

				// }
				mapRelated.displayMarker(locObj);
			});
		},

		displayMarker : function (locObj) {
			if ( typeof locObj.coords() === 'object'){
				// mapRelated.addMarker(locObj);
				locObj.marker = mapRelated.addMarker(locObj);

				// extend map bounds to include new marker
				 bounds.extend (locObj.marker.getPosition());

				//THIS WAS A PAIN, FINALLY FIGURED OUT THE CLOSURE PROBLEM!!!
				locObj.marker.addListener('click', (function(curLocation) {
	    		    
	    		    return function () {

	    		    	var curMarker = curLocation.marker,
	    		    		curContent = mapRelated.createContent(curLocation);

	    		    	// close any marker window and stop animation on any marker that may be open
	    		    	mapRelated.closeMarkers();

	    		    	// set clicked flag
	    		    	curLocation.clicked(true);
	    		    	
	    		    	// move to clicked marker
	    		    	map.setZoom(16);
	    		    	map.panTo(curMarker.getPosition());

	    		    	// get content for infowindow
	    		    	mapRelated.attachContent(curMarker, curContent );

	    		   		
	    		    	// animate on click
	    		    	if (curMarker.getAnimation() === null) {
	    		    	    //open infowindow
	    		    		infowindow.open(curMarker.get('map'), curMarker)
							curMarker.setAnimation(google.maps.Animation.BOUNCE);
	    		    	}
	    		    };
	    		})(locObj));

	    		map.fitBounds(bounds);
			}
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
				name = unWrap(loc.name),
				options = {
					position: coords,
					animation: google.maps.Animation.DROP,
					map: map,
					place: {query: name, location: coords},
					icon: "/img/beer-icon.png"
				};

			// add marker object to location entry
			// loc.marker = new google.maps.Marker(options);
			marker = new google.maps.Marker(options);

			return marker
		},
		addGroupMarkers: function(markersArray) {
			var bounds = new google.maps.LatLngBounds();
			for(i=0;i<markers.length;i++) {
			 bounds.extend(markers[i].getPosition());
			}
			map.fitBounds(bounds);
		},
		createContent: function(loc) {
			var name = unWrap(loc.name),
				area = unWrap(loc.area),
				description = unWrap(loc.description),
				fsUrl = unWrap(loc.fsUrl),
				fsCheckins = unWrap(loc.fsCheckins),
				fsRatings = unWrap(loc.fsRatings),
				fsLikes = unWrap(loc.fsLikes),
				fsPhotos = unWrap(loc.fsPhotos),
				output='';

			output += '<div class=\'clearfix info-window\'>';
			output += name 			? '<h2>' + name + '<\/h2>' : '';
			output += area 			? '<h5>' + area + '<\/h5>' : '';
			output += description 	? '<p>' + description + '<\/p>' : '';
			output += fsCheckins 	? '<h4>Check Ins: ' + fsCheckins + '<\/h4>' : '';
			output += fsRatings 	? '<h4>Rating: ' + fsRatings + '<\/h4>' : '';
			output += fsLikes 	? '<h4>Likes: ' + fsLikes + '<\/h4>' : '';
			output += fsUrl 		? '<a href="' + fsUrl + '">' + fsUrl + '<\/p>' : '';
			// if ( fsPhotos.length > 0){
			// 	output += this.getPhotos();
			// }
			output += fsPhotos 		? this.getPhotos(fsPhotos) : '';
			output += '<\/div>';
			return output;
    	},
    	getPhotos : function (photos) {

    		var photoStr = '<ul>';

    		photos.forEach( function (photo, index, photos) {
    			photoStr +=  '<li><img src=" ' + photo.prefix + photo.small + photo.suffix + '"></li>';
    		})

    		photoStr += '</ul>';

    		return photoStr;
    	},
    	attachContent: function(marker, details) {
    		infowindow.setContent( details );
    	},
    	// stop animation and close infowindow for marker
    	closeMarkers: function() {
    		infowindow.close();
    		map.fitBounds(bounds);
    		// model.locations.forEach(function(locObj, index, locations) {
    		vm.breweryLocations().forEach(function(locObj, index, locations) {
    			// if locations a marker on map
    			if ( locObj.marker){
    				locObj.marker.setAnimation(null);
    				locObj.clicked(false);
    			}
    		});
    	}
	}

// *--------------------------------------------------------------------*
//			                   fourSquare Object
//
// https://developer.foursquare.com/docs/venues/search
// *--------------------------------------------------------------------*


	var fourSquare = {
		// m=swarm give me access to url, m=foursquare does not
		url: 'https://api.foursquare.com/v2/venues/',
		search: 'search?v=20160110&m=swarm&limit=1',
		client_id: '&client_id=ZD4WOTN3K1HFKA1NUFAFXEFADANVJAJZNX3JBBWLXAYP5B0Y',
		client_secret: '&client_secret=QA2FPVXGUP3FPVKMVNDY3BXBKKXZGB4OOFX5DJJRD1BM2NUW',

		getInfo: function (loc) {
			var coords = unWrap(loc.coords);

			// TODO: is there a better way to check if we have lat/lng??
			// only make ajax call if have Ltn/Lng AND need id, url, or Name
			if ( typeof coords === 'object' && !($.isEmptyObject(coords)) ) {
				var lat = unWrap(coords.lat),
					lng = unWrap(coords.lng);

				var ll = '&ll=' + lat + ',' + lng,
					query = '&query=' + unWrap(loc.name),
					fsUrl = this.url + this.search + this.client_id + this.client_secret + ll + query;

				// only make ajax call if we need id, name, or url
				if ( !loc.fsId() || !loc.fsUrl() || !loc.fsName() ){
					var xhr = $.getJSON(fsUrl, function(data) {
						console.log("data: %o", data);

						if (data.response.venues[0]){
							var fsId = data.response.venues[0].id,
								fsUrl = data.response.venues[0].url,
								fsName = data.response.venues[0].name;
								

							if ( loc.fsId() === undefined){ loc.fsId(fsId)}
							if ( loc.fsUrl() === undefined){ loc.fsUrl(fsUrl)}
							if ( loc.fsName() === undefined){ loc.fsName(fsName)}

							console.log("update location: %o", loc);
						} else {
							console.log("no FourSquare data for this location");
							toastr.error('can\'t find FourSquare Data',unWrap(loc.name),{timeOut: 0});
						}
					
					}).fail(function() {
						console.log("ERROR, can't communicate properly with FourSquare API");

						toastr.error('Can\'t communicate properly with FourSquare API', 'FourSquare', {timeOut: 0});
					});

					// get details after getting ID for venue
					xhr.then(function () {
					toastr.success('SECOND THEN from ajax call for coords...!!!');
					fourSquare.getDetails(loc);
				});
				}
			} else {
				toastr.error('Don\'t have valid Lat/Lng to get FourSquare Data', unWrap(loc.name), {timeOut: 0,"preventDuplicates": false});
			}
		},
		/**
		 * Ajax call for location with FourSquare ID to get details, such as likes, ratings, photos.
		 * This call should be made every time to make sure we get latest stats.
		 *
		 * @parameter {object}  loc - location object
		 *
		 */
		getDetails: function (loc) {
			var id = unWrap(loc.fsId),
				fsUrl = this.url + id + '/?v=20151122' + this.client_id + this.client_secret;

			if ( id ){
				$.getJSON(fsUrl, function(data) {
					console.log("data: %o", data);

					if (data.response.venue){
						var fsLikes = data.response.venue.likes.count,
							fsRating = data.response.venue.rating,
							fsCheckins = data.response.venue.stats.checkinsCount,
							fsPhotos;

							// always update stats/pics below
							loc.fsCheckins(fsCheckins)
							loc.fsRating(fsRating);
							loc.fsLikes(fsLikes);

						// if ( fsPhotos.length > 0){ 
							
							data.response.venue.photos.groups[0].items.forEach(function (photo) {
								loc.fsPhotos.push({
												"prefix" : photo.prefix,
												"suffix" : photo.suffix,
												"small"  : "200x200",
												"med"    : "700x700",
												"large"  : "1200x1200"
										});
								console.log("pushed to photos array: %o", photo);
							});
						// }
						
						console.log("update location DETAILS: %o", loc);
					} else {
						console.log("no FourSquare data for this location");
						toastr.error('can\'t find FourSquare Data',unWrap(loc.name),{timeOut: 0});
					}
					
				}).fail(function() {
					console.log("ERROR, can't communicate properly with FourSquare API");
					toastr.error('Can\'t communicate properly with FourSquare API', 'FourSquare', {timeOut: 0});
				});
			} else {
				toastr.error('Don\'t have valid foursquare ID to get Detail Data', unWrap(loc.name), {timeOut: 0,"preventDuplicates": false});
			}
		},
		/**
		 * loop through all locations to get Foursquare detials
		 *
		 * 
		 *
		 */
		 getAllDetails: function () {
		 	vm.breweryLocations().forEach(function(locObj, index, locations) {
		 		if ( unWrap(locObj.fsId) ){
		 			fourSquare.getDetails(locObj);
		 		}
			});
		 },
		init: function () {
			vm.breweryLocations().forEach(function(locObj, index, locations) {
				fourSquare.getInfo(locObj);
			});
		}
	}
	

	
	var vm = new ViewModel();
// *****************************
	// fourSquare.init();

	// fo testing in console, expose through app namespace
	app.model = model;
	app.mapRelated = mapRelated;
	app.fourSquare = fourSquare;
	app.infowindow = infowindow;
	app.vm = vm;
// *******************************
	
	ko.applyBindings(vm);


})( window.app || (window.app = {}), window);

 /* Features:
	click on a marker animates, will stop when click on map, another icon, or self again.

	show all icons within map bounds, 




*/

