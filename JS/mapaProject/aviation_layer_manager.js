(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.AeroTrackAviationLayers = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const GROUPS = {
    airspace: { label: 'Airspace', enabled: true },
    airways: { label: 'Airways', enabled: true },
    navaids: { label: 'VOR', enabled: true },
    fixes: { label: 'Fixes', enabled: true }
  };
  const BASEMAP_DIMMER_SOURCE_ID = 'aviation-basemap-dimmer-source';
  const BASEMAP_DIMMER_LAYER_ID = 'aviation-basemap-dimmer';
  const SELECTION_SOURCE_ID = 'aviation-selection-source';
  const AIRSPACE_CLASS_COLORS = {
    B: '#2563eb',
    C: '#c026d3',
    D: '#2563eb',
    E: '#c026d3',
    F: '#d97706',
    G: '#64748b'
  };

  const AIRSPACE_SOURCES = [
    { id: 'aviation-sector-1', data: './JS/geojson/SEC1.json', geometry: 'line', color: '#0f766e', lineOpacity: 0.55, lineWidth: 1.3 },
    { id: 'aviation-sector-2', data: './JS/geojson/sector2.json', geometry: 'line', color: '#0f766e', lineOpacity: 0.55, lineWidth: 1.3 },
    { id: 'aviation-sector-3', data: './JS/geojson/sector3.json', geometry: 'line', color: '#0f766e', lineOpacity: 0.55, lineWidth: 1.3 },
    { id: 'aviation-sector-4', data: './JS/geojson/sector4pol.json', geometry: 'line', color: '#0f766e', lineOpacity: 0.55, lineWidth: 1.3 },
    { id: 'aviation-sector-5', data: './JS/geojson/sector5pol.json', geometry: 'line', color: '#0f766e', lineOpacity: 0.55, lineWidth: 1.3 },
    { id: 'aviation-sector-6', data: './JS/geojson/sector6pol.json', geometry: 'line', color: '#0f766e', lineOpacity: 0.55, lineWidth: 1.3 },
    { id: 'aviation-mid-acc', data: './JS/geojson/midacctrack.json', geometry: 'line', color: '#0f766e', lineOpacity: 0.65, lineWidth: 1.5 },
    { id: 'aviation-cme-tma', data: './JS/geojson/cmetma.json?v=20261118d', geometry: 'polygon', color: AIRSPACE_CLASS_COLORS.D, lineDasharray: [6, 4] },
    { id: 'aviation-tgz-tma', data: './JS/geojson/tgztma.json?v=20261118b', geometry: 'polygon', color: AIRSPACE_CLASS_COLORS.D, lineDasharray: [6, 4] },
    { id: 'aviation-vsa-tma', data: './JS/geojson/vsaTma.json?v=20261118d', geometry: 'polygon', color: AIRSPACE_CLASS_COLORS.D, lineDasharray: [6, 4] },
    { id: 'aviation-adatap', data: './JS/geojson/adatap.json?v=20261118b', geometry: 'polygon', color: AIRSPACE_CLASS_COLORS.F, lineDasharray: [2, 2] }
  ];

  const state = {
    enabled: false,
    groups: Object.fromEntries(Object.entries(GROUPS).map(([key, value]) => [key, value.enabled])),
    layerIdsByGroup: Object.fromEntries(Object.keys(GROUPS).map((key) => [key, []])),
    map: null,
    control: null,
    popup: null,
    interactionRegistered: false
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatCoordinate(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(6) : 'Not available';
  }

  function propertyFlag(value) {
    return value === true || String(value).toLowerCase() === 'true';
  }

  function featureCategory(layerId) {
    if (layerId.startsWith('aviation-vors')) return 'VOR';
    if (layerId.startsWith('aviation-fixes')) return 'Fix';
    if (layerId.startsWith('aviation-airways')) return 'Airway';
    return 'Airspace';
  }

  function buildFeatureDetails(feature) {
    const properties = feature?.properties || {};
    const category = featureCategory(feature?.layer?.id || '');
    const name = properties.Name || properties.name || category;
    const description = properties.description || properties.Description || '';
    const geometryType = feature?.geometry?.type || '';
    const airspaceClass = String(properties.airspaceClass || '').trim().toUpperCase();
    const isPointFeature = geometryType === 'Point';
    const explicitLatitude = Number(
      properties.coordinateLatitude ?? properties.centerLatitude
    );
    const explicitLongitude = Number(
      properties.coordinateLongitude ?? properties.centerLongitude
    );
    const hasExplicitAreaCoordinates =
      !isPointFeature &&
      propertyFlag(properties.showCoordinates) &&
      Number.isFinite(explicitLatitude) &&
      Number.isFinite(explicitLongitude);
    const pointCoordinates = isPointFeature
      ? feature.geometry.coordinates
      : hasExplicitAreaCoordinates
        ? [explicitLongitude, explicitLatitude]
        : [];

    return {
      category,
      name: String(name),
      description: String(description || ''),
      accentColor: category === 'Airspace'
        ? (AIRSPACE_CLASS_COLORS[airspaceClass] || '#0f766e')
        : '#0f766e',
      showCoordinates: isPointFeature || hasExplicitAreaCoordinates,
      coordinateLabel: hasExplicitAreaCoordinates
        ? String(properties.coordinateLabel || 'Reference point')
        : '',
      longitude: formatCoordinate(pointCoordinates?.[0]),
      latitude: formatCoordinate(pointCoordinates?.[1])
    };
  }

  function detailsHtml(details) {
    const descriptionSections = details.description
      ? details.description.split(/\r?\n\s*\r?\n/)
      : [];
    const description = details.description
      ? `<div class="aviation-popup-description">${descriptionSections.length === 1
          ? escapeHtml(details.description).replace(/\r?\n/g, '<br>')
          : descriptionSections.map((section) => {
            const [heading, ...lines] = section.split(/\r?\n/);
            if (!lines.length) return escapeHtml(heading);
            return `<section class="aviation-popup-section">
              <div class="aviation-popup-section-title">${escapeHtml(heading)}</div>
              <div>${lines.map(escapeHtml).join('<br>')}</div>
            </section>`;
          })
          .join('')}</div>`
      : '<div class="aviation-popup-unavailable">Frequency and schedule: not available in the current data.</div>';

    const coordinateHeading = details.coordinateLabel
      ? `<div class="aviation-popup-coordinate-heading">${escapeHtml(details.coordinateLabel)}</div>`
      : '';
    const coordinates = details.showCoordinates
      ? `${coordinateHeading}<dl>
        <dt>Latitude</dt><dd>${escapeHtml(details.latitude)}°</dd>
        <dt>Longitude</dt><dd>${escapeHtml(details.longitude)}°</dd>
      </dl>`
      : '';

    return `<article class="aviation-popup-card" style="--aviation-popup-accent: ${escapeHtml(details.accentColor || '#0f766e')}">
      <div class="aviation-popup-type">${escapeHtml(details.category)}</div>
      <h3>${escapeHtml(details.name)}</h3>
      ${description}
      ${coordinates}
    </article>`;
  }

  function shouldHighlightFeature(details) {
    return details?.category !== 'Airspace';
  }

  function interactiveLayerIds() {
    return Object.values(state.layerIdsByGroup).flat().filter((layerId) =>
      !layerId.endsWith('-label') && state.map?.getLayer(layerId)
    );
  }

  function clearFeatureSelection(removePopup = true) {
    state.map?.getSource(SELECTION_SOURCE_ID)?.setData({
      type: 'FeatureCollection',
      features: []
    });
    if (removePopup && state.popup) {
      const popup = state.popup;
      state.popup = null;
      popup.remove();
    }
  }

  function registerInteractions(map) {
    if (state.interactionRegistered) return;
    state.interactionRegistered = true;

    map.on('click', (event) => {
      if (!state.enabled) return;
      const layerIds = interactiveLayerIds();
      if (!layerIds.length) {
        clearFeatureSelection();
        return;
      }
      const feature = map.queryRenderedFeatures(event.point, { layers: layerIds })[0];
      if (!feature) {
        clearFeatureSelection();
        return;
      }

      const details = buildFeatureDetails(feature);
      if (state.popup) {
        const previousPopup = state.popup;
        state.popup = null;
        previousPopup.remove();
      }
      map.getSource(SELECTION_SOURCE_ID)?.setData(
        shouldHighlightFeature(details)
          ? {
              type: 'Feature',
              properties: feature.properties || {},
              geometry: feature.geometry
            }
          : {
              type: 'FeatureCollection',
              features: []
            }
      );
      const popup = new mapboxgl.Popup({
        closeButton: true,
        maxWidth: '310px',
        className: 'aviation-feature-popup'
      })
        .setLngLat(event.lngLat)
        .setHTML(detailsHtml(details));
      popup.on('close', () => {
        if (state.popup === popup) {
          state.popup = null;
          clearFeatureSelection(false);
        }
      });
      state.popup = popup;
      popup.addTo(map);
    });

    map.on('mousemove', (event) => {
      if (!state.enabled) {
        map.getCanvas().style.cursor = '';
        return;
      }
      const layerIds = interactiveLayerIds();
      const hasFeature = layerIds.length && map.queryRenderedFeatures(event.point, { layers: layerIds }).length;
      map.getCanvas().style.cursor = hasFeature ? 'pointer' : '';
    });
  }

  function visibilityFor(group) {
    return state.enabled && state.groups[group] ? 'visible' : 'none';
  }

  function addTrackedLayer(map, definition, group, beforeId) {
    if (map.getLayer(definition.id)) {
      return;
    }
    map.addLayer(definition, beforeId);
    state.layerIdsByGroup[group].push(definition.id);
  }

  function addBasemapDimmer(map) {
    if (!map.getSource(BASEMAP_DIMMER_SOURCE_ID)) {
      map.addSource(BASEMAP_DIMMER_SOURCE_ID, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]
            ]]
          }
        }
      });
    }
    if (!map.getLayer(BASEMAP_DIMMER_LAYER_ID)) {
      map.addLayer({
        id: BASEMAP_DIMMER_LAYER_ID,
        type: 'fill',
        source: BASEMAP_DIMMER_SOURCE_ID,
        layout: { visibility: state.enabled ? 'visible' : 'none' },
        paint: { 'fill-color': '#ffffff', 'fill-opacity': 0.5 }
      });
    }
  }

  function addSelectionLayers(map) {
    if (!map.getSource(SELECTION_SOURCE_ID)) {
      map.addSource(SELECTION_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
    }

    [
      {
        id: 'aviation-selection-line', type: 'line', source: SELECTION_SOURCE_ID,
        filter: ['in', ['geometry-type'], ['literal', ['LineString', 'Polygon']]],
        paint: { 'line-color': '#facc15', 'line-width': 5, 'line-opacity': 1 }
      },
      {
        id: 'aviation-selection-point', type: 'circle', source: SELECTION_SOURCE_ID,
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-radius': 9,
          'circle-color': 'rgba(250, 204, 21, 0.25)',
          'circle-stroke-color': '#facc15',
          'circle-stroke-width': 3
        }
      }
    ].forEach((definition) => {
      if (!map.getLayer(definition.id)) map.addLayer(definition);
    });
  }

  function addAirspaceLayers(map) {
    AIRSPACE_SOURCES.forEach((item) => {
      if (!map.getSource(item.id)) {
        map.addSource(item.id, { type: 'geojson', data: item.data });
      }

      if (item.geometry === 'polygon') {
        addTrackedLayer(map, {
          id: `${item.id}-fill`,
          type: 'fill',
          source: item.id,
          minzoom: 3,
          layout: { visibility: visibilityFor('airspace') },
          paint: {
            'fill-color': item.color,
            'fill-opacity': 0.2
          }
        }, 'airspace');
      }

      addTrackedLayer(map, {
        id: `${item.id}-line`,
        type: 'line',
        source: item.id,
        minzoom: 3,
        layout: { visibility: visibilityFor('airspace') },
        paint: {
          'line-color': item.color,
          'line-width': item.lineWidth || ['interpolate', ['linear'], ['zoom'], 3, 1.8, 9, 3],
          'line-opacity': item.lineOpacity ?? 1,
          ...(item.lineDasharray ? { 'line-dasharray': item.lineDasharray } : {})
        }
      }, 'airspace');

      addTrackedLayer(map, {
        id: `${item.id}-label`,
        type: 'symbol',
        source: item.id,
        minzoom: 5,
        layout: {
          visibility: visibilityFor('airspace'),
          'symbol-placement': item.geometry === 'line' ? 'line' : 'point',
          'text-field': ['coalesce', ['get', 'Name'], ['get', 'name'], ''],
          'text-size': 11,
          'text-letter-spacing': 0.08,
          'text-allow-overlap': false
        },
        paint: {
          'text-color': item.color,
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.3
        }
      }, 'airspace');
    });
  }

  function addAirwayLayers(map) {
    const airwaySources = [
      {
        id: 'aviation-airways-rnav',
        data: './JS/geojson/airways_rnav.geojson?v=20261117a',
        color: '#2563eb',
        dasharray: [1, 0]
      },
      {
        id: 'aviation-airways-conventional',
        data: './JS/geojson/airways_conventional.geojson?v=20261117a',
        color: '#111827',
        dasharray: [3, 2]
      }
    ];

    airwaySources.forEach((airway) => {
      if (!map.getSource(airway.id)) {
        map.addSource(airway.id, { type: 'geojson', data: airway.data });
      }

      addTrackedLayer(map, {
        id: `${airway.id}-line`,
        type: 'line',
        source: airway.id,
        minzoom: 4,
        layout: { visibility: visibilityFor('airways') },
        paint: {
          'line-color': airway.color,
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1.2, 9, 2.2],
          'line-opacity': 0.88,
          'line-dasharray': airway.dasharray
        }
      }, 'airways');

      addTrackedLayer(map, {
        id: `${airway.id}-label`,
        type: 'symbol',
        source: airway.id,
        minzoom: 6,
        layout: {
          visibility: visibilityFor('airways'),
          'symbol-placement': 'line-center',
          'text-field': ['coalesce', ['get', 'Name'], ['get', 'name'], ''],
          'text-size': 10,
          'text-allow-overlap': false
        },
        paint: {
          'text-color': airway.color,
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.4
        }
      }, 'airways');
    });
  }

  function addFixLayers(map) {
    const sourceId = 'aviation-fixes';
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, { type: 'geojson', data: './JS/geojson/FIXES1.json?v=20261117a' });
    }

    addTrackedLayer(map, {
      id: 'aviation-fixes-point',
      type: 'circle',
      source: sourceId,
      minzoom: 7,
      layout: { visibility: visibilityFor('fixes') },
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 3, 11, 5.5],
        'circle-color': '#475569',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.2,
        'circle-opacity': 0.9
      }
    }, 'fixes');

    addTrackedLayer(map, {
      id: 'aviation-fixes-label',
      type: 'symbol',
      source: sourceId,
      minzoom: 7,
      layout: {
        visibility: visibilityFor('fixes'),
        'text-field': ['coalesce', ['get', 'Name'], ['get', 'name'], ''],
        'text-size': ['interpolate', ['linear'], ['zoom'], 7, 11, 11, 14],
        'text-offset': [0, 1.2],
        'text-allow-overlap': false
      },
      paint: {
        'text-color': '#111827',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.8
      }
    }, 'fixes');
  }

  function convertVorData(records) {
    return {
      type: 'FeatureCollection',
      features: (records || []).map((record) => ({
        type: 'Feature',
        properties: { Name: String(record?.nombre || '').trim().toUpperCase() },
        geometry: {
          type: 'Point',
          coordinates: [
            Number(record?.coordenadas?.longitud),
            Number(record?.coordenadas?.latitud)
          ]
        }
      })).filter((feature) =>
        feature.properties.Name && feature.geometry.coordinates.every(Number.isFinite)
      )
    };
  }

  function loadMapImage(map, imageId, url) {
    if (map.hasImage(imageId)) return Promise.resolve(true);
    return new Promise((resolve) => {
      const image = new Image(64, 64);
      image.onload = () => {
        if (!map.hasImage(imageId)) map.addImage(imageId, image, { pixelRatio: 2 });
        resolve(true);
      };
      image.onerror = () => resolve(false);
      image.src = url;
    });
  }

  async function addVorLayers(map) {
    const sourceId = 'aviation-vors';
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, { type: 'geojson', data: './JS/geojson/vores_full.geojson?v=20261117a' });
    }

    const symbolLoaded = await loadMapImage(
      map,
      'aviation-vor-symbol',
      './JS/svg/vor-map-symbol.svg'
    );

    addTrackedLayer(map, {
      id: 'aviation-vors-point',
      type: symbolLoaded ? 'symbol' : 'circle',
      source: sourceId,
      minzoom: 4,
      layout: symbolLoaded ? {
        visibility: visibilityFor('navaids'),
        'icon-image': 'aviation-vor-symbol',
        'icon-size': ['interpolate', ['linear'], ['zoom'], 4, 0.72, 9, 1.05],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true
      } : { visibility: visibilityFor('navaids') },
      paint: symbolLoaded ? {} : {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 5, 9, 8],
        'circle-color': '#ffffff',
        'circle-stroke-color': '#7c3aed',
        'circle-stroke-width': 2.5
      }
    }, 'navaids');

    addTrackedLayer(map, {
      id: 'aviation-vors-label',
      type: 'symbol',
      source: sourceId,
      minzoom: 5,
      layout: {
        visibility: visibilityFor('navaids'),
        'text-field': ['coalesce', ['get', 'Name'], ''],
        'text-size': ['interpolate', ['linear'], ['zoom'], 5, 12, 10, 15],
        'text-offset': [0, 1.4],
        'text-allow-overlap': false
      },
      paint: {
        'text-color': '#6d28d9',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.9
      }
    }, 'navaids');
  }

  function applyVisibility() {
    if (!state.map) {
      return;
    }
    Object.entries(state.layerIdsByGroup).forEach(([group, layerIds]) => {
      const visibility = visibilityFor(group);
      layerIds.forEach((layerId) => {
        if (state.map.getLayer(layerId)) {
          state.map.setLayoutProperty(layerId, 'visibility', visibility);
        }
      });
    });
    if (state.map.getLayer(BASEMAP_DIMMER_LAYER_ID)) {
      state.map.setLayoutProperty(
        BASEMAP_DIMMER_LAYER_ID,
        'visibility',
        state.enabled ? 'visible' : 'none'
      );
    }
    state.control?.update?.();
  }

  function setEnabled(enabled) {
    state.enabled = Boolean(enabled);
    if (!state.enabled) {
      clearFeatureSelection();
    }
    applyVisibility();
  }

  function setGroupEnabled(group, enabled) {
    if (!(group in state.groups)) {
      return;
    }
    state.groups[group] = Boolean(enabled);
    if (enabled) {
      state.enabled = true;
    }
    applyVisibility();
  }

  function createControl() {
    let container;
    let toggle;
    let layersToggle;
    let panel;
    let panelOpen = false;
    const inputs = new Map();

    return {
      onAdd() {
        container = document.createElement('div');
        container.className = 'mapboxgl-ctrl aviation-map-control';

        toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'aviation-map-toggle';
        toggle.textContent = 'Aviation';
        toggle.setAttribute('aria-pressed', 'false');
        toggle.addEventListener('click', () => setEnabled(!state.enabled));
        container.appendChild(toggle);

        layersToggle = document.createElement('button');
        layersToggle.type = 'button';
        layersToggle.className = 'aviation-layers-toggle';
        layersToggle.textContent = 'Layers';
        layersToggle.setAttribute('aria-expanded', 'false');
        layersToggle.setAttribute('aria-label', 'Show aviation layer options');
        layersToggle.addEventListener('click', () => {
          panelOpen = !panelOpen;
          container.classList.toggle('is-panel-open', panelOpen);
          layersToggle.setAttribute('aria-expanded', String(panelOpen));
          layersToggle.setAttribute(
            'aria-label',
            panelOpen ? 'Hide aviation layer options' : 'Show aviation layer options'
          );
        });
        container.appendChild(layersToggle);

        panel = document.createElement('div');
        panel.className = 'aviation-layer-panel';
        Object.entries(GROUPS).forEach(([group, definition]) => {
          const label = document.createElement('label');
          const input = document.createElement('input');
          input.type = 'checkbox';
          input.checked = state.groups[group];
          input.addEventListener('change', () => setGroupEnabled(group, input.checked));
          inputs.set(group, input);
          label.append(input, document.createTextNode(definition.label));
          panel.appendChild(label);
        });
        const legend = document.createElement('div');
        legend.className = 'aviation-map-legend';
        legend.innerHTML = `
          <span><i class="legend-swatch legend-airspace"></i>Airspace</span>
          <span><i class="legend-swatch legend-airway"></i>RNAV</span>
          <span><i class="legend-swatch legend-conventional"></i>Conventional</span>
          <span><i class="legend-dot legend-vor"></i>VOR</span>
          <span><i class="legend-dot legend-fix"></i>Fix</span>`;
        panel.appendChild(legend);
        container.appendChild(panel);
        this.update();
        return container;
      },
      onRemove() {
        container?.remove();
      },
      update() {
        if (!container) {
          return;
        }
        container.classList.toggle('is-active', state.enabled);
        if (!state.enabled && panelOpen) {
          panelOpen = false;
          container.classList.remove('is-panel-open');
          layersToggle.setAttribute('aria-expanded', 'false');
          layersToggle.setAttribute('aria-label', 'Show aviation layer options');
        }
        toggle.setAttribute('aria-pressed', String(state.enabled));
        toggle.textContent = state.enabled ? 'Aviation on' : 'Aviation';
        inputs.forEach((input, group) => {
          input.checked = state.groups[group];
        });
      }
    };
  }

  async function initialize(map) {
    if (!map || state.map === map) {
      return;
    }
    state.map = map;
    addBasemapDimmer(map);
    addAirspaceLayers(map);
    addAirwayLayers(map);
    addFixLayers(map);

    state.control = createControl();
    map.addControl(state.control, 'top-left');

    try {
      await addVorLayers(map);
    } catch (error) {
      console.warn('AeroTrack VOR layer unavailable:', error);
    }
    addSelectionLayers(map);
    registerInteractions(map);
    applyVisibility();
  }

  return {
    AIRSPACE_CLASS_COLORS,
    AIRSPACE_SOURCES,
    GROUPS,
    convertVorData,
    buildFeatureDetails,
    detailsHtml,
    shouldHighlightFeature,
    initialize,
    setEnabled,
    setGroupEnabled
  };
});
