let aircraftMarkers = [];  // Save a reference to all markers
let trackingInterval = null;  // Reference to the tracking interval
let selectedAircraft = null;

// Define your three center points
// Define your three center points
const centerPoints = [
  {lat: 21, lon: -89.5},  // replace these with your actual coordinates
  {lat: 30, lon: 40},
  {lat: 50, lon: 60},
];

// a partir de aquí EMPIEZA EL CODIGO PARA OBTENER INFORMACION DE LAS AERONAVES
// Modify your updateAircraft function to take a center parameter
function updateAircraft(center) {
  // Remove all previous aircraft markers
  for (let i = 0; i < aircraftMarkers.length; i++) {
    aircraftMarkers[i].remove();
  }
  aircraftMarkers = [];
  // Now check if a center was provided
  if (center) {
    fetchDataAndAddMarkers(center.lat, center.lon);
  } else {
    navigator.geolocation.getCurrentPosition(
      function(position) {
        // Extract latitude and longitude from the position object
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        fetchDataAndAddMarkers(latitude, longitude);
      },
      function(error) {
        // Handle any errors occurred while getting the geolocation
        console.error("Error occurred while getting geolocation", error);
      }
    );
  }
}


function fetchDataAndAddMarkers(latitude, longitude) {
  const xhr = new XMLHttpRequest();
  xhr.withCredentials = true;

  xhr.addEventListener('readystatechange', function () {
    if (this.readyState === this.DONE) {
      const data = JSON.parse(this.responseText);
      console.log(data);  // Output the response data to the console

      const aircraftData = data.ac;  // Assuming the aircraft data is in a property called 'ac'
      // Remove all previous aircraft markers
      for (let i = 0; i < aircraftMarkers.length; i++) {
        aircraftMarkers[i].remove();
      }
      aircraftMarkers = [];

// Add a marker for each aircraft
for (let i = 0; i < aircraftData.length; i++) {
  const aircraft = aircraftData[i];
  const pos = [aircraft.lon, aircraft.lat]; // Assuming the aircraft data includes 'lon' and 'lat' properties
  const flight = aircraft.flight && aircraft.flight !== "Unknown" ? aircraft.flight : "";
  const type = aircraft.t ? aircraft.t : "Unknown";
  const gs = aircraft.gs ? Math.floor(aircraft.gs) : "Unknown";
  const reg = aircraft.r ? aircraft.r : "Unknown";
  const squawk = aircraft.squawk ? aircraft.squawk : "Unknown";
  // Assuming the aircraft data includes 'track' and 'dst' properties
  const heading = aircraft.track ? String(aircraft.track.toFixed(0)).padStart(3, '0') : "Unknown";
  const distance = aircraft.dst ? aircraft.dst : "Unknown";

  // Assuming 'track' is a property of 'aircraft' and is in degrees
  const track = aircraft.track;
  const flightInfo = flight ? '<div class="popup-content">' + flight +'<br>' : '<div class="popup-content">';
  const typeInfo = type !== "Unknown" ? ' ' + type + '<br>'  : '';
  const distanceInNM = Math.floor(aircraft.dst);
  const distanceInfo = aircraft.dst ? + distanceInNM + 'NM' + '</div>' : '';
  const regInfo = reg !== "" ? '<div class="popup-content">' + reg : '';
  const squawkInfo = squawk !== "Unknown" ? ' ' + squawk + '</div>' : '';
  const altbaro = aircraft.alt_baro;

  let altbaroInfo;
  if (altbaro === 'ground') {
    altbaroInfo = '<div class="popup-content">GND';
  } else if (altbaro) {
    altbaroInfo = '<div class="popup-content">' + 'F' + String(Math.floor(altbaro / 100)).padStart(3, '0');
  } else {
  altbaroInfo = 'Unknown';
  }
  const gsInfo = gs !== "Unknown" ? ' N' + gs + '</div>' : '';

  // Prepare the heading and distance information for the popup
  const headingInfo = heading ? '<div class="popup-content">'+'H'+ heading+'</div>' : '' ;

  // Create a HTML element for the marker's popup
  const popup = new mapboxgl.Popup({ offset: 10 })
  .setHTML(flightInfo + typeInfo + distanceInfo);

// Create a custom marker for aircraft icon
  let el = document.createElement('div');
  el.className = 'marker';
  el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 24 24" width="30px" height="30px"> <path fill="yellow" stroke="black" stroke-width="1" d="M 12 2 A 2 2 0 0 0 10 4 L 10 9.0039062 L 2 14 L 2 16 L 10 13.507812 L 10 19.003906 L 8 20.5 L 8 22 L 12 21 L 16 22 L 16 20.5 L 14 19.003906 L 14 13.507812 L 22 16 L 22 14 L 14 9.0039062 L 14 4 A 2 2 0 0 0 12 2 z"/></svg>';
  el.style.width = '20px';  // Adjust 
  el.style.height = '30px';  // Adjust
  el.style.backgroundSize = 'cover'; 

    // Create the marker with the popup and set attributes and run methods
    const marker = new mapboxgl.Marker(el, { 
      pitchAlignment: 'map', // This line makes the marker tilt with the map
      rotationAlignment: 'auto' }) // Use the custom marker
      .setLngLat(pos)
      .setPopup(popup) // sets a popup on this marker
      .setRotation(track) // rotates the marker
      .addTo(mapboxMap)
      .togglePopup(); // Open the popup

    // Add a click event listener to the marker
    marker.getElement().addEventListener("click", () => {
      selectedAircraft = aircraft; // Store the selected aircraft
      updateAircraftDetails(aircraft); // Update the aircraft details div
      onAircraftClick(aircraft);
    });

    aircraftMarkers.push(marker);
  }
}

// Function to update the aircraft details in the aircraftDetails div
function updateAircraftDetails(aircraft) {
  const aircraftDetailsDiv = document.getElementById("aircraftDetails");
  const flight = aircraft.flight && aircraft.flight !== "Unknown" ? aircraft.flight : "";
  const type = aircraft.t ? aircraft.t : "Unknown";
  const gs = aircraft.gs ? Math.floor(aircraft.gs) : "Unknown";
  const reg = aircraft.r ? aircraft.r : "Unknown";
  const squawk = aircraft.squawk ? aircraft.squawk : "Unknown";
  const altbaro = aircraft.alt_baro;
  let altbaroInfo;

  if (altbaro === 'ground') {
    altbaroInfo = 'GND';
  } else if (altbaro) {
    altbaroInfo = 'F' + String(Math.floor(altbaro / 100)).padStart(3, '0');
  } else {
    altbaroInfo = 'Unknown';
  }

    // Extract the 'hex' property from the aircraft data
    const hex = aircraft.hex ? aircraft.hex : "Unknown";
    const altgeom = aircraft.alt_geom ? aircraft.alt_geom : "Unknown";

  // Prepare the HTML content for the aircraft details
  const aircraftInfo = `
      <div class="popup-infoContent">FN: ${flight}</div>
      <div class="popup-infoContent">AC: ${type}</div>
      <div class="popup-infoContent">GS: ${gs}N</div>
      <div class="popup-infoContent">FL: ${altbaroInfo}</div>
      <div class="popup-infoContent">Alt GPS: ${altgeom}</div>
      <div class="popup-infoContent">REG: ${reg}</div>
      <div class="popup-infoContent">Hex: ${hex}</div>  <!-- New data point -->
      <div class="popup-infoContent">Squawk: ${squawk}</div>
  `;

  // Update the content of the aircraftDetails div
  aircraftDetailsDiv.innerHTML = aircraftInfo;
}
});

   // Use the latitude and longitude in the API request
   xhr.open('GET', `https://adsbexchange-com1.p.rapidapi.com/v2/lat/${latitude}/lon/${longitude}/dist/300/`);
      xhr.setRequestHeader('X-RapidAPI-Key', 'd7b91b8f4cmshcac9d1ff6f0bfe9p1df759jsn8692821b5ddc');
      xhr.setRequestHeader('X-RapidAPI-Host', 'adsbexchange-com1.p.rapidapi.com');

      xhr.send(null);
    }

// Button to start tracking
document.getElementById('startTrackingFlights').addEventListener('click', function () {
  // Update aircraft data every 30 seconds
  if (!trackingInterval) {
    trackingInterval = setInterval(updateAircraft, 30000);
  }
});

// Button to stop tracking
document.getElementById('stopTrackingFlights').addEventListener('click', function () {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;

    // Remove all markers when stop tracking
    for (let i = 0; i < aircraftMarkers.length; i++) {
      aircraftMarkers[i].remove();
    }
    aircraftMarkers = [];
  }
});