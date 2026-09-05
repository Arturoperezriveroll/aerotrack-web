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

## Docker

1. Copy the environment template and add your credentials:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Build and start the app:

   ```powershell
   docker compose up --build
   ```

3. Open `http://localhost:8080`.

To stop it, run `docker compose down`. Change `AEROTRACK_PORT` in `.env` if port 8080 is already in use.

For local development, Compose mounts the existing `config.local.js` into the container and does not bake it into the image. If the image is run without Compose, `MAPBOX_ACCESS_TOKEN`, `MAPBOX_STYLE`, and `ADSB_RAPIDAPI_KEY` are used to generate that browser-facing file at startup. Browser-side API credentials are visible to anyone using the web app, so restrict the keys by allowed origin and API permissions where the provider supports it.

The experimental `navcalc-c` command-line project is not required by the web app and is not built into this container.

## Notes

- Runtime keys are loaded from `config.js` / `config.local.js`. Local-only secrets should stay out of Git.
- GitHub Pages builds `config.js` from repository secrets during deploy.
- Current near-term data cleanup: review duplicate fixes and airway references that point to missing fixes.
