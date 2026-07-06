# AeroTrack

Static web app for flight route planning, current-position tracking, and nearby traffic display.

This project was separated from the `SISAL PUERTO` website so it can evolve as its own GitHub Pages app.

## Files

- `index.html` is the app entry point.
- `css/mapa_style.css` contains the current UI styles.
- `JS/mapaProject/` contains the main Mapbox, route, tracking, and traffic modules.
- `JS/geojson/` contains aviation datasets used by the map and route tools.
- `JS/mapaProject/route_engine.js` resolves typed routes, fixes, airways, and distance calculations.
- `JS/mapaProject/data_validator.js` checks the navigation database at load time and reports issues in the browser console.

## Local Use

Open `index.html` from a local static server. Browser geolocation and the service worker work best from `https://` or `localhost`.

## Notes

- Runtime keys are loaded from `config.js` / `config.local.js`. Local-only secrets should stay out of Git.
- GitHub Pages builds `config.js` from repository secrets during deploy.
- Current near-term data cleanup: review duplicate fixes and airway references that point to missing fixes.
