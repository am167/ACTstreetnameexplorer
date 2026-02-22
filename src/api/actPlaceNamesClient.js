export const DEFAULT_LAYER_URL =
  "https://services1.arcgis.com/E5n4f1VY84i0xSjy/ArcGIS/rest/services/ACTGOV_PLACENAMES/FeatureServer/0";

const DEFAULT_OUT_FIELDS = [
  "OBJECTID",
  "NAME",
  "CATEGORY_NAME",
  "DESCRIPTION",
  "GAZETTAL_INFORMATION",
  "OTHER_NAME",
  "DIVISION_CODE",
];

function escapeSqlLiteral(value) {
  return String(value).replace(/'/g, "''");
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

export function compareByNameThenId(a, b) {
  const aAttrs = a?.attributes || {};
  const bAttrs = b?.attributes || {};

  const nameCompare = String(aAttrs.NAME || "").localeCompare(String(bAttrs.NAME || ""));
  if (nameCompare !== 0) {
    return nameCompare;
  }

  return Number(aAttrs.OBJECTID || 0) - Number(bAttrs.OBJECTID || 0);
}

export function scoreFeatureRelevance(feature, normalizedQuery) {
  if (!normalizedQuery) {
    return 0;
  }

  const attrs = feature?.attributes || {};
  const name = normalizeText(attrs.NAME);
  const otherName = normalizeText(attrs.OTHER_NAME);
  const description = normalizeText(attrs.DESCRIPTION);

  let score = 0;

  if (name === normalizedQuery) {
    score += 1000;
  } else if (name.startsWith(normalizedQuery)) {
    score += 800;
  } else if (name.includes(normalizedQuery)) {
    score += 600;
  }

  if (otherName === normalizedQuery) {
    score += 550;
  } else if (otherName.startsWith(normalizedQuery)) {
    score += 350;
  } else if (otherName.includes(normalizedQuery)) {
    score += 250;
  }

  if (description.includes(`commemorated name: ${normalizedQuery}`)) {
    score += 300;
  }
  if (description.includes(`feature name: ${normalizedQuery}`)) {
    score += 250;
  }
  if (description.includes(normalizedQuery)) {
    score += 100;
  }

  return score;
}

export class ActPlaceNamesClient {
  constructor(layerUrl = DEFAULT_LAYER_URL) {
    this.layerUrl = layerUrl;
  }

  async getLayerInfo() {
    const url = new URL(this.layerUrl);
    url.searchParams.set("f", "json");

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load layer info (${response.status})`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || "ArcGIS layer info error");
    }

    return data;
  }

  async getCategories() {
    const params = {
      where: "CATEGORY_NAME IS NOT NULL",
      outFields: "CATEGORY_NAME",
      orderByFields: "CATEGORY_NAME ASC",
      returnDistinctValues: "true",
      returnGeometry: "false",
      f: "json",
    };

    const result = await this.queryRaw(params);
    const values = (result.features || [])
      .map((feature) => feature?.attributes?.CATEGORY_NAME)
      .filter((value) => typeof value === "string" && value.trim().length > 0)
      .map((value) => value.trim());

    return [...new Set(values)];
  }

  async searchPlaces({
    query = "",
    category = "",
    limit = 80,
    offset = 0,
    includeGeometry = true,
  } = {}) {
    const whereParts = ["1=1"];

    if (isNonEmptyString(query)) {
      const safeQuery = escapeSqlLiteral(query.trim());
      whereParts.push(
        `(
          UPPER(NAME) LIKE UPPER('%${safeQuery}%') OR
          UPPER(DESCRIPTION) LIKE UPPER('%${safeQuery}%') OR
          UPPER(OTHER_NAME) LIKE UPPER('%${safeQuery}%')
        )`
      );
    }

    if (isNonEmptyString(category)) {
      const safeCategory = escapeSqlLiteral(category.trim());
      whereParts.push(`CATEGORY_NAME = '${safeCategory}'`);
    }

    const params = {
      where: whereParts.join(" AND "),
      outFields: DEFAULT_OUT_FIELDS.join(","),
      orderByFields: "NAME ASC, OBJECTID ASC",
      // Fetch a wider set when searching so client-side relevance ranking
      // can place strong matches ahead of incidental description matches.
      resultRecordCount: String(isNonEmptyString(query) ? Math.max(limit * 4, 200) : limit),
      resultOffset: String(offset),
      returnGeometry: includeGeometry ? "true" : "false",
      outSR: includeGeometry ? "4326" : undefined,
      f: "json",
    };

    const result = await this.queryRaw(params);
    const normalizedQuery = normalizeText(query);

    let features = result.features || [];

    if (normalizedQuery) {
      features = features
        .map((feature, index) => ({
          feature,
          index,
          score: scoreFeatureRelevance(feature, normalizedQuery),
        }))
        .sort((a, b) => {
          if (b.score !== a.score) {
            return b.score - a.score;
          }

          const nameSort = compareByNameThenId(a.feature, b.feature);
          if (nameSort !== 0) {
            return nameSort;
          }

          return a.index - b.index;
        })
        .map((item) => item.feature);
    } else {
      features = [...features].sort(compareByNameThenId);
    }

    if (features.length > limit) {
      features = features.slice(0, limit);
    }

    return {
      features,
      count: features.length,
      exceededTransferLimit: Boolean(result.exceededTransferLimit),
    };
  }

  async fetchAllFeatures({ signal, onProgress } = {}) {
    const PAGE_SIZE = 1000;
    let offset = 0;
    const all = [];

    while (true) {
      const result = await this.queryRaw({
        where: "1=1",
        outFields: DEFAULT_OUT_FIELDS.join(","),
        orderByFields: "NAME ASC, OBJECTID ASC",
        resultRecordCount: String(PAGE_SIZE),
        resultOffset: String(offset),
        returnGeometry: "true",
        outSR: "4326",
        f: "json",
      }, signal);

      all.push(...(result.features || []));
      onProgress?.(all.length);

      if (!result.exceededTransferLimit) break;
      offset += PAGE_SIZE;
    }

    return all;
  }

  async queryRaw(params = {}, signal) {
    const url = new URL(`${this.layerUrl}/query`);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });

    const response = await fetch(url, signal ? { signal } : undefined);
    if (!response.ok) {
      throw new Error(`Query failed (${response.status})`);
    }

    const data = await response.json();
    if (data.error) {
      const details = Array.isArray(data.error.details)
        ? data.error.details.filter(Boolean).join("; ")
        : "";
      throw new Error(details || data.error.message || "ArcGIS query error");
    }

    return data;
  }
}
