import { TWO_PI } from "./helpers.js";

function paintCollage(context, target) {
  const { p5, parameters, palette, shortEdge, width, height, random, chance, pick, pickDifferent, drawFrame } = context;
  const bleed = parameters.bleed * shortEdge;
  target.fill(palette.bg);
  target.rect(0, 0, width, height);

  for (let index = 0; index < parameters.shapes; index++) {
    const progress = parameters.shapes > 1 ? index / (parameters.shapes - 1) : 0;
    const radius = shortEdge
      * parameters.scale
      * p5.lerp(1.5, 0.26, Math.pow(progress, 0.7))
      * random(0.78, 1.22);
    const centerX = random(-bleed - radius * 0.35, width + bleed + radius * 0.35);
    const centerY = random(-bleed - radius * 0.35, height + bleed + radius * 0.35);
    const rotation = random(TWO_PI);
    const firstColor = pick();
    const secondColor = pickDifferent(palette.colors, firstColor);

    if (chance(parameters.bars)) {
      target.push();
      target.translate(centerX, centerY);
      target.rotate(rotation);
      target.stroke(firstColor);
      target.strokeWeight(radius * random(0.3, 0.6));
      target.strokeCap(p5.ROUND);
      target.line(-radius, 0, radius, random(-radius * 0.6, radius * 0.6));
      target.noStroke();
      target.pop();
      continue;
    }

    const isAngular = chance(parameters.angular);
    const pointCount = isAngular ? Math.floor(random(3, 8)) : 72;
    const vertices = [];
    const waveCount = Math.floor(random(2, 4));
    const phase = random(TWO_PI);
    for (let point = 0; point < pointCount; point++) {
      const angle = rotation + (point / pointCount) * TWO_PI;
      const pointRadius = isAngular
        ? radius * random(0.6, 1.35)
        : radius * (1 + parameters.wobble * 0.28 * Math.sin(waveCount * angle + phase));
      vertices.push([
        centerX + pointRadius * Math.cos(angle),
        centerY + pointRadius * Math.sin(angle),
      ]);
    }

    target.fill(firstColor);
    target.beginShape();
    vertices.forEach(([x, y]) => target.vertex(x, y));
    target.endShape(p5.CLOSE);

    if (chance(parameters.patterned)) {
      const drawingContext = target.drawingContext;
      drawingContext.save();
      drawingContext.beginPath();
      vertices.forEach(([x, y], point) => (
        point ? drawingContext.lineTo(x, y) : drawingContext.moveTo(x, y)
      ));
      drawingContext.closePath();
      drawingContext.clip();
      drawingContext.fillStyle = secondColor;
      const cellSize = Math.max(2, shortEdge * parameters.patternScale);
      for (
        let left = centerX - radius * 1.5, column = 0;
        left < centerX + radius * 1.5;
        left += cellSize, column++
      ) {
        if (column % 2 === 0) {
          drawingContext.fillRect(left, centerY - radius * 1.5, cellSize, radius * 3);
        }
      }
      drawingContext.restore();
    }
  }

  drawFrame(target, parameters.frame);
}

export const collageSeries = {
  id: "sr0060",
  name: "Collage",
  note: "Layered cut-paper shapes",
  palettes: [
    { name: "Original print", bg: "#111111", colors: ["#f0e7d8", "#2e7d7b", "#8c1f2f", "#17365c", "#f0b429", "#e79a91", "#7ba7d1", "#b5701f"] },
    { name: "Atelier", bg: "#0f0f0e", colors: ["#efe7d6", "#7d8a55", "#3f5f96", "#e8a13c", "#d97b72", "#a8b8cc", "#b8b3a6", "#2a2a28"] },
    { name: "Poster paint", bg: "#f2ede1", colors: ["#1a1a1a", "#d94f2b", "#f0c02c", "#2f6fb0", "#4f8f5e", "#e0a0b0", "#8a5ba8", "#c9c2b2"] },
    { name: "Slate garden", bg: "#1c2226", colors: ["#e8eae2", "#6f8f6a", "#3d6b7d", "#c96f4a", "#d9c48a", "#8fa8b8", "#43514f", "#a85a5a"] },
    { name: "Ochre & ink", bg: "#f4ecdc", colors: ["#20201e", "#c07a2c", "#7f8f4a", "#b04a3a", "#6a8fa8", "#e0cba8", "#4a4336", "#d8a05a"] },
  ],
  parameters: [
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
  paint: paintCollage,
};
