# AeroTrack

Static web app for flight route planning, current-position tracking, and nearby traffic display.

This project was separated from the `SISAL PUERTO` website so it can evolve as its own GitHub Pages app.

## Files

- `index.html` is the app entry point.
- `css/mapa_style.css` contains the current UI styles.
- `JS/mapaProject/` contains the main Mapbox, route, tracking, and traffic modules.
- `JS/geojson/` contains aviation datasets used by the map and route tools.

## Local Use

Open `index.html` from a local static server. Browser geolocation and the service worker work best from `https://` or `localhost`.

## Notes

The Mapbox access token is currently blank in `JS/mapaProject/add_map_and_get_pos-1.js`. Add a token before publishing if the configured Mapbox style requires one.
