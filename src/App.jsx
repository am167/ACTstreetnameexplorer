import { useEffect, useMemo, useRef, useState } from "react";
import { ActPlaceNamesClient, DEFAULT_LAYER_URL } from "./api/actPlaceNamesClient";
import MapPanel from "./components/MapPanel";
import ResultsPanel from "./components/ResultsPanel";
import SearchControls from "./components/SearchControls";

const SEARCH_DEBOUNCE_MS = 320;
const SEARCH_LIMIT = 80;
const INITIAL_VISIBLE_COUNT = 5;
const VISIBLE_STEP = 5;

const client = new ActPlaceNamesClient();

function useDebouncedValue(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function App() {
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [searchSeed, setSearchSeed] = useState(0);
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [features, setFeatures] = useState([]);
  const [exceededTransferLimit, setExceededTransferLimit] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const [status, setStatus] = useState({ message: "", tone: "neutral" });
  const [ready, setReady] = useState(false);
  const requestIdRef = useRef(0);

  const debouncedInput = useDebouncedValue(queryInput.trim(), SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    setQuery(debouncedInput);
  }, [debouncedInput]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setStatus({ message: "Loading ACT place-name metadata...", tone: "loading" });

      try {
        const info = await client.getLayerInfo();
        if (!cancelled) {
          setStatus({ message: `Loaded ${info?.name || "ACT place names"}.`, tone: "success" });
        }
      } catch (error) {
        if (!cancelled) {
          setStatus({ message: `Metadata load failed: ${error.message}`, tone: "warn" });
        }
      }

      try {
        const list = await client.getCategories();
        if (!cancelled) {
          setCategories(list);
        }
      } catch (error) {
        if (!cancelled) {
          setStatus({ message: `Category filter unavailable: ${error.message}`, tone: "warn" });
        }
      }

      if (!cancelled) {
        setReady(true);
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    let cancelled = false;
    const requestId = ++requestIdRef.current;

    async function runSearch() {
      setStatus({ message: "Searching ACT place names...", tone: "loading" });

      try {
        const result = await client.searchPlaces({
          query,
          category,
          limit: SEARCH_LIMIT,
          includeGeometry: true,
        });

        if (cancelled || requestId !== requestIdRef.current) {
          return;
        }

        setFeatures(result.features);
        setVisibleCount(INITIAL_VISIBLE_COUNT);
        setExceededTransferLimit(result.exceededTransferLimit);

        const querySummary = query ? ` for \"${query}\"` : "";
        const categorySummary = category ? ` in ${category}` : "";
        setStatus({
          message: `Showing ${result.features.length} result${
            result.features.length === 1 ? "" : "s"
          }${querySummary}${categorySummary}.`,
          tone: "success",
        });
      } catch (error) {
        if (cancelled || requestId !== requestIdRef.current) {
          return;
        }

        setFeatures([]);
        setExceededTransferLimit(false);
        setStatus({ message: `Search failed: ${error.message}`, tone: "error" });
      }
    }

    runSearch();

    return () => {
      cancelled = true;
    };
  }, [query, category, ready, searchSeed]);

  function handleSubmit(event) {
    event.preventDefault();
    setQuery(queryInput.trim());
    setSearchSeed((seed) => seed + 1);
  }

  function handleClear() {
    setQueryInput("");
    setQuery("");
    setCategory("");
    setVisibleCount(INITIAL_VISIBLE_COUNT);
    setSearchSeed((seed) => seed + 1);
  }

  function handleShowMore() {
    setVisibleCount((current) => Math.min(current + VISIBLE_STEP, features.length));
  }

  function handleShowAll() {
    setVisibleCount(features.length);
  }

  const resultCount = useMemo(() => features.length, [features]);
  const visibleFeatures = useMemo(
    () => features.slice(0, Math.min(visibleCount, features.length)),
    [features, visibleCount]
  );
  const hiddenCount = Math.max(features.length - visibleFeatures.length, 0);

  return (
    <div className="page-shell">
      <header className="hero">
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
          category={category}
          onCategoryChange={setCategory}
          categories={categories}
        />

        <p className="status" data-tone={status.tone} role="status" aria-live="polite">
          {status.message}
        </p>
      </header>

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
            <ResultsPanel features={visibleFeatures} exceededTransferLimit={exceededTransferLimit} />
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
