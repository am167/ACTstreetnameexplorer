# ACT Street Names App — Build Summary

## Goal
Rebuild the ACT Government "Where Streets Are Named After" app (originally at https://apps.vertigisstudio.com/web/?app=b785e23ff7a943f1a9c7616205533333). The app lets users search for a street in the ACT (Canberra, Australia) and find out who or what it is named after.

---

## Data Source

**Provider:** ACT Government via ACTMapi (ArcGIS REST services)  
**Licence:** Creative Commons Attribution 4.0 (CC BY 4.0) — free to use and republish with attribution  
**No API key required** — endpoints are publicly accessible

### Primary ArcGIS REST Endpoints (try in order of preference)

1. **ACT Feature Names (basic map layer)**
   ```
   https://data.actmapi.act.gov.au/arcgis/rest/services/actmapi/basic/MapServer/4
   ```

2. **Place Names Themes (dedicated service)**
   ```
   https://data4.actmapi.act.gov.au/arcgis/rest/services/ACT_ADMINISTRATION_AND_CADASTRE/PlaceNamesThemes/MapServer
   ```

3. **Land Administration extract (broader dataset)**
   ```
   https://data.actmapi.act.gov.au/arcgis/rest/services/data_extract/Land_Administration/MapServer
   ```

> **Note:** The exact active endpoint should be confirmed by hitting the URL with `?f=json` and checking for a valid layer list response. The services follow standard Esri ArcGIS REST API conventions.

---

## Querying the Data

Append `/query` to any FeatureServer/MapServer layer endpoint. Example:

```
GET {endpoint}/query?where=NAME+LIKE+'%Mawson%'&outFields=*&f=geojson
```

### Key Query Parameters

| Parameter | Purpose |
|---|---|
| `where` | SQL-style filter, e.g. `NAME='Flynn Drive'` or `NAME LIKE '%Cook%'` |
| `outFields=*` | Return all fields including origin/commemoration text |
| `f=json` or `f=geojson` | Response format |
| `returnGeometry=true/false` | Whether to include coordinates |
| `resultRecordCount` | Max records to return |
| `orderByFields` | Sort results |

### Expected Fields (confirm exact names from `?f=json` layer info)

| Field (likely name) | Description |
|---|---|
| `NAME` | Street/place name |
| `ORIGIN` or `COMMEMORATION` | Who/what it is named after |
| `SUBURB_NAME` or `DISTRICT` | Location context |
| `FEATURE_TYPE` | Type (street, reserve, suburb, etc.) |
| Geometry | Point or line coordinates for mapping |

Retrieve actual field names by calling the layer endpoint with `?f=json` — the `fields` array in the response will list all available attributes.

---

## Full Dataset Download (Alternative / Preferred Approach)

The complete dataset can be bulk-downloaded from the ACT Geospatial Data Catalogue:
```
https://actmapi-actgov.opendata.arcgis.com
```
Search for "ACT Feature Names" or "Place Names". Available formats: **CSV, GeoJSON, KML, Shapefile**.

**Recommended approach:** Download the full dataset as GeoJSON or CSV at build time, bundle or host it statically, and run searches client-side or via a lightweight backend. This avoids dependency on ACT servers at runtime and gives instant search performance.

---

## Recommended App Architecture

### Option A — Static / Client-Side (simplest)
1. Download the full dataset as CSV or GeoJSON once
2. Host it as a static file (or inline in the app)
3. Search/filter entirely in the browser using a JS search library (e.g. Fuse.js for fuzzy search)
4. Display results + optional map using Leaflet or MapLibre GL
5. No backend needed

### Option B — API-Backed (dynamic)
1. On user search, fire a query to the ArcGIS REST endpoint
2. Return and display results
3. Cache responses for repeated queries
4. Map display via Leaflet / MapLibre GL

---

## Core Features to Build

- **Search bar** — by street name (with fuzzy/partial matching)
- **Results panel** — showing street name, suburb, and the commemoration/origin text
- **Map view** — optional, showing where the street is geographically
- **Filter by type** — streets, suburbs, reserves, etc.
- **Attribution** — "Data sourced from ACT Government via ACTMapi, CC BY 4.0"

---

## First Steps for the Agent

1. Fetch `https://data.actmapi.act.gov.au/arcgis/rest/services/actmapi/basic/MapServer/4?f=json` to confirm the layer is live and inspect available fields
2. If unavailable, try the other endpoints listed above
3. Run a test query: `{endpoint}/query?where=1=1&resultRecordCount=5&outFields=*&f=json` to see sample records
4. Determine the correct field names from the response
5. Decide on static download vs live API approach based on dataset size
6. Build search UI and wire up to data source