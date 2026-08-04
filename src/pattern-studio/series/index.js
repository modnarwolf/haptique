import { blockGridSeries } from "./sr0010-block-grid.js";
import { swatchPairsSeries } from "./sr0020-swatch-pairs.js";
import { cutRibbonsSeries } from "./sr0030-cut-ribbons.js";
import { loomSeries } from "./sr0040-loom.js";
import { strataSeries } from "./sr0050-strata.js";
import { collageSeries } from "./sr0060-collage.js";
import { moireSeries } from "./sr0070-moire.js";

// This array is the only registry an admin edits when adding or reordering a
// series. Each imported module owns its metadata, palettes, parameters, and
// drawing implementation.
export const SERIES = Object.freeze([
  blockGridSeries,
  swatchPairsSeries,
  cutRibbonsSeries,
  loomSeries,
  strataSeries,
  collageSeries,
  moireSeries,
]);

const duplicateIds = SERIES
  .map((series) => series.id)
  .filter((seriesId, index, ids) => ids.indexOf(seriesId) !== index);
if (duplicateIds.length) throw new Error(`Duplicate pattern series IDs: ${duplicateIds.join(", ")}`);

for (const series of SERIES) {
  if (!/^sr\d{4}$/.test(series.id)) {
    throw new Error(`Invalid pattern series ID "${series.id}". Expected sr followed by four digits.`);
  }
  if (!series.name || !series.note || typeof series.paint !== "function") {
    throw new Error(`Pattern series "${series.id}" is missing required module exports.`);
  }
  if (!Array.isArray(series.palettes) || !series.palettes.length) {
    throw new Error(`Pattern series "${series.id}" must define at least one palette.`);
  }
  for (const palette of series.palettes) {
    if (!palette.name || !palette.bg || !Array.isArray(palette.colors) || !palette.colors.length) {
      throw new Error(`Pattern series "${series.id}" contains an invalid palette.`);
    }
  }
  if (!Array.isArray(series.parameters)) {
    throw new Error(`Pattern series "${series.id}" must define a parameters array.`);
  }
  const parameterKeys = series.parameters.map((parameter) => parameter.key);
  const duplicateParameterKeys = parameterKeys.filter(
    (key, index, keys) => !key || keys.indexOf(key) !== index,
  );
  if (duplicateParameterKeys.length) {
    throw new Error(
      `Pattern series "${series.id}" has missing or duplicate parameter keys: ${duplicateParameterKeys.join(", ")}`,
    );
  }
}

export const SERIES_BY_ID = Object.freeze(
  Object.fromEntries(SERIES.map((series) => [series.id, series])),
);

export const DEFAULT_SERIES_ID = SERIES[0].id;

export function getSeriesDefinition(seriesId) {
  const series = SERIES_BY_ID[seriesId];
  if (!series) throw new Error(`Unknown pattern series ID: ${seriesId}`);
  return series;
}
