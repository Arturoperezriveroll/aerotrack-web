let aircraftMarkers = [];
let aircraftLabelMarkers = [];
let trackingInterval = null;
let testTrafficInterval = null;
let testTrafficElapsedSec = 0;
let selectedAircraft = null;
let isTrafficLoading = false;

const TRAFFIC_REFRESH_MS = 15000;
const TRAFFIC_RADIUS_NM = 300;
const TRAFFIC_API_HOST = 'adsbexchange-com1.p.rapidapi.com';
const TRAFFIC_CONFLICT_HORIZONTAL_NM = 5;
const TRAFFIC_CONFLICT_VERTICAL_FT = 1000;
const TRAFFIC_CONFLICT_LOOKAHEAD_SEC = 300;
const TRAFFIC_CONFLICT_STEP_SEC = 10;
const TEST_TRAFFIC_REFRESH_MS = 10000;
const TEST_TRAFFIC_INITIAL_DISTANCE_NM = 35;
const TEST_TRAFFIC_RESOLUTION_SEC = 60;
const TEST_TRAFFIC_RESOLUTION_ALTITUDE_FT = 33000;
const TEST_TRAFFIC_CENTER = { lat: 15.0, lon: -97.275 };
const EARTH_RADIUS_NM = 3440.0695;
const TRAFFIC_CONFLICT_SOURCE_ID = 'traffic-conflict-projections';
const TRAFFIC_CONFLICT_LAYER_ID = 'traffic-conflict-safe-line';
const TRAFFIC_CONFLICT_LOSS_LAYER_ID = 'traffic-conflict-loss-line';
const TRAFFIC_CONFLICT_SEPARATION_LAYER_ID = 'traffic-conflict-separation-line';
const TRAFFIC_CONFLICT_POINT_SOURCE_ID = 'traffic-conflict-points';
const TRAFFIC_CONFLICT_POINT_LAYER_ID = 'traffic-conflict-points-circle';
const TRAFFIC_CONFLICT_LABEL_LAYER_ID = 'traffic-conflict-points-label';

function setTrafficStatus(message, type = 'info') {
  const aircraftDetailsDiv = document.getElementById('aircraftDetails');
  if (!aircraftDetailsDiv) return;

  aircraftDetailsDiv.innerHTML = `<div class="traffic-status traffic-status-${type}">${message}</div>`;
}

function clearAircraftMarkers() {
  aircraftMarkers.forEach(marker => marker.remove());
  aircraftLabelMarkers.forEach(marker => marker.remove());
  aircraftMarkers = [];
  aircraftLabelMarkers = [];
  clearTrafficConflictLines();
}

function getTrafficToggleButton() {
  return document.getElementById('startTrackingFlights');
}

function getTrafficTestButton() {
  return document.getElementById('testTrafficConflict');
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
      ? 'Hide Web Traffic'
      : 'Show Web Traffic';
}

function setTrafficTestState(isActive) {
  const button = getTrafficTestButton();
  if (!button) return;

  button.setAttribute('aria-pressed', String(isActive));
  button.classList.toggle('is-active', isActive);
}

function stopTrafficTracking(message = 'Air traffic removed.') {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }

  if (testTrafficInterval) {
    clearInterval(testTrafficInterval);
    testTrafficInterval = null;
  }

  clearAircraftMarkers();
  setTrafficToggleState(false);
  setTrafficTestState(false);
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

