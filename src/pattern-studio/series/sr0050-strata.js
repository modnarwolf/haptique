function paintStrata(context, target) {
  const { p5, parameters, palette, shortEdge, width, height, random, chance, pickDifferent, drawFrame } = context;
  const colors = palette.colors;
  target.fill(colors[0]);
  target.rect(0, 0, width, height);
  let previousColor = colors[0];

  for (let layer = 1; layer <= parameters.layers; layer++) {
    const isHorizontal = chance(parameters.mix);
    const color = pickDifferent(colors, previousColor);
    const basePosition = layer / (parameters.layers + 1) + random(-0.09, 0.09);
    const amplitude = parameters.sway * shortEdge * 0.5;
    const noiseOffset = random(1000);
    previousColor = color;
    target.fill(color);
    target.beginShape();
    for (let sample = 0; sample <= 192; sample++) {
      const progress = sample / 192;
      const sway = (
        (p5.noise(noiseOffset + progress * parameters.freq) - 0.5) * 2.4
        + (p5.noise(noiseOffset + 90 + progress * parameters.freq * 0.37) - 0.5) * 0.8
      ) * amplitude;
      target.vertex(
        isHorizontal ? progress * width : basePosition * width + sway,
        isHorizontal ? basePosition * height + sway : progress * height,
      );
    }
    if (isHorizontal) {
      target.vertex(width, height);
      target.vertex(0, height);
    } else {
      target.vertex(width, height);
      target.vertex(width, 0);
    }
    target.endShape(p5.CLOSE);
  }

  drawFrame(target, parameters.frame);
}

export const strataSeries = {
  id: "sr0050",
  name: "Strata",
  note: "Curved color fields",
  palettes: [
    { name: "Original print", bg: "#f4ead6", colors: ["#f4ead6", "#6f8b6a", "#e0a09b", "#1c3557", "#557f9e", "#b0532c"] },
    { name: "Coastal fog", bg: "#eceee9", colors: ["#eceee9", "#9fb0ad", "#5f7d80", "#2b3f47", "#c9d3cc", "#d98f6a"] },
    { name: "Desert dusk", bg: "#f6e6cf", colors: ["#f6e6cf", "#e6a15c", "#c0523c", "#6b3352", "#2f2440", "#8fa08a"] },
    { name: "Orchard", bg: "#f0efe2", colors: ["#f0efe2", "#4e6b3c", "#a8bf6a", "#d9b44a", "#7c4a2d", "#2c3a2a"] },
    { name: "Deep water", bg: "#e9eef0", colors: ["#e9eef0", "#2a4d6b", "#4f8ba8", "#8fc0c8", "#12232f", "#d97f5c"] },
  ],
  parameters: [
    { key: "layers", label: "Fields", min: 2, max: 10, step: 1, value: 5 },
    { key: "sway", label: "Sway", min: 0, max: 0.9, step: 0.01, value: 0.5 },
    { key: "freq", label: "Undulation", min: 0.4, max: 6, step: 0.1, value: 2.2 },
    { key: "mix", label: "Horizontal mix", min: 0, max: 1, step: 0.01, value: 0.35 },
    { key: "frame", label: "Frame", min: 0, max: 0.05, step: 0.002, value: 0.012 },
  ],
  paint: paintStrata,
};
