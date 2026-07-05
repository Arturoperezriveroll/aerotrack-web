// let routeCoordinates = []; // Declare this outside of your event listeners
// routeCoordinates, waypoints, totalDistance, previousWP, cells, name, lat,long, distanceFromCurrent
// anadirFila
document.getElementById('drawRouteBtn').addEventListener('click', function () {
    // Ensure geolocation has been set
    if (!currentLocation) {
        console.error("Current location is not set. Please wait for geolocation.");
        alert("Please wait for geolocation to set your current location.");
        return;
    }

    const table = document.getElementById('fixTable');
    const rows = table.getElementsByTagName('tr');
    const routeCoordinates = [];
    const waypoints = []; // Store waypoints including name, lat, and lng
    let totalDistance = 0;
    let distance = 0; // Declare distance here for the entire loop
    let previousWaypoint;
    const tbody = document.getElementById('distanceTable').getElementsByTagName('tbody')[0];
    tbody.innerHTML = '';

    for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].getElementsByTagName('td');
        const name = cells[0].innerText;
        const lat = parseFloat(cells[1].innerText);
        const lng = parseFloat(cells[2].innerText);

        if (!isNaN(lat) && !isNaN(lng)) {
            const waypoint = { name, lat, lng };
            routeCoordinates.push([lng, lat]);
            waypoints.push(waypoint);

            if (previousWaypoint) {
                // Update the distance variable instead of redeclaring it
                distance = haversineDistance(previousWaypoint, waypoint, true); // true for miles
                console.log(`Distance from ${previousWaypoint.name} to ${name}: ${distance.toFixed(1)} miles`);
                totalDistance += distance;
            }

            // Calculate distance from the current location
            const distanceFromCurrent = haversineDistance(currentLocation, { lat, lng }, false); // false for kilometers
            console.log(`Distance from Current Location to ${name}: ${distanceFromCurrent.toFixed(2)} km`);

            // Call anadirFila with the new distanceFromCurrent parameter
            anadirFila(waypoint.name, distance, tbody, totalDistance, distanceFromCurrent);
            previousWaypoint = waypoint;
        }
    }

    console.log("All route coordinates:", routeCoordinates);
    console.log(`Total distance: ${totalDistance.toFixed(2)} miles`);

    // SE ELABORA EL MARKER PARA CADA FIJO
    // Add markers and popups for each waypoint
    waypoints.forEach(waypoint => {
        const el1 = new Image();
        el1.src = './JS/svg/icons8-map-marker.svg';
        el1.style.width = '20px';
        el1.style.height = '20px';

        // Create a popup
        let popupHtml = `<div class='my-popup'>${waypoint.name}</div>`;

        new mapboxgl.Marker(el1, { anchor: 'center' }) // Set the anchor to 'center'
            .setLngLat([waypoint.lng, waypoint.lat])
            .setPopup(new mapboxgl.Popup().setHTML(popupHtml))
            .addTo(mapboxMap)
            .getPopup().addTo(mapboxMap); // This line will open the popup automatically

        return [waypoint.lng, waypoint.lat];
    });
});


// Flag to indicate if the table is populated
let tableIsPopulated = false;

// Modified anadirFila to ensure enough cells
//anadir fila se ejecuta al click en drawRouteButton. 
function anadirFila(name, distance, tableBody, totalDistance, distanceFromCurrent) {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    nameCell.innerText = name;
    const distanceCell = document.createElement('td');
    distanceCell.innerText = distance.toFixed(0);
    const totalDistanceCell = document.createElement('td');
    totalDistanceCell.innerText = totalDistance.toFixed(1);
    const distanceFromCurrentCell = document.createElement('td');
    distanceFromCurrentCell.innerText = (distanceFromCurrent * 0.539957).toFixed(1);

    row.appendChild(nameCell);
    row.appendChild(distanceCell);
    row.appendChild(totalDistanceCell);
    row.appendChild(distanceFromCurrentCell);
    tableBody.appendChild(row);
}

