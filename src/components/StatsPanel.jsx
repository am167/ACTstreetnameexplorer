import { useEffect, useId, useState } from "react";

const CHART_PALETTES = {
  category: ["#106669", "#0f8b8d", "#f4a261", "#e76f51", "#7b6cf6"],
  division: ["#d97706", "#ef4444", "#8b5cf6", "#2563eb", "#14b8a6"],
  commemorated: ["#c2410c", "#db2777", "#7c3aed", "#0284c7", "#0f766e"],
};

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function getPaletteColor(palette, index) {
  return palette[index % palette.length];
}

function BarChart({
  title,
  eyebrow,
  description,
  data,
  paletteKey,
  collapsible = false,
  initialVisibleCount = data.length,
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAllRows, setShowAllRows] = useState(false);
  const contentId = useId();

  useEffect(() => {
    const visibleLength = showAllRows ? data.length : Math.min(initialVisibleCount, data.length);
    setActiveIndex((current) => Math.min(current, Math.max(visibleLength - 1, 0)));
  }, [data, initialVisibleCount, showAllRows]);

  if (data.length === 0) {
    return null;
  }

  const visibleData = showAllRows ? data : data.slice(0, initialVisibleCount);
  const max = visibleData[0].count;
  const total = visibleData.reduce((sum, item) => sum + item.count, 0);
  const palette = CHART_PALETTES[paletteKey];
  const activeItem = visibleData[activeIndex] || visibleData[0];
  const activeShare = total > 0 ? activeItem.count / total : 0;
  const hiddenCount = Math.max(data.length - visibleData.length, 0);

  return (
    <section className="stats-card panel stats-chart-card">
      <div className="stats-chart-card__header">
        <div>
          <p className="stats-eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <div className="stats-chart-card__actions">
          <span className="count-badge">{data.length}</span>
          {collapsible && (
            <button
              type="button"
              className="stats-chart-toggle"
              aria-expanded={isExpanded}
              aria-controls={contentId}
              onClick={() => setIsExpanded((current) => !current)}
            >
              {isExpanded ? "Collapse" : "Expand"}
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="stats-chart-card__body" id={contentId}>
          <div className="stats-spotlight">
            <div>
              <p className="stats-spotlight__label">Selected highlight</p>
              <h3>{activeItem.name}</h3>
              <p className="stats-spotlight__description">{description}</p>
            </div>
            <div className="stats-spotlight__stats" aria-live="polite">
              <div>
                <span className="stats-spotlight__value">{activeItem.count.toLocaleString()}</span>
                <span className="stats-spotlight__meta">entries</span>
              </div>
              <div>
                <span className="stats-spotlight__value">{formatPercent(activeShare)}</span>
                <span className="stats-spotlight__meta">share of visible rows</span>
              </div>
              <div>
                <span className="stats-spotlight__value">#{activeIndex + 1}</span>
                <span className="stats-spotlight__meta">visible rank</span>
              </div>
            </div>
          </div>

          <div className="bar-chart">
            {visibleData.map((item, index) => {
              const color = getPaletteColor(palette, index);
              const isActive = index === activeIndex;
              return (
                <button
                  type="button"
                  className={`bar-row${isActive ? " bar-row--active" : ""}`}
                  key={item.name}
                  onMouseEnter={() => setActiveIndex(index)}
                  onFocus={() => setActiveIndex(index)}
                  onClick={() => setActiveIndex(index)}
                  style={{
                    "--bar-size": `${(item.count / max) * 100}%`,
                    "--bar-accent": color,
                    "--bar-accent-soft": `${color}22`,
                  }}
                >
                  <span className="bar-label" title={item.name}>
                    {item.name}
                  </span>
                  <div className="bar-track">
                    <div className="bar-fill" />
                  </div>
                  <span className="bar-count">{item.count}</span>
                </button>
              );
            })}
          </div>

          {hiddenCount > 0 && (
            <div className="stats-chart-card__footer">
              <p className="stats-chart-card__hint">
                Showing {visibleData.length} of {data.length} rows
              </p>
              <button
                type="button"
                className="stats-chart-toggle stats-chart-toggle--secondary"
                onClick={() => setShowAllRows((current) => !current)}
              >
                {showAllRows ? "Show Less" : `Show All (${data.length})`}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function StatCard({ eyebrow, value, label, detail, accent }) {
  return (
    <article className={`stat-number stat-number--${accent}`}>
      <span className="stat-chip">{eyebrow}</span>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
      <span className="stat-detail">{detail}</span>
    </article>
  );
}

export default function StatsPanel({ stats }) {
  const {
    totalFeatures,
    totalCategories,
    totalDivisions,
    commemoratedFeatures,
    commemoratedCoverage,
    topCategory,
    topDivision,
    categoryDistribution,
    topDivisions,
  } = stats;

  return (
    <>
      <section className="stats-card panel stats-overview">
        <div className="stats-overview__copy">
          <p className="stats-eyebrow">Dataset Snapshot</p>
          <h2>Street naming patterns at a glance</h2>
          <p className="stats-overview__text">
            {topCategory
              ? `${topCategory.name} is the biggest category, while ${topDivision?.name || "the busiest division"} carries one of the densest clusters of named features.`
              : "Load the place-name dataset to explore how categories, divisions, and commemorations are distributed."}
          </p>
          <div className="stats-overview__pills">
            <span className="stats-pill">
              {topCategory ? `${formatPercent(topCategory.count / totalFeatures)} in ${topCategory.name}` : "No category data yet"}
            </span>
            <span className="stats-pill">
              {commemoratedFeatures
                ? `${formatPercent(commemoratedCoverage)} include commemorated names`
                : "No commemorated names parsed yet"}
            </span>
          </div>
        </div>
        <div className="stats-overview__glow" aria-hidden="true">
          <div className="stats-overview__ring" />
          <div className="stats-overview__ring stats-overview__ring--inner" />
        </div>
      </section>

      <section className="stats-card panel stat-number-row">
        <StatCard
          eyebrow="Scale"
          value={totalFeatures.toLocaleString()}
          label="Total Features"
          detail="Every place-name record in the dataset"
          accent="teal"
        />
        <StatCard
          eyebrow="Spread"
          value={totalCategories}
          label="Categories"
          detail={topCategory ? `${topCategory.name} leads the mix` : "Waiting for category data"}
          accent="gold"
        />
        <StatCard
          eyebrow="Coverage"
          value={totalDivisions}
          label="Divisions"
          detail={topDivision ? `${topDivision.name} appears most often` : "Waiting for division data"}
          accent="coral"
        />
        <StatCard
          eyebrow="Stories"
          value={formatPercent(commemoratedCoverage)}
          label="Commemorative Share"
          detail={`${commemoratedFeatures.toLocaleString()} named records reference people`}
          accent="violet"
        />
      </section>

      <div className="stats-chart-grid">
        <BarChart
          title="Category Distribution"
          eyebrow="Browse the mix"
          description="Hover or focus a row to compare how often each feature type appears."
          data={categoryDistribution}
          paletteKey="category"
          collapsible
          initialVisibleCount={6}
        />
        <BarChart
          title="Top Divisions"
          eyebrow="Where names cluster"
          description="These divisions contain the highest concentration of named features in the dataset."
          data={topDivisions}
          paletteKey="division"
        />
      </div>
    </>
  );
}
