function BarChart({ title, data }) {
  if (data.length === 0) {
    return null;
  }

  const max = data[0].count;

  return (
    <section className="stats-card panel">
      <div className="panel-head">
        <h2>{title}</h2>
        <span className="count-badge">{data.length}</span>
      </div>
      <div className="bar-chart">
        {data.map((item) => (
          <div className="bar-row" key={item.name}>
            <span className="bar-label" title={item.name}>
              {item.name}
            </span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
            <span className="bar-count">{item.count}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function StatsPanel({ stats }) {
  const {
    totalFeatures,
    totalCategories,
    totalDivisions,
    categoryDistribution,
    topDivisions,
    topCommemoratedNames,
  } = stats;

  return (
    <>
      <section className="stats-card panel stat-number-row">
        <div className="stat-number">
          <span className="stat-value">{totalFeatures.toLocaleString()}</span>
          <span className="stat-label">Total Features</span>
        </div>
        <div className="stat-number">
          <span className="stat-value">{totalCategories}</span>
          <span className="stat-label">Categories</span>
        </div>
        <div className="stat-number">
          <span className="stat-value">{totalDivisions}</span>
          <span className="stat-label">Divisions</span>
        </div>
      </section>

      <BarChart title="Category Distribution" data={categoryDistribution} />
      <BarChart title="Top Divisions" data={topDivisions} />
      <BarChart title="Most Commemorated Names" data={topCommemoratedNames} />
    </>
  );
}
