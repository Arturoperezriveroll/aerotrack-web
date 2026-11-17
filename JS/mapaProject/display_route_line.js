let routeLayerInteractionsReady = false;

function escapeRouteHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getRouteDisplayData() {
    const waypoints = [];
    document.querySelectorAll('#fixTable tr').forEach((row) => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 3) return;
        const lat = Number.parseFloat(cells[1].innerText);
        const lng = Number.parseFloat(cells[2].innerText);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            waypoints.push({ name: cells[0].innerText.trim(), lat, lng });
        }
    });

    const coordinates = waypoints.map((waypoint) => [waypoint.lng, waypoint.lat]);
    return {
        coordinates,
        line: {
            type: 'Feature', properties: {},
            geometry: { type: 'LineString', coordinates }
        },
        points: {
            type: 'FeatureCollection',
            features: waypoints.map((waypoint, index) => ({
                type: 'Feature',
                properties: {
                    Name: waypoint.name,
                    sequence: index + 1,
                    role: index === 0 ? 'departure' : (index === waypoints.length - 1 ? 'destination' : 'waypoint')
                },
                geometry: { type: 'Point', coordinates: [waypoint.lng, waypoint.lat] }
            }))
        }
    };
}

function addRouteLayerIfMissing(definition) {
    if (!mapboxMap.getLayer(definition.id)) mapboxMap.addLayer(definition);
}

function ensureRouteLayers(routeData) {
    if (mapboxMap.getSource('route')) mapboxMap.getSource('route').setData(routeData.line);
    else mapboxMap.addSource('route', { type: 'geojson', data: routeData.line });

    if (mapboxMap.getSource('route-waypoints')) mapboxMap.getSource('route-waypoints').setData(routeData.points);
    else mapboxMap.addSource('route-waypoints', { type: 'geojson', data: routeData.points });

    addRouteLayerIfMissing({
        id: 'route-casing', type: 'line', source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
            'line-color': '#064e3b',
            'line-width': ['interpolate', ['linear'], ['zoom'], 4, 5, 10, 9],
            'line-opacity': 0.78,
            'line-blur': 0.6
        }
    });
    addRouteLayerIfMissing({
        id: 'route', type: 'line', source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
            'line-color': '#22c55e',
            'line-width': ['interpolate', ['linear'], ['zoom'], 4, 2.5, 10, 5],
            'line-opacity': 1
        }
    });
    addRouteLayerIfMissing({
        id: 'route-waypoint-halo', type: 'circle', source: 'route-waypoints',
        paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 4.5, 10, 7],
            'circle-color': '#ffffff',
            'circle-stroke-color': '#064e3b',
            'circle-stroke-width': 2
        }
    });
    addRouteLayerIfMissing({
        id: 'route-waypoint-point', type: 'circle', source: 'route-waypoints',
        paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 2.2, 10, 4],
            'circle-color': ['match', ['get', 'role'], 'departure', '#2563eb', 'destination', '#dc2626', '#16a34a']
        }
    });
    addRouteLayerIfMissing({
        id: 'route-waypoint-label', type: 'symbol', source: 'route-waypoints', minzoom: 4,
        layout: {
            'text-field': ['get', 'Name'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 4, 10, 9, 13],
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-offset': [0, 1.25],
            'text-anchor': 'top',
            'text-allow-overlap': false,
            'text-optional': true
        },
        paint: {
            'text-color': '#052e16',
            'text-halo-color': '#ffffff',
            'text-halo-width': 2,
            'text-halo-blur': 0.5
        }
    });
}

function registerRouteLayerInteractions() {
    if (routeLayerInteractionsReady) return;
    routeLayerInteractionsReady = true;
    mapboxMap.on('click', 'route-waypoint-halo', (event) => {
        const feature = event.features?.[0];
        if (!feature) return;
        const [lng, lat] = feature.geometry.coordinates;
        new mapboxgl.Popup({ className: 'route-waypoint-popup', maxWidth: '260px' })
            .setLngLat([lng, lat])
            .setHTML(`<div class="route-popup-card"><strong>${escapeRouteHtml(feature.properties.Name)}</strong><span>WP ${escapeRouteHtml(feature.properties.sequence)}</span><code>${lat.toFixed(6)}°, ${lng.toFixed(6)}°</code></div>`)
            .addTo(mapboxMap);
    });
    mapboxMap.on('mouseenter', 'route-waypoint-halo', () => { mapboxMap.getCanvas().style.cursor = 'pointer'; });
    mapboxMap.on('mouseleave', 'route-waypoint-halo', () => { mapboxMap.getCanvas().style.cursor = ''; });
}

function displayRouteLine() {
    const routeData = getRouteDisplayData();
    polylinePoints = routeData.coordinates;
    if (polylinePoints.length <= 1) {
        alert('Not enough points to draw a route.');
        return false;
    }
    ensureRouteLayers(routeData);
    registerRouteLayerInteractions();
    fitMapToRoute(polylinePoints);
    return true;
}

function fitMapToRoute(routePoints) {
    if (!Array.isArray(routePoints) || routePoints.length < 2 || !mapboxMap?.fitBounds) return;
    const bounds = routePoints.reduce(
        (routeBounds, point) => routeBounds.extend(point),
        new mapboxgl.LngLatBounds(routePoints[0], routePoints[0])
    );
    const isMobileLayout = window.matchMedia?.('(max-width: 760px)').matches;
    const padding = isMobileLayout
        ? { top: 48, right: 36, bottom: 48, left: 36 }
        : { top: 90, right: 60, bottom: 90, left: 60 };
    mapboxMap.resize();
    mapboxMap.fitBounds(bounds, { padding, maxZoom: 9, duration: 900 });
}

const drawRouteLineBtn = document.getElementById('drawRouteBtn');
if (drawRouteLineBtn) drawRouteLineBtn.addEventListener('click', displayRouteLine);
