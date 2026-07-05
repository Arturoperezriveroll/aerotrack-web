 // empieza codigo para obtener una direccion a partir de hacer click sobre un punto sobre el mapa
const click = document.getElementById('lugar');

if (typeof mapboxMap === 'undefined') {
  console.warn('Mapbox map is not initialized; address and weather click handlers were skipped.');
} else {
    
mapboxMap.on('click', function (e) {
  var lat = e.lngLat.lat; // Note: Corrected from e.lngLat.lng
  var lon = e.lngLat.lng; // Note: Corrected from e.lngLat.lat
  var url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' + lon + ',' + lat + '.json?access_token=' + mapboxgl.accessToken;

    xmlHttp = null;
    xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", url, false);
    xmlHttp.send();
    
      if (xmlHttp.status === 200) {
        var responseJSON = JSON.parse(xmlHttp.responseText);
        if (responseJSON.features && responseJSON.features.length > 0) {
          var placename = responseJSON.features[0].place_name;
          click.innerHTML = 'Aprox sobre: '+ placename;
           
        } 
        else 
        {
          click.innerHTML = "No results found";
        }
        } else 
        {
        click.innerHTML = "Error fetching data";
        }
      console.log(responseJSON);

// Call fetchWeatherData for the current click
fetchWeatherData(lat, lon);

// Function to fetch weather data
function fetchWeatherData(lat, lon) {
    const apiKey = '200b3b85b8a2baab15f0054b3586877f';
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`;

    fetch(apiUrl)
        .then((response) => response.json())
        .then((data) => {
            const temperature = data.main.temp;
            const temperatureInCelsiusRounded = (temperature - 273.15).toFixed(1);
            const weatherDescription = data.weather[0].description;
            const groundLevelPressure = data.main.grnd_level;
            const humidity = data.main.humidity;
            const vis = data.visibility;
            const visKm = (vis/1000);
            const visSm = visKm/1.15;
            const visSmFormat = Math.round(visSm).toString().padStart(2,'0');
            const wd = data.wind.deg; // Your original wind degree value
            let wdFormat = Math.round(wd).toString().padStart(3, '0'); // Converts and formats to a 3-digit string
            const ws = data.wind.speed;
            const wskt = ((ws * 3600)/1000)/1.852; // Convert m/s to kmh
            let wsFormat = Math.round(wskt).toString().padStart(2, '0'); // Formats to a 2-digit string
            // Create a popup to display the weather information
            const unixTimestamp = data.dt; // Your Unix timestamp
            const date = new Date(unixTimestamp * 1000); // Convert to milliseconds
            const localTime = date.toLocaleString(); // Converts to local time string
            const unixSr = data.sys.sunrise;
            const srDate = new Date(unixSr * 1000); // Convert to milliseconds
            const srUTCTime = srDate.toISOString().split('T')[1].split('.')[0]; // Extracts only the time part
            const unixSs = data.sys.sunset;
            const ssDate = new Date(unixSs * 1000); // Convert to milliseconds
            const ssUTCTime = ssDate.toISOString().split('T')[1].split('.')[0]; // Extracts only the time part
            // Create a popup to display the weather information

            // Additional console logging
            console.log(data);
            console.log(temperatureInCelsiusRounded);
            console.log(weatherDescription);
            console.log(lat);
            console.log(lon);
            console.log (visSmFormat);
        // Also update .wx div content
        const wxDiv = document.querySelector('.wx');
            wxDiv.innerHTML = `<p>WX Temperatura: <strong>${temperatureInCelsiusRounded}°C</strong>
                  Weather: <strong>${weatherDescription}</strong>
                  Presion: <strong>${groundLevelPressure} hPa</strong>
                  Humedad: <strong>${humidity} %</strong>
                  Visibilidad: <strong>${visSmFormat} SM</strong>
                  Viento: <strong>${wdFormat}° ${wsFormat}KT</strong>
                  Sunrise: <strong>${srUTCTime} UTC</strong>
                  Sunset: <strong>${ssUTCTime} UTC</strong></p>`;
        })
        .catch((error) => {
            console.error('Error fetching weather data:', error);
        });
}
});
}
