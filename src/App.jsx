import { useEffect, useMemo, useState } from "react";
import {
  ActPlaceNamesClient,
  DEFAULT_LAYER_URL,
  compareByNameThenId,
  normalizeText,
  scoreFeatureRelevance,
} from "./api/actPlaceNamesClient";
import FeatureModal from "./components/FeatureModal";
import MapPanel from "./components/MapPanel";
import ResultsPanel from "./components/ResultsPanel";
import SearchControls from "./components/SearchControls";
import StatsPanel from "./components/StatsPanel";
import { useDatasetStats } from "./hooks/useDatasetStats";

const SEARCH_LIMIT = 80;
const INITIAL_VISIBLE_COUNT = 5;
const VISIBLE_STEP = 5;

const client = new ActPlaceNamesClient();

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const [queryInput, setQueryInput] = useState("");
  const [scope, setScope] = useState("all");
  const [division, setDivision] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sortBy, setSortBy] = useState("relevance");
  const [allFeatures, setAllFeatures] = useState(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const [status, setStatus] = useState({ message: "", tone: "neutral" });
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState("search");

  useEffect(() => {
    const controller = new AbortController();

    async function bootstrap() {
      setStatus({ message: "Loading ACT place names...", tone: "loading" });

      try {
        const info = await client.getLayerInfo();
        setStatus({ message: `Loading ${info?.name || "ACT place names"}...`, tone: "loading" });
      } catch {
        // non-fatal — keep loading
      }

      try {
        const features = await client.fetchAllFeatures({
          signal: controller.signal,
          onProgress: (n) =>
            setStatus({ message: `Loading ACT place names... (${n} loaded)`, tone: "loading" }),
        });
        setAllFeatures(features);
        setStatus({ message: `Loaded ${features.length} place names.`, tone: "success" });
        setReady(true);
      } catch (err) {
        if (err.name === "AbortError") return;
        setStatus({ message: `Failed to load data: ${err.message}`, tone: "error" });
      }
    }

    bootstrap();
    return () => controller.abort();
  }, []);

  const categories = useMemo(() => {
    if (!allFeatures) return [];
    const seen = new Set();
    const result = [];
    for (const f of allFeatures) {
      const c = f.attributes?.CATEGORY_NAME;
      if (c && !seen.has(c)) {
        seen.add(c);
        result.push(c);
      }
    }
    return result.sort();
  }, [allFeatures]);

  const divisions = useMemo(() => {
    if (!allFeatures) return [];
    const seen = new Set();
    const result = [];
    for (const f of allFeatures) {
      const d = f.attributes?.DIVISION_CODE;
      if (d && !seen.has(d)) {
        seen.add(d);
        result.push(d);
      }
    }
    return result.sort();
  }, [allFeatures]);

  const features = useMemo(() => {
    if (!allFeatures) return [];

    const trimmed = queryInput.trim();
    const normalizedQuery = normalizeText(trimmed);

    let results = allFeatures;

    if (selectedCategories.length > 0) {
      results = results.filter((f) => selectedCategories.includes(f.attributes?.CATEGORY_NAME));
    }

    if (division) {
      results = results.filter((f) => f.attributes?.DIVISION_CODE === division);
    }

    if (normalizedQuery) {
      results = results.filter((f) => {
        const a = f.attributes || {};
        if (scope === "name") {
          return (
            normalizeText(a.NAME).includes(normalizedQuery) ||
            normalizeText(a.OTHER_NAME || "").includes(normalizedQuery)
          );
        } else if (scope === "biography") {
          return normalizeText(a.DESCRIPTION || "").includes(normalizedQuery);
        }
        return (
          normalizeText(a.NAME).includes(normalizedQuery) ||
          normalizeText(a.OTHER_NAME || "").includes(normalizedQuery) ||
          normalizeText(a.DESCRIPTION || "").includes(normalizedQuery)
        );
      });
      results = results
        .map((f, i) => ({ f, i, score: scoreFeatureRelevance(f, normalizedQuery) }))
        .sort((a, b) => {
          if (sortBy === "name") {
            return String(a.f.attributes?.NAME || "").localeCompare(String(b.f.attributes?.NAME || ""));
          }
          if (sortBy === "category") {
            const catCmp = String(a.f.attributes?.CATEGORY_NAME || "").localeCompare(
              String(b.f.attributes?.CATEGORY_NAME || "")
            );
            if (catCmp !== 0) return catCmp;
            return String(a.f.attributes?.NAME || "").localeCompare(String(b.f.attributes?.NAME || ""));
          }
          return b.score - a.score || compareByNameThenId(a.f, b.f) || a.i - b.i;
        })
        .map(({ f }) => f);
    } else {
      if (sortBy === "category") {
        results = [...results].sort((a, b) => {
          const catCmp = String(a.attributes?.CATEGORY_NAME || "").localeCompare(
            String(b.attributes?.CATEGORY_NAME || "")
          );
          if (catCmp !== 0) return catCmp;
          return compareByNameThenId(a, b);
        });
      } else {
        results = [...results].sort(compareByNameThenId);
      }
    }

    return results.slice(0, SEARCH_LIMIT);
  }, [allFeatures, queryInput, selectedCategories, division, scope, sortBy]);

  useEffect(() => {
    if (!ready) return;
    const querySummary = queryInput.trim() ? ` for "${queryInput.trim()}"` : "";
    const categorySummary = selectedCategories.length > 0 ? ` in ${selectedCategories.join(", ")}` : "";
    const divisionSummary = division ? ` (${division})` : "";
    setStatus({
      message: `Showing ${features.length} result${features.length === 1 ? "" : "s"}${querySummary}${categorySummary}${divisionSummary}.`,
      tone: "success",
    });
  }, [features, queryInput, selectedCategories, division, ready]);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }, [queryInput, selectedCategories, division, scope, sortBy]);

  function handleSubmit(e) {
    e.preventDefault();
  }

  function handleClear() {
    setQueryInput("");
    setScope("all");
    setDivision("");
    setSelectedCategories([]);
    setSortBy("relevance");
  }

  function handleShowMore() {
    setVisibleCount((current) => Math.min(current + VISIBLE_STEP, features.length));
  }

  function handleShowAll() {
    setVisibleCount(features.length);
  }

  const stats = useDatasetStats(allFeatures);

  const resultCount = features.length;
  const visibleFeatures = useMemo(
    () => features.slice(0, Math.min(visibleCount, features.length)),
    [features, visibleCount]
  );
  const hiddenCount = Math.max(features.length - visibleFeatures.length, 0);

  return (
    <div className="page-shell">
      <header className="hero">
        <button
          className={`theme-toggle${darkMode ? " theme-toggle--dark" : ""}`}
          onClick={() => setDarkMode((d) => !d)}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          <span aria-hidden="true">☀</span>
          <span className="theme-toggle__track">
            <span className="theme-toggle__thumb" />
          </span>
          <span aria-hidden="true">☽</span>
        </button>
        <p className="eyebrow">ACT Place Names</p>
        <h1>Street Name Origins Explorer</h1>
        <p className="intro">
          A clean wrapper over the ACT geospatial place-name dataset. Search by street or commemorated
          person, then browse origin details and map locations.
        </p>

        <SearchControls
          queryInput={queryInput}
          onQueryInputChange={setQueryInput}
          onSubmit={handleSubmit}
          onClear={handleClear}
          scope={scope}
          onScopeChange={setScope}
          division={division}
          onDivisionChange={setDivision}
          divisions={divisions}
          selectedCategories={selectedCategories}
          onSelectedCategoriesChange={setSelectedCategories}
          categories={categories}
          sortBy={sortBy}
          onSortByChange={setSortBy}
        />

        {status.tone === "loading" ? (
          <div className="loading-status" role="status" aria-live="polite">
            <div className="loading-bar" aria-hidden="true">
              <div className="loading-bar__fill" />
            </div>
            <p className="loading-label">{status.message}</p>
          </div>
        ) : (
          <p className="status" data-tone={status.tone} role="status" aria-live="polite">
            {status.message}
          </p>
        )}

        <div className="view-toggle">
          <button
            type="button"
            className={`view-toggle__btn${view === "search" ? " view-toggle__btn--active" : ""}`}
            onClick={() => setView("search")}
          >
            Search
          </button>
          <button
            type="button"
            className={`view-toggle__btn${view === "stats" ? " view-toggle__btn--active" : ""}`}
            onClick={() => setView("stats")}
            disabled={!ready}
          >
            Statistics
          </button>
        </div>
      </header>

      {view === "search" ? (
        <main className="content-grid">
          <section className="panel results-panel">
            <div className="panel-head">
              <h2>Matching Entries</h2>
              <span className="count-badge">{resultCount}</span>
            </div>
            <p className="results-summary">
              Showing {visibleFeatures.length} of {resultCount}
            </p>
            <div className="results">
              <ResultsPanel features={visibleFeatures} exceededTransferLimit={false} onLearnMore={setSelectedFeature} />
            </div>
            {hiddenCount > 0 && (
              <div className="results-actions">
                <button type="button" onClick={handleShowMore}>
                  Show {Math.min(VISIBLE_STEP, hiddenCount)} More
                </button>
                <button type="button" className="ghost" onClick={handleShowAll}>
                  Show All ({resultCount})
                </button>
              </div>
            )}
          </section>

          <aside className="panel map-panel">
            <div className="panel-head">
              <h2>Map View</h2>
            </div>
            <MapPanel features={visibleFeatures} />
          </aside>
        </main>
      ) : (
        <main className="stats-grid">
          <StatsPanel stats={stats} />
        </main>
      )}

      {selectedFeature && (
        <FeatureModal feature={selectedFeature} onClose={() => setSelectedFeature(null)} />
      )}

      <footer className="footer">
        Data sourced from ACT Government via ACTMapi / ArcGIS Online, licensed under CC BY 4.0. {" "}
        <a href={DEFAULT_LAYER_URL} target="_blank" rel="noreferrer noopener">
          Open source layer
        </a>
        {" | "}
        <a
          href="https://github.com/am167/ACTstreetnameexplorer"
          target="_blank"
          rel="noreferrer noopener"
        >
          GitHub
        </a>
      </footer>
    </div>
  );
}
