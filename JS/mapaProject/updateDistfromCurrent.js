 // Update distance from current location in the table
// invocated in add_Map_and_get_pos (f geolocateControl)
function updateDistanceFromCurrent(currentLocation) { // el parametro global currentLocation se define en la f geolocate, archivo add_map_and...
    const fixTable = document.getElementById('fixTable');
    const distanceTable = document.getElementById('distanceTable').getElementsByTagName('tbody')[0];
    const fixRows = fixTable.getElementsByTagName('tr');
    const distanceRows = distanceTable.getElementsByTagName('tr');

    // Loop through fixTable rows 
    for (let i = 0; i < fixRows.length; i++) {
        const fixCells = fixRows[i].getElementsByTagName('td');

        if (fixCells.length < 3 || !distanceRows[i]) {
            continue;
        }

        // Get the name, latitude, and longitude from fixTable
        const name = fixCells[0].innerText;
        const lat = parseFloat(fixCells[1].innerText);
        const lng = parseFloat(fixCells[2].innerText);

        // Check for valid coordinates
        if (!isNaN(lat) && !isNaN(lng)) {
            const waypoint = { lat, lng };

            // Calculate distance from the current location
            const distanceFromCurrent = AeroTrackRouteEngine.calculateDistanceNm(currentLocation, waypoint);

            // Update the corresponding row in distanceTable
            const distanceRow = distanceRows[i];
            const distanceCells = distanceRow.getElementsByTagName('td');

            // Update the fourth cell with the calculated distance
            if (distanceCells.length >= 4 && distanceFromCurrent !== null) {
                console.log(`Setting distance: ${distanceFromCurrent.toFixed(1)}`);
                distanceCells[3].innerText = distanceFromCurrent.toFixed(1);
            }

        } else {
            console.log(`Invalid coordinates for waypoint: ${name}`);
        }
    }
}

function getNextFix() {
    console.log("getNextFix called");
    const distanceTable = document.getElementById('distanceTable').getElementsByTagName('tbody')[0];
    const distanceRows = distanceTable.getElementsByTagName('tr');
    
    let shortestDistance = Infinity;
    let closestFixRow = null;
    let closestIndex = -1; // Store the index of the closest fix row

    // Loop through the rows to find the closest waypoint
    for (let i = 0; i < distanceRows.length; i++) {
        const distanceCells = distanceRows[i].getElementsByTagName('td');
        const distancia = parseFloat(distanceCells[3].innerText);

        if (!isNaN(distancia) && distancia < shortestDistance) {
            shortestDistance = distancia;
            closestFixRow = distanceRows[i]; // Store the row for the closest waypoint
            closestIndex = i; // Store the index of the closest waypoint
        }
    }

    // Determine the next fix row (if there's one after the closest)
    let nextFixRow = null;
    if (closestIndex !== -1 && closestIndex + 1 < distanceRows.length) {
        nextFixRow = distanceRows[closestIndex + 1];
    }

    // Reset styles for all rows (remove existing highlight)
    for (let i = 0; i < distanceRows.length; i++) {
        const nameCell = distanceRows[i].getElementsByTagName('td')[0];
        nameCell.style.backgroundColor = ''; // Reset background
        nameCell.style.fontWeight = '';      // Reset font weight
        nameCell.style.color = '';           // Reset text color
    }

    // Apply new style to the closest waypoint row's name cell (td[0])
    if (nextFixRow) {
        const closestNameCell = nextFixRow.getElementsByTagName('td')[0];
        closestNameCell.style.backgroundColor = '#ffeb3b'; // Yellow background
        closestNameCell.style.fontWeight = 'bold';         // Bold text
        closestNameCell.style.color = '#d32f2f';           // Red text
        console.log(`The next WP is: ${nextFixRow.getElementsByTagName('td')[0].innerText}`);
    }

    if (closestFixRow) {
        console.log(`The closest WP is: ${closestFixRow.getElementsByTagName('td')[0].innerText}, Distance: ${shortestDistance.toFixed(2)} NM`);
    }
}
