import { useEffect, useRef } from "react";
import { buildNamedAfterLabel, getLabelValue, parseDescription } from "../utils/formatters";
import { useWikipediaSummary } from "../hooks/useWikipediaSummary";

export default function FeatureModal({ feature, onClose }) {
  const closeButtonRef = useRef(null);
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  const attrs = feature.attributes || {};
  const geo = feature.geometry || null;
  const parsed = parseDescription(attrs.DESCRIPTION || "");
  const namedAfter = buildNamedAfterLabel({
    commemoratedName: parsed.commemoratedName,
    givenNames: getLabelValue(parsed, "Given names"),
    title: getLabelValue(parsed, "Title"),
    fallbackName: attrs.OTHER_NAME || attrs.NAME || "",
  });
  const wikiState = useWikipediaSummary(
    namedAfter,
    parsed.commemoratedName || attrs.OTHER_NAME || ""
  );
  const mapsUrl = geo ? `https://www.google.com/maps?q=${geo.y},${geo.x}` : null;

  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = "";
      previousFocusRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab") {
        const focusable = Array.from(
          dialogRef.current?.querySelectorAll(
            'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          ) || []
        ).filter((el) => !el.disabled);

        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        ref={dialogRef}
      >
        <div className="modal-header">
          <div className="modal-title-group">
            <h2 id="modal-title">{attrs.NAME || "Unknown"}</h2>
            <p className="category-pill">{attrs.CATEGORY_NAME || "Uncategorised"}</p>
          </div>
          <button
            type="button"
            className="modal-close"
            aria-label="Close details"
            ref={closeButtonRef}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p className="named-after">
            <span>Named after</span>
            {namedAfter}
          </p>

          {parsed.biography && (
            <section className="modal-section">
              <p className="modal-section-heading">Biography</p>
              <p className="modal-bio">{parsed.biography}</p>
            </section>
          )}

          {parsed.labelledValues.length > 0 && (
            <section className="modal-section">
              <p className="modal-section-heading">Details</p>
              <ul className="meta-list">
                {parsed.labelledValues.map((entry) => (
                  <li key={`${attrs.OBJECTID}-${entry.label}`}>
                    <span>{entry.label}</span>
                    <strong>{entry.value}</strong>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="modal-section modal-section--wiki">
            <p className="modal-section-heading">
              Wikipedia
              <span
                className="wiki-accuracy-warning"
                data-tip="Wikipedia result is based on a fuzzy search and may not exactly match this street name."
                aria-label="Wikipedia accuracy disclaimer"
              >
                ⚠
              </span>
            </p>

            {wikiState.status === "loading" && (
              <div className="wiki-loading" aria-label="Loading Wikipedia summary">
                <span className="wiki-loading__dot" />
                <span className="wiki-loading__dot" />
                <span className="wiki-loading__dot" />
              </div>
            )}

            {wikiState.status === "success" && (
              <div className="wiki-result">
                {wikiState.data.thumbnail && (
                  <img
                    className="wiki-thumbnail"
                    src={wikiState.data.thumbnail}
                    alt={`Wikipedia thumbnail for ${wikiState.data.title}`}
                  />
                )}
                <div className="wiki-content">
                  {wikiState.data.description && (
                    <p className="wiki-description">{wikiState.data.description}</p>
                  )}
                  <p className="wiki-extract">{wikiState.data.extract}</p>
                  <a
                    href={wikiState.data.pageUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="wiki-link"
                  >
                    Read full article on Wikipedia ↗
                  </a>
                </div>
              </div>
            )}

            {wikiState.status === "not-found" && (
              <p className="wiki-empty">No Wikipedia article found for "{namedAfter}".</p>
            )}

            {wikiState.status === "disambiguation" && (
              <p className="wiki-empty">
                Multiple Wikipedia articles match this name.{" "}
                <a
                  href={`https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(namedAfter)}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="wiki-link"
                >
                  Search Wikipedia ↗
                </a>
              </p>
            )}

            {wikiState.status === "error" && (
              <p className="wiki-empty wiki-empty--error">Could not load Wikipedia summary.</p>
            )}
          </section>

          {attrs.GAZETTAL_INFORMATION && (
            <section className="modal-section">
              <p className="modal-section-heading">Gazettal Information</p>
              <p>{attrs.GAZETTAL_INFORMATION}</p>
            </section>
          )}

          {attrs.DIVISION_CODE && (
            <section className="modal-section">
              <p className="modal-section-heading">Division Code</p>
              <p>{attrs.DIVISION_CODE}</p>
            </section>
          )}

          {mapsUrl && (
            <section className="modal-section">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="modal-maps-link"
              >
                View on Google Maps ↗
              </a>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
