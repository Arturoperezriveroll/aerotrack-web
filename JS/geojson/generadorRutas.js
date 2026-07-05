// f displayLatLong, para tomar ruta del textbox y tabular la ruta en fixTable, la tabla inferior, de donde posteriormente se toman de nuevo los datos por otras funciones. 


    
    function displayLatLong() {
    const input = document.getElementById('fixes').value.split(' ');
    const table = document.getElementById('fixTable');
    table.innerHTML = ''; // Clear the table content
    console.log('Input:', input);

    let previousFix = null;
    let currentAirway = null;
    let isFirstFixInAirway = true;

    input.forEach(item => {
        const fix = fixesData.find(f => f.nombre === item.trim().toUpperCase());
        console.log('Current Item:', item, 'Fix:', fix);

        if (fix) {
            if (currentAirway) {
                const segment = getSegmentOfAirway(currentAirway, previousFix, fix.nombre);
                console.log('Airway Segment for', currentAirway, ':', segment);

                segment.forEach(fixName => {
                    const segmentFix = fixesData.find(f => f.nombre === fixName);
                    if (segmentFix && !(previousFix === fixName && isFirstFixInAirway)) {
                        addRowToTable(segmentFix, table);
                    }
                });
                isFirstFixInAirway = false;
                currentAirway = null;
            }

            if (!(previousFix === fix.nombre && isFirstFixInAirway)) {
                addRowToTable(fix, table);
            }
            previousFix = fix.nombre;
        } else {
            currentAirway = item.trim().toUpperCase();
            isFirstFixInAirway = true;
        }
    });

    // Handle the case where the last item is an airway without a subsequent fix
    if (currentAirway && previousFix) {
        console.log("Final Segment: Processing airway without a subsequent fix:", currentAirway, "from", previousFix);
        const segment = getSegmentOfAirway(currentAirway, previousFix, null);
        console.log('Final Segment:', segment);

        segment.forEach(fixName => {
            const segmentFix = fixesData.find(f => f.nombre === fixName);
            if (segmentFix) {
                addRowToTable(segmentFix, table);
            }
        });
    }
}

function getSegmentOfAirway(airwayName, startFix, endFix) {
    const airwayObject = airways.find(a => Object.keys(a)[0] === airwayName);
    if (!airwayObject) return [];

    const airway = Object.values(airwayObject)[0];
    let startIndex = airway.indexOf(startFix);
    let endIndex = endFix ? airway.indexOf(endFix) : -1;

    if (startIndex === -1) return [];

    if (endIndex === -1) {
        // If no end fix, return the remaining segment to the end of the airway
        return airway.slice(startIndex + 1);
    }

    // Handle case where the first fix is in reverse order
    if (startIndex > endIndex) {
        return airway.slice(endIndex + 1, startIndex + 1).reverse();
    } else {
        return airway.slice(startIndex + 1, endIndex);
    }
}
    
    // function para añadir los nombres y coordenadas de los fijos a la tabla al hacer click en drawRouteButton
    function addRowToTable(fix, table) {
        const row = `<tr>
            <td>${fix.nombre}</td>
            <td>${fix.coordenadas.latitud}</td>
            <td>${fix.coordenadas.longitud}</td>
        </tr>`;
        table.innerHTML += row;
    }

 
    