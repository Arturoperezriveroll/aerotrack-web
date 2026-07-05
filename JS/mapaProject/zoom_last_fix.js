
document.getElementById('zoomToLastFix').addEventListener('click', function() {
    if (polylinePoints.length > 0) {
        const lastFix = polylinePoints[polylinePoints.length - 1];

        // Function to start rotating the map
        function rotateMap() {
            const currentBearing = mapboxMap.getBearing();
    mapboxMap.setBearing(currentBearing + .5); // Increase this value to speed up rotation
            requestAnimationFrame(rotateMap);
        }

        // Zoom to the last fix
        mapboxMap.flyTo({
            center: lastFix,
            pitch: 75,
            bearing: 330,
            zoom: 8
        });

        // Listen for the end of the flyTo animation
        mapboxMap.once('moveend', function() {
            rotateMap();
        });
    }
}); 