//empieza f para obtener coordenadas de los puntos de la ruta y plotear la linea verde.
//f para tomar datos de la tablafix, y plotear la trayectoria en verde
document.getElementById('drawRouteBtn').addEventListener('click', function() {
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
    } else {
        alert('Not enough points to draw a route.');
    }
});