function cleanValue(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim();
}

export function escapeHtml(value) {
  const source = String(value ?? "");
  return source
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function parseDescription(description) {
  const rawText = typeof description === "string" ? description : "";
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const fields = {};

  for (const line of lines) {
    const separator = line.indexOf(":");
    if (separator === -1) {
      continue;
    }

    const key = cleanValue(line.slice(0, separator)).toLowerCase();
    const value = cleanValue(line.slice(separator + 1));

    if (key.length > 1 && key.length < 40 && value) {
      fields[key] = value;
    }
  }

  const featureName = fields["feature name"] || "";
  const commemoratedName = fields["commemorated name"] || "";
  const biography = fields.biography || cleanValue(rawText);
  const givenNames = fields["given names"] || "";
  const title = fields.title || "";
  const alias = fields.alias || "";

  const labelledValues = [
    { label: "Feature name", value: featureName },
    { label: "Commemorated name", value: commemoratedName },
    { label: "Given names", value: givenNames },
    { label: "Title", value: title },
    { label: "Alias", value: alias },
  ].filter((entry) => entry.value && entry.value.toLowerCase() !== "none");

  return {
    featureName,
    commemoratedName,
    biography,
    labelledValues,
  };
}

export function formatBiographyPreview(text, maxLength = 340) {
  const cleaned = cleanValue(text);
  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, maxLength).trim()}...`;
}

export function getLabelValue(parsed, label) {
  return parsed.labelledValues.find((item) => item.label === label)?.value || "";
}

export function buildNamedAfterLabel({
  commemoratedName,
  givenNames,
  title,
  fallbackName = "",
}) {
  const fullName = [title, givenNames, commemoratedName]
    .map((piece) => cleanValue(piece))
    .filter(Boolean)
    .join(" ");

  return fullName || cleanValue(fallbackName) || "Not specified";
}
