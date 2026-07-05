mapboxgl.accessToken = window.AEROTRACK_CONFIG?.mapboxAccessToken || "";

if (!mapboxgl.accessToken) {
  const mapboxContainer = document.getElementById('mapbox');
  if (mapboxContainer) {
    mapboxContainer.innerHTML = '<div class="mapbox-token-warning">Mapbox access token missing. Add it to config.local.js.</div>';
  }
  throw new Error('Mapbox access token missing. Add window.AEROTRACK_CONFIG.mapboxAccessToken in config.local.js.');
}

// var def lat,lng, currentLocation, accuracy, pathCoordinates,
// functions: updateDistanceFromCurrent,
var mapboxMap = new mapboxgl.Map({
    container: 'mapbox',
    style: window.AEROTRACK_CONFIG?.mapboxStyle || 'mapbox://styles/mapbox/outdoors-v12',
    center: [-92.50, 15], // starting position [lng, lat]
    zoom: 9 // starting zoom
});

// se crea geolocateControl 
var geolocateControl = new mapboxgl.GeolocateControl({
    positionOptions: {
        enableHighAccuracy: true
        },
    trackUserLocation: true,
    showUserHeading: true,
    fitBoundsOptions: {
      zoom: 18,      // no acercar mÃ¡s allÃ¡ de zoom 15
      linear: false      // transiciÃ³n lineal en lugar de vuelo curvado
  }
});
//se aÃ±ade al mapa el geolocate control
mapboxMap.addControl(geolocateControl);

var navControl = new mapboxgl.NavigationControl();
mapboxMap.addControl(navControl, 'top-right'); 

// Automatically trigger geolocation when the map loads
mapboxMap.on('load', function() {
    geolocateControl.trigger();
});

// Declare global variables for lng and lat
let lng, lat;
// Define currentLocation globally with a default value
let currentLocation = null;
var pathCoordinates = [];
let lastPos = null;
let totalDistance = 0;

geolocateControl.on('geolocate', function(e) {
    // Update global lng and lat variables with current coordinates
    lng = e.coords.longitude;
    lat = e.coords.latitude;
    acc = e.coords.accuracy;
    altitude = e.coords.altitude;
    currentLocation = { 
      lat: e.coords.latitude, 
      lng: e.coords.longitude, 
      acc: e.coords.accuracy,
      altitude : e.coords.altitude 
    };

const currentPos = [lng, lat];

if (lastPos) {
  const from = turf.point(lastPos);
  const to = turf.point(currentPos);
  const options = { units: 'kilometers' };
  const distance = turf.distance(from, to, options);
  totalDistance += distance;
}

lastPos = currentPos; // update the last position

console.log(`Current location set: Latitude: ${currentLocation.lat}, Longitude: ${currentLocation.lng}, Acc: ${currentLocation.acc}, gpsAlt: ${altitude}`);

// Update pathCoordinates with the new location
pathCoordinates.push([currentLocation.lng, currentLocation.lat]);
console.log("Past Track: " + pathCoordinates);

document.getElementById('distance').textContent = totalDistance.toFixed(3);

const heading = e.coords.heading;
document.getElementById('heading').textContent = heading !== null ? heading.toFixed(0) : 'StdBy';

const speed = e.coords.speed;
let speedKt = 'StdBy';

if (speed !== null) {
  const speedKmh = speed * 3.6;
  speedKt = (speedKmh * 0.539957).toFixed(0);
}

document.getElementById('speed').textContent = `${speedKt}`;

// Display latitude, longitude, and altitude in the coordinates div
document.getElementById('posInfo').innerHTML = 
  `Pos: ${currentLocation.lat.toFixed(2)}, ${currentLocation.lng.toFixed(2)}<br>` +
  `Acc: ${currentLocation.acc.toFixed()}<br>` + 
  `gpsAlt: ${altitude.toFixed(2)} m`;

// Call the function to update the polyline on the map
//updatePolyline(); //this f is commented bc it is being called since the beginning and I dont want the blue line printed since the beginning
updateDistanceFromCurrent(currentLocation);
console.log("Global lat: ", lat," Global lng: ", lng);
});

//se genera el marker de windsock
var svgCono = document.createElement('div');
svgCono.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 50 50" width="100px" height="100px" baseProfile="basic"><polygon fill="#a8a8a8" points="43,27.309 43,34.238 37,37.702 17,30.774 17,23.845 14,20.381 14,44.053 12,45.207 10,44.053 10,19.804 8,18.65 8,14.03 10,12.88 10,7.102 12,5.95 14,7.102 14,12.88 16,14.03 16,15.762 23.004,15.76 27,13.453"/><polygon fill="gray" points="12,16.34 12,20.959 16,18.649 16,14.03"/><polygon fill="#ccc" points="12,16.34 12,20.959 8,18.649 8,14.03"/><polygon fill="#737373" points="12,8.257 12,15.185 14,14.03 14,7.102"/><polygon fill="#ccc" points="12,8.257 12,15.185 10,14.03 10,7.102"/><polygon fill="#737373" points="12,20.959 12,45.207 14,44.053 14,19.804"/><polygon fill="#bababa" points="12,20.959 12,45.207 10,44.053 10,19.804"/><polygon fill="#a8a8a8" points="13,16.917 15,15.762 23,15.762 21,16.917"/><polygon fill="#ccc" points="21,16.917 13,16.917 13,19.227 17,23.845 17,21.536 15,19.227 17,19.226"/><polygon fill="#d94a4a" points="37,30.774 17,19.226 27,13.453 43,27.309"/><polygon fill="#ff5757" points="37,30.774 37,37.702 17,30.774 17,19.226"/><polygon fill="#b33d3d" points="43,27.309 43,34.238 37,37.702 37,30.774"/><polygon fill="#ff5757" points="38,31.351 42,29.041 42,33.66"/><polygon fill="#e64e4e" points="38,31.351 38,35.97 42,33.66"/><polygon fill="#ccc" points="21,21.536 21,32.158 25,33.543 25,23.845"/><polygon fill="#a8a8a8" points="25,23.845 33.399,18.996 30.2,16.224 21,21.536"/><polygon fill="#ccc" points="29,26.155 29,34.93 33,36.315 33,28.464"/><polygon fill="#a8a8a8" points="33,28.464 39.799,24.539 36.599,21.768 29,26.155"/></svg>';

var svgMarker = new mapboxgl.Marker(svgCono)
.setLngLat([-92.26, 14.9])
.addTo(mapboxMap);
