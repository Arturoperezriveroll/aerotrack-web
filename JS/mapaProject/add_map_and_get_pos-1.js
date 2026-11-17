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
    center: [-90.53, 19.84], // Approximate Campeche map view; not a user location.
    zoom: 6.5
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
// Keep map controls away from the information rail in landscape mode.
mapboxMap.addControl(geolocateControl, 'top-left');

var navControl = new mapboxgl.NavigationControl();
mapboxMap.addControl(navControl, 'top-left');

let mapResizeFrame = null;
function resizeMapForViewport() {
  if (mapResizeFrame !== null) cancelAnimationFrame(mapResizeFrame);
  mapResizeFrame = requestAnimationFrame(() => {
    mapResizeFrame = null;
    mapboxMap.resize();
  });
}
window.addEventListener('resize', resizeMapForViewport);
window.addEventListener('orientationchange', resizeMapForViewport);

// Privacy: geolocation is never requested automatically. The user must
// explicitly select the location control or start Track Path.

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
// Update pathCoordinates with the new location
pathCoordinates.push([currentLocation.lng, currentLocation.lat]);

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
});

