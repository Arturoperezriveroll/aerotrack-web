let aircraftMarkers = [];
let trackingInterval = null;
let selectedAircraft = null;

const TRAFFIC_REFRESH_MS = 30000;
const TRAFFIC_RADIUS_NM = 300;
const TRAFFIC_API_HOST = 'adsbexchange-com1.p.rapidapi.com';

function setTrafficStatus(message, type = 'info') {
  const aircraftDetailsDiv = document.getElementById('aircraftDetails');
  if (!aircraftDetailsDiv) return;

  aircraftDetailsDiv.innerHTML = `<div class="traffic-status traffic-status-${type}">${message}</div>`;
}

function clearAircraftMarkers() {
  aircraftMarkers.forEach(marker => marker.remove());
  aircraftMarkers = [];
}

function getTrafficSearchCenter() {
  if (typeof currentLocation !== 'undefined' && currentLocation) {
    return { lat: currentLocation.lat, lon: currentLocation.lng, source: 'GPS' };
  }

  if (typeof mapboxMap !== 'undefined' && mapboxMap?.getCenter) {
    const center = mapboxMap.getCenter();
    return { lat: center.lat, lon: center.lng, source: 'map center' };
  }

  return { lat: 21, lon: -89.5, source: 'default' };
}

function getAircraftLabel(aircraft) {
  const flight = aircraft.flight && aircraft.flight.trim() && aircraft.flight !== 'Unknown'
    ? aircraft.flight.trim()
    : aircraft.hex || 'Unknown';
  const altitude = aircraft.alt_baro === 'ground'
    ? 'GND'
    : aircraft.alt_baro
      ? `F${String(Math.floor(aircraft.alt_baro / 100)).padStart(3, '0')}`
      : '';
  const speed = aircraft.gs ? `N${Math.floor(aircraft.gs)}` : '';

  return [flight, altitude, speed].filter(Boolean).join(' ');
}

function getAircraftPopupHtml(aircraft) {
  const flight = aircraft.flight && aircraft.flight.trim() ? aircraft.flight.trim() : 'Unknown';
  const type = aircraft.t || 'Unknown';
  const distance = Number.isFinite(aircraft.dst) ? `${Math.floor(aircraft.dst)} NM` : 'Unknown';
  const altitude = aircraft.alt_baro === 'ground'
    ? 'GND'
    : aircraft.alt_baro
      ? `F${String(Math.floor(aircraft.alt_baro / 100)).padStart(3, '0')}`
      : 'Unknown';
  const speed = aircraft.gs ? `${Math.floor(aircraft.gs)} kt` : 'Unknown';
  const heading = aircraft.track ? `${String(aircraft.track.toFixed(0)).padStart(3, '0')} deg` : 'Unknown';

  return `
    <div class="aircraft-popup">
      <strong>${flight}</strong>
      <span>${type}</span>
      <span>${altitude} / ${speed}</span>
      <span>TRK ${heading} / ${distance}</span>
    </div>
  `;
}

function updateAircraftDetails(aircraft) {
  selectedAircraft = aircraft;

  const aircraftDetailsDiv = document.getElementById('aircraftDetails');
  if (!aircraftDetailsDiv) return;

  const flight = aircraft.flight && aircraft.flight.trim() ? aircraft.flight.trim() : 'Unknown';
  const type = aircraft.t || 'Unknown';
  const gs = aircraft.gs ? `${Math.floor(aircraft.gs)} kt` : 'Unknown';
  const reg = aircraft.r || 'Unknown';
  const squawk = aircraft.squawk || 'Unknown';
  const hex = aircraft.hex || 'Unknown';
  const altGeom = aircraft.alt_geom || 'Unknown';
  const altitude = aircraft.alt_baro === 'ground'
    ? 'GND'
    : aircraft.alt_baro
      ? `F${String(Math.floor(aircraft.alt_baro / 100)).padStart(3, '0')}`
      : 'Unknown';

  aircraftDetailsDiv.innerHTML = `
    <div class="aircraft-detail-grid">
      <div><span>FN</span><strong>${flight}</strong></div>
      <div><span>AC</span><strong>${type}</strong></div>
      <div><span>GS</span><strong>${gs}</strong></div>
      <div><span>FL</span><strong>${altitude}</strong></div>
      <div><span>GPS ALT</span><strong>${altGeom}</strong></div>
      <div><span>REG</span><strong>${reg}</strong></div>
      <div><span>HEX</span><strong>${hex}</strong></div>
      <div><span>SQUAWK</span><strong>${squawk}</strong></div>
    </div>
  `;
}

