//funcion para obtener los datos del aeropuerto destino, e informacion metar si disponible
function displayAirportInfo() {
    var airportCode = document.getElementById('destAd').value.toUpperCase();
    var airportInfoDiv = document.getElementById('airportInfo');
    airportInfoDiv.innerHTML = '';

    var airport = mexicoAirports.find(airport => airport.icaoId === airportCode);

    if (airport) {
        airportInfoDiv.innerHTML = '<span><strong>ICAO:</strong> ' + airport.icaoId + ' | </span>';
        airportInfoDiv.innerHTML += '<span><strong>IATA:</strong> ' + airport.iataId + ' | </span>';
        airportInfoDiv.innerHTML += '<span><strong>Pos:</strong> Lat ' + airport.lat + ', Long ' + airport.lon + ' | </span>';
        airportInfoDiv.innerHTML += '<span><strong>Name:</strong> ' + airport.site + ' | </span>';
        airportInfoDiv.innerHTML += '<span><strong>Elevation:</strong> ' + airport.elev + ' | </span>';

        if (airport && airport.runways) {
          airport.runways.forEach(runway => {
            airportInfoDiv.innerHTML += '<span><strong>Rwy:</strong> ' + runway.id + ' </span>';
            airportInfoDiv.innerHTML += '<span><strong>Length:</strong> ' + runway.dimension + ' | </span>';
          });
        } else {
        console.error('Runways data is missing or not an array');
        }

if (airport && airport.freqs) {
    airport.freqs.forEach(freq => {
        airportInfoDiv.innerHTML += '<span><strong>Freq (' + freq.type + '):</strong> ' + freq.freq + ' | </span>';
    });
} else {
    console.error('Frequencies data is missing or not an array');
}
        // Fetching METAR data
        fetchMetarData(airportCode);
    } 
    
    else {
        airportInfoDiv.innerHTML = '<span>Airport not in database yet!</span>';
    }
}

function fetchMetarData(icaoId) {
    const url = `https://5589-189-150-155-57.ngrok-free.app/metar?icaoId=${icaoId}`;
                 
    fetch(url)
    .then(response => response.text())
    .then(text => {
        console.log("Response text:", text); // This will show you the HTML or error page content
        try {
            const data = JSON.parse(text); // Try parsing only if the content is JSON
            displayMetarData(data);
        } catch (e) {
            console.error('JSON Parsing Error:', e);
        }
    })
    .catch(error => {
        console.error('Error fetching METAR data:', error);
    });
}


function displayMetarData(data) {
    console.log('Displaying METAR Data:', data); // Add this to see what data is received
    const airportInfoDiv = document.getElementById('airportInfo');
    
    // Clear previous content to avoid repeated data on each fetch
    airportInfoDiv.innerHTML = '';

    if (data && data.length > 0 && data[0].rawOb) {
        const metar = data[0];
        airportInfoDiv.innerHTML = `<span><strong>METAR Data:</strong> ${metar.rawOb}</span>`;
    } else {
        airportInfoDiv.innerHTML = '<span>No METAR data available.</span>';
    }
}