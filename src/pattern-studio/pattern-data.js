import { TOTE_AOP_MEDIUM_PRESET } from "./print-layouts.js";

export const SERIES = {
  A: {
    name: "Block Grid",
    note: "Geometric cells on ink",
    palettes: [
      { name: "Original print", bg: "#141210", colors: ["#f2e7d3", "#e1938e", "#7b96b0", "#c79a5b", "#2b4632", "#6b2029"] },
      { name: "Kiln", bg: "#171210", colors: ["#f0e4d0", "#d96c3f", "#e3b85c", "#7a2b23", "#3e4a3d", "#8a5b3b"] },
      { name: "Cold press", bg: "#0e1216", colors: ["#edefe8", "#3fa6a0", "#f0c64a", "#2d4c6b", "#b9c6c2", "#8e3b52"] },
      { name: "Bottle & bone", bg: "#101414", colors: ["#e9e5d8", "#1f5c4d", "#9fb8a6", "#d8cbb0", "#43302b", "#c2603f"] },
      { name: "Cobalt hour", bg: "#0d1020", colors: ["#f4f1e6", "#2f4bd1", "#f2b32c", "#b9c3e8", "#0d1020", "#e0563f"] },
    ],
  },
  C: {
    name: "Swatch Pairs",
    note: "Two-tone chips on paper",
    palettes: [
      { name: "Original print", bg: "#f7eedd", colors: ["#1f6f78", "#e8b33a", "#a98fc0", "#1a1a1a", "#a9bfa0", "#5f7a45", "#d8703a", "#94bddd", "#e9a2a2", "#6e2334"] },
      { name: "Herbarium", bg: "#f4f0e2", colors: ["#3d5a3a", "#8ba36c", "#c8cf9e", "#6b4a2f", "#d8b26a", "#2f2d28", "#a45b3b", "#e2d6bb"] },
      { name: "Municipal", bg: "#f1eee7", colors: ["#20303f", "#456a8c", "#9fb6c4", "#c94f36", "#e8c05a", "#2f2f2f", "#7d8a6a", "#dcd3c0"] },
      { name: "Sweet shop", bg: "#fdf3e7", colors: ["#e8577c", "#f7a03c", "#ffd45e", "#5bc0a5", "#5a6fd1", "#2b2438", "#f2c4d8", "#8e4bb0"] },
      { name: "Two inks", bg: "#f2efe6", colors: ["#1a1a1a", "#c8452e", "#f0e8d8", "#7a7468", "#e5cfae"] },
    ],
  },
  E: {
    name: "Cut Ribbons",
    note: "Tapered strips in bands",
    palettes: [
      { name: "Original print", bg: "#f4efe2", colors: ["#2b2a28", "#6f8a4e", "#f0a4b8", "#e08a72", "#8cbce0", "#2e7189", "#e4bc6e"] },
      { name: "Newsstand", bg: "#efece2", colors: ["#232323", "#c0392b", "#2c6ea8", "#e8b93c", "#7b7b7b"] },
      { name: "Dune", bg: "#f6efe0", colors: ["#33251c", "#c98f4e", "#e3c48f", "#8a6a4b", "#b7472f", "#5d7a72"] },
      { name: "Aquatint", bg: "#eef1ee", colors: ["#1e2b2f", "#2e7189", "#6fb0a8", "#c2d6cd", "#d8654f"] },
      { name: "Night shift", bg: "#14161a", colors: ["#f0ece0", "#e0563f", "#5b7fb9", "#f2b32c", "#4b525c"] },
    ],
  },
  W: {
    name: "Loom",
    note: "Woven bands, edge to edge",
    palettes: [
      { name: "Original print", bg: "#1a1a18", colors: ["#f0e6d2", "#a8c0d4", "#cf7748", "#191919", "#5f7048", "#a8452a"] },
      { name: "Andean", bg: "#17120f", colors: ["#f2e3c9", "#d94f2b", "#f0a93c", "#2e6f6b", "#1c1a17", "#9c6a3c"] },
      { name: "Tartan", bg: "#14161a", colors: ["#eae4d6", "#2e4a7d", "#8f2f36", "#c9a23f", "#1a1c20", "#4f6b58"] },
      { name: "Salt marsh", bg: "#131715", colors: ["#eef0e6", "#7f9a86", "#3f5a52", "#c8b48a", "#1b201d", "#b5674a"] },
      { name: "Primary weave", bg: "#111111", colors: ["#f2efe6", "#d8232a", "#1b57a5", "#f2c200", "#141414", "#7a7a7a"] },
    ],
  },
  S: {
    name: "Strata",
    note: "Curved color fields",
    palettes: [
      { name: "Original print", bg: "#f4ead6", colors: ["#f4ead6", "#6f8b6a", "#e0a09b", "#1c3557", "#557f9e", "#b0532c"] },
      { name: "Coastal fog", bg: "#eceee9", colors: ["#eceee9", "#9fb0ad", "#5f7d80", "#2b3f47", "#c9d3cc", "#d98f6a"] },
      { name: "Desert dusk", bg: "#f6e6cf", colors: ["#f6e6cf", "#e6a15c", "#c0523c", "#6b3352", "#2f2440", "#8fa08a"] },
      { name: "Orchard", bg: "#f0efe2", colors: ["#f0efe2", "#4e6b3c", "#a8bf6a", "#d9b44a", "#7c4a2d", "#2c3a2a"] },
      { name: "Deep water", bg: "#e9eef0", colors: ["#e9eef0", "#2a4d6b", "#4f8ba8", "#8fc0c8", "#12232f", "#d97f5c"] },
    ],
  },
  B: {
    name: "Collage",
    note: "Layered cut-paper shapes",
    palettes: [
      { name: "Original print", bg: "#111111", colors: ["#f0e7d8", "#2e7d7b", "#8c1f2f", "#17365c", "#f0b429", "#e79a91", "#7ba7d1", "#b5701f"] },
      { name: "Atelier", bg: "#0f0f0e", colors: ["#efe7d6", "#7d8a55", "#3f5f96", "#e8a13c", "#d97b72", "#a8b8cc", "#b8b3a6", "#2a2a28"] },
      { name: "Poster paint", bg: "#f2ede1", colors: ["#1a1a1a", "#d94f2b", "#f0c02c", "#2f6fb0", "#4f8f5e", "#e0a0b0", "#8a5ba8", "#c9c2b2"] },
      { name: "Slate garden", bg: "#1c2226", colors: ["#e8eae2", "#6f8f6a", "#3d6b7d", "#c96f4a", "#d9c48a", "#8fa8b8", "#43514f", "#a85a5a"] },
      { name: "Ochre & ink", bg: "#f4ecdc", colors: ["#20201e", "#c07a2c", "#7f8f4a", "#b04a3a", "#6a8fa8", "#e0cba8", "#4a4336", "#d8a05a"] },
    ],
  },
  O: {
    name: "Moiré",
    note: "Op-art wave bands",
    palettes: [
      { name: "Original print", bg: "#e8dcc4", colors: ["#1f1e1c", "#8a7f6a"] },
      { name: "Blueprint", bg: "#0f2a44", colors: ["#e8eef5", "#7fb2d9"] },
      { name: "Vermilion", bg: "#f2ede2", colors: ["#c8321f", "#1f1e1c", "#e0a03c"] },
      { name: "Ink & jade", bg: "#eef2ec", colors: ["#16211d", "#2f7d6a", "#c8d6c4"] },
      { name: "Nightfall", bg: "#101014", colors: ["#ece7d8", "#6b7a9c", "#c85a3c"] },
    ],
  },
};

