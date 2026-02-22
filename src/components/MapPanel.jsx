import { useEffect, useRef } from "react";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import {
  buildNamedAfterLabel,
  escapeHtml,
  formatBiographyPreview,
  getLabelValue,
  parseDescription,
} from "../utils/formatters";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_CENTER = [-35.2809, 149.13];

function buildPopupHtml(attrs, parsed, namedAfter) {
  const title = attrs.NAME || "Unknown";
  const category = attrs.CATEGORY_NAME || "Uncategorised";
  const biography = formatBiographyPreview(parsed.biography, 220);

  return `
    <article class="popup-card">
      <h4>${escapeHtml(title)}</h4>
      <p class="popup-card__category">${escapeHtml(category)}</p>
      <p><strong>Named after:</strong> ${escapeHtml(namedAfter)}</p>
      ${parsed.featureName ? `<p><strong>Feature name:</strong> ${escapeHtml(parsed.featureName)}</p>` : ""}
      <p class="popup-card__bio">${escapeHtml(biography)}</p>
    </article>
  `;
}

export default function MapPanel({ features }) {
  const mapRef = useRef(null);
  const markerLayerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return undefined;
    }

    const map = L.map(containerRef.current, {
      scrollWheelZoom: false,
      zoomControl: true,
    }).setView(DEFAULT_CENTER, 11);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    const markerLayer = L.layerGroup().addTo(map);

    mapRef.current = map;
    markerLayerRef.current = markerLayer;

    return () => {
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;

    if (!map || !markerLayer) {
      return;
    }

    markerLayer.clearLayers();

    const validPoints = [];

    for (const feature of features) {
      const geometry = feature?.geometry;
      const attrs = feature?.attributes || {};

      if (!geometry || typeof geometry.x !== "number" || typeof geometry.y !== "number") {
        continue;
      }

      const lat = geometry.y;
      const lng = geometry.x;

      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        continue;
      }

      validPoints.push([lat, lng]);

      const parsed = parseDescription(attrs.DESCRIPTION || "");
      const namedAfter = buildNamedAfterLabel({
        commemoratedName: parsed.commemoratedName,
        givenNames: getLabelValue(parsed, "Given names"),
        title: getLabelValue(parsed, "Title"),
        fallbackName: attrs.OTHER_NAME || attrs.NAME || "",
      });

      L.marker([lat, lng])
        .bindPopup(buildPopupHtml(attrs, parsed, namedAfter))
        .addTo(markerLayer);
    }

    if (validPoints.length > 0) {
      map.fitBounds(L.latLngBounds(validPoints).pad(0.2), { maxZoom: 14 });
    } else {
      map.setView(DEFAULT_CENTER, 11);
    }
  }, [features]);

  return <div ref={containerRef} id="map" aria-label="Locations of matching ACT place names" />;
}
