let aircraftMarkers = [];
let trackingInterval = null;
let selectedAircraft = null;
let isTrafficLoading = false;

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

function getTrafficToggleButton() {
  return document.getElementById('startTrackingFlights');
}

function isTrafficVisible() {
  return Boolean(trackingInterval || aircraftMarkers.length);
}

function setTrafficToggleState(isActive, isLoading = false) {
  const button = getTrafficToggleButton();
  if (!button) return;

  button.disabled = isLoading;
  button.setAttribute('aria-pressed', String(isActive));
  button.classList.toggle('is-active', isActive);
  button.classList.toggle('is-loading', isLoading);
  button.textContent = isLoading
    ? 'Loading...'
    : isActive
      ? 'Hide Traffic'
      : 'Show Traffic';
}

function stopTrafficTracking(message = 'Air traffic removed.') {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }

  clearAircraftMarkers();
  setTrafficToggleState(false);
  setTrafficStatus(message, 'info');
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

function hasValue(value) {
  return value !== undefined
    && value !== null
    && value !== ''
    && value !== 'Unknown'
    && value !== 'unknown';
}

function cleanText(value) {
  if (!hasValue(value)) return '';
  return String(value).trim();
}

function getAircraftLabel(aircraft) {
  const flight = cleanText(aircraft.flight) || cleanText(aircraft.hex) || 'Aircraft';
  const altitude = aircraft.alt_baro === 'ground'
    ? 'GND'
    : aircraft.alt_baro
      ? `F${String(Math.floor(aircraft.alt_baro / 100)).padStart(3, '0')}`
      : '';
  const speed = aircraft.gs ? `N${Math.floor(aircraft.gs)}` : '';

  return [flight, altitude, speed].filter(Boolean).join(' ');
}

function getAircraftPopupHtml(aircraft) {
  const flight = cleanText(aircraft.flight) || cleanText(aircraft.hex) || 'Aircraft';
  const type = cleanText(aircraft.t);
  const distance = Number.isFinite(aircraft.dst) ? `${Math.floor(aircraft.dst)} NM` : '';
  const altitude = aircraft.alt_baro === 'ground'
    ? 'GND'
    : aircraft.alt_baro
      ? `F${String(Math.floor(aircraft.alt_baro / 100)).padStart(3, '0')}`
      : '';
  const speed = aircraft.gs ? `${Math.floor(aircraft.gs)} kt` : '';
  const heading = Number.isFinite(aircraft.track)
    ? `TRK ${String(aircraft.track.toFixed(0)).padStart(3, '0')}`
    : '';
  const performanceLine = [altitude, speed].filter(Boolean).join(' / ');
  const navLine = [heading, distance].filter(Boolean).join(' / ');

  return `
    <div class="aircraft-popup">
      <strong>${flight}</strong>
      ${type ? `<span>${type}</span>` : ''}
      ${performanceLine ? `<span>${performanceLine}</span>` : ''}
      ${navLine ? `<span>${navLine}</span>` : ''}
    </div>
  `;
}

function updateAircraftDetails(aircraft) {
  selectedAircraft = aircraft;

  const aircraftDetailsDiv = document.getElementById('aircraftDetails');
  if (!aircraftDetailsDiv) return;

  const flight = cleanText(aircraft.flight);
  const type = cleanText(aircraft.t);
  const gs = aircraft.gs ? `${Math.floor(aircraft.gs)} kt` : '';
  const reg = cleanText(aircraft.r);
  const squawk = cleanText(aircraft.squawk);
  const hex = cleanText(aircraft.hex);
  const altGeom = hasValue(aircraft.alt_geom) ? aircraft.alt_geom : '';
  const altitude = aircraft.alt_baro === 'ground'
    ? 'GND'
    : aircraft.alt_baro
      ? `F${String(Math.floor(aircraft.alt_baro / 100)).padStart(3, '0')}`
      : '';

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
      const markerElement = document.createElement('div');
      markerElement.className = 'aircraft-marker';
      markerElement.setAttribute('role', 'button');
      markerElement.setAttribute('tabindex', '0');
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

      let lastMarkerActivation = 0;
      const activateMarker = (event) => {
        const now = Date.now();
        if (now - lastMarkerActivation < 250) return;
        lastMarkerActivation = now;

        event.preventDefault();
        event.stopPropagation();
        updateAircraftDetails(aircraft);
        marker.togglePopup();
      };

      markerElement.addEventListener('pointerdown', activateMarker);
      markerElement.addEventListener('click', activateMarker);
      markerElement.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          activateMarker(event);
        }
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
    return true;
  } catch (error) {
    console.error(error);
    clearAircraftMarkers();
    setTrafficStatus(error.message, 'error');
    return false;
  }
}

document.getElementById('startTrackingFlights').addEventListener('click', function () {
  if (isTrafficLoading) return;

  if (isTrafficVisible()) {
    stopTrafficTracking();
    return;
  }

  isTrafficLoading = true;
  setTrafficToggleState(false, true);

  updateAircraft()
    .then((loaded) => {
      if (!loaded) {
        setTrafficToggleState(false);
        return;
      }

      if (!trackingInterval) {
        trackingInterval = setInterval(updateAircraft, TRAFFIC_REFRESH_MS);
      }
      setTrafficToggleState(true);
    })
    .catch(() => {
      setTrafficToggleState(false);
    })
    .finally(() => {
      isTrafficLoading = false;
    });
});

setTrafficToggleState(false);
