import { PatternPainter } from "./pattern-renderer.js";
import { getMirroredToteGeometry, getPrintLayout } from "./print-layouts.js";

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

function drawImageVerticallyFlipped(context, image, source, destination) {
  context.save();
  context.translate(0, destination.y * 2 + destination.height);
  context.scale(1, -1);
  context.drawImage(
    image,
    source.x,
    source.y,
    source.width,
    source.height,
    destination.x,
    destination.y,
    destination.width,
    destination.height,
  );
  context.restore();
}

export function composeMirroredTote(canvas, faceCanvas, geometry) {
  const context = canvas.getContext("2d");
  const { width, height, halfHeight, faceHeight, bleedHeight, bottomFaceY } = geometry;
  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  context.drawImage(faceCanvas, 0, 0, faceCanvas.width, faceCanvas.height, 0, 0, width, faceHeight);
  drawImageVerticallyFlipped(
    context,
    faceCanvas,
    { x: 0, y: 0, width: faceCanvas.width, height: faceCanvas.height },
    { x: 0, y: bottomFaceY, width, height: faceHeight },
  );

  if (bleedHeight > 0) {
    const sourceBleedHeight = Math.min(faceCanvas.height, bleedHeight);
    const sourceBleed = {
      x: 0,
      y: faceCanvas.height - sourceBleedHeight,
      width: faceCanvas.width,
      height: sourceBleedHeight,
    };
    drawImageVerticallyFlipped(
      context,
      faceCanvas,
      sourceBleed,
      { x: 0, y: faceHeight, width, height: bleedHeight },
    );
    context.drawImage(
      faceCanvas,
      sourceBleed.x,
      sourceBleed.y,
      sourceBleed.width,
      sourceBleed.height,
      0,
      halfHeight,
      width,
      bleedHeight,
    );
  }
  context.restore();
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
    // The Studio is always the editable, single-face pattern. Product-specific
    // folds, mirrors, bleeds, and print sheets are created only for submission.
    this.painter.paint(this.p5, state, state.width, state.height, scale);
    this.onTextureUpdate?.(this.canvas, state.width, state.height, state);
  }

  paintPrintLayout(target, state, outputWidth, outputHeight, scale) {
    const layout = getPrintLayout(state);
    if (!layout || layout.type !== "mirrored-tote") {
      this.painter.paint(target, state, state.width, state.height, scale);
      return;
    }

    const geometry = getMirroredToteGeometry(layout, outputWidth, outputHeight);
    const face = this.p5.createGraphics(geometry.width, geometry.faceHeight);
    face.pixelDensity(1);
    try {
      const faceScale = geometry.width / layout.artworkWidth;
      this.painter.paint(face, state, layout.artworkWidth, layout.artworkHeight, faceScale);
      composeMirroredTote(target.canvas, face.canvas, geometry);
    } finally {
      face.remove();
    }
  }

  async createFlatPatternBlob({ maxEdge = Infinity, label = "pattern" } = {}) {
    await this.ready;
    const state = this.state ?? this.pendingState;
    if (!state) throw new Error("A pattern must be rendered before it can be exported.");
    const scale = Math.min(1, maxEdge / Math.max(state.width, state.height));
    const outputWidth = Math.max(1, Math.round(state.width * scale));
    const outputHeight = Math.max(1, Math.round(state.height * scale));
    const graphics = this.p5.createGraphics(outputWidth, outputHeight);
    graphics.pixelDensity(1);
    try {
      this.painter.paint(graphics, state, state.width, state.height, scale);
      return {
        blob: await canvasToBlob(graphics.canvas),
        width: outputWidth,
        height: outputHeight,
        filename: `haptique-${label}-${state.seriesId}-${String(state.seed).padStart(6, "0")}-${outputWidth}x${outputHeight}.png`,
      };
    } finally {
      graphics.remove();
    }
  }

  async createProductArtworkBlob({ printPreset, label = "product" } = {}) {
    await this.ready;
    const state = this.state ?? this.pendingState;
    if (!state) throw new Error("A pattern must be rendered before product artwork can be created.");
    const layout = getPrintLayout({ printPreset });
    if (!layout) throw new Error("This product does not have a production artwork layout yet.");
    const graphics = this.p5.createGraphics(layout.width, layout.height);
    graphics.pixelDensity(1);
    try {
      this.paintPrintLayout(graphics, { ...state, printPreset }, layout.width, layout.height, 1);
      return {
        blob: await canvasToBlob(graphics.canvas),
        width: layout.width,
        height: layout.height,
        filename: `haptique-${label}-${state.seriesId}-${String(state.seed).padStart(6, "0")}-${layout.width}x${layout.height}.png`,
      };
    } finally {
      graphics.remove();
    }
  }

  async exportFlatPattern({ maxEdge = Infinity, label = "pattern" } = {}) {
    const { blob, filename } = await this.createFlatPatternBlob({ maxEdge, label });
    downloadBlob(blob, filename);
  }

  dispose() {
    this.sketch?.remove();
    this.sketch = null;
    this.canvas = null;
  }
}
