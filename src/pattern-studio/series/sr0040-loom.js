function drawWeave(context, target, weaveType, left, top, width, height, density) {
  const { palette, random, pick, pickDifferent } = context;
  const baseColor = pick();
  const markColor = pickDifferent(palette.colors, baseColor);
  target.fill(baseColor);
  target.rect(left, top, width, height);
  target.fill(markColor);

  if (weaveType === 0) {
    const count = Math.max(4, Math.round(density * random(0.6, 1.4)));
    for (let index = 0; index < count; index += 2) {
      target.rect(left + (index * width) / count, top, width / count, height);
    }
  } else if (weaveType === 1) {
    const columns = Math.max(2, Math.round(density / 3));
    const cellWidth = width / columns;
    const rows = Math.max(2, Math.round(height / cellWidth));
    for (let row = 0; row < rows; row++) {
      for (let column = -1; column <= columns; column++) {
        const cellLeft = left + column * cellWidth + (row % 2 ? cellWidth / 2 : 0);
        target.rect(
          Math.max(left, cellLeft),
          top + (row * height) / rows,
          Math.min(cellWidth / 2, left + width - cellLeft),
          height / rows,
        );
      }
    }
  } else if (weaveType === 2 || weaveType === 3) {
    const columns = Math.max(3, Math.round(density / 2.5));
    const cellWidth = width / columns;
    const rows = Math.max(1, Math.round(height / cellWidth));
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        if ((row + column) % 2 !== 0) continue;
        target.rect(
          left + column * cellWidth,
          top + (row * height) / rows,
          cellWidth + 0.5,
          height / rows + 0.5,
        );
      }
    }
    if (weaveType === 3) {
      target.fill(pickDifferent(palette.colors, markColor));
      for (let column = 0; column < columns; column += 2) {
        target.rect(left + column * cellWidth, top, cellWidth * 0.28, height);
      }
    }
  } else if (weaveType === 4) {
    const groups = Math.max(3, Math.round(density / 3.2));
    const pitch = width / groups;
    const ruleWidth = pitch * random(0.035, 0.075);
    for (let group = 0; group <= groups; group++) {
      for (let line = 0; line < 3; line++) {
        target.rect(left + group * pitch + line * ruleWidth * 2.2, top, ruleWidth, height);
      }
    }
  } else {
    let currentLeft = left;
    const unitWidth = width / Math.max(4, Math.round(density / 2));
    while (currentLeft < left + width) {
      const columnWidth = unitWidth * random(0.5, 3);
      target.fill(pick());
      target.rect(currentLeft, top, Math.min(columnWidth, left + width - currentLeft) + 0.5, height);
      currentLeft += columnWidth;
    }
  }
}

function paintLoom(context, target) {
  const { parameters, shortEdge, width, height, random, drawFrame } = context;
  const edge = parameters.frame * shortEdge;
  const gap = parameters.gap * shortEdge;
  const bandWeights = Array.from(
    { length: parameters.bands },
    () => 1 + random(-1, 1) * parameters.variance * 0.6,
  );
  const totalWeight = bandWeights.reduce((sum, weight) => sum + weight, 0);
  const usableHeight = height - edge * 2 - gap * (parameters.bands - 1);
  let bandTop = edge;

  for (let band = 0; band < parameters.bands; band++) {
    const bandHeight = (usableHeight * bandWeights[band]) / totalWeight;
    drawWeave(context, target, band % 6, edge, bandTop, width - edge * 2, bandHeight, parameters.density);
    bandTop += bandHeight + gap;
  }
  drawFrame(target, parameters.frame);
}

export const loomSeries = {
  id: "sr0040",
  name: "Loom",
  note: "Woven bands, edge to edge",
  palettes: [
    { name: "Original print", bg: "#1a1a18", colors: ["#f0e6d2", "#a8c0d4", "#cf7748", "#191919", "#5f7048", "#a8452a"] },
    { name: "Andean", bg: "#17120f", colors: ["#f2e3c9", "#d94f2b", "#f0a93c", "#2e6f6b", "#1c1a17", "#9c6a3c"] },
    { name: "Tartan", bg: "#14161a", colors: ["#eae4d6", "#2e4a7d", "#8f2f36", "#c9a23f", "#1a1c20", "#4f6b58"] },
    { name: "Salt marsh", bg: "#131715", colors: ["#eef0e6", "#7f9a86", "#3f5a52", "#c8b48a", "#1b201d", "#b5674a"] },
    { name: "Primary weave", bg: "#111111", colors: ["#f2efe6", "#d8232a", "#1b57a5", "#f2c200", "#141414", "#7a7a7a"] },
  ],
  parameters: [
    { key: "bands", label: "Bands", min: 3, max: 14, step: 1, value: 8 },
    { key: "variance", label: "Band variance", min: 0, max: 1, step: 0.01, value: 0.5 },
    { key: "density", label: "Weave density", min: 6, max: 60, step: 1, value: 26 },
    { key: "gap", label: "Band gap", min: 0, max: 0.02, step: 0.001, value: 0.003 },
    { key: "frame", label: "Frame", min: 0, max: 0.05, step: 0.002, value: 0.014 },
  ],
  paint: paintLoom,
};