export const PARAMS = {
  A: [
    { key: "cols", label: "Columns", min: 2, max: 7, step: 1, value: 3 },
    { key: "rows", label: "Rows", min: 2, max: 9, step: 1, value: 4 },
    { key: "gap", label: "Gutter", min: 0, max: 0.06, step: 0.002, value: 0.013 },
    { key: "margin", label: "Margin", min: 0, max: 0.12, step: 0.002, value: 0.016 },
    { key: "blank", label: "Empty cells", min: 0, max: 0.6, step: 0.01, value: 0.12 },
    { key: "inset", label: "Block inset", min: 0, max: 0.2, step: 0.01, value: 0 },
  ],
  C: [
    { key: "cols", label: "Columns", min: 2, max: 10, step: 1, value: 6 },
    { key: "rows", label: "Rows", min: 2, max: 12, step: 1, value: 7 },
    { key: "shape", label: "Chip shape", options: ["Square", "Triangle", "Circle", "Mixed"], value: "Square" },
    { key: "size", label: "Chip size", min: 0.2, max: 1, step: 0.01, value: 0.6 },
    { key: "split", label: "Split point", min: 0.2, max: 0.8, step: 0.01, value: 0.5 },
    { key: "jitter", label: "Split offset", min: 0, max: 0.5, step: 0.01, value: 0 },
    { key: "margin", label: "Margin", min: 0.02, max: 0.2, step: 0.005, value: 0.078 },
    { key: "frame", label: "Frame", min: 0, max: 0.05, step: 0.002, value: 0.016 },
  ],
  E: [
    { key: "bands", label: "Bands", min: 1, max: 7, step: 1, value: 3 },
    { key: "density", label: "Strip density", min: 5, max: 30, step: 1, value: 13 },
    { key: "taper", label: "Taper", min: 0, max: 1, step: 0.01, value: 0.45 },
    { key: "accent", label: "Color chance", min: 0, max: 1, step: 0.01, value: 0.3 },
    { key: "ragged", label: "Ragged edge", min: 0, max: 0.2, step: 0.01, value: 0.05 },
    { key: "frame", label: "Frame", min: 0, max: 0.05, step: 0.002, value: 0.013 },
  ],
  W: [
    { key: "bands", label: "Bands", min: 3, max: 14, step: 1, value: 8 },
    { key: "variance", label: "Band variance", min: 0, max: 1, step: 0.01, value: 0.5 },
    { key: "density", label: "Weave density", min: 6, max: 60, step: 1, value: 26 },
    { key: "gap", label: "Band gap", min: 0, max: 0.02, step: 0.001, value: 0.003 },
    { key: "frame", label: "Frame", min: 0, max: 0.05, step: 0.002, value: 0.014 },
  ],
  S: [
    { key: "layers", label: "Fields", min: 2, max: 10, step: 1, value: 5 },
    { key: "sway", label: "Sway", min: 0, max: 0.9, step: 0.01, value: 0.5 },
    { key: "freq", label: "Undulation", min: 0.4, max: 6, step: 0.1, value: 2.2 },
    { key: "mix", label: "Horizontal mix", min: 0, max: 1, step: 0.01, value: 0.35 },
    { key: "frame", label: "Frame", min: 0, max: 0.05, step: 0.002, value: 0.012 },
  ],
  B: [
    { key: "shapes", label: "Shapes", min: 4, max: 40, step: 1, value: 16 },
    { key: "scale", label: "Shape scale", min: 0.1, max: 1.2, step: 0.01, value: 0.62 },
    { key: "wobble", label: "Blobiness", min: 0, max: 1, step: 0.01, value: 0.45 },
    { key: "angular", label: "Angular share", min: 0, max: 1, step: 0.01, value: 0.35 },
    { key: "bars", label: "Bar share", min: 0, max: 0.6, step: 0.01, value: 0.14 },
    { key: "patterned", label: "Patterned", min: 0, max: 1, step: 0.01, value: 0.25 },
    { key: "patternScale", label: "Pattern scale", min: 0.012, max: 0.12, step: 0.002, value: 0.045 },
    { key: "bleed", label: "Edge bleed", min: 0, max: 0.6, step: 0.01, value: 0.25 },
    { key: "frame", label: "Frame", min: 0, max: 0.05, step: 0.002, value: 0.014 },
  ],
  O: [
    { key: "bands", label: "Bands", min: 16, max: 120, step: 1, value: 55 },
    { key: "twist", label: "Twist", min: -1.5, max: 1.5, step: 0.05, value: 0.55 },
    { key: "wave", label: "Wave depth", min: 0, max: 0.6, step: 0.01, value: 0.18 },
    { key: "lobes", label: "Wave lobes", min: 1, max: 8, step: 1, value: 3 },
    { key: "ink", label: "Ink weight", min: 0.15, max: 0.9, step: 0.01, value: 0.5 },
    { key: "focusX", label: "Focus X", min: -0.4, max: 1.4, step: 0.01, value: 0.78 },
    { key: "focusY", label: "Focus Y", min: -0.4, max: 1.4, step: 0.01, value: 0.72 },
    { key: "accent", label: "Color chance", min: 0, max: 1, step: 0.01, value: 0 },
    { key: "frame", label: "Frame", min: 0, max: 0.05, step: 0.002, value: 0.014 },
  ],
};

