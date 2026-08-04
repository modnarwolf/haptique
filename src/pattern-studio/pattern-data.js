import {
  DEFAULT_SERIES_ID,
  SERIES,
  getSeriesDefinition,
} from "./series/index.js";

export { DEFAULT_SERIES_ID, SERIES, SERIES_BY_ID } from "./series/index.js";

export const PRINT_PRESETS = {
  "Screen — 900 × 1200": [900, 1200],
  "Square @ 300 dpi — 3600 × 3600": [3600, 3600],
  "A4 @ 300 dpi — 2480 × 3508": [2480, 3508],
  "A3 @ 300 dpi — 3508 × 4961": [3508, 4961],
  "A2 @ 300 dpi — 4961 × 7016": [4961, 7016],
  "18 × 24 in @ 300 dpi — 5400 × 7200": [5400, 7200],
  "24 × 32 in @ 240 dpi — 5760 × 7680": [5760, 7680],
  Custom: null,
};

export function createDefaultPatternState() {
  const parametersBySeriesId = {};
  const paletteIndexesBySeriesId = {};
  const paletteValuesBySeriesId = {};

  for (const series of SERIES) {
    parametersBySeriesId[series.id] = Object.fromEntries(
      series.parameters.map((parameter) => [parameter.key, parameter.value]),
    );
    paletteIndexesBySeriesId[series.id] = 0;
    paletteValuesBySeriesId[series.id] = {
      bg: series.palettes[0].bg,
      colors: [...series.palettes[0].colors],
    };
  }

  return {
    seriesId: DEFAULT_SERIES_ID,
    seed: 1042,
    printPreset: Object.keys(PRINT_PRESETS)[0],
    width: 900,
    height: 1200,
    parametersBySeriesId,
    paletteIndexesBySeriesId,
    paletteValuesBySeriesId,
  };
}

export function getPalette(state) {
  const series = getSeriesDefinition(state.seriesId);
  const selectedIndex = Math.min(
    series.palettes.length - 1,
    Math.max(0, state.paletteIndexesBySeriesId[state.seriesId] ?? 0),
  );
  const selectedPalette = series.palettes[selectedIndex];
  const editedPalette = state.paletteValuesBySeriesId?.[state.seriesId];
  return editedPalette
    ? { name: selectedPalette.name, bg: editedPalette.bg, colors: editedPalette.colors }
    : selectedPalette;
}
