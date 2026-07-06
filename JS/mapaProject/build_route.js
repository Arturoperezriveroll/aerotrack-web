function buildRoute() {
    if (document.getElementById('destAd')?.value.trim()) {
        displayAirportInfo();
    }

    if (!document.getElementById('fixes')?.value.trim()) {
        updateRouteSummary(null, []);
        return;
    }

    const route = displayLatLong();
    displayRouteLine();
    const distanceRows = displayRouteDistancesAndMarkers();
    updateRouteSummary(route, distanceRows);
}

function updateRouteSummary(route, distanceRows) {
    const summary = document.getElementById('routeSummary');

    if (!summary) {
        return;
    }

    const waypointCount = route?.fixes?.length || 0;
    const lastDistanceRow = Array.isArray(distanceRows)
        ? distanceRows[distanceRows.length - 1]
        : null;
    const totalDistanceNm = lastDistanceRow
        ? `${lastDistanceRow.totalDistanceNm.toFixed(1)} NM`
        : '0.0 NM';

    summary.textContent = route
        ? `${waypointCount} WP | ${totalDistanceNm}`
        : 'FPL data loaded | Route pending';

    if (route?.messages?.length) {
        summary.textContent += ` | ${route.messages.length} aviso(s)`;
        summary.classList.add('has-warning');
    } else {
        summary.classList.remove('has-warning');
    }
}

const buildRouteBtn = document.getElementById('buildRouteBtn');
if (buildRouteBtn) {
    buildRouteBtn.addEventListener('click', buildRoute);
}
