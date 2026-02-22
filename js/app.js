import { ActPlaceNamesClient, DEFAULT_LAYER_URL } from "./actPlaceNamesClient.js";
import {
  buildNamedAfterLabel,
  escapeHtml,
  formatBiographyPreview,
  parseDescription,
} from "./formatters.js";

const SEARCH_DEBOUNCE_MS = 320;
const SEARCH_LIMIT = 80;

const client = new ActPlaceNamesClient();

const state = {
  query: "",
  category: "",
  lastRequestId: 0,
  map: null,
  markerLayer: null,
};

const elements = {
  form: document.getElementById("searchForm"),
  searchInput: document.getElementById("searchInput"),
  categorySelect: document.getElementById("categorySelect"),
  clearBtn: document.getElementById("clearBtn"),
  status: document.getElementById("status"),
  results: document.getElementById("results"),
  countBadge: document.getElementById("resultCountBadge"),
};

function debounce(callback, wait) {
  let timeoutId;
  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => callback(...args), wait);
  };
}

function setStatus(message, tone = "neutral") {
  elements.status.textContent = message;
  elements.status.dataset.tone = tone;
}

function initMap() {
  state.map = window.L.map("map", {
    scrollWheelZoom: false,
    zoomControl: true,
  }).setView([-35.2809, 149.13], 11);

  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(state.map);

  state.markerLayer = window.L.layerGroup().addTo(state.map);
}

function clearMapMarkers() {
  if (state.markerLayer) {
    state.markerLayer.clearLayers();
  }
}

function updateMap(features) {
  if (!state.map || !state.markerLayer) {
    return;
  }

  clearMapMarkers();

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
    const popupTitle = attrs.NAME || "Unknown";
    const namedAfter = buildNamedAfterLabel({
      commemoratedName: parsed.commemoratedName,
      givenNames: parsed.labelledValues.find((v) => v.label === "Given names")?.value || "",
      title: parsed.labelledValues.find((v) => v.label === "Title")?.value || "",
      fallbackName: attrs.OTHER_NAME || attrs.NAME || "",
    });

    const marker = window.L.marker([lat, lng]).bindPopup(
      `<strong>${escapeHtml(popupTitle)}</strong><br>${escapeHtml(namedAfter)}`
    );

    marker.addTo(state.markerLayer);
  }

  if (validPoints.length > 0) {
    const bounds = window.L.latLngBounds(validPoints);
    state.map.fitBounds(bounds.pad(0.2), { maxZoom: 14 });
  } else {
    state.map.setView([-35.2809, 149.13], 11);
  }
}

function renderEmptyState(message) {
  elements.results.innerHTML = `
    <article class="empty-state">
      <h3>No matches</h3>
      <p>${escapeHtml(message)}</p>
    </article>
  `;
}

function renderResults(features, exceededTransferLimit = false) {
  elements.countBadge.textContent = String(features.length);

  if (features.length === 0) {
    renderEmptyState("Try a broader search term or switch categories.");
    updateMap([]);
    return;
  }

  const cards = features.map((feature, index) => {
    const attrs = feature?.attributes || {};
    const parsed = parseDescription(attrs.DESCRIPTION || "");

    const title = attrs.NAME || "Unknown";
    const category = attrs.CATEGORY_NAME || "Uncategorised";
    const namedAfter = buildNamedAfterLabel({
      commemoratedName: parsed.commemoratedName,
      givenNames: parsed.labelledValues.find((v) => v.label === "Given names")?.value || "",
      title: parsed.labelledValues.find((v) => v.label === "Title")?.value || "",
      fallbackName: attrs.OTHER_NAME || attrs.NAME || "",
    });

    const metaLines = parsed.labelledValues
      .map(
        (entry) =>
          `<li><span>${escapeHtml(entry.label)}</span><strong>${escapeHtml(entry.value)}</strong></li>`
      )
      .join("");

    const biography = formatBiographyPreview(parsed.biography);

    return `
      <article class="result-card" style="--card-index:${index};">
        <header>
          <h3>${escapeHtml(title)}</h3>
          <p class="category-pill">${escapeHtml(category)}</p>
        </header>
        <p class="named-after"><span>Named after</span>${escapeHtml(namedAfter)}</p>
        ${parsed.featureName ? `<p class="feature-name">${escapeHtml(parsed.featureName)}</p>` : ""}
        ${metaLines ? `<ul class="meta-list">${metaLines}</ul>` : ""}
        <p class="bio-preview">${escapeHtml(biography)}</p>
      </article>
    `;
  });

  if (exceededTransferLimit) {
    cards.unshift(`
      <article class="notice-card">
        <p>Showing the first ${features.length} matches. Refine search text or category for tighter results.</p>
      </article>
    `);
  }

  elements.results.innerHTML = cards.join("");
  updateMap(features);
}

async function loadCategories() {
  try {
    const categories = await client.getCategories();

    for (const category of categories) {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      elements.categorySelect.appendChild(option);
    }
  } catch (error) {
    setStatus(`Category filter unavailable: ${error.message}`, "warn");
  }
}

async function runSearch() {
  const requestId = ++state.lastRequestId;

  setStatus("Searching ACT place names...", "loading");

  try {
    const result = await client.searchPlaces({
      query: state.query,
      category: state.category,
      limit: SEARCH_LIMIT,
      includeGeometry: true,
    });

    // Prevent stale render when responses return out of order.
    if (requestId !== state.lastRequestId) {
      return;
    }

    renderResults(result.features, result.exceededTransferLimit);

    const querySummary = state.query ? ` for \"${state.query}\"` : "";
    const categorySummary = state.category ? ` in ${state.category}` : "";
    setStatus(
      `Showing ${result.features.length} result${
        result.features.length === 1 ? "" : "s"
      }${querySummary}${categorySummary}.`,
      "success"
    );
  } catch (error) {
    renderEmptyState("The data service could not be reached right now.");
    clearMapMarkers();
    setStatus(`Search failed: ${error.message}`, "error");
  }
}

function bindEvents() {
  const debouncedSearch = debounce(() => {
    state.query = elements.searchInput.value.trim();
    runSearch();
  }, SEARCH_DEBOUNCE_MS);

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    state.query = elements.searchInput.value.trim();
    runSearch();
  });

  elements.searchInput.addEventListener("input", debouncedSearch);

  elements.categorySelect.addEventListener("change", () => {
    state.category = elements.categorySelect.value;
    runSearch();
  });

  elements.clearBtn.addEventListener("click", () => {
    elements.searchInput.value = "";
    elements.categorySelect.value = "";
    state.query = "";
    state.category = "";
    runSearch();
  });
}

async function init() {
  bindEvents();
  initMap();
  setStatus("Loading ACT place-name metadata...", "loading");

  try {
    const info = await client.getLayerInfo();
    const displayName = info?.name || "ACT place names";
    setStatus(`Loaded ${displayName}.`, "success");
  } catch (error) {
    setStatus(`Metadata load failed: ${error.message}`, "warn");
  }

  await loadCategories();
  await runSearch();
}

init();

const sourceLink = document.getElementById("sourceLink");
if (sourceLink) {
  sourceLink.href = DEFAULT_LAYER_URL;
}
