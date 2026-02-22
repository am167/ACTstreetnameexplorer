export default function SearchControls({
  queryInput,
  onQueryInputChange,
  onSubmit,
  onClear,
  category,
  onCategoryChange,
  categories,
}) {
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

      <label htmlFor="categorySelect">Category filter</label>
      <select
        id="categorySelect"
        value={category}
        onChange={(event) => onCategoryChange(event.target.value)}
      >
        <option value="">All categories</option>
        {categories.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </form>
  );
}
