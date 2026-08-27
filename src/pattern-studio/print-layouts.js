export const TOTE_AOP_MEDIUM_PRESET = "tote:16 × 16 in";
export const BLANKET_PRINT_PRESETS = Object.freeze({
  "37 × 52 in": "blanket:37 × 52 in",
  "50 × 60 in": "blanket:50 × 60 in",
  "60 × 80 in": "blanket:60 × 80 in",
});

export const PRINT_LAYOUTS = Object.freeze({
  [TOTE_AOP_MEDIUM_PRESET]: Object.freeze({
    type: "mirrored-tote",
    width: 2625,
    height: 5250,
    artworkWidth: 2400,
    artworkHeight: 2280,
    filenameLabel: "tote-aop-medium",
  }),
  [BLANKET_PRINT_PRESETS["37 × 52 in"]]: Object.freeze({
    type: "rotate-clockwise",
    width: 4992,
    height: 3552,
    artworkWidth: 3552,
    artworkHeight: 4992,
    filenameLabel: "blanket-37x52",
  }),
  [BLANKET_PRINT_PRESETS["50 × 60 in"]]: Object.freeze({
    type: "rotate-clockwise",
    width: 5760,
    height: 4800,
    artworkWidth: 4800,
    artworkHeight: 5760,
    filenameLabel: "blanket-50x60",
  }),
  [BLANKET_PRINT_PRESETS["60 × 80 in"]]: Object.freeze({
    type: "rotate-clockwise",
    width: 7680,
    height: 5760,
    artworkWidth: 5760,
    artworkHeight: 7680,
    filenameLabel: "blanket-60x80",
  }),
});

export function getProductPrintPreset(productId, size) {
  if (productId === "tote") return TOTE_AOP_MEDIUM_PRESET;
  if (productId === "blanket") return BLANKET_PRINT_PRESETS[size];
  return undefined;
}

export function getPrintLayout(state) {
  return PRINT_LAYOUTS[state?.printPreset] ?? null;
}

export function getMirroredToteGeometry(layout, outputWidth = layout.width, outputHeight = layout.height) {
  const width = Math.max(1, Math.round(outputWidth));
  const height = Math.max(2, Math.round(outputHeight));
  const halfHeight = Math.floor(height / 2);
  const faceHeight = Math.min(
    halfHeight,
    Math.max(1, Math.round((width * layout.artworkHeight) / layout.artworkWidth)),
  );

  return {
    width,
    height,
    halfHeight,
    faceHeight,
    bleedHeight: halfHeight - faceHeight,
    bottomFaceY: height - faceHeight,
  };
}
