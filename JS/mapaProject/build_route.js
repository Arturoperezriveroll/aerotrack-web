function buildRoute() {
    displayLatLong();
    displayRouteLine();
    displayRouteDistancesAndMarkers();
}

const buildRouteBtn = document.getElementById('buildRouteBtn');
if (buildRouteBtn) {
    buildRouteBtn.addEventListener('click', buildRoute);
}
