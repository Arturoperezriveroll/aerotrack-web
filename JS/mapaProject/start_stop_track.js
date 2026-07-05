var marker = null;
var watchId = null;
let tripPathCoordinates = [];
let tripLastPos = null;
let tripTotalDistance = 0;
      
var markerElement = document.createElement('div');
markerElement.innerHTML = '<svg style="position: relative; height="30" width="20"><polygon points="0,30 10,0 20,30" style="fill:lime;stroke:purple;stroke-width:1" /></svg>';

// f para iniciar la linea de trayectoria de viaje. Se resetea la dist a 0. 
function startTracking() {
  if (navigator.geolocation && watchId === null) {
    tripPathCoordinates = [];
    tripLastPos = null;
    tripTotalDistance = 0;
    currentLocation = null;

    // Optional: Remove previous trip path if exists
    //if (mapboxMap.getSource('tripPath')) {
    //  mapboxMap.removeLayer('tripPath');
    //  mapboxMap.removeSource('tripPath');
    //}

    watchId = navigator.geolocation.watchPosition(function(position) {
      const pos = [
        position.coords.longitude,
        position.coords.latitude,
        position.coords.altitude,
        position.coords.accuracy,
        position.coords.heading,
        position.coords.speed
      ];

      if (!tripLastPos || tripLastPos[0] !== pos[0] || tripLastPos[1] !== pos[1]) {
        tripPathCoordinates.push(pos);

        if (tripLastPos) {
          const from = turf.point(tripLastPos);
          const to = turf.point(pos);
          const options = { units: 'kilometers' };
          const distance = turf.distance(from, to, options);
          tripTotalDistance += distance;
        }

        tripLastPos = pos;
        console.log("📍 Added new trip point:", pos);

        // Update total trip distance display
        document.getElementById('distance').textContent = tripTotalDistance.toFixed(3);
      }

      if (tripPathCoordinates.length >= 2) {
        const tripPathData = {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: tripPathCoordinates
          }
        };

        if (!mapboxMap.getSource('tripPath')) {
          console.log("🧵 Creating new trip path source and layer");
          mapboxMap.addSource('tripPath', {
            type: 'geojson',
            data: tripPathData
          });

          mapboxMap.addLayer({
            id: 'tripPath',
            type: 'line',
            source: 'tripPath',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#ff0000',
              'line-width': 5
            }
          });
        } else {
          console.log("🔄 Updating trip path data");
          mapboxMap.getSource('tripPath').setData(tripPathData);
        }
      }

    }, function(error) {
      console.log("❌ Geolocation error:", error);
    }, {
      enableHighAccuracy: true,
      maximumAge: 0
    });
    console.log("🚀 Trip tracking started: trip path and distance reset.");
    return true;
  }

  return watchId !== null;
}

function stopTracking() {
  if (navigator.geolocation && watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;

    if (tripPathCoordinates.length > 1) {
      saveTripToCSV();  // ⬅️ Save the trip FIRST!
    } else {
      console.log("ℹ️ No significant trip to save.");
    }

    lastPos = null;
    totalDistance = 0;
    tripPathCoordinates = [];

    if (marker) {
      marker.remove();
      marker = null;
    }

    if (mapboxMap.getLayer('tripPath')) {
      mapboxMap.removeLayer('tripPath');
      mapboxMap.removeSource('tripPath');
    }

    console.log("🛑 Trip tracking stopped and reset.");
    return true;
  }

  return watchId === null;
}

function updateTrackingButton() {
  const trackingButton = document.getElementById('startTracking');
  if (!trackingButton) {
    return;
  }

  const isRecording = watchId !== null;
  trackingButton.textContent = isRecording ? 'Stop Recording' : 'Record Path';
  trackingButton.setAttribute('aria-pressed', String(isRecording));
  trackingButton.classList.toggle('is-active', isRecording);
}

function toggleTracking() {
  if (watchId === null) {
    startTracking();
  } else {
    stopTracking();
  }

  updateTrackingButton();
}

const trackingButton = document.getElementById('startTracking');
if (trackingButton) {
  trackingButton.addEventListener('click', toggleTracking);
  updateTrackingButton();
}
console.log(pathCoordinates);

// función para analizar algunos valores con los datos del vuelo, como max alt, min alt, etc.
function analyzeTrip() {
  let totalAltitude = 0;
  let minAltitude = Infinity;
  let maxAltitude = -Infinity;
  let count = 0;

  for (const coord of tripPathCoordinates) {
    const alt = coord[2]; // Altitude is the third element

    if (alt !== undefined && !isNaN(alt)) {
      totalAltitude += alt;
      minAltitude = Math.min(minAltitude, alt);
      maxAltitude = Math.max(maxAltitude, alt);
      count++;
    }
  }

  const averageAltitude = count > 0 ? totalAltitude / count : null;

  return {
    averageAltitude: averageAltitude ? averageAltitude.toFixed(2) : null,
    minAltitude: minAltitude !== Infinity ? minAltitude.toFixed(2) : null,
    maxAltitude: maxAltitude !== -Infinity ? maxAltitude.toFixed(2) : null
  };
}

function saveTripToCSV() {
  if (tripPathCoordinates.length === 0) {
    console.log("⚠️ No trip data to save.");
    return;
  }

  let csvContent = "Longitude,Latitude,Altitude,Heading,Speed\n"; // CSV header

  tripPathCoordinates.forEach(coord => {
    // coord[0] = Longitude, coord[1] = Latitude, coord[2] = Altitude
    csvContent += `${coord[0]},${coord[1]},${coord[2]},${coord[4]},${coord[5]}\n`;
  });

  // Create a Blob object
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  // Create a download link
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  const fileName = `trip_${year}-${month}-${day}_${hours}${minutes}.csv`;

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log(`💾 Trip saved as CSV: ${fileName}`);
}


function saveTripToFile() {
  const altitudeStats = analyzeTrip();

  const geojson = {
    type: "FeatureCollection",
    crs: {   // Manually add CRS for ArcGIS
      type: "name",
      properties: {
        name: "EPSG:4326"
      }
    },
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: tripPathCoordinates
        },
        properties: {
          name: "Recorded Trip",
          created: new Date().toISOString(),
          total_distance_km: tripTotalDistance.toFixed(2),
          average_altitude_m: altitudeStats.averageAltitude,
          min_altitude_m: altitudeStats.minAltitude,
          max_altitude_m: altitudeStats.maxAltitude
        }
      }
    ]
  };

  // Create dynamic file name
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  const fileName = `trip_${year}-${month}-${day}_${hours}${minutes}.geojson`;

  const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log(`💾 Trip saved as GeoJSON: ${fileName}`);
}
