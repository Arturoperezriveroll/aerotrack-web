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

const altitudeText = Number.isFinite(altitude) ? `${altitude.toFixed(0)} m` : '';
console.log(`Current location set: Latitude: ${currentLocation.lat}, Longitude: ${currentLocation.lng}, Acc: ${currentLocation.acc}, gpsAlt: ${altitudeText}`);

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

// Display latitude, longitude, accuracy, and altitude.
const posInfo = document.getElementById('posInfo');
const posParts = [
  `<span><strong>POS</strong> ${currentLocation.lat.toFixed(2)}, ${currentLocation.lng.toFixed(2)}</span>`,
  `<span><strong>ACC</strong> ${currentLocation.acc.toFixed(0)} m</span>`,
  altitudeText ? `<span><strong>ALT</strong> ${altitudeText}</span>` : ''
].filter(Boolean);

if (posInfo) {
  posInfo.innerHTML = posParts.join('');
}

// Call the function to update the polyline on the map
//updatePolyline(); //this f is commented bc it is being called since the beginning and I dont want the blue line printed since the beginning
updateDistanceFromCurrent(currentLocation);
console.log("Global lat: ", lat," Global lng: ", lng);
});

