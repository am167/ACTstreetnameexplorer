import { useState } from "react";

export default function SearchControls({
  queryInput,
  onQueryInputChange,
  onSubmit,
  onClear,
  scope,
  onScopeChange,
  division,
  onDivisionChange,
  divisions,
  selectedCategories,
  onSelectedCategoriesChange,
  categories,
  sortBy,
  onSortByChange,
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const hasActiveFilters =
    scope !== "all" || division || selectedCategories.length > 0 || sortBy !== "relevance";

  function handleCategoryToggle(cat) {
    if (selectedCategories.includes(cat)) {
      onSelectedCategoriesChange(selectedCategories.filter((c) => c !== cat));
    } else {
      onSelectedCategoriesChange([...selectedCategories, cat]);
    }
  }

  return (
    <form className="search-form" onSubmit={onSubmit} autoComplete="off">
      <label htmlFor="searchInput">Street or commemorated name</label>
      <div className="input-row">
        <input
          id="searchInput"
          type="search"
          value={queryInput}
          onChange={(event) => onQueryInputChange(event.target.value)}
          placeholder="Try Mawson, Flynn, Cook..."
          spellCheck="false"
        />
        <button type="submit">Search</button>
        <button type="button" className="ghost" onClick={onClear}>
          Clear
        </button>
      </div>

      <button
        type="button"
        className={`advanced-toggle${hasActiveFilters ? " advanced-toggle--active" : ""}`}
        onClick={() => setAdvancedOpen((o) => !o)}
        aria-expanded={advancedOpen}
      >
        Advanced {advancedOpen ? "▴" : "▾"}
        {hasActiveFilters && !advancedOpen && <span className="advanced-toggle__dot" aria-hidden="true" />}
      </button>

      {advancedOpen && (
        <div className="advanced-panel">
          <div className="advanced-field">
            <span className="advanced-label">Search in</span>
            <div className="radio-group">
              {[
                { value: "all", label: "All fields" },
                { value: "name", label: "Name only" },
                { value: "biography", label: "Biography only" },
              ].map(({ value, label }) => (
                <label key={value} className="radio-label">
                  <input
                    type="radio"
                    name="scope"
                    value={value}
                    checked={scope === value}
                    onChange={() => onScopeChange(value)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="advanced-field">
            <label htmlFor="divisionSelect" className="advanced-label">Division</label>
            <select
              id="divisionSelect"
              value={division}
              onChange={(e) => onDivisionChange(e.target.value)}
            >
              <option value="">All divisions</option>
              {divisions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="advanced-field">
            <span className="advanced-label">
              Categories
              {selectedCategories.length > 0 && (
                <span className="advanced-label__count"> ({selectedCategories.length} selected)</span>
              )}
            </span>
            <div className="checkbox-list">
              {categories.map((cat) => (
                <label key={cat} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat)}
                    onChange={() => handleCategoryToggle(cat)}
                  />
                  {cat}
                </label>
              ))}
            </div>
          </div>

          <div className="advanced-field">
            <span className="advanced-label">Sort by</span>
            <div className="sort-group">
              {[
                { value: "relevance", label: "Relevance" },
                { value: "name", label: "Name A–Z" },
                { value: "category", label: "Category" },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`sort-btn${sortBy === value ? " sort-btn--active" : ""}`}
                  onClick={() => onSortByChange(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
