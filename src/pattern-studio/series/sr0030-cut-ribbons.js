function paintCutRibbons(context, target) {
  const { parameters, palette, shortEdge, width, height, random, chance, pick, drawFrame } = context;
  const edge = parameters.frame * shortEdge;
  const bandWeights = Array.from({ length: parameters.bands }, () => random(0.75, 1.25));
  const totalWeight = bandWeights.reduce((sum, weight) => sum + weight, 0);
  const accentColors = palette.colors.slice(1);
  let bandTop = edge;

  for (let band = 0; band < parameters.bands; band++) {
    const bandBottom = band === parameters.bands - 1
      ? height - edge
      : bandTop + ((height - edge * 2) * bandWeights[band]) / totalWeight;
    target.fill(palette.bg);
    target.rect(edge, bandTop, width - edge * 2, bandBottom - bandTop);

    const unitWidth = (width - edge * 2) / parameters.density;
    let ribbonTop = edge - random(unitWidth);
    let ribbonBottom = ribbonTop + random(-unitWidth, unitWidth) * parameters.taper * 0.5;
    for (let guard = 0; ribbonTop < width - edge && guard < 400; guard++) {
      const gap = unitWidth * random(0.25, 0.9);
      ribbonTop += gap;
      ribbonBottom += gap * (1 + random(-0.6, 0.6) * parameters.taper);
      const topWidth = unitWidth * random(0.3, 1.05);
      const bottomWidth = topWidth * (1 + random(-0.55, 0.75) * parameters.taper);
      target.fill(accentColors.length && chance(parameters.accent) ? pick(accentColors) : palette.colors[0]);
      target.quad(
        ribbonTop,
        bandTop,
        ribbonTop + topWidth,
        bandTop,
        ribbonBottom + bottomWidth,
        bandBottom - (bandBottom - bandTop) * random(0, parameters.ragged),
        ribbonBottom,
        bandBottom - (bandBottom - bandTop) * random(0, parameters.ragged),
      );
      ribbonTop += topWidth;
      ribbonBottom += bottomWidth;
    }
    bandTop = bandBottom;
  }

  drawFrame(target, parameters.frame, palette.colors[0]);
}

export const cutRibbonsSeries = {
  id: "sr0030",
  name: "Cut Ribbons",
  note: "Tapered strips in bands",
  palettes: [
    { name: "Original print", bg: "#f4efe2", colors: ["#2b2a28", "#6f8a4e", "#f0a4b8", "#e08a72", "#8cbce0", "#2e7189", "#e4bc6e"] },
    { name: "Newsstand", bg: "#efece2", colors: ["#232323", "#c0392b", "#2c6ea8", "#e8b93c", "#7b7b7b"] },
    { name: "Dune", bg: "#f6efe0", colors: ["#33251c", "#c98f4e", "#e3c48f", "#8a6a4b", "#b7472f", "#5d7a72"] },
    { name: "Aquatint", bg: "#eef1ee", colors: ["#1e2b2f", "#2e7189", "#6fb0a8", "#c2d6cd", "#d8654f"] },
    { name: "Night shift", bg: "#14161a", colors: ["#f0ece0", "#e0563f", "#5b7fb9", "#f2b32c", "#4b525c"] },
  ],
  parameters: [
    { key: "bands", label: "Bands", min: 1, max: 7, step: 1, value: 3 },
    { key: "density", label: "Strip density", min: 5, max: 30, step: 1, value: 13 },
    { key: "taper", label: "Taper", min: 0, max: 1, step: 0.01, value: 0.45 },
    { key: "accent", label: "Color chance", min: 0, max: 1, step: 0.01, value: 0.3 },
    { key: "ragged", label: "Ragged edge", min: 0, max: 0.2, step: 0.01, value: 0.05 },
    { key: "frame", label: "Frame", min: 0, max: 0.05, step: 0.002, value: 0.013 },
  ],
  paint: paintCutRibbons,
};
