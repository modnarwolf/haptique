function drawChip(target, shape, centerX, centerY, size, split, topColor, bottomColor) {
  const left = centerX - size / 2;
  const top = centerY - size / 2;
  const cutHeight = size * split;
  target.fill(bottomColor);

  if (shape === "Triangle") {
    target.triangle(centerX, top, left, top + size, left + size, top + size);
    target.fill(topColor);
    const halfWidth = cutHeight / 2;
    target.triangle(centerX, top, centerX - halfWidth, top + cutHeight, centerX + halfWidth, top + cutHeight);
  } else if (shape === "Circle") {
    target.ellipse(centerX, centerY, size, size);
    target.fill(topColor);
    const drawingContext = target.drawingContext;
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(left, top, size, cutHeight);
    drawingContext.clip();
    target.ellipse(centerX, centerY, size, size);
    drawingContext.restore();
  } else {
    target.rect(left, top, size, size);
    target.fill(topColor);
    target.rect(left, top, size, cutHeight);
  }
}

function paintSwatchPairs(context, target) {
  const { parameters, palette, shortEdge, width, height, random, pick, pickDifferent } = context;
  const frameSize = parameters.frame * shortEdge;
  if (frameSize > 0) {
    target.fill(palette.colors[0]);
    target.rect(0, 0, width, height);
    target.fill(palette.bg);
    target.rect(frameSize, frameSize, width - frameSize * 2, height - frameSize * 2);
  }

  const margin = parameters.margin * shortEdge + frameSize;
  const cellWidth = (width - margin * 2) / parameters.cols;
  const cellHeight = (height - margin * 2) / parameters.rows;
  const chipSize = Math.min(cellWidth, cellHeight) * parameters.size;

  for (let row = 0; row < parameters.rows; row++) {
    for (let column = 0; column < parameters.cols; column++) {
      const shape = parameters.shape === "Mixed"
        ? ["Square", "Triangle", "Circle"][Math.floor(random(3))]
        : parameters.shape;
      const topColor = pick();
      const bottomColor = pickDifferent(palette.colors, topColor);
      const split = Math.max(
        0,
        Math.min(1, parameters.split + (parameters.jitter ? random(-parameters.jitter, parameters.jitter) : 0)),
      );
      drawChip(
        target,
        shape,
        margin + cellWidth * (column + 0.5),
        margin + cellHeight * (row + 0.5),
        chipSize,
        split,
        topColor,
        bottomColor,
      );
    }
  }
}

export const swatchPairsSeries = {
  id: "sr0020",
  name: "Swatch Pairs",
  note: "Two-tone chips on paper",
  palettes: [
    { name: "Original print", bg: "#f7eedd", colors: ["#1f6f78", "#e8b33a", "#a98fc0", "#1a1a1a", "#a9bfa0", "#5f7a45", "#d8703a", "#94bddd", "#e9a2a2", "#6e2334"] },
    { name: "Herbarium", bg: "#f4f0e2", colors: ["#3d5a3a", "#8ba36c", "#c8cf9e", "#6b4a2f", "#d8b26a", "#2f2d28", "#a45b3b", "#e2d6bb"] },
    { name: "Municipal", bg: "#f1eee7", colors: ["#20303f", "#456a8c", "#9fb6c4", "#c94f36", "#e8c05a", "#2f2f2f", "#7d8a6a", "#dcd3c0"] },
    { name: "Sweet shop", bg: "#fdf3e7", colors: ["#e8577c", "#f7a03c", "#ffd45e", "#5bc0a5", "#5a6fd1", "#2b2438", "#f2c4d8", "#8e4bb0"] },
    { name: "Two inks", bg: "#f2efe6", colors: ["#1a1a1a", "#c8452e", "#f0e8d8", "#7a7468", "#e5cfae"] },
  ],
  parameters: [
    { key: "cols", label: "Columns", min: 2, max: 10, step: 1, value: 6 },
    { key: "rows", label: "Rows", min: 2, max: 12, step: 1, value: 7 },
    { key: "shape", label: "Chip shape", options: ["Square", "Triangle", "Circle", "Mixed"], value: "Square" },
    { key: "size", label: "Chip size", min: 0.2, max: 1, step: 0.01, value: 0.6 },
    { key: "split", label: "Split point", min: 0.2, max: 0.8, step: 0.01, value: 0.5 },
    { key: "jitter", label: "Split offset", min: 0, max: 0.5, step: 0.01, value: 0 },
    { key: "margin", label: "Margin", min: 0.02, max: 0.2, step: 0.005, value: 0.078 },
    { key: "frame", label: "Frame", min: 0, max: 0.05, step: 0.002, value: 0.016 },
  ],
  paint: paintSwatchPairs,
};
