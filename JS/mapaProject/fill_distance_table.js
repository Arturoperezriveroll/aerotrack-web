function getRouteWaypointsFromFixTable() {
    const table = document.getElementById('fixTable');
    const rows = table.getElementsByTagName('tr');
    const waypoints = [];

    for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].getElementsByTagName('td');

        if (cells.length < 3) {
            continue;
        }

        const name = cells[0].innerText;
        const lat = parseFloat(cells[1].innerText);
        const lng = parseFloat(cells[2].innerText);

        if (!isNaN(lat) && !isNaN(lng)) {
            waypoints.push({ name, lat, lng });
        }
    }

    return waypoints;
}

let routeWaypointMarkers = [];

function clearRouteWaypointMarkers() {
    routeWaypointMarkers.forEach((marker) => marker.remove());
    routeWaypointMarkers = [];
}

function displayRouteDistancesAndMarkers() {
    const tbody = document.getElementById('distanceTable').getElementsByTagName('tbody')[0];
    const waypoints = getRouteWaypointsFromFixTable();
    const routeCoordinates = waypoints.map((waypoint) => [waypoint.lng, waypoint.lat]);
    const currentPosition = typeof currentLocation === 'undefined' ? null : currentLocation;
    const distanceRows = AeroTrackRouteEngine.computeRouteDistances(waypoints, currentPosition);

    tbody.innerHTML = '';
    clearRouteWaypointMarkers();

    distanceRows.forEach((waypoint) => {
        anadirFila(
            waypoint.name,
            waypoint.legDistanceNm,
            tbody,
            waypoint.totalDistanceNm,
            waypoint.distanceFromCurrentNm
        );
    });

    const lastDistanceRow = distanceRows[distanceRows.length - 1];
    console.log("All route coordinates:", routeCoordinates);
    console.log(`Total distance: ${lastDistanceRow ? lastDistanceRow.totalDistanceNm.toFixed(2) : '0.00'} NM`);

    // SE ELABORA EL MARKER PARA CADA FIJO
    // Add markers and popups for each waypoint
    waypoints.forEach(waypoint => {
        const el1 = new Image();
        el1.src = './JS/svg/icons8-map-marker.svg';
        el1.style.width = '20px';
        el1.style.height = '20px';

        // Create a popup
        let popupHtml = `<div class='my-popup'>${waypoint.name}</div>`;

        const marker = new mapboxgl.Marker(el1, { anchor: 'center' }) // Set the anchor to 'center'
            .setLngLat([waypoint.lng, waypoint.lat])
            .setPopup(new mapboxgl.Popup().setHTML(popupHtml))
            .addTo(mapboxMap)
        marker.getPopup().addTo(mapboxMap); // This line will open the popup automatically
        routeWaypointMarkers.push(marker);

        return [waypoint.lng, waypoint.lat];
    });
    return true;
}

const routeDistanceBtn = document.getElementById('drawRouteBtn');
if (routeDistanceBtn) {
    routeDistanceBtn.addEventListener('click', displayRouteDistancesAndMarkers);
}


// Flag to indicate if the table is populated
let tableIsPopulated = false;

// Modified anadirFila to ensure enough cells
//anadir fila se ejecuta al click en drawRouteButton. 
function anadirFila(name, distance, tableBody, totalDistance, distanceFromCurrentNm) {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    nameCell.innerText = name;
    const distanceCell = document.createElement('td');
    distanceCell.innerText = distance.toFixed(0);
    const totalDistanceCell = document.createElement('td');
    totalDistanceCell.innerText = totalDistance.toFixed(1);
    const distanceFromCurrentCell = document.createElement('td');
    distanceFromCurrentCell.innerText = distanceFromCurrentNm === null ? '' : distanceFromCurrentNm.toFixed(1);

    row.appendChild(nameCell);
    row.appendChild(distanceCell);
    row.appendChild(totalDistanceCell);
    row.appendChild(distanceFromCurrentCell);
    tableBody.appendChild(row);
}

