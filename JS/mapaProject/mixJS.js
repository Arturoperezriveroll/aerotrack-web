mapboxgl.accessToken = "";

const mapboxMap = new mapboxgl.Map({
  container: 'mapbox',
  style: 'mapbox://styles/arturoriverol/clmofit4704je01ma2d8fblkr',
  center: [-92.50, 15],
  zoom: 10
});

// Controls
const geolocateControl = new mapboxgl.GeolocateControl({
  positionOptions: { enableHighAccuracy: true },
  trackUserLocation: true,
  showUserHeading: true
});
mapboxMap.addControl(geolocateControl);
mapboxMap.addControl(new mapboxgl.NavigationControl(), 'top-right');

// Trigger geolocation on load
mapboxMap.on('load', () => geolocateControl.trigger());

// ðŸ”„ Global state
let isTracking = false;
let pathCoordinates = [];
let totalDistance = 0;
let lastPos = null;
let currentLocation = null;

// ðŸ›°ï¸ Geolocation updates
geolocateControl.on('geolocate', function(e) {
  const lat = e.coords.latitude;
  const lng = e.coords.longitude;
  const acc = e.coords.accuracy;
  const altitude = e.coords.altitude;
  const heading = e.coords.heading;
  const speed = e.coords.speed;
  const pos = [lng, lat];

  currentLocation = { lat, lng, acc };

  document.getElementById('coordinates').innerHTML =
    `Pos: ${lat.toFixed(2)}, ${lng.toFixed(2)}<br>` +
    `Acc: ${acc.toFixed()} m<br>` +
    `Alt: ${altitude?.toFixed(2) || 'N/A'} m`;

  if (isTracking) {
    // Calculate distance
    if (lastPos) {
      const from = turf.point(lastPos);
      const to = turf.point(pos);
      const distance = turf.distance(from, to, { units: 'kilometers' });
      totalDistance += distance;
    }

    lastPos = pos;
    pathCoordinates.push(pos);
    document.getElementById('distance').textContent = totalDistance.toFixed(2) + ' km';
    document.getElementById('heading').textContent = heading ? heading.toFixed(0) : 'N/A';
    document.getElementById('speed').textContent = speed ? `${(speed * 3.6 * 0.539957).toFixed(0)} KT` : 'N/A';
    document.getElementById('accuracy').textContent = acc ? acc.toFixed(2) + ' m' : 'N/A';

    // Update or create polyline
    if (!mapboxMap.getSource('path')) {
      mapboxMap.addSource('path', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: pathCoordinates
          }
        }
      });

      mapboxMap.addLayer({
        id: 'path',
        type: 'line',
        source: 'path',
        paint: {
          'line-color': 'blue',
          'line-width': 7
        }
      });
    } else {
      mapboxMap.getSource('path').setData({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: pathCoordinates
        }
      });
    }
  }
});

// â–¶ï¸ Start Tracking
function startTracking() {
  isTracking = true;
  pathCoordinates = [];
  totalDistance = 0;
  lastPos = null;

  if (mapboxMap.getLayer('path')) {
    mapboxMap.removeLayer('path');
    mapboxMap.removeSource('path');
  }

  console.log("Tracking started.");
}

// â¹ï¸ Stop Tracking
function stopTracking() {
  isTracking = false;
  pathCoordinates = [];
  totalDistance = 0;
  lastPos = null;

  if (mapboxMap.getLayer('path')) {
    mapboxMap.removeLayer('path');
    mapboxMap.removeSource('path');
  }

  document.getElementById('distance').textContent = '0 km';
  console.log("Tracking stopped and cleared.");
}

// ðŸ–±ï¸ Hook up buttons
document.getElementById('startTracking').addEventListener('click', startTracking);
document.getElementById('stopTracking').addEventListener('click', stopTracking);
