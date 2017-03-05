'use strict';

var init = {
    map : null,
    center : {
            lat: 51.1426889,
            lng: 8.2124054
        },
    drawMap : function(){

    /*
    *   first we ask the User for his permission for his location
    *   right after that we draw the map
    */
        user.getLocation();

        init.map = new google.maps.Map(document.getElementById('map'), {
            center: init.center,
            zoomControl: true,
            scrollwheel: false,
            zoom: 7
        });
        $(".spinner").hide(1300);
        /*
            *   we instanciate the fields as Autocomplete Objects and bind them to this map
            */
            inputFields.initiateAuto();
    }
};

(function(DB){

    DB.takeDBStations = function(){
        $.ajax({
            url : "http://opendata.dbbahnpark.info/api/beta/stations",
            type: "GET",
            dataType : "json",
            async: true,
            success : function(data){
                //console.log(data);
            },
            error : function(err){
                console.log(err);
            }

        });
    }();

    DB.takeDBParkings = function(){
        $.ajax({
            url : "http://opendata.dbbahnpark.info/api/beta/sites",
            type: "GET",
            dataType : "json",
            async: true,
            success : function(data){
                manipulate.fromParkhouses = data;
                DB.putMarkersParking(data.results);
            },
            error : function(err){
                console.log(err);
            }

        });
    }();

    DB.takeDBOccupancy = function(){
        $.ajax({
            url : "http://opendata.dbbahnpark.info/api/beta/occupancy",
            type: "GET",
            dataType : "json",
            async: true,
            success : function(data){
                //console.log(data)
            },
            error : function(err){
                console.log(err);
            }

        });
    }();

    DB.putMarkersParking = function(res){

        for(var i=0;i<res.length;i++){
            
            var parkLat     = parseFloat(res[i].parkraumGeoLatitude),
                parkLong    = parseFloat(res[i].parkraumGeoLongitude),
                name        = res[i].parkraumDisplayName,
                parkCoordinates = {
                    lat : parkLat,
                    lng : parkLong
                };

                var marker = new google.maps.Marker({
                        map: init.map ,
                        position: parkCoordinates,
                        title: name,
                        icon: "img/blue_MarkerP.png"
                });
        }
    };

    DB.putMarkerUser = function(coords){

        var markerUser = new google.maps.Marker({
                map: init.map ,
                position: coords,
                title: "My Position",
                icon: "img/male.svg"
        });
    };

})(this.DBCall = {});

/*
*   we will use the HTML5 Geolocation API for taking the position of the Agent (user or browser)
*
*   todo ********
*
*   as of Chrome 50, the Geolocation API will only work on secure contexts such as HTTPS
*   if the site is hosted on an non-secure origin (such as HTTP) the requests to get the users location will no longer function
*   for this reason i will test it now with Opera, Safari and Firefox
*/

var user = {
    coords : {},
    getLocation : function(){

        if ( navigator.geolocation ) {
            navigator.geolocation.getCurrentPosition(user.savePosition,showError);
        } else {
            console.log("Geolocation is not supported by this browser.");
        }

        function showError(error) {
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    alert("User denied the request for Geolocation.");
                    break;
                case error.POSITION_UNAVAILABLE:
                    alert("Location information is unavailable.");
                    break;
                case error.TIMEOUT:
                    alert("The request to get user location timed out.");
                    break;
                case error.UNKNOWN_ERROR:
                    alert("An unknown error occurred.");
                    break;
            }
        }
    },
    savePosition : function(position){
        if(position !== undefined){
            user.coords.lat  = position.coords.latitude;
            user.coords.lng = position.coords.longitude;

            console.log(user.coords);
            DBCall.putMarkerUser(user.coords);

            return user.coords;
        }

        return false;
    }
};
/*
*   in this literal Object we will play some more time as in the others
*   we will manipulate the data from parking places near train stations
*   we will show to the User the nearest train stations nearby him/her
*/
var manipulate = {
    fromParkhouses : null,
    countParksNearby : 0,
    findParkNearby : function(userPlace){

        console.log(userPlace);
        var userVicinity = userPlace.vicinity,
            userLocName = userPlace.name,
            results = manipulate.fromParkhouses.results,
            resLength = results.length,
            i = 0,
            j = 0;

        for(i; i < resLength; i++){
            var thisPlace = results[i],
                locName = results[i].parkraumBahnhofName;


                console.log(locName);

                if( locName.includes(userVicinity) || locName.includes(userLocName) ){
                    console.log(thisPlace);
                    manipulate.countParksNearby ++;
                }
        }
        manipulate.countParksNearby = 0;
    }
};

