export const TOTE_AOP_MEDIUM_PRESET = "tote:16 × 16 in";

export const PRINT_LAYOUTS = Object.freeze({
  [TOTE_AOP_MEDIUM_PRESET]: Object.freeze({
    type: "mirrored-tote",
    width: 2625,
    height: 5250,
    artworkWidth: 2400,
    artworkHeight: 2280,
    filenameLabel: "tote-aop-medium",
  }),
});

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
