# ACT Street Name Origins Explorer (React + Vite)

A React frontend wrapper over the ACT place-names geospatial dataset. Search ACT streets/place names and see who or what each feature is named after.

## Data Source

- Service: `ACTGOV_PLACENAMES` ArcGIS Feature Layer
- Endpoint: `https://services1.arcgis.com/E5n4f1VY84i0xSjy/ArcGIS/rest/services/ACTGOV_PLACENAMES/FeatureServer/0`
- Licence: CC BY 4.0 (ACT Government)

## Features

- Search by street name, commemorated name, or description text
- Category filtering
- Structured card view for naming/origin details
- Leaflet map markers for matching entries
- Responsive desktop/mobile UI

## Run

```bash
npm install
npm run dev
```

Open the local URL shown by Vite (usually `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

## Project Structure

- `src/App.jsx`: app state, search flow, composition
- `src/api/actPlaceNamesClient.js`: ArcGIS query wrapper
- `src/utils/formatters.js`: description parsing and formatting
- `src/components/SearchControls.jsx`: search + filters
- `src/components/ResultsPanel.jsx`: results cards and empty states
- `src/components/MapPanel.jsx`: Leaflet map rendering
- `src/styles.css`: styling and responsiveness
