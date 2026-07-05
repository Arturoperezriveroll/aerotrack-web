
////// SE DECLARAN VARIABLES DE LA BRL 
let startCoordinates = null;
let endCoordinates = null;
let previewCoordinates = null; // Preview endpoint
let bearing = null;
let distance = null;
let popup; // To store the current popup


 // Add a text element for displaying bearing and distance
 const bearingDistanceText = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false
  });

let currentMousePosition = null;

 /////////ACTUALIZAMOS LA BRL
  function updateBRL() {
    if (startCoordinates && (endCoordinates || previewCoordinates)) {
      map.getSource('line-source').setData({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [startCoordinates, endCoordinates || previewCoordinates]
        }
      });
    } else {
      map.getSource('line-source').setData({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [] // Empty coordinates will remove the line
        }
      });
    }
  }
  
  // Update start and preview coordinates as the pointer moves
  map.on('mousemove', (e) => {
    currentMousePosition = e.lngLat.toArray();
    if (startCoordinates && !endCoordinates) {
        previewCoordinates = e.lngLat.toArray();
        updateBRL();
        
        // Calculate bearing and distance
        bearing = turf.bearing(
            turf.point(startCoordinates),
            turf.point(previewCoordinates)
        );

         // Normalize bearing to 0-360° range
        if (bearing < 0) {
            bearing += 360;
        }
        distance = turf.distance(
            turf.point(startCoordinates),
            turf.point(previewCoordinates)
        );

        // Convert distance from kilometers to nautical miles
        const distanceInNM = distance * 0.53996;

        if (popup) {
            popup.remove(); // Remove previous popup if it exists
        }
    
        popup = new mapboxgl.Popup({ 
            anchor: 'bottom',
            offset: [0, -5] // x, y - This will shift the popup 50 pixels upwards
        })
        .setLngLat(previewCoordinates)
        .setHTML(`
            <div class="custom-popup"> 
                <p>${Math.round(bearing)}°<br>
                    ${Math.round(distanceInNM)} NM</p>
            </div>`)
        .addTo(map);     
}
});
  
function fetchMagneticDeclination() {
    if (startCoordinates && endCoordinates) {
      // Convert distance from kilometers to nautical miles
      const distanceInNM = distance * 0.53996;
      let url = 'https://geomag.amentum.io/wmm/magnetic_field?';
      let params = new URLSearchParams({
          year: new Date().getFullYear() + (new Date().getMonth() + 1) / 12,
          latitude: endCoordinates[1],
          longitude: endCoordinates[0],
          altitude: 10
      });
      var requestOptions = {
          method: 'GET',
          redirect: 'follow',
          headers: {'API-Key': 'fp5YpdCwQQcObxTp94oIGNp7F7HBu8Ld'}
      };
  
      fetch(url + params, requestOptions)
          .then(response => response.json())
          .then(data => {
              const decMag = data.declination.value;
              let rumboMagnetico = bearing - decMag;
  
              // Normalize magnetic bearing to 0-360° range
              while (rumboMagnetico >= 360) {
                  rumboMagnetico -= 360;
              }
              while (rumboMagnetico < 0) {
                  rumboMagnetico += 360;
              }
  
              popup = new mapboxgl.Popup({ 
                  anchor: 'bottom',
                  offset: [0, -5]
              })
              .setLngLat(endCoordinates)
              .setHTML(`
                  <div class="custom-popup"> 
                      <p>${Math.round(rumboMagnetico)}°<br>
                          ${Math.round(distanceInNM)} NM</p>
                  </div>`)
              .addTo(map);
          })
          .catch(error => console.log('error', error));
    }
  }
  
///EVENT LISTENER PARA LAS LETRAS
document.addEventListener('keydown', (e) => {
    if (currentMousePosition) {
      if (e.key.toLowerCase() === 's') {
        startCoordinates = currentMousePosition;
        updateBRL();
      } else if (e.key.toLowerCase() === 'e') {
        endCoordinates = currentMousePosition;
        updateBRL();
        fetchMagneticDeclination(); // Call the new function here
      }
    }
  });

    // Erase BRL on right-click
    map.on('contextmenu', function(e) { 
        startCoordinates = null;
        endCoordinates = null;
        previewCoordinates = null;
        borrarpopup();  // remove the popup
        updateBRL();  // update the BRL
    });
    
    function borrarpopup() {  // declare the function outside the event listener
        if (popup) {
            popup.remove();
            popup = null;
        }
    }


// Add BRL line
map.on('load', () => {
    map.addSource('line-source', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: []
        }
      }
    });
  
    map.addLayer({
      id: 'line-layer',
      type: 'line',
      source: 'line-source',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      }, 
      paint: {
        'line-color': 'yellow',
        'line-width': 3
      }
    });
  });