function escapeHtml(value) {
  return cleanText(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function degToRad(degrees) {
  return degrees * Math.PI / 180;
}

function radToDeg(radians) {
  return radians * 180 / Math.PI;
}

function normalizeLongitude(degrees) {
  let result = (degrees + 180) % 360;
  if (result < 0) result += 360;
  return result - 180;
}

function distanceNm(pointA, pointB) {
  const lat1 = degToRad(pointA.lat);
  const lat2 = degToRad(pointB.lat);
  const dLat = degToRad(pointB.lat - pointA.lat);
  const dLon = degToRad(pointB.lon - pointA.lon);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const centralAngle = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return EARTH_RADIUS_NM * centralAngle;
}

function projectPoint(point, trackDeg, distanceNmValue) {
  const lat1 = degToRad(point.lat);
  const lon1 = degToRad(point.lon);
  const bearing = degToRad(trackDeg);
  const angularDistance = distanceNmValue / EARTH_RADIUS_NM;
  const sinLat1 = Math.sin(lat1);
  const cosLat1 = Math.cos(lat1);
  const sinDistance = Math.sin(angularDistance);
  const cosDistance = Math.cos(angularDistance);
  const lat2 = Math.asin(sinLat1 * cosDistance + cosLat1 * sinDistance * Math.cos(bearing));
  const lon2 = lon1 + Math.atan2(
    Math.sin(bearing) * sinDistance * cosLat1,
    cosDistance - sinLat1 * Math.sin(lat2)
  );

  return {
    lat: radToDeg(lat2),
    lon: normalizeLongitude(radToDeg(lon2))
  };
}

function getAircraftName(aircraft) {
  return cleanText(aircraft.flight) || cleanText(aircraft.hex) || 'Aircraft';
}

function isAircraftOnGround(aircraft) {
  if (aircraft.on_ground === true) return true;

  return [aircraft.alt_baro, aircraft.alt_geom, aircraft.airground]
    .some(value => {
      if (typeof value !== 'string') return false;
      const normalized = value.trim().toLowerCase().replace(/[\s_-]/g, '');
      return normalized === 'ground' || normalized === 'gnd' || normalized === 'onground';
    });
}

function getAircraftAltitudeFt(aircraft) {
  if (Number.isFinite(aircraft.alt_baro)) return aircraft.alt_baro;
  if (Number.isFinite(aircraft.alt_geom)) return aircraft.alt_geom;
  return null;
}

function getAircraftNominalAltitudeFt(aircraft) {
  const altitudeFt = getAircraftAltitudeFt(aircraft);
  return Number.isFinite(altitudeFt)
    ? Math.round(altitudeFt / 100) * 100
    : null;
}

function getTrafficState(aircraft) {
  const altitudeFt = getAircraftNominalAltitudeFt(aircraft);
  const groundSpeedKt = Number(aircraft.gs);

  if (isAircraftOnGround(aircraft) ||
      !Number.isFinite(aircraft.lat) ||
      !Number.isFinite(aircraft.lon) ||
      !Number.isFinite(altitudeFt) ||
      !Number.isFinite(groundSpeedKt) ||
      !Number.isFinite(aircraft.track) ||
      groundSpeedKt <= 0) {
    return null;
  }

  return {
    aircraft,
    lat: aircraft.lat,
    lon: aircraft.lon,
    altitudeFt,
    groundSpeedKt,
    trackDeg: aircraft.track
  };
}

function projectTrafficState(state, timeSec) {
  const distanceAheadNm = state.groundSpeedKt * timeSec / 3600;
  return projectPoint(
    { lat: state.lat, lon: state.lon },
    state.trackDeg,
    distanceAheadNm
  );
}

function getMidpoint(pointA, pointB) {
  return {
    lat: (pointA.lat + pointB.lat) / 2,
    lon: (pointA.lon + pointB.lon) / 2
  };
}

function formatUtcTimeFromNow(offsetSec) {
  const date = new Date(Date.now() + offsetSec * 1000);
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}:${String(date.getUTCSeconds()).padStart(2, '0')}Z`;
}

function getConflictProjectionFeatures(conflicts) {
  const features = [];

  conflicts.forEach((conflict, index) => {
    [conflict.aircraftA, conflict.aircraftB].forEach(aircraft => {
      const state = getTrafficState(aircraft);
      if (!state) return;

      const projectionTimeSec = TRAFFIC_CONFLICT_LOOKAHEAD_SEC;
      const lossStartSec = Math.max(0, Math.min(conflict.lossStartSec, projectionTimeSec));
      const lossEndSec = Math.max(lossStartSec, Math.min(conflict.lossEndSec, projectionTimeSec));
      const lossStartPoint = projectTrafficState(state, lossStartSec);
      const lossEndPoint = projectTrafficState(state, lossEndSec);
      const projectedPoint = projectTrafficState(state, projectionTimeSec);

      if (lossStartSec > 0) {
        features.push({
          type: 'Feature',
          properties: {
            featureType: 'trajectory-safe',
            conflictIndex: index,
            callsign: getAircraftName(aircraft)
          },
          geometry: {
            type: 'LineString',
            coordinates: [
              [state.lon, state.lat],
              [lossStartPoint.lon, lossStartPoint.lat]
            ]
          }
        });
      }

      if (lossEndSec > lossStartSec) {
        features.push({
          type: 'Feature',
          properties: {
            featureType: 'trajectory-conflict',
            conflictIndex: index,
            callsign: getAircraftName(aircraft)
          },
          geometry: {
            type: 'LineString',
            coordinates: [
              [lossStartPoint.lon, lossStartPoint.lat],
              [lossEndPoint.lon, lossEndPoint.lat]
            ]
          }
        });
      }

      if (lossEndSec < projectionTimeSec) {
        features.push({
          type: 'Feature',
          properties: {
            featureType: 'trajectory-safe',
            conflictIndex: index,
            callsign: getAircraftName(aircraft)
          },
          geometry: {
            type: 'LineString',
            coordinates: [
              [lossEndPoint.lon, lossEndPoint.lat],
              [projectedPoint.lon, projectedPoint.lat]
            ]
          }
        });
      }
    });

    if (Number.isFinite(conflict.cpaLatA) &&
        Number.isFinite(conflict.cpaLonA) &&
        Number.isFinite(conflict.cpaLatB) &&
        Number.isFinite(conflict.cpaLonB)) {
      features.push({
        type: 'Feature',
        properties: {
          featureType: 'separation',
          conflictIndex: index
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [conflict.cpaLonA, conflict.cpaLatA],
            [conflict.cpaLonB, conflict.cpaLatB]
          ]
        }
      });
    }
  });

  return features;
}

function getConflictPointFeatures(conflicts) {
  const features = [];

  conflicts.forEach((conflict, index) => {
    if (!Number.isFinite(conflict.convergenceLat) ||
        !Number.isFinite(conflict.convergenceLon) ||
        !Number.isFinite(conflict.cpaLatA) ||
        !Number.isFinite(conflict.cpaLonA) ||
        !Number.isFinite(conflict.cpaLatB) ||
        !Number.isFinite(conflict.cpaLonB)) {
      return;
    }

    [
      { lat: conflict.cpaLatA, lon: conflict.cpaLonA },
      { lat: conflict.cpaLatB, lon: conflict.cpaLonB }
    ].forEach(point => {
      features.push({
        type: 'Feature',
        properties: {
          featureType: 'position',
          conflictIndex: index
        },
        geometry: {
          type: 'Point',
          coordinates: [point.lon, point.lat]
        }
      });
    });

    features.push({
      type: 'Feature',
      properties: {
        featureType: 'label',
        conflictIndex: index,
        label: `CPA ${formatUtcTimeFromNow(conflict.timeSec)} / ${conflict.horizontalSepNm.toFixed(1)} NM`,
        detail: `${Math.round(conflict.timeSec)}s`
      },
      geometry: {
        type: 'Point',
        coordinates: [conflict.convergenceLon, conflict.convergenceLat]
      }
    });
  });

  return features;
}

function getEmptyFeatureCollection() {
  return {
    type: 'FeatureCollection',
    features: []
  };
}

function clearTrafficConflictLines() {
  if (typeof mapboxMap === 'undefined' || !mapboxMap?.getSource) return;

  try {
    [TRAFFIC_CONFLICT_SOURCE_ID, TRAFFIC_CONFLICT_POINT_SOURCE_ID].forEach(sourceId => {
      const source = mapboxMap.getSource(sourceId);
      if (source?.setData) {
        source.setData(getEmptyFeatureCollection());
      }
    });
  } catch (error) {
    console.warn('Unable to clear traffic conflict lines.', error);
  }
}

function updateTrafficConflictLines(conflicts, retryCount = 0) {
  if (typeof mapboxMap === 'undefined' || !mapboxMap?.getSource || !mapboxMap?.addSource) {
    if (retryCount < 12) {
      setTimeout(() => updateTrafficConflictLines(conflicts, retryCount + 1), 250);
    }
    return;
  }

  const data = {
    type: 'FeatureCollection',
    features: getConflictProjectionFeatures(conflicts)
  };
  const pointData = {
    type: 'FeatureCollection',
    features: getConflictPointFeatures(conflicts)
  };

  try {
    if (mapboxMap.getSource(TRAFFIC_CONFLICT_SOURCE_ID)) {
      mapboxMap.getSource(TRAFFIC_CONFLICT_SOURCE_ID).setData(data);
    } else {
      mapboxMap.addSource(TRAFFIC_CONFLICT_SOURCE_ID, {
        type: 'geojson',
        data
      });
    }

    if (mapboxMap.getSource(TRAFFIC_CONFLICT_POINT_SOURCE_ID)) {
      mapboxMap.getSource(TRAFFIC_CONFLICT_POINT_SOURCE_ID).setData(pointData);
    } else {
      mapboxMap.addSource(TRAFFIC_CONFLICT_POINT_SOURCE_ID, {
        type: 'geojson',
        data: pointData
      });
    }

    if (!mapboxMap.getLayer(TRAFFIC_CONFLICT_LAYER_ID)) {
      mapboxMap.addLayer({
        id: TRAFFIC_CONFLICT_LAYER_ID,
        type: 'line',
        source: TRAFFIC_CONFLICT_SOURCE_ID,
        filter: ['==', ['get', 'featureType'], 'trajectory-safe'],
        paint: {
          'line-color': '#f59e0b',
          'line-width': 3,
          'line-opacity': 0.9,
          'line-dasharray': [1.5, 1]
        }
      });
    }

    if (!mapboxMap.getLayer(TRAFFIC_CONFLICT_LOSS_LAYER_ID)) {
      mapboxMap.addLayer({
        id: TRAFFIC_CONFLICT_LOSS_LAYER_ID,
        type: 'line',
        source: TRAFFIC_CONFLICT_SOURCE_ID,
        filter: ['==', ['get', 'featureType'], 'trajectory-conflict'],
        paint: {
          'line-color': '#dc2626',
          'line-width': 4,
          'line-opacity': 1,
          'line-dasharray': [1.5, 1]
        }
      });
    }

    if (!mapboxMap.getLayer(TRAFFIC_CONFLICT_SEPARATION_LAYER_ID)) {
      mapboxMap.addLayer({
        id: TRAFFIC_CONFLICT_SEPARATION_LAYER_ID,
        type: 'line',
        source: TRAFFIC_CONFLICT_SOURCE_ID,
        filter: ['==', ['get', 'featureType'], 'separation'],
        paint: {
          'line-color': '#facc15',
          'line-width': 3,
          'line-opacity': 1
        }
      });
    }

    if (!mapboxMap.getLayer(TRAFFIC_CONFLICT_POINT_LAYER_ID)) {
      mapboxMap.addLayer({
        id: TRAFFIC_CONFLICT_POINT_LAYER_ID,
        type: 'circle',
        source: TRAFFIC_CONFLICT_POINT_SOURCE_ID,
        filter: ['==', ['get', 'featureType'], 'position'],
        paint: {
          'circle-radius': 6,
          'circle-color': '#facc15',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2
        }
      });
    }

    if (!mapboxMap.getLayer(TRAFFIC_CONFLICT_LABEL_LAYER_ID)) {
      mapboxMap.addLayer({
        id: TRAFFIC_CONFLICT_LABEL_LAYER_ID,
        type: 'symbol',
        source: TRAFFIC_CONFLICT_POINT_SOURCE_ID,
        filter: ['==', ['get', 'featureType'], 'label'],
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 13,
          'text-offset': [0, 1.4],
          'text-anchor': 'top',
          'text-allow-overlap': true
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#7f1d1d',
          'text-halo-width': 4,
          'text-halo-blur': 0.5
        }
      });
    }
  } catch (error) {
    if (retryCount < 12) {
      setTimeout(() => updateTrafficConflictLines(conflicts, retryCount + 1), 250);
      return;
    }

    console.warn('Unable to draw traffic conflict lines.', error);
  }
}

function refineSeparationCrossing(stateA, stateB, startSec, endSec, enteringConflict) {
  let lowSec = startSec;
  let highSec = endSec;

  for (let iteration = 0; iteration < 12; iteration += 1) {
    const midSec = (lowSec + highSec) / 2;
    const separationNm = distanceNm(
      projectTrafficState(stateA, midSec),
      projectTrafficState(stateB, midSec)
    );
    const isConflict = separationNm < TRAFFIC_CONFLICT_HORIZONTAL_NM;

    if (enteringConflict ? isConflict : !isConflict) {
      highSec = midSec;
    } else {
      lowSec = midSec;
    }
  }

  return (lowSec + highSec) / 2;
}

function findPairConflict(stateA, stateB) {
  const verticalSepFt = Math.abs(stateA.altitudeFt - stateB.altitudeFt);
  if (verticalSepFt >= TRAFFIC_CONFLICT_VERTICAL_FT) return null;

  const currentSepNm = distanceNm(stateA, stateB);
  let minSepNm = currentSepNm;
  let minTimeSec = 0;
  let minPointA = stateA;
  let minPointB = stateB;
  let wasInConflict = currentSepNm < TRAFFIC_CONFLICT_HORIZONTAL_NM;
  let lossStartSec = wasInConflict ? 0 : null;
  let lossEndSec = null;

  for (let timeSec = TRAFFIC_CONFLICT_STEP_SEC; timeSec <= TRAFFIC_CONFLICT_LOOKAHEAD_SEC; timeSec += TRAFFIC_CONFLICT_STEP_SEC) {
    const projectedA = projectTrafficState(stateA, timeSec);
    const projectedB = projectTrafficState(stateB, timeSec);
    const horizontalSepNm = distanceNm(projectedA, projectedB);
    const isInConflict = horizontalSepNm < TRAFFIC_CONFLICT_HORIZONTAL_NM;

    if (horizontalSepNm < minSepNm) {
      minSepNm = horizontalSepNm;
      minTimeSec = timeSec;
      minPointA = projectedA;
      minPointB = projectedB;
    }

    if (!wasInConflict && isInConflict && lossStartSec === null) {
      lossStartSec = refineSeparationCrossing(
        stateA,
        stateB,
        timeSec - TRAFFIC_CONFLICT_STEP_SEC,
        timeSec,
        true
      );
    } else if (wasInConflict && !isInConflict && lossEndSec === null) {
      lossEndSec = refineSeparationCrossing(
        stateA,
        stateB,
        timeSec - TRAFFIC_CONFLICT_STEP_SEC,
        timeSec,
        false
      );
    }

    wasInConflict = isInConflict;
  }

  if (lossStartSec === null || minSepNm >= TRAFFIC_CONFLICT_HORIZONTAL_NM) return null;
  if (lossEndSec === null) lossEndSec = TRAFFIC_CONFLICT_LOOKAHEAD_SEC;
  const convergencePoint = getMidpoint(minPointA, minPointB);

  return {
    aircraftA: stateA.aircraft,
    aircraftB: stateB.aircraft,
    timeSec: minTimeSec,
    horizontalSepNm: minSepNm,
    verticalSepFt,
    lossStartSec,
    lossEndSec,
    cpaLatA: minPointA.lat,
    cpaLonA: minPointA.lon,
    cpaLatB: minPointB.lat,
    cpaLonB: minPointB.lon,
    convergenceLat: convergencePoint.lat,
    convergenceLon: convergencePoint.lon
  };
}

function detectTrafficConflicts(aircraftData) {
  const states = aircraftData
    .map(getTrafficState)
    .filter(Boolean);
  const conflicts = [];

  for (let i = 0; i < states.length - 1; i += 1) {
    for (let j = i + 1; j < states.length; j += 1) {
      const conflict = findPairConflict(states[i], states[j]);
      if (conflict) conflicts.push(conflict);
    }
  }

  return conflicts.sort((a, b) => a.timeSec - b.timeSec || a.horizontalSepNm - b.horizontalSepNm);
}

function createConflictLookup(conflicts) {
  const lookup = new WeakMap();

  conflicts.forEach(conflict => {
    [conflict.aircraftA, conflict.aircraftB].forEach(aircraft => {
      const aircraftConflicts = lookup.get(aircraft) || [];
      aircraftConflicts.push(conflict);
      lookup.set(aircraft, aircraftConflicts);
    });
  });

  return lookup;
}

function getConflictOtherAircraft(conflict, aircraft) {
  return conflict.aircraftA === aircraft ? conflict.aircraftB : conflict.aircraftA;
}

function getAircraftConflictSummary(aircraft, conflicts) {
  if (!conflicts?.length) return '';

  const nearest = conflicts[0];
  const otherAircraft = getConflictOtherAircraft(nearest, aircraft);
  return `Conflict with ${escapeHtml(getAircraftName(otherAircraft))}: ${nearest.horizontalSepNm.toFixed(1)} NM / ${nearest.verticalSepFt.toFixed(0)} ft in ${Math.round(nearest.timeSec)}s`;
}

function getConflictListHtml(conflicts, trafficStatus = null) {
  if (trafficStatus?.type === 'solved' && !conflicts.length) {
    return `
      <div class="traffic-conflict-panel traffic-conflict-panel-solved">
        <strong>Conflict solved</strong>
        <span>${escapeHtml(trafficStatus.message)}</span>
      </div>
    `;
  }

  if (!conflicts.length) {
    return `
      <div class="traffic-conflict-panel traffic-conflict-panel-clear">
        <strong>No conflicts detected</strong>
      </div>
    `;
  }

  const items = conflicts.slice(0, 6).map(conflict => {
    const aircraftA = escapeHtml(getAircraftName(conflict.aircraftA));
    const aircraftB = escapeHtml(getAircraftName(conflict.aircraftB));
    const conflictTime = formatUtcTimeFromNow(conflict.timeSec);
    const convergencePoint = Number.isFinite(conflict.convergenceLat) && Number.isFinite(conflict.convergenceLon)
      ? `${conflict.convergenceLat.toFixed(3)}, ${conflict.convergenceLon.toFixed(3)}`
      : 'N/A';

    return `
      <li>
        <strong>${aircraftA} / ${aircraftB}</strong>
        <span>CPA ${Math.round(conflict.timeSec)}s / ${conflictTime} - ${convergencePoint} - ${conflict.horizontalSepNm.toFixed(1)} NM - ${conflict.verticalSepFt.toFixed(0)} ft</span>
      </li>
    `;
  }).join('');

  return `
    <div class="traffic-conflict-panel">
      <strong>${conflicts.length} possible conflict${conflicts.length === 1 ? '' : 's'}</strong>
      <ol class="traffic-conflict-list">${items}</ol>
    </div>
  `;
}

function getTrafficMetaHtml(aircraftCount, refreshMs = TRAFFIC_REFRESH_MS) {
  return `
    <div class="traffic-criteria-panel">
      Sep criteria: vertical ${TRAFFIC_CONFLICT_VERTICAL_FT} ft, horizontal ${TRAFFIC_CONFLICT_HORIZONTAL_NM} NM for converging headings
    </div>
    <div class="traffic-meta-panel">
      <span>${aircraftCount} aircraft displayed</span>
      <span>Updates every ${refreshMs / 1000}s</span>
    </div>
  `;
}

function getAircraftLabel(aircraft) {
  const flight = getAircraftName(aircraft);
  const altitude = isAircraftOnGround(aircraft)
    ? 'GND'
    : aircraft.alt_baro
      ? `F${String(Math.round(aircraft.alt_baro / 100)).padStart(3, '0')}`
      : '';
  const speed = aircraft.gs ? `N${Math.floor(aircraft.gs)}` : '';

  return [flight, altitude, speed].filter(Boolean).join(' ');
}

function isTestAircraft(aircraft) {
  return cleanText(aircraft.t) === 'SIM' || getAircraftName(aircraft).startsWith('TEST');
}

function getAircraftPopupHtml(aircraft) {
  const flight = getAircraftName(aircraft);
  const type = cleanText(aircraft.t);
  const distance = Number.isFinite(aircraft.dst) ? `${Math.floor(aircraft.dst)} NM` : '';
  const altitude = isAircraftOnGround(aircraft)
    ? 'GND'
    : aircraft.alt_baro
      ? `F${String(Math.round(aircraft.alt_baro / 100)).padStart(3, '0')}`
      : '';
  const speed = aircraft.gs ? `${Math.floor(aircraft.gs)} kt` : '';
  const heading = Number.isFinite(aircraft.track)
    ? `TRK ${String(aircraft.track.toFixed(0)).padStart(3, '0')}`
    : '';
  const conflictLine = getAircraftConflictSummary(aircraft, aircraft._trafficConflicts);
  const performanceLine = [altitude, speed].filter(Boolean).join(' / ');
  const navLine = [heading, distance].filter(Boolean).join(' / ');

  return `
    <div class="aircraft-popup">
      <strong>${flight}</strong>
      ${type ? `<span>${type}</span>` : ''}
      ${performanceLine ? `<span>${performanceLine}</span>` : ''}
      ${navLine ? `<span>${navLine}</span>` : ''}
      ${conflictLine ? `<span class="aircraft-popup-warning">${conflictLine}</span>` : ''}
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
  const altitude = isAircraftOnGround(aircraft)
    ? 'GND'
    : aircraft.alt_baro
      ? `F${String(Math.round(aircraft.alt_baro / 100)).padStart(3, '0')}`
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

function addAircraftMarkers(aircraftData, refreshMs = TRAFFIC_REFRESH_MS, trafficStatus = null) {
  clearAircraftMarkers();

  const conflicts = detectTrafficConflicts(aircraftData);
  const conflictLookup = createConflictLookup(conflicts);
  updateTrafficConflictLines(conflicts);

  aircraftData
    .filter(aircraft => Number.isFinite(aircraft.lat) && Number.isFinite(aircraft.lon))
    .forEach(aircraft => {
      aircraft._trafficConflicts = conflictLookup.get(aircraft) || [];
      const markerElement = document.createElement('div');
      markerElement.className = 'aircraft-marker';
      markerElement.classList.toggle('aircraft-marker-conflict', aircraft._trafficConflicts.length > 0);
      markerElement.classList.toggle('aircraft-marker-test', isTestAircraft(aircraft));
      markerElement.classList.toggle('aircraft-marker-ground', isAircraftOnGround(aircraft));
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

      if (isTestAircraft(aircraft)) {
        const labelElement = document.createElement('span');
        labelElement.className = 'aircraft-test-label';
        labelElement.textContent = getAircraftName(aircraft);

        const labelMarker = new mapboxgl.Marker(labelElement, {
          anchor: 'bottom',
          offset: [0, -15],
          pitchAlignment: 'viewport',
          rotationAlignment: 'viewport'
        })
          .setLngLat([aircraft.lon, aircraft.lat])
          .addTo(mapboxMap);

        aircraftLabelMarkers.push(labelMarker);
      }

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

  const aircraftDetailsDiv = document.getElementById('aircraftDetails');
  if (aircraftDetailsDiv) {
    aircraftDetailsDiv.innerHTML = `
      ${getConflictListHtml(conflicts, trafficStatus)}
      ${getTrafficMetaHtml(aircraftMarkers.length, refreshMs)}
    `;
  }
}

function createTestConflictTraffic(elapsedSec = 0) {
  const center = TEST_TRAFFIC_CENTER;
  const southwestPoint = projectPoint({ lat: center.lat, lon: center.lon }, 225, TEST_TRAFFIC_INITIAL_DISTANCE_NM);
  const northwestPoint = projectPoint({ lat: center.lat, lon: center.lon }, 315, TEST_TRAFFIC_INITIAL_DISTANCE_NM);
  const northPoint = projectPoint({ lat: center.lat, lon: center.lon }, 0, 10);
  const test01SpeedKt = 420;
  const test02SpeedKt = 450;
  const test01DistanceFlownNm = test01SpeedKt * elapsedSec / 3600;
  const test02DistanceFlownNm = test02SpeedKt * elapsedSec / 3600;
  const test01Point = projectPoint(southwestPoint, 45, test01DistanceFlownNm);
  const test02InitialTrack = 135;
  const test02ManeuverActive = elapsedSec >= TEST_TRAFFIC_RESOLUTION_SEC;
  const test02Point = projectPoint(northwestPoint, test02InitialTrack, test02DistanceFlownNm);
  const test02AltitudeFt = test02ManeuverActive
    ? TEST_TRAFFIC_RESOLUTION_ALTITUDE_FT
    : 35000;

  return [
    {
      flight: 'TEST01',
      hex: 'TEST01',
      t: 'SIM',
      lat: test01Point.lat,
      lon: test01Point.lon,
      alt_baro: 35000,
      alt_geom: 35000,
      gs: test01SpeedKt,
      track: 45
    },
    {
      flight: 'TEST02',
      hex: 'TEST02',
      t: 'SIM',
      lat: test02Point.lat,
      lon: test02Point.lon,
      alt_baro: test02AltitudeFt,
      alt_geom: test02AltitudeFt,
      gs: test02SpeedKt,
      track: test02InitialTrack
    },
    {
      flight: 'TEST03',
      hex: 'TEST03',
      t: 'SIM',
      lat: northPoint.lat,
      lon: northPoint.lon,
      alt_baro: 39000,
      alt_geom: 39000,
      gs: 360,
      track: 180
    }
  ];
}

function getTestTrafficStatus(elapsedSec) {
  if (elapsedSec < TEST_TRAFFIC_RESOLUTION_SEC) return null;

  return {
    type: 'solved',
    message: `TEST02 descended to FL${String(Math.floor(TEST_TRAFFIC_RESOLUTION_ALTITUDE_FT / 100)).padStart(3, '0')} at +${TEST_TRAFFIC_RESOLUTION_SEC}s`
  };
}

function centerMapOnTestTraffic() {
  if (typeof mapboxMap === 'undefined' || !mapboxMap?.flyTo) return;

  mapboxMap.resize();
  mapboxMap.flyTo({
    center: [TEST_TRAFFIC_CENTER.lon, TEST_TRAFFIC_CENTER.lat],
    zoom: 7.5,
    bearing: 0,
    pitch: 0,
    duration: 900
  });
}

function loadTestTrafficConflict() {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }

  if (testTrafficInterval) {
    clearInterval(testTrafficInterval);
  }

  testTrafficElapsedSec = 0;
  setTrafficToggleState(false);
  setTrafficTestState(true);
  addAircraftMarkers(
    createTestConflictTraffic(testTrafficElapsedSec),
    TEST_TRAFFIC_REFRESH_MS,
    getTestTrafficStatus(testTrafficElapsedSec)
  );
  centerMapOnTestTraffic();

  testTrafficInterval = setInterval(() => {
    testTrafficElapsedSec += TEST_TRAFFIC_REFRESH_MS / 1000;
    addAircraftMarkers(
      createTestConflictTraffic(testTrafficElapsedSec),
      TEST_TRAFFIC_REFRESH_MS,
      getTestTrafficStatus(testTrafficElapsedSec)
    );
    setTrafficTestState(true);
  }, TEST_TRAFFIC_REFRESH_MS);
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

document.getElementById('testTrafficConflict').addEventListener('click', function () {
  if (aircraftMarkers.length && getTrafficTestButton()?.classList.contains('is-active')) {
    stopTrafficTracking();
    return;
  }

  loadTestTrafficConflict();
});

setTrafficToggleState(false);
setTrafficTestState(false);