export const PRINT_PRESETS = {
  "Screen — 900 × 1200": [900, 1200],
  [TOTE_AOP_MEDIUM_PRESET]: [2625, 5250],
  "Square @ 300 dpi — 3600 × 3600": [3600, 3600],
  "A4 @ 300 dpi — 2480 × 3508": [2480, 3508],
  "A3 @ 300 dpi — 3508 × 4961": [3508, 4961],
  "A2 @ 300 dpi — 4961 × 7016": [4961, 7016],
  "18 × 24 in @ 300 dpi — 5400 × 7200": [5400, 7200],
  "24 × 32 in @ 240 dpi — 5760 × 7680": [5760, 7680],
  Custom: null,
};

export function createDefaultPatternState() {
  const params = {};
  const palettes = {};
  const paletteValues = {};
  for (const key of Object.keys(SERIES)) {
    params[key] = Object.fromEntries(PARAMS[key].map((item) => [item.key, item.value]));
    palettes[key] = 0;
    paletteValues[key] = {
      bg: SERIES[key].palettes[0].bg,
      colors: [...SERIES[key].palettes[0].colors],
    };
  }
  return {
    series: "A",
    seed: 1042,
    printPreset: Object.keys(PRINT_PRESETS)[0],
    width: 900,
    height: 1200,
    params,
    palettes,
    paletteValues,
  };
}

export function getPalette(state) {
  const selected = SERIES[state.series].palettes[
    Math.min(SERIES[state.series].palettes.length - 1, Math.max(0, state.palettes[state.series] ?? 0))
  ];
  const edited = state.paletteValues?.[state.series];
  return edited ? { name: selected.name, bg: edited.bg, colors: edited.colors } : selected;
}
