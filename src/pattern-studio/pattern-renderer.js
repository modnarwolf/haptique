import { getPalette } from "./pattern-data.js";
import { createSeriesRenderContext } from "./series/helpers.js";
import { getSeriesDefinition } from "./series/index.js";

export class PatternPainter {
  constructor(p5) {
    this.p5 = p5;
  }

  paint(target, state, width, height, scale = 1) {
    const series = getSeriesDefinition(state.seriesId);
    const palette = getPalette(state);
    const parameters = state.parametersBySeriesId[state.seriesId];
    if (!parameters) throw new Error(`Missing parameters for pattern series: ${state.seriesId}`);

    this.p5.randomSeed(state.seed);
    this.p5.noiseSeed(state.seed);
    target.push();
    try {
      target.noStroke();
      target.background(palette.bg);
      target.scale(scale);
      series.paint(
        createSeriesRenderContext({
          p5: this.p5,
          palette,
          parameters,
          width,
          height,
          scale,
        }),
        target,
      );
    } finally {
      target.pop();
    }
  }
}
