import { PatternPainter } from "./pattern-renderer.js";

const LIVE_TEXTURE_MAX_EDGE = 1600;

function downloadBlob(blob, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 8000);
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Canvas export failed."))), "image/png");
  });
}

export class P5PatternEngine {
  constructor(onTextureUpdate) {
    if (!window.p5) throw new Error("p5.js did not load before the pattern engine.");
    this.onTextureUpdate = onTextureUpdate;
    this.ready = new Promise((resolve) => {
      this.sketch = new window.p5((p5) => {
        p5.setup = () => {
          const renderer = p5.createCanvas(2, 2);
          renderer.elt.className = "pattern-texture-canvas";
          renderer.elt.setAttribute("aria-hidden", "true");
          p5.pixelDensity(1);
          p5.noLoop();
          this.p5 = p5;
          this.canvas = renderer.elt;
          this.painter = new PatternPainter(p5);
          resolve(this);
          if (this.pendingState) this.renderNow(this.pendingState);
        };
      });
    });
  }

  setState(state) {
    this.pendingState = state;
    if (!this.p5 || this.renderQueued) return;
    this.renderQueued = true;
    requestAnimationFrame(() => {
      this.renderQueued = false;
      if (this.pendingState) this.renderNow(this.pendingState);
    });
  }

  renderNow(state) {
    this.state = state;
    const scale = Math.min(1, LIVE_TEXTURE_MAX_EDGE / Math.max(state.width, state.height));
    const width = Math.max(1, Math.round(state.width * scale));
    const height = Math.max(1, Math.round(state.height * scale));
    if (this.p5.width !== width || this.p5.height !== height) this.p5.resizeCanvas(width, height, true);
    this.p5.clear();
    this.painter.paint(this.p5, state, state.width, state.height, scale);
    this.onTextureUpdate?.(this.canvas, state.width, state.height, state);
  }

  async exportFlatPattern() {
    await this.ready;
    const state = this.state ?? this.pendingState;
    if (!state) return;
    const graphics = this.p5.createGraphics(state.width, state.height);
    graphics.pixelDensity(1);
    try {
      this.painter.paint(graphics, state, state.width, state.height, 1);
      const blob = await canvasToBlob(graphics.canvas);
      downloadBlob(
        blob,
        `haptique-pattern-${state.series}-${String(state.seed).padStart(6, "0")}-${state.width}x${state.height}.png`,
      );
    } finally {
      graphics.remove();
    }
  }

  dispose() {
    this.sketch?.remove();
    this.sketch = null;
    this.canvas = null;
  }
}
