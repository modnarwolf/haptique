import { TWO_PI } from "./helpers.js";

function paintMoire(context, target) {
  const { p5, parameters, palette, width, height, scale, chance, pick, drawFrame } = context;
  const focusX = parameters.focusX * width;
  const focusY = parameters.focusY * height;
  const accentColors = palette.colors.slice(1);
  let maxRadius = 0;
  for (const [cornerX, cornerY] of [[0, 0], [width, 0], [0, height], [width, height]]) {
    maxRadius = Math.max(maxRadius, Math.hypot(cornerX - focusX, cornerY - focusY));
  }
  maxRadius *= 1.02;

  const radiusRatio = Math.pow(0.004, 1 / parameters.bands);
  const inkRatio = Math.pow(radiusRatio, parameters.ink);
  const pointAt = (radius, angle) => {
    const wavedRadius = radius * (1 + parameters.wave * Math.sin(Math.round(parameters.lobes) * angle));
    const twistedAngle = angle
      + parameters.twist * Math.log(Math.max(wavedRadius, 0.000001) / maxRadius);
    return [
      focusX + wavedRadius * Math.cos(twistedAngle),
      focusY + wavedRadius * Math.sin(twistedAngle),
    ];
  };

  for (let band = 0; band < parameters.bands; band++) {
    const outerRadius = maxRadius * Math.pow(radiusRatio, band);
    const innerRadius = outerRadius * inkRatio;
    if (outerRadius < 0.4) break;
    const steps = Math.max(64, Math.min(2048, Math.ceil(TWO_PI * outerRadius * scale / 2)));
    target.fill(accentColors.length && chance(parameters.accent) ? pick(accentColors) : palette.colors[0]);
    target.beginShape();
    for (let step = 0; step <= steps; step++) {
      target.vertex(...pointAt(outerRadius, (step / steps) * TWO_PI));
    }
    for (let step = steps; step >= 0; step--) {
      target.vertex(...pointAt(innerRadius, (step / steps) * TWO_PI));
    }
    target.endShape(p5.CLOSE);
  }

  drawFrame(target, parameters.frame, palette.colors[0]);
}

export const moireSeries = {
  id: "sr0070",
  name: "Moiré",
  note: "Op-art wave bands",
  palettes: [
    { name: "Original print", bg: "#e8dcc4", colors: ["#1f1e1c", "#8a7f6a"] },
    { name: "Blueprint", bg: "#0f2a44", colors: ["#e8eef5", "#7fb2d9"] },
    { name: "Vermilion", bg: "#f2ede2", colors: ["#c8321f", "#1f1e1c", "#e0a03c"] },
    { name: "Ink & jade", bg: "#eef2ec", colors: ["#16211d", "#2f7d6a", "#c8d6c4"] },
    { name: "Nightfall", bg: "#101014", colors: ["#ece7d8", "#6b7a9c", "#c85a3c"] },
  ],
  parameters: [
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
  paint: paintMoire,
};
