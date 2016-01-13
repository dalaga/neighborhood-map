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
	model = {
		locations: [
			{
				name: "Stone Brewing Co.",
				address: "1999 Citracado Parkway, Escondido, CA 92029",
				coords: {lat: 33.1160146, lng: -117.1198876},
				area: "North County",
				description: "Stone Description goes here..."
			},
			{
				name: "Oceanside Ale Works",
				address: "1800 Ord Way, Oceanside, CA 92056",
				coords: {lat: 33.2113331, lng: -117.2731069}
			},
			{
				name: "Ballast Point",
				address: "10051 Old Grove Rd, San Diego, CA 92131",
				coords: {lat: 32.8985298, lng: -117.1108975}
			},
			{
				name: "Green Flash",
				address: "6550 Mira Mesa Blvd, San Diego, CA 92121",
				coords: {lat: 32.9070566, lng: -117.1777777}
			},
			{
				name: "Iron Fist",
				address: "1305 Hot Springs Way, Vista, CA 92081"			},
			{
				name: "Mad Lab Craft Brewing",
				address: "6120 Business Center CT,San Diego, CA 92154",
				coords: {lat: 32.5697451, lng: -117.003081}
			},
			{
				name: "Nickel Beer",
				address: "1485 Hollow Glen Road, Julian, CA 92036"
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
				coords: {lat: 32.6978177, lng: -117.1732552}
			}
		],
		centeredAt: {
			lat: 33.1958333, 
			lng: -117.3786111
		},
		add: function(obj) {
			// add new entry into locations
		},
		remove: function(obj) {
			// remove entry from locations
		}
	};


	var ViewModel = function() {

		// keep reference to viewModel even when context changes
		var self = this;
	};


	ko.applyBindings(new ViewModel());


	// Initalizes the map
	app.mapRelated = {
		geocodeKey :"AIzaSyDPNZ81nXvNN-ZT7P97zwfmwtC398njJT4",
		geocodeUrl : "https://maps.googleapis.com/maps/api/geocode/json?",
		// initial view of map
		init: function() {
			// Map center determined by global variable

			var mapOptions = {
				center: model.centeredAt,
				scrollwheel:false,
				zoom: 11,
				styles: [{"featureType":"administrative","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"landscape","elementType":"all","stylers":[{"visibility":"simplified"},{"hue":"#0066ff"},{"saturation":74},{"lightness":100}]},{"featureType":"poi","elementType":"all","stylers":[{"visibility":"simplified"}]},{"featureType":"road","elementType":"all","stylers":[{"visibility":"simplified"}]},{"featureType":"road.highway","elementType":"all","stylers":[{"visibility":"on"},{"weight":0.6},{"saturation":-85},{"lightness":61}]},{"featureType":"road.highway","elementType":"geometry","stylers":[{"visibility":"on"}]},{"featureType":"road.arterial","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"road.local","elementType":"all","stylers":[{"visibility":"on"}]},{"featureType":"transit","elementType":"all","stylers":[{"visibility":"simplified"}]},{"featureType":"water","elementType":"all","stylers":[{"visibility":"simplified"},{"color":"#5f94ff"},{"lightness":26},{"gamma":5.86}]}]
			};

			map = new google.maps.Map(document.getElementById('map'), mapOptions);
			
			model.locations.forEach(function(locObj, index, locations) {

				// check to see if we need to get lat/lng coordinates
				if (locObj.coords === undefined) {
					console.log ("address: %s", locObj.address);
					app.mapRelated.getLatLng(locObj.address, index);
				}

				// only add markers for those that have lat/lng coords
				if ( locObj.coords !== undefined){
					app.mapRelated.addMarker(locObj);

					var infoContent = app.mapRelated.createContent(locObj.name, locObj.area)
					app.mapRelated.attachContent(locObj, infoContent );

				}  

			});


			// EVENT LISTENERS

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
					console.log("index: ", index + "  coords: ",curLoc.coords);
				} else {
					console.log("Error getting Lat and Lng of " + address);
				}

			}).fail(function() {
				console.log("ERROR, can't get location!!!, Google Geocoding api not available");
			});

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
			loc.infowindow = new google.maps.InfoWindow();
		},
		createContent: function(name, area, description) {

			name = name || '';
			area = area || '';
			description = description || '';
	       var output="";
	       output += "<div class=\"clearfix info-window\">";
	       output += "  <h2>" + name+ "<\/h2>";
	       output += "  <h5>" + area + "<\/h5>";
	       output += "  <p>" + description + "<\/p>";
	       output += "<\/div>";
	       return output;
    	},
    	attachContent: function(location, details) {
    		var marker = location.marker,
    			infowindow = location.infowindow;
    		infowindow.setContent( details );

    		marker.addListener('click', function() {
    		    infowindow.open(marker.get('map'), marker)
    		 });
    	},
    	closeOtherInfoWindows: function(location) {
    		
    	}
	}
		
	
		app[model] = model;
	

})( window.app || (window.app = {}), window);