var inputFields = {
    /**
    *   first we have to initiate our Input Fields as instances of Autocomplete Google Mapi API
    */
    initiateAuto : function(){

    /*
    *   what I wrote here is it strongly inspired from Google Maps JavaScript API (i worked until now only one time with Google Maps)
    *   even like this TAKE A STRONG Cooffe and focus on this part and "manipulate" object also , in some places even me i will not totally understand what I do
    */
        var origin      = document.getElementById("origin"),
            destination = document.getElementById("destination"),
            origin_place_id = null,
            destination_place_id = null,
            autoOrigin  = new google.maps.places.Autocomplete(origin),
            autoDest    = new google.maps.places.Autocomplete(destination),
            driving_mode = google.maps.TravelMode.DRIVING,
            directionsService = new google.maps.DirectionsService,
            directionsDisplay = new google.maps.DirectionsRenderer;

    //  we place the input fields on the top of the map
            init.map.controls[google.maps.ControlPosition.TOP_LEFT].push(origin);
            init.map.controls[google.maps.ControlPosition.TOP_LEFT].push(destination);

            directionsDisplay.setMap(init.map);

            autoOrigin.bindTo('bounds', init.map);
            autoOrigin.addListener('place_changed', function() {
                var placeOrigin = autoOrigin.getPlace();
                    if (!placeOrigin.geometry) {
                      window.alert("Autocomplete's returned place contains no geometry");
                      return;
                    }
    //  we will send our "Location" (in this case placeOrigin) Object to Manipulate Object so we can show the User if he or she has Parkingplaces nearby him/her
    //  if we will make a "console.log()" for placeOrigin Object we can see that Google gives us all what we need for a location
    //  Adress Compontents that are saved in an Object array , Latitude and Longitude , Vecinity , State , PLZ, Street even an URL for that location and tel Number
                    manipulate.findParkNearby(placeOrigin);

    //  we will focus the viewport on the origin Place
                    inputFields.expandViewportToFitPlace(init.map, placeOrigin);

    // If the place has a geometry, store its place ID and route if we have
    // the other place ID

                    origin_place_id = placeOrigin.place_id;
                    inputFields.showTheRoute(origin_place_id, destination_place_id, driving_mode, directionsService, directionsDisplay);
            });

            autoDest.bindTo('bounds', init.map);
            autoDest.addListener('place_changed', function() {
                var placeDest = autoDest.getPlace();

                    if (!placeDest.geometry) {
                      window.alert("Autocomplete's returned place contains no geometry");
                      return;
                    }

                    inputFields.expandViewportToFitPlace(init.map, placeDest);

            // If the place has a geometry, store its place ID and route if we have
            // the other place ID
                    console.log(placeDest.place_id);
                    destination_place_id = placeDest.place_id;
                    inputFields.showTheRoute(origin_place_id, destination_place_id, driving_mode, directionsService, directionsDisplay);
            });
    },
    showTheRoute : function(orig,dest,travel_mode,dirService,dirDisplay){
        if (!orig || !dest) {
          return;
        }

        dirService.route(
            {
                origin: {'placeId': orig},
                destination: {'placeId': dest},
                travelMode: travel_mode
            },
            function(response, status) {
                if (status === google.maps.DirectionsStatus.OK) {
                    dirDisplay.setDirections(response);
                } else {
                    window.alert('Directions request failed due to ' + status);
                }
            }
        );
    },
    expandViewportToFitPlace : function(map,place){
        if (place.geometry.viewport) {
            map.fitBounds(place.geometry.viewport);
        } else {
            map.setCenter(place.geometry.location);
            map.setZoom(17);
        }
    }
};











