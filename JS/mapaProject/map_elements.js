 //instruction cuando cargar se dibujen los sectores
mapboxMap.on('load', function() {

    // Add first source and layer
    mapboxMap.addSource('sector1', {
        'type': 'geojson',
        'data': './JS/geojson/SEC1.json'
    });

    mapboxMap.addLayer({
        'id': 'sector1-layer',
        'type': 'line',
        'source': 'sector1', 
        'layout': {},
        'paint': {
            'line-color': '#FF0000',
            'line-width': 1
        }
    });

    mapboxMap.addLayer({
    'id': 'sector1-text',
    'type': 'symbol',
    'source': 'sector1',  // 
    'layout': {
        'text-field': '{Name}',  //
        'text-size': 14,
        'symbol-placement': 'line',
        'text-justify': 'center',
        'text-offset': [0,.5]  // 
    },
    'paint': {
        'text-color': '#000'
    }
    });

// SE INGRESA CODIGO SECTOR 2
mapboxMap.addSource('sector2', {
    'type': 'geojson',
    'data': './JS/geojson/sector2.json'
});

// TRAZO DEL SECTOR2
mapboxMap.addLayer({
    'id': 'sector2-line-layer',  
    'type': 'line',
    'source': 'sector2',
    'layout': {},
    'paint': {
        'line-color': '#FF0000',
        'line-width': 1
    }
});

// SE INGRESA CODIGO SECTOR 3
mapboxMap.addSource('sector3', {
    'type': 'geojson',
    'data': './JS/geojson/sector3.json'
});
// TRAZO DEL SECTOR3
mapboxMap.addLayer({
    'id': 'sector3-line-layer',  
    'type': 'line',
    'source': 'sector3',
    'layout': {},
    'paint': {
        'line-color': '#FF0000',
        'line-width': 1
    }
});

// SE INGRESA CODIGO SECTOR 4
mapboxMap.addSource('sector4', {
    'type': 'geojson',
    'data': './JS/geojson/sector4pol.json'
});

mapboxMap.addLayer({
    'id': 'sector4-layer',
    'type': 'line',
    'source': 'sector4',  
    'layout': {},
    'paint': {
        'line-color': '#FF0000',
        'line-width': 2
    }
});

/////////////// SE INGRESA CODIGO SECTOR 5
mapboxMap.addSource('sector5', {
    'type': 'geojson',
    'data': './JS/geojson/sector5pol.json'
});

mapboxMap.addLayer({
    'id': 'sector5-layer',
    'type': 'line',
    'source': 'sector5',  
    'layout': {},
    'paint': {
        'line-color': '#FF0000',
        'line-width': 2
    }
});


/////////////// SE INGRESA CODIGO SECTOR 6
mapboxMap.addSource('sector6', {
    'type': 'geojson',
    'data': './JS/geojson/sector6pol.json'
});

// TRAZO DEL SECTOR6
mapboxMap.addLayer({
    'id': 'sector6-line-layer', 
    'type': 'line',
    'source': 'sector6',
    'layout': {},
    'paint': {
        'line-color': '#FF0000',
        'line-width': 1
    }
});


 /////// MIDACC
 /* esta parte es mejor silenciarla porque el midacc viene como default en el mapa style

 mapboxMap.addSource('midacc', {
    'type': 'geojson',
    'data': './JS/geojson/midacctrack.json'
});


    mapboxMap.addLayer({
        'id': 'midacc-layer',
        'type': 'line',
        'source': 'midacc',  // corrected the source name
        'layout': {},
        'paint': {
          'line-color': '#FF0000',  // This is red
            'line-width': 2
        }
    });

    mapboxMap.addLayer({
    'id': 'midacc-text',
    'type': 'symbol',
    'source': 'midacc',
    'layout': {
        'text-field': '{Name}',  
        'text-size': 14,
        'symbol-placement': 'line',
        'text-justify': 'center',
        'text-offset': [0, -.5]  
    },
    'paint': {
        'text-color': '#000'
    }
});
*/

const labelPoint = {
    "type": "Feature",
    "properties": {
        "Name": "MERIDA CENTER"
    },
    "geometry": {
        "type": "Point",
        "coordinates": [-90, 20]
    }
};
mapboxMap.addSource('label-point', {
    'type': 'geojson',
    'data': labelPoint
});

mapboxMap.addLayer({
    'id': 'midacc-info',
    'type': 'symbol',
    'source': 'label-point',
    'layout': {
        'text-field': [
            'format',
            'SEC1', {}, 
            '\n', {},
            '128.3', {}
        ],
        'text-size': 14,
        'symbol-placement': 'point',
        'text-justify': 'center',
        'text-offset': [0, 0]
    },
    'paint': {
        'text-color': '#000'
    }
});
}); //aquÍ se cierra llaves de dibujar sectores.