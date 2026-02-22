import {
  buildNamedAfterLabel,
  formatBiographyPreview,
  getLabelValue,
  parseDescription,
} from "../utils/formatters";

function ResultCard({ feature, index, onLearnMore }) {
  const attrs = feature?.attributes || {};
  const parsed = parseDescription(attrs.DESCRIPTION || "");

  const namedAfter = buildNamedAfterLabel({
    commemoratedName: parsed.commemoratedName,
    givenNames: getLabelValue(parsed, "Given names"),
    title: getLabelValue(parsed, "Title"),
    fallbackName: attrs.OTHER_NAME || attrs.NAME || "",
  });

  return (
    <article className="result-card" style={{ "--card-index": index }}>
      <header>
        <h3>{attrs.NAME || "Unknown"}</h3>
        <p className="category-pill">{attrs.CATEGORY_NAME || "Uncategorised"}</p>
      </header>

      <p className="named-after">
        <span>Named after</span>
        {namedAfter}
      </p>

      {parsed.featureName && <p className="feature-name">{parsed.featureName}</p>}

      {parsed.labelledValues.length > 0 && (
        <ul className="meta-list">
          {parsed.labelledValues.map((entry) => (
            <li key={`${attrs.OBJECTID}-${entry.label}`}>
              <span>{entry.label}</span>
              <strong>{entry.value}</strong>
            </li>
          ))}
        </ul>
      )}

      <p className="bio-preview">{formatBiographyPreview(parsed.biography)}</p>
      <button type="button" className="learn-more-btn" onClick={() => onLearnMore(feature)}>
        Learn more
      </button>
    </article>
  );
}

export default function ResultsPanel({ features, exceededTransferLimit, onLearnMore }) {
  if (features.length === 0) {
    return (
      <article className="empty-state">
        <h3>No matches</h3>
        <p>Try a broader search term or switch categories.</p>
      </article>
    );
  }

  return (
    <>
      {features.map((feature, index) => (
        <ResultCard
          key={feature?.attributes?.OBJECTID || `${feature?.attributes?.NAME || "entry"}-${index}`}
          feature={feature}
          index={index}
          onLearnMore={onLearnMore}
        />
      ))}

      {exceededTransferLimit && (
        <article className="notice-card">
          <p>
            Showing the first {features.length} matches. Refine search text or category for tighter
            results.
          </p>
        </article>
      )}
    </>
  );
}
