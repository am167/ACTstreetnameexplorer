import { useEffect, useState } from "react";

const WIKI_BASE = "https://en.wikipedia.org/api/rest_v1/page/summary";
const WIKI_SEARCH = "https://en.wikipedia.org/w/api.php";

async function fetchSummary(term, signal) {
  const res = await fetch(`${WIKI_BASE}/${encodeURIComponent(term)}?redirect=true`, { signal });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Wikipedia request failed (${res.status})`);
  return res.json();
}

async function searchAndFetch(term, signal) {
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: term,
    srlimit: "1",
    format: "json",
    origin: "*",
  });
  const res = await fetch(`${WIKI_SEARCH}?${params}`, { signal });
  if (!res.ok) return null;
  const json = await res.json();
  const results = json?.query?.search;
  if (!results?.length) return null;
  return fetchSummary(results[0].title, signal);
}

export function useWikipediaSummary(primaryTerm, fallbackTerm) {
  const [state, setState] = useState({ status: "idle", data: null, error: null });

  useEffect(() => {
    if (!primaryTerm || primaryTerm === "Not specified") {
      setState({ status: "not-found", data: null, error: null });
      return;
    }
    const controller = new AbortController();
    const { signal } = controller;

    async function run() {
      setState({ status: "loading", data: null, error: null });
      try {
        let json = await fetchSummary(primaryTerm, signal);
        if (json === null) json = await searchAndFetch(primaryTerm, signal);
        if (json === null) {
          setState({ status: "not-found", data: null, error: null });
          return;
        }
        if (json.type === "disambiguation") {
          setState({ status: "disambiguation", data: null, error: null });
          return;
        }
        setState({
          status: "success", error: null,
          data: {
            title: json.title || "",
            extract: json.extract || "",
            thumbnail: json.thumbnail?.source ?? null,
            pageUrl: json.content_urls?.desktop?.page || "",
            description: json.description || "",
          },
        });
      } catch (err) {
        if (err.name === "AbortError") return;
        setState({ status: "error", data: null, error: err.message });
      }
    }

    run();
    return () => controller.abort();
  }, [primaryTerm, fallbackTerm]);

  return state;
}
