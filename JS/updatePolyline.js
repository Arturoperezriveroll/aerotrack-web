 function updatePolyline(coords) {
    if (!mapboxMap.getSource('path')) {
        // If the source doesn't exist, create it
        mapboxMap.addSource('path', {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: pathCoordinates
                }
            }
        });

        // Then add the layer using the source
        mapboxMap.addLayer({
            id: 'path',
            type: 'line',
            source: 'path',
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': 'blue',
                'line-width': 4
            }
        });
    } else {
        // If the source exists, just update its data
        mapboxMap.getSource('path').setData({
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: pathCoordinates
            }
        });
    }
}