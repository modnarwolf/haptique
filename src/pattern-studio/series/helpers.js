export const TWO_PI = Math.PI * 2;

function darkestColor(colors) {
  const luminance = (hexColor) => {
    const value = Number.parseInt(hexColor.slice(1), 16);
    return 0.299 * ((value >> 16) & 255) + 0.587 * ((value >> 8) & 255) + 0.114 * (value & 255);
  };
  return colors.reduce(
    (darkest, color) => (luminance(color) < luminance(darkest) ? color : darkest),
    colors[0],
  );
}

export function createSeriesRenderContext({ p5, palette, parameters, width, height, scale }) {
  const shortEdge = Math.min(width, height);
  const random = (...args) => p5.random(...args);
  const chance = (amount) => random() < amount;
  const pick = (colors = palette.colors) => colors[Math.floor(random(colors.length))];
  const pickDifferent = (colors, excludedColor) => {
    if (colors.length < 2) return colors[0];
    let color = pick(colors);
    for (let attempt = 0; color === excludedColor && attempt < 12; attempt++) color = pick(colors);
    return color;
  };
  const drawFrame = (target, amount, color = darkestColor(palette.colors)) => {
    const frameSize = amount * shortEdge;
    if (frameSize <= 0) return;
    target.fill(color);
    target.rect(0, 0, width, frameSize);
    target.rect(0, height - frameSize, width, frameSize);
    target.rect(0, 0, frameSize, height);
    target.rect(width - frameSize, 0, frameSize, height);
  };

  return {
    p5,
    palette,
    parameters,
    width,
    height,
    scale,
    shortEdge,
    random,
    chance,
    pick,
    pickDifferent,
    drawFrame,
  };
}
