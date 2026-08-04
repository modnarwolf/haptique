import { TWO_PI } from "./helpers.js";

function drawBlockMotif(context, target, motif, left, top, width, height, baseColor, markColor) {
  const { p5, palette, random, chance, pick, pickDifferent } = context;
  target.fill(baseColor);
  target.rect(left, top, width, height);
  target.fill(markColor);

  if (motif === 0) {
    const count = Math.floor(random(3, 8));
    const stripeWidth = width / (count * 2 - 1);
    for (let index = 0; index < count; index++) {
      target.rect(left + index * stripeWidth * 2, top, stripeWidth, height);
    }
  } else if (motif === 1) {
    target.ellipse(left + width / 2, top + height / 2, Math.min(width, height) * random(0.6, 0.88));
  } else if (motif === 2) {
    const direction = Math.floor(random(4));
    if (direction === 0) target.triangle(left, top, left + width, top, left + width / 2, top + height);
    if (direction === 1) target.triangle(left, top + height, left + width, top + height, left + width / 2, top);
    if (direction === 2) target.triangle(left + width, top, left + width, top + height, left, top + height / 2);
    if (direction === 3) target.triangle(left, top, left, top + height, left + width, top + height / 2);
  } else if (motif === 3) {
    const count = Math.floor(random(2, 4));
    const sectionHeight = height / count;
    for (let index = 0; index < count; index++) {
      const sectionTop = top + index * sectionHeight;
      target.triangle(
        left + width * 0.18,
        sectionTop + sectionHeight * 0.92,
        left + width * 0.82,
        sectionTop + sectionHeight * 0.92,
        left + width / 2,
        sectionTop + sectionHeight * 0.12,
      );
    }
  } else if (motif === 4) {
    const columns = Math.floor(random(2, 4));
    const rows = Math.floor(random(2, 4));
    for (let column = 0; column < columns; column++) {
      for (let row = 0; row < rows; row++) {
        if (chance(0.22)) continue;
        target.fill(pick());
        target.rect(
          left + (column * width) / columns,
          top + (row * height) / rows,
          width / columns + 0.5,
          height / rows + 0.5,
        );
      }
    }
  } else if (motif === 5) {
    const steps = Math.floor(random(3, 7));
    const stepWidth = width / steps;
    const stepHeight = (height * 0.72) / steps;
    let stepLeft = left;
    let stepTop = top + height * 0.28;
    target.beginShape();
    target.vertex(left, top + height);
    target.vertex(stepLeft, stepTop);
    for (let index = 0; index < steps; index++) {
      stepLeft += stepWidth;
      target.vertex(stepLeft, stepTop);
      stepTop += stepHeight;
      target.vertex(stepLeft, stepTop);
    }
    target.vertex(left + width, top + height);
    target.endShape(p5.CLOSE);
  } else if (motif === 6) {
    const diameter = Math.min(width, height * 1.1) * random(0.9, 1.15);
    target.arc(left + width / 2, top, diameter, diameter, 0, Math.PI, p5.PIE);
    target.fill(pickDifferent(palette.colors, markColor));
    target.arc(left + width / 2, top + height, diameter, diameter, Math.PI, TWO_PI, p5.PIE);
  } else if (motif === 7) {
    const bandHeight = height * random(0.18, 0.42);
    target.rect(left, top + (height - bandHeight) * random(0.15, 0.85), width, bandHeight);
  } else if (motif === 8) {
    const columns = Math.floor(random(2, 4));
    for (let index = 0; index < columns; index++) {
      if (chance(0.28)) continue;
      target.fill(pick());
      const isCut = chance(0.3);
      target.rect(
        left + (index * width) / columns,
        top + (isCut ? height * 0.2 : 0),
        width / columns + 0.5,
        height * (isCut ? 0.8 : 1),
      );
    }
  } else if (chance(0.5)) {
    target.rect(left, top, width * random(0.25, 0.7), height);
  } else {
    target.rect(left, top, width, height * random(0.25, 0.7));
  }
}

function paintBlockGrid(context, target) {
  const { parameters, palette, shortEdge, width, height, random, chance, pick, pickDifferent } = context;
  const margin = parameters.margin * shortEdge;
  const gap = parameters.gap * shortEdge;
  const cellWidth = (width - margin * 2 - gap * (parameters.cols - 1)) / parameters.cols;
  const cellHeight = (height - margin * 2 - gap * (parameters.rows - 1)) / parameters.rows;

  for (let row = 0; row < parameters.rows; row++) {
    for (let column = 0; column < parameters.cols; column++) {
      if (chance(parameters.blank)) continue;
      const insetX = cellWidth * parameters.inset;
      const insetY = cellHeight * parameters.inset;
      const left = margin + column * (cellWidth + gap) + insetX;
      const top = margin + row * (cellHeight + gap) + insetY;
      const blockWidth = cellWidth - insetX * 2;
      const blockHeight = cellHeight - insetY * 2;
      const baseColor = chance(0.4) ? palette.colors[0] : pick();
      const markColor = pickDifferent(palette.colors, baseColor);
      drawBlockMotif(
        context,
        target,
        Math.floor(random(10)),
        left,
        top,
        blockWidth,
        blockHeight,
        baseColor,
        markColor,
      );
    }
  }
}

export const blockGridSeries = {
  id: "sr0010",
  name: "Block Grid",
  note: "Geometric cells on ink",
  palettes: [
    { name: "Original print", bg: "#141210", colors: ["#f2e7d3", "#e1938e", "#7b96b0", "#c79a5b", "#2b4632", "#6b2029"] },
    { name: "Kiln", bg: "#171210", colors: ["#f0e4d0", "#d96c3f", "#e3b85c", "#7a2b23", "#3e4a3d", "#8a5b3b"] },
    { name: "Cold press", bg: "#0e1216", colors: ["#edefe8", "#3fa6a0", "#f0c64a", "#2d4c6b", "#b9c6c2", "#8e3b52"] },
    { name: "Bottle & bone", bg: "#101414", colors: ["#e9e5d8", "#1f5c4d", "#9fb8a6", "#d8cbb0", "#43302b", "#c2603f"] },
    { name: "Cobalt hour", bg: "#0d1020", colors: ["#f4f1e6", "#2f4bd1", "#f2b32c", "#b9c3e8", "#0d1020", "#e0563f"] },
  ],
  parameters: [
    { key: "cols", label: "Columns", min: 2, max: 7, step: 1, value: 3 },
    { key: "rows", label: "Rows", min: 2, max: 9, step: 1, value: 4 },
    { key: "gap", label: "Gutter", min: 0, max: 0.06, step: 0.002, value: 0.013 },
    { key: "margin", label: "Margin", min: 0, max: 0.12, step: 0.002, value: 0.016 },
    { key: "blank", label: "Empty cells", min: 0, max: 0.6, step: 0.01, value: 0.12 },
    { key: "inset", label: "Block inset", min: 0, max: 0.2, step: 0.01, value: 0 },
  ],
  paint: paintBlockGrid,
};
