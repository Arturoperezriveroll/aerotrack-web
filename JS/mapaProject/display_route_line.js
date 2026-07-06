function displayRouteLine() {
    polylinePoints = []; // Reset the array

    const table = document.getElementById('fixTable');
    const rows = table.getElementsByTagName('tr');

    for(let i = 0; i < rows.length; i++) { 
        const cells = rows[i].getElementsByTagName('td');
        const lat = parseFloat(cells[1].innerText); 
        const lng = parseFloat(cells[2].innerText); 

        if(!isNaN(lat) && !isNaN(lng)) {
            polylinePoints.push([lng, lat]);  // Add coordinates to the array
        }
    }
    
    // Update the route with the coordinates from the table
    if(polylinePoints.length > 1) {
        const data = {
            'type': 'Feature',
            'properties': {},
            'geometry': {
                'type': 'LineString',
                'coordinates': polylinePoints
            }
        };

        if (mapboxMap.getSource('route')) {
            mapboxMap.getSource('route').setData(data);
        } else {
            mapboxMap.addSource('route', {
                'type': 'geojson',
                'data': data
            });
            
            mapboxMap.addLayer({
                'id': 'route',
                'type': 'line',
                'source': 'route',
                'layout': {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                'paint': {
                    'line-color': 'GREEN',
                    'line-width': 3
                }
            }); 
        }
        fitMapToRoute(polylinePoints);
        return true;
    } else {
        alert('Not enough points to draw a route.');
        return false;
    }
}

function fitMapToRoute(routePoints) {
    if (!Array.isArray(routePoints) || routePoints.length < 2 || !mapboxMap?.fitBounds) {
        return;
    }

    const bounds = routePoints.reduce((routeBounds, point) => {
        return routeBounds.extend(point);
    }, new mapboxgl.LngLatBounds(routePoints[0], routePoints[0]));
    const isMobileLayout = window.matchMedia?.('(max-width: 760px)').matches;
    const padding = isMobileLayout
        ? { top: 48, right: 36, bottom: 48, left: 36 }
        : { top: 90, right: 60, bottom: 90, left: 60 };

    mapboxMap.resize();
    mapboxMap.fitBounds(bounds, {
        padding,
        maxZoom: 9,
        duration: 900
    });
}

// Backward-compatible hook in case the legacy button exists.
const drawRouteLineBtn = document.getElementById('drawRouteBtn');
if (drawRouteLineBtn) {
    drawRouteLineBtn.addEventListener('click', displayRouteLine);
}
