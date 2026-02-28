import { useMemo } from "react";
import { parseDescription } from "../utils/formatters";

function countByField(features, fieldName) {
  const counts = {};
  for (const f of features) {
    const value = f.attributes?.[fieldName];
    if (typeof value === "string" && value.trim()) {
      const key = value.trim();
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function countCommemoratedNames(features) {
  const counts = {};
  for (const f of features) {
    const desc = f.attributes?.DESCRIPTION || "";
    const parsed = parseDescription(desc);
    const name = parsed.commemoratedName?.trim();
    if (name && name.toLowerCase() !== "none") {
      counts[name] = (counts[name] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function useDatasetStats(allFeatures) {
  return useMemo(() => {
    if (!allFeatures || allFeatures.length === 0) {
      return {
        totalFeatures: 0,
        totalCategories: 0,
        totalDivisions: 0,
        commemoratedFeatures: 0,
        commemoratedCoverage: 0,
        topCategory: null,
        topDivision: null,
        categoryDistribution: [],
        topDivisions: [],
        topCommemoratedNames: [],
      };
    }

    const categoryDistribution = countByField(allFeatures, "CATEGORY_NAME");
    const allDivisions = countByField(allFeatures, "DIVISION_CODE");
    const allCommemoratedNames = countCommemoratedNames(allFeatures);
    const commemoratedFeatures = allCommemoratedNames.reduce((total, item) => total + item.count, 0);

    return {
      totalFeatures: allFeatures.length,
      totalCategories: categoryDistribution.length,
      totalDivisions: allDivisions.length,
      commemoratedFeatures,
      commemoratedCoverage: commemoratedFeatures / allFeatures.length,
      topCategory: categoryDistribution[0] || null,
      topDivision: allDivisions[0] || null,
      categoryDistribution,
      topDivisions: allDivisions.slice(0, 15),
      topCommemoratedNames: allCommemoratedNames.slice(0, 15),
    };
  }, [allFeatures]);
}
