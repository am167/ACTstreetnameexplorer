const DEFAULT_LAYER_URL =
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
    const query = {
      where: "CATEGORY_NAME IS NOT NULL",
      outFields: "CATEGORY_NAME",
      orderByFields: "CATEGORY_NAME ASC",
      returnDistinctValues: "true",
      returnGeometry: "false",
      f: "json",
    };

    const result = await this.queryRaw(query);
    const values = (result.features || [])
      .map((feature) => feature?.attributes?.CATEGORY_NAME)
      .filter((name) => typeof name === "string" && name.trim() !== "")
      .map((name) => name.trim());

    return [...new Set(values)];
  }

  async searchPlaces({
    query = "",
    category = "",
    limit = 60,
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

    const queryParams = {
      where: whereParts.join(" AND "),
      outFields: DEFAULT_OUT_FIELDS.join(","),
      orderByFields: "NAME ASC, OBJECTID ASC",
      resultRecordCount: String(limit),
      resultOffset: String(offset),
      returnGeometry: includeGeometry ? "true" : "false",
      outSR: includeGeometry ? "4326" : undefined,
      f: "json",
    };

    const result = await this.queryRaw(queryParams);

    return {
      features: result.features || [],
      exceededTransferLimit: Boolean(result.exceededTransferLimit),
      count: (result.features || []).length,
    };
  }

  async queryRaw(params = {}) {
    const url = new URL(`${this.layerUrl}/query`);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });

    const response = await fetch(url);
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

export { DEFAULT_LAYER_URL };
