/* app.js
 * This file provides the detais for the map application.
 *
 * TODO: more description


FourSquare Owner
JAVIER SALAZAR
Client id
ZD4WOTN3K1HFKA1NUFAFXEFADANVJAJZNX3JBBWLXAYP5B0Y
Client secret
QA2FPVXGUP3FPVKMVNDY3BXBKKXZGB4OOFX5DJJRD1BM2NUW

https://api.foursquare.com/v2/venues/search?v=20151122&m=swarm&client_id=ZD4WOTN3K1HFKA1NUFAFXEFADANVJAJZNX3JBBWLXAYP5B0Y&client_secret=QA2FPVXGUP3FPVKMVNDY3BXBKKXZGB4OOFX5DJJRD1BM2NUW&ll=33.1160146,-117.1198876&query=Stone Brewery
 TODO: remove 'app' prefix to model, only have it for testing after running from console.


 *
 *
 */


/**
 * Keep variables off global space
 *
 */
(function (app, window) {
	var map;
	var infowindow;
	var bounds;
	var firebase = new Firebase("https://p5.firebaseIO.com/locations");

	Array.prototype.getIndexBy = function (name, value) {
	    for (var i = 0; i < this.length; i++) {
	        if (this[i][name] == value) {
	            return i;
	        }
	    }
	    return -1;
	};

	var model = {
		init: function () {

			firebase.once("value", function (snapshot) {
				// if firebase db is empty initialize with model.locations
				if( !snapshot.hasChildren()){
					console.log("Does not have children");
					model.locations.forEach(function (brewery) {
						// firebase.push(brewery);
						model.add(brewery);
						console.log("pushed to firebase: %o", brewery);
					});
				} else {
					console.log("on value triggered with children");
				}
			})

		},
		locations: [
			{
				name: "Stone Brewing Co.",
				address: "1999 Citracado Parkway, Escondido, CA 92029",
				area: "North County",
				description: "Stone Description goes here..."
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
				name: "Nickel Beer",
				address: "1485 Hollow Glen Road, Julian, CA 92036",
				area: "North County"
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
		centeredAt: {
			lat: 33.1958333, 
			lng: -117.3786111
		},
		add: function(obj) {
			// add new entry into locations
			return firebase.push(obj);
		},
		/*
			* id = id of entry in lisnt
			* obj = contains obj of changes to make
			*
		*/
		update: function (id, obj) {

			var entryRef = firebase.child(id);

			return entryRef(obj);
			
		},
		remove: function(obj) {
			// remove entry from locations
		},
		// array of locations areas
		getAreas: function (array) {
			var newArray = [];
			newArray = array.map(function (item) {
				// body...
				if (item.area){
					return item.area;
				}
			});
			return newArray;
		},
		getUniques: function (array) {
			// body...
			var newArray = [];
			newArray = array.filter(function(item, i, ar){ 
				return ar.indexOf(item) === i; 
			});
			return newArray;
		}
	};


	// Location constructor
	var Brewery = function (data) {
		this.id = data.id;
		
		this.address = ko.observable(data.address);
		this.coords = ko.observable(data.coords);
		this.area = ko.observable(data.area);
		this.description = ko.observable(data.description);
		this.name = ko.observable(data.name);
		this.photos = ko.observableArray(data.photos);
		// Keeps track of when the item is clicked.
		this.clicked = ko.observable(false);
		// The item is intially displayed on screen upon load.
		this.display = ko.observable(true);
		//four square related
		this.fsId = data.fsId;
		this.fsName = data.fsName;
		this.fsUrl = data.fsUrl;
		this.fsCheckins = data.fsCheckins;
		this.name = ko.observable(data.name);
	}


// *----- viewModel -------*

	var ViewModel = function() {

		// keep reference to viewModel even when context changes
		var self = this;

		self.searchVal = ko.observable('');
		self.breweryLocations = ko.observableArray();

		firebase.on('child_added', function (snapshot) {
			// The callback function will get called for every location
			console.log("top key is: ", snapshot.key());
			// snapshot.val() will be the object for each snapshot
			console.log("top data: %o ", snapshot.val());
			var brewery = snapshot.val();
			// add id in brewery object
			brewery.id =  snapshot.key();
			self.breweryLocations.push(new Brewery(brewery));

			console.log("currrentl brewery list: %o", self.breweryLocations());

			// need to progogate any changes done on the firebase db down to the observable array
			snapshot.ref().on("value", function(valueSnap) {
				//initial read OR added new entry to locations
	            if (valueSnap.val()) {
	                var currentBreweryIndex = self.breweryLocations().getIndexBy("id", brewery.id);
	                
	                valueSnap.forEach(function(childSnapshot) {
	                	// key will be name of key, such as name, address, etc.
	                	var key = childSnapshot.key();
	                	// val will be the value for the key, such as "stone brewery" for name, etc.
	                	var val = childSnapshot.val();

	                	// update an observable property
	                	if ( ko.isObservable(self.breweryLocations()[currentBreweryIndex][key]) ){
	                		self.breweryLocations()[currentBreweryIndex][key](val);
	                	// update an NON-observable property
	                	} else {
	                		console.log("updated value NOT observable...");
	                		self.breweryLocations()[currentBreweryIndex][key] = val ;
	                	}
	                });
	            //if valueSnap.val() == null means it was removed, so remove from observable array    
	            } else {  
	            	console.log("value removed, brewery: %o", brewery);
	                self.removeBrewery(brewery.id);
	            }
	        });

			ko.utils.arrayForEach(self.breweryLocations(), function(brewery) {
		        for (var property1 in brewery) {

		        	(function(property){
			            if (brewery.hasOwnProperty(property)) {
	 						// check if current property is observable. only subscribe to observables since non-observables will
			            	// only be read values coming from firebase db
			            	if ( ko.isObservable(brewery[property]) ){
			            		
			            		console.log("OBSERVEABLE: "+ property + " : " + brewery[property]());
			            		
			            		brewery[property].subscribe( function(newVal){

		     						var obj = {};
		     						obj[property] = newVal;
		     						console.log("obj; %o", obj);
		     						var brewRef = firebase.child(brewery.id);
		     						brewRef.update(obj);
		            			});
			            	
			            	} else {
			            		console.log("NOT OBS " + property );
			            	}
			            }
			        })(property1);

		        }
		    });

		});

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
       	self.areaSelected = ko.observableArray(self.areaList());

       	self.removeBrewery = function (id) {
       	    self.breweryLocations.remove(function(brewery) {
       	        return brewery.id == id;
       	    });

       	};

       	self.subFire = function () {
       					
			ko.utils.arrayForEach(self.breweryLocations(), function(brewery) {
		        for (var property1 in brewery) {

		        	(function(property){
			            if (brewery.hasOwnProperty(property)) {
	 						// check if current property is observable. only subscribe to observables since non-observables will
			            	// only be read values coming from firebase db
			            	if ( ko.isObservable(brewery[property]) ){
			            		
			            		console.log("OBSERVEABLE: "+ property + " : " + brewery[property]());
			            		
			            		brewery[property].subscribe( function(newVal){
		     						console.log("susbcribing  " + property + " : " + newVal);

		            			});
			            	
			            	} else {
			            		console.log("NOT OBS " + property );
			            	}
			            }
			        })(property1);

		        }
		    });

       	}

       	self.subscribeTo = function (propery, val ) {
       		
       	}

       	// to be efficient we show/hide elements by using visible: binding
       	// instead of generating an array each time we search for breweries
       	self.checkSearch = function(index) {
       		var brewery = self.breweryLocations()[index];
			var searchString = self.searchVal().toLowerCase();
			var breweryName = brewery.name().toLowerCase();
			var breweryArea = (brewery.area() && brewery.area().toLowerCase()) || '';
			var marker = model.locations[index].marker;

			// console.log("name: %o", brewery);
			// console.log("searchString: %s", searchString);

			// checking for both name and area since we display those on the list...
			if(breweryName.indexOf(searchString) > -1 || breweryArea.indexOf(searchString) > -1 || searchString.length === 0) {
				brewery.display(true);
				if(marker != null) {
					marker.setMap(map);
					// marker.setVisible(true);
				}
			} else {
				brewery.display(false);
				if(marker != null) {
					marker.setMap(null);
					// maker.setVisible(false);
				}
			}
			
			// after setting the value return value so view 'visible' binding knows whether its true or false
			return brewery.display();
		};       	
	};

	// Initalizes the map
	var mapRelated = {
		geocodeKey :"AIzaSyDPNZ81nXvNN-ZT7P97zwfmwtC398njJT4",
		geocodeUrl : "https://maps.googleapis.com/maps/api/geocode/json?",
		// initial view of map. Initially we want to show ALL locations
		// later as we filter we will simply hide/show the markers rather
		// than removing/adding them, using the 'marker.setMap()' function 
		init: function() {
			// Map center determined by global variable

			var mapOptions = {
				center: model.centeredAt,
				scrollwheel:false,
				zoom: 16,
				styles: [{"featureType":"administrative","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"landscape","elementType":"all","stylers":[{"visibility":"simplified"},{"hue":"#0066ff"},{"saturation":74},{"lightness":100}]},{"featureType":"poi","elementType":"all","stylers":[{"visibility":"simplified"}]},{"featureType":"road","elementType":"all","stylers":[{"visibility":"simplified"}]},{"featureType":"road.highway","elementType":"all","stylers":[{"visibility":"on"},{"weight":0.6},{"saturation":-85},{"lightness":61}]},{"featureType":"road.highway","elementType":"geometry","stylers":[{"visibility":"on"}]},{"featureType":"road.arterial","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"road.local","elementType":"all","stylers":[{"visibility":"on"}]},{"featureType":"transit","elementType":"all","stylers":[{"visibility":"simplified"}]},{"featureType":"water","elementType":"all","stylers":[{"visibility":"simplified"},{"color":"#5f94ff"},{"lightness":26},{"gamma":5.86}]}]
			};

			map = new google.maps.Map(document.getElementById('map'), mapOptions);
			bounds = new google.maps.LatLngBounds ();
			infowindow = new google.maps.InfoWindow();
			




			//map all locations initially

/**************			
			model.locations.forEach(function(locObj, index, locations) {

				// check to see if we need to get lat/lng coordinates
				if (locObj.coords === undefined) {
					// console.log ("address: %s", locObj.address);
					// mapRelated.getLatLng(locObj.address, index);

					locObj.coords = mapRelated.getLatLng2(locObj.address);
					console.log("test");
				}

				// only add markers for those that have lat/lng coords
				// TODO: is there a better/more efficient way to do this check?
				if ( locObj.coords !== undefined){
					mapRelated.addMarker(locObj);

					// extend map bounds to include new marker
					 bounds.extend (locObj.marker.getPosition());

					//THIS WAS A PAIN, FINALLY FIGURED OUT THE CLOSURE PROBLEM!!!
					locObj.marker.addListener('click', (function(curLocation) {
		    		    
		    		    return function () {

		    		    	mapRelated.closeMarkers();

		    		    	var curMarker = curLocation.marker,
		    		    		curContent = mapRelated.createContent(curLocation);
		    		    	
		    		    	// move to clicked marker
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
			});
*********/




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
		},

		/**
		 *  address = address 
		 *	index = current entry in location list
		 */
		getLatLng: function(address, index) {
			var url = this.geocodeUrl + "address=" + address  + "key="+ this.geocodeKey,
				curLoc = model.locations[index];
			var myCoords = $.getJSON(url, function(data) {
				console.log("status: %s", data.status);
				if(data.status === "OK") {
					var latValue = data.results[0].geometry.location.lat, 
						lngValue =data.results[0].geometry.location.lng;

					curLoc.coords = { lat : latValue, lng: lngValue};
					// console.log("index: ", index + "  coords: ",curLoc.coords);
				} else {
					console.log("Error getting Lat and Lng of " + address);
				}

			}).fail(function() {
				console.log("ERROR, can't get location!!!, Google Geocoding api not available");
			});

		},
		getLatLng2: function(address) {
			var url = this.geocodeUrl + "address=" + address  + "key="+ this.geocodeKey;
			var myCoords;

			$.getJSON(url, function(data) {
				console.log("status: %s", data.status);
				if(data.status === "OK") {
					var latValue = data.results[0].geometry.location.lat, 
						lngValue =data.results[0].geometry.location.lng;

					myCoords =  { lat : latValue, lng: lngValue};
					// console.log("index: ", index + "  coords: ",curLoc.coords);
				} else {
					console.log("Error getting Lat and Lng of " + address);
				}

				// return myCoords;

			}).fail(function() {
				console.log("ERROR, can't get location!!!, Google Geocoding api not available");
			});

			return myCoords;

		},
		addMarker: function(loc) {
			var options = {
				position: loc.coords,
				animation: google.maps.Animation.DROP,
				map: map,
				place: {query: loc.name, location: loc.coords},
				icon: "/img/beer-icon.png"
			};

			
			// add marker object to location entry
			loc.marker = new google.maps.Marker(options);
		},
		addGroupMarkers: function(markersArray) {
			var bounds = new google.maps.LatLngBounds();
			for(i=0;i<markers.length;i++) {
			 bounds.extend(markers[i].getPosition());
			}
			map.fitBounds(bounds);
		},
		createContent: function(loc) {
			name = loc.name || '';
			area = loc.area || '';
			description = loc.description || '';
			var output="";
			output += "<div class=\"clearfix info-window\">";
			output += "  <h2>" + name+ "<\/h2>";
			output += "  <h5>" + area + "<\/h5>";
			output += "  <p>" + description + "<\/p>";
			output += "<\/div>";
			return output;
    	},
    	attachContent: function(marker, details) {
    		infowindow.setContent( details );
    	},
    	// stop animation and close infowindow for marker
    	closeMarkers: function() {
    		infowindow.close();
    		map.fitBounds(bounds);
    		model.locations.forEach(function(locObj, index, locations) {
    			// if locations a marker on map
    			if ( locObj.marker){
    				locObj.marker.setAnimation(null);
    			}
    		});
    	}
	}

// https://developer.foursquare.com/docs/responses/photo
	var fourSquare = {
		// m=swarm give me access to url, m=foursquare does not
		url: 'https://api.foursquare.com/v2/venues/search?v=20160110&m=swarm',
		client_id: '&client_id=ZD4WOTN3K1HFKA1NUFAFXEFADANVJAJZNX3JBBWLXAYP5B0Y',
		client_secret: '&client_secret=QA2FPVXGUP3FPVKMVNDY3BXBKKXZGB4OOFX5DJJRD1BM2NUW',

		getInfo: function (loc) {
			if ( ("coords" in loc) && ("lat" in loc.coords) && ("lng" in loc.coords) ){
				var lat = loc.coords.lat,
				lng = loc.coords.lng;

				var ll = '&ll=' + loc.coords.lat + ',' + loc.coords.lng,
					query = '&query=' + loc.name,
					fsUrl = this.url + this.client_id + this.client_secret + ll + query;

				$.getJSON(fsUrl, function(data) {
					console.log("data: %o", data);

					if (data.response.venues[0]){
						var fsId = data.response.venues[0].id,
							fsUrl = data.response.venues[0].url,
							fsName = data.response.venues[0].name;

						if ( loc.fsId === undefined){ loc.fsId = fsId}
						if ( loc.fsUrl === undefined){ loc.fsUrl = fsUrl}
						if ( loc.fsName === undefined){ loc.fsName = fsName}

						console.log("update location: %o", loc);
					} else {
						console.log("no FourSquare data for this location");
					}
					
				}).fail(function() {
					console.log("ERROR, can't communicate properly with FourSquare API");
				});
			}
		},

		init: function () {
			model.locations.forEach(function(locObj, index, locations) {
				fourSquare.getInfo(locObj);
			});
		}
	}
	

	vm = new ViewModel();
// *****************************
	fourSquare.init();

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

