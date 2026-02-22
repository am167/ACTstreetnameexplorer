# ACT Street Name Origins Explorer

A lightweight frontend wrapper over the ACT place-names geospatial dataset. It lets you search ACT streets/place names and quickly see who or what each feature is named after.

## Data Source

- Service: `ACTGOV_PLACENAMES` ArcGIS Feature Layer
- Endpoint: `https://services1.arcgis.com/E5n4f1VY84i0xSjy/ArcGIS/rest/services/ACTGOV_PLACENAMES/FeatureServer/0`
- Licence: CC BY 4.0 (ACT Government)

## Features

- Search by street name, commemorated name, or description text
- Filter by category
- Clear card layout for commemorative details and biography snippets
- Map markers for matching results
- Responsive UI for desktop/mobile

## Run Locally

Use any static file server from the project root. For example:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## File Structure

- `index.html`: UI shell
- `styles.css`: visual design and responsiveness
- `js/actPlaceNamesClient.js`: ArcGIS wrapper client
- `js/formatters.js`: description parsing and display formatting
- `js/app.js`: search flow, rendering, and map integration