function addAircraftMarkers(aircraftData) {
  clearAircraftMarkers();

  aircraftData
    .filter(aircraft => Number.isFinite(aircraft.lat) && Number.isFinite(aircraft.lon))
    .forEach(aircraft => {
      const markerElement = document.createElement('button');
      markerElement.type = 'button';
      markerElement.className = 'aircraft-marker';
      markerElement.setAttribute('aria-label', getAircraftLabel(aircraft));
      markerElement.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2a2 2 0 0 0-2 2v5L2 14v2l8-2.5V19l-2 1.5V22l4-1 4 1v-1.5L14 19v-5.5l8 2.5v-2l-8-5V4a2 2 0 0 0-2-2Z"/>
        </svg>
      `;

      const popup = new mapboxgl.Popup({
        className: 'aircraft-mapbox-popup',
        closeButton: false,
        offset: 16
      }).setHTML(getAircraftPopupHtml(aircraft));

      const marker = new mapboxgl.Marker(markerElement, {
        pitchAlignment: 'map',
        rotationAlignment: 'map'
      })
        .setLngLat([aircraft.lon, aircraft.lat])
        .setPopup(popup)
        .setRotation(Number.isFinite(aircraft.track) ? aircraft.track : 0)
        .addTo(mapboxMap);

      markerElement.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        updateAircraftDetails(aircraft);
        marker.togglePopup();
      });

      aircraftMarkers.push(marker);
    });

  setTrafficStatus(`${aircraftMarkers.length} aircraft displayed. Updates every ${TRAFFIC_REFRESH_MS / 1000}s.`, 'success');
}

async function fetchTrafficData(latitude, longitude) {
  const apiKey = window.AEROTRACK_CONFIG?.adsbRapidApiKey;

  if (!apiKey) {
    throw new Error('Missing ADS-B RapidAPI key. Add adsbRapidApiKey to config.local.js or ADSB_RAPIDAPI_KEY in GitHub Secrets.');
  }

  const url = `https://${TRAFFIC_API_HOST}/v2/lat/${latitude}/lon/${longitude}/dist/${TRAFFIC_RADIUS_NM}/`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': TRAFFIC_API_HOST
    }
  });

  if (!response.ok) {
    throw new Error(`ADS-B request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function updateAircraft(center) {
  const searchCenter = center || getTrafficSearchCenter();
  setTrafficStatus(`Loading air traffic near ${searchCenter.source}...`, 'info');

  try {
    const data = await fetchTrafficData(searchCenter.lat, searchCenter.lon);
    const aircraftData = Array.isArray(data.ac) ? data.ac : [];
    addAircraftMarkers(aircraftData);
  } catch (error) {
    console.error(error);
    clearAircraftMarkers();
    setTrafficStatus(error.message, 'error');
  }
}

document.getElementById('startTrackingFlights').addEventListener('click', function () {
  updateAircraft();

  if (!trackingInterval) {
    trackingInterval = setInterval(updateAircraft, TRAFFIC_REFRESH_MS);
  }
});

document.getElementById('stopTrackingFlights').addEventListener('click', function () {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }

  clearAircraftMarkers();
  setTrafficStatus('Air traffic removed.', 'info');
});
