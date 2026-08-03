import { getPalette } from "./pattern-data.js";

const TWO_PI = Math.PI * 2;

export class PatternPainter {
  constructor(p5) {
    this.p5 = p5;
  }

  paint(target, state, width, height, scale = 1) {
    this.state = state;
    this.width = width;
    this.height = height;
    this.scale = scale;
    this.palette = getPalette(state);
    this.p5.randomSeed(state.seed);
    this.p5.noiseSeed(state.seed);
    target.push();
    target.noStroke();
    target.background(this.palette.bg);
    target.scale(scale);
    const painters = {
      A: this.drawBlockGrid,
      C: this.drawSwatchPairs,
      E: this.drawCutRibbons,
      W: this.drawLoom,
      S: this.drawStrata,
      B: this.drawCollage,
      O: this.drawMoire,
    };
    painters[state.series].call(this, target);
    target.pop();
  }

  get params() {
    return this.state.params[this.state.series];
  }

  get shortEdge() {
    return Math.min(this.width, this.height);
  }

  random(...args) {
    return this.p5.random(...args);
  }

  chance(amount) {
    return this.random() < amount;
  }

  pick(colors = this.palette.colors) {
    return colors[Math.floor(this.random(colors.length))];
  }

  pickNot(colors, excluded) {
    if (colors.length < 2) return colors[0];
    let color = this.pick(colors);
    for (let guard = 0; color === excluded && guard < 12; guard++) color = this.pick(colors);
    return color;
  }

  frame(target, amount, color = this.darkest(this.palette.colors)) {
    const size = amount * this.shortEdge;
    if (size <= 0) return;
    target.fill(color);
    target.rect(0, 0, this.width, size);
    target.rect(0, this.height - size, this.width, size);
    target.rect(0, 0, size, this.height);
    target.rect(this.width - size, 0, size, this.height);
  }

  darkest(colors) {
    const luminance = (hex) => {
      const value = Number.parseInt(hex.slice(1), 16);
      return 0.299 * ((value >> 16) & 255) + 0.587 * ((value >> 8) & 255) + 0.114 * (value & 255);
    };
    return colors.reduce((result, color) => (luminance(color) < luminance(result) ? color : result), colors[0]);
  }

  drawBlockGrid(target) {
    const p = this.params;
    const margin = p.margin * this.shortEdge;
    const gap = p.gap * this.shortEdge;
    const cellWidth = (this.width - margin * 2 - gap * (p.cols - 1)) / p.cols;
    const cellHeight = (this.height - margin * 2 - gap * (p.rows - 1)) / p.rows;
    for (let row = 0; row < p.rows; row++) {
      for (let column = 0; column < p.cols; column++) {
        if (this.chance(p.blank)) continue;
        const insetX = cellWidth * p.inset;
        const insetY = cellHeight * p.inset;
        const x = margin + column * (cellWidth + gap) + insetX;
        const y = margin + row * (cellHeight + gap) + insetY;
        const w = cellWidth - insetX * 2;
        const h = cellHeight - insetY * 2;
        const base = this.chance(0.4) ? this.palette.colors[0] : this.pick();
        const mark = this.pickNot(this.palette.colors, base);
        this.drawBlockMotif(target, Math.floor(this.random(10)), x, y, w, h, base, mark);
      }
    }
  }

  drawBlockMotif(g, motif, x, y, w, h, base, mark) {
    g.fill(base);
    g.rect(x, y, w, h);
    g.fill(mark);
    if (motif === 0) {
      const count = Math.floor(this.random(3, 8));
      const stripe = w / (count * 2 - 1);
      for (let index = 0; index < count; index++) g.rect(x + index * stripe * 2, y, stripe, h);
    } else if (motif === 1) {
      g.ellipse(x + w / 2, y + h / 2, Math.min(w, h) * this.random(0.6, 0.88));
    } else if (motif === 2) {
      const direction = Math.floor(this.random(4));
      if (direction === 0) g.triangle(x, y, x + w, y, x + w / 2, y + h);
      if (direction === 1) g.triangle(x, y + h, x + w, y + h, x + w / 2, y);
      if (direction === 2) g.triangle(x + w, y, x + w, y + h, x, y + h / 2);
      if (direction === 3) g.triangle(x, y, x, y + h, x + w, y + h / 2);
    } else if (motif === 3) {
      const count = Math.floor(this.random(2, 4));
      const section = h / count;
      for (let index = 0; index < count; index++) {
        const yy = y + index * section;
        g.triangle(x + w * 0.18, yy + section * 0.92, x + w * 0.82, yy + section * 0.92, x + w / 2, yy + section * 0.12);
      }
    } else if (motif === 4) {
      const columns = Math.floor(this.random(2, 4));
      const rows = Math.floor(this.random(2, 4));
      for (let column = 0; column < columns; column++) for (let row = 0; row < rows; row++) {
        if (!this.chance(0.22)) {
          g.fill(this.pick());
          g.rect(x + (column * w) / columns, y + (row * h) / rows, w / columns + 0.5, h / rows + 0.5);
        }
      }
    } else if (motif === 5) {
      const steps = Math.floor(this.random(3, 7));
      const stepW = w / steps;
      const stepH = (h * 0.72) / steps;
      let xx = x;
      let yy = y + h * 0.28;
      g.beginShape();
      g.vertex(x, y + h);
      g.vertex(xx, yy);
      for (let index = 0; index < steps; index++) {
        xx += stepW;
        g.vertex(xx, yy);
        yy += stepH;
        g.vertex(xx, yy);
      }
      g.vertex(x + w, y + h);
      g.endShape(this.p5.CLOSE);
    } else if (motif === 6) {
      const diameter = Math.min(w, h * 1.1) * this.random(0.9, 1.15);
      g.arc(x + w / 2, y, diameter, diameter, 0, Math.PI, this.p5.PIE);
      g.fill(this.pickNot(this.palette.colors, mark));
      g.arc(x + w / 2, y + h, diameter, diameter, Math.PI, TWO_PI, this.p5.PIE);
    } else if (motif === 7) {
      const bandHeight = h * this.random(0.18, 0.42);
      g.rect(x, y + (h - bandHeight) * this.random(0.15, 0.85), w, bandHeight);
    } else if (motif === 8) {
      const columns = Math.floor(this.random(2, 4));
      for (let index = 0; index < columns; index++) {
        if (this.chance(0.28)) continue;
        g.fill(this.pick());
        const cut = this.chance(0.3);
        g.rect(x + (index * w) / columns, y + (cut ? h * 0.2 : 0), w / columns + 0.5, h * (cut ? 0.8 : 1));
      }
    } else if (this.chance(0.5)) {
      g.rect(x, y, w * this.random(0.25, 0.7), h);
    } else {
      g.rect(x, y, w, h * this.random(0.25, 0.7));
    }
  }

  drawSwatchPairs(g) {
    const p = this.params;
    const frame = p.frame * this.shortEdge;
    if (frame > 0) {
      g.fill(this.palette.colors[0]);
      g.rect(0, 0, this.width, this.height);
      g.fill(this.palette.bg);
      g.rect(frame, frame, this.width - frame * 2, this.height - frame * 2);
    }
    const margin = p.margin * this.shortEdge + frame;
    const cellWidth = (this.width - margin * 2) / p.cols;
    const cellHeight = (this.height - margin * 2) / p.rows;
    const size = Math.min(cellWidth, cellHeight) * p.size;
    for (let row = 0; row < p.rows; row++) for (let column = 0; column < p.cols; column++) {
      const shape = p.shape === "Mixed" ? ["Square", "Triangle", "Circle"][Math.floor(this.random(3))] : p.shape;
      const top = this.pick();
      const bottom = this.pickNot(this.palette.colors, top);
      const split = Math.max(0, Math.min(1, p.split + (p.jitter ? this.random(-p.jitter, p.jitter) : 0)));
      this.drawChip(g, shape, margin + cellWidth * (column + 0.5), margin + cellHeight * (row + 0.5), size, split, top, bottom);
    }
  }

  drawChip(g, shape, cx, cy, size, split, top, bottom) {
    const x = cx - size / 2;
    const y = cy - size / 2;
    const cut = size * split;
    g.fill(bottom);
    if (shape === "Triangle") {
      g.triangle(cx, y, x, y + size, x + size, y + size);
      g.fill(top);
      const halfWidth = cut / 2;
      g.triangle(cx, y, cx - halfWidth, y + cut, cx + halfWidth, y + cut);
    } else if (shape === "Circle") {
      g.ellipse(cx, cy, size, size);
      g.fill(top);
      const ctx = g.drawingContext;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, size, cut);
      ctx.clip();
      g.ellipse(cx, cy, size, size);
      ctx.restore();
    } else {
      g.rect(x, y, size, size);
      g.fill(top);
      g.rect(x, y, size, cut);
    }
  }

  drawCutRibbons(g) {
    const p = this.params;
    const edge = p.frame * this.shortEdge;
    const weights = Array.from({ length: p.bands }, () => this.random(0.75, 1.25));
    const total = weights.reduce((sum, value) => sum + value, 0);
    const accents = this.palette.colors.slice(1);
    let top = edge;
    for (let band = 0; band < p.bands; band++) {
      const bottom = band === p.bands - 1 ? this.height - edge : top + ((this.height - edge * 2) * weights[band]) / total;
      g.fill(this.palette.bg);
      g.rect(edge, top, this.width - edge * 2, bottom - top);
      const unit = (this.width - edge * 2) / p.density;
      let xTop = edge - this.random(unit);
      let xBottom = xTop + this.random(-unit, unit) * p.taper * 0.5;
      for (let guard = 0; xTop < this.width - edge && guard < 400; guard++) {
        const gap = unit * this.random(0.25, 0.9);
        xTop += gap;
        xBottom += gap * (1 + this.random(-0.6, 0.6) * p.taper);
        const topWidth = unit * this.random(0.3, 1.05);
        const bottomWidth = topWidth * (1 + this.random(-0.55, 0.75) * p.taper);
        g.fill(accents.length && this.chance(p.accent) ? this.pick(accents) : this.palette.colors[0]);
        g.quad(
          xTop, top,
          xTop + topWidth, top,
          xBottom + bottomWidth, bottom - (bottom - top) * this.random(0, p.ragged),
          xBottom, bottom - (bottom - top) * this.random(0, p.ragged),
        );
        xTop += topWidth;
        xBottom += bottomWidth;
      }
      top = bottom;
    }
    this.frame(g, p.frame, this.palette.colors[0]);
  }

  drawLoom(g) {
    const p = this.params;
    const edge = p.frame * this.shortEdge;
    const gap = p.gap * this.shortEdge;
    const weights = Array.from({ length: p.bands }, () => 1 + this.random(-1, 1) * p.variance * 0.6);
    const total = weights.reduce((sum, value) => sum + value, 0);
    const usable = this.height - edge * 2 - gap * (p.bands - 1);
    let y = edge;
    for (let band = 0; band < p.bands; band++) {
      const height = (usable * weights[band]) / total;
      this.drawWeave(g, band % 6, edge, y, this.width - edge * 2, height, p.density);
      y += height + gap;
    }
    this.frame(g, p.frame);
  }

  drawWeave(g, type, x, y, width, height, density) {
    const base = this.pick();
    const mark = this.pickNot(this.palette.colors, base);
    g.fill(base);
    g.rect(x, y, width, height);
    g.fill(mark);
    if (type === 0) {
      const count = Math.max(4, Math.round(density * this.random(0.6, 1.4)));
      for (let index = 0; index < count; index += 2) g.rect(x + (index * width) / count, y, width / count, height);
    } else if (type === 1) {
      const columns = Math.max(2, Math.round(density / 3));
      const cellWidth = width / columns;
      const rows = Math.max(2, Math.round(height / cellWidth));
      for (let row = 0; row < rows; row++) for (let column = -1; column <= columns; column++) {
        const xx = x + column * cellWidth + (row % 2 ? cellWidth / 2 : 0);
        g.rect(Math.max(x, xx), y + (row * height) / rows, Math.min(cellWidth / 2, x + width - xx), height / rows);
      }
    } else if (type === 2 || type === 3) {
      const columns = Math.max(3, Math.round(density / 2.5));
      const cellWidth = width / columns;
      const rows = Math.max(1, Math.round(height / cellWidth));
      for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
        if ((row + column) % 2 === 0) g.rect(x + column * cellWidth, y + (row * height) / rows, cellWidth + 0.5, height / rows + 0.5);
      }
      if (type === 3) {
        g.fill(this.pickNot(this.palette.colors, mark));
        for (let column = 0; column < columns; column += 2) g.rect(x + column * cellWidth, y, cellWidth * 0.28, height);
      }
    } else if (type === 4) {
      const groups = Math.max(3, Math.round(density / 3.2));
      const pitch = width / groups;
      const rule = pitch * this.random(0.035, 0.075);
      for (let group = 0; group <= groups; group++) for (let line = 0; line < 3; line++) {
        g.rect(x + group * pitch + line * rule * 2.2, y, rule, height);
      }
    } else {
      let current = x;
      const unit = width / Math.max(4, Math.round(density / 2));
      while (current < x + width) {
        const columnWidth = unit * this.random(0.5, 3);
        g.fill(this.pick());
        g.rect(current, y, Math.min(columnWidth, x + width - current) + 0.5, height);
        current += columnWidth;
      }
    }
  }

  drawStrata(g) {
    const p = this.params;
    const colors = this.palette.colors;
    g.fill(colors[0]);
    g.rect(0, 0, this.width, this.height);
    let previous = colors[0];
    for (let layer = 1; layer <= p.layers; layer++) {
      const horizontal = this.chance(p.mix);
      const color = this.pickNot(colors, previous);
      const base = layer / (p.layers + 1) + this.random(-0.09, 0.09);
      const amplitude = p.sway * this.shortEdge * 0.5;
      const offset = this.random(1000);
      previous = color;
      g.fill(color);
      g.beginShape();
      for (let sample = 0; sample <= 192; sample++) {
        const t = sample / 192;
        const sway = ((this.p5.noise(offset + t * p.freq) - 0.5) * 2.4 + (this.p5.noise(offset + 90 + t * p.freq * 0.37) - 0.5) * 0.8) * amplitude;
        g.vertex(horizontal ? t * this.width : base * this.width + sway, horizontal ? base * this.height + sway : t * this.height);
      }
      if (horizontal) {
        g.vertex(this.width, this.height);
        g.vertex(0, this.height);
      } else {
        g.vertex(this.width, this.height);
        g.vertex(this.width, 0);
      }
      g.endShape(this.p5.CLOSE);
    }
    this.frame(g, p.frame);
  }

  drawCollage(g) {
    const p = this.params;
    const bleed = p.bleed * this.shortEdge;
    g.fill(this.palette.bg);
    g.rect(0, 0, this.width, this.height);
    for (let index = 0; index < p.shapes; index++) {
      const t = p.shapes > 1 ? index / (p.shapes - 1) : 0;
      const radius = this.shortEdge * p.scale * this.p5.lerp(1.5, 0.26, Math.pow(t, 0.7)) * this.random(0.78, 1.22);
      const cx = this.random(-bleed - radius * 0.35, this.width + bleed + radius * 0.35);
      const cy = this.random(-bleed - radius * 0.35, this.height + bleed + radius * 0.35);
      const rotation = this.random(TWO_PI);
      const first = this.pick();
      const second = this.pickNot(this.palette.colors, first);
      if (this.chance(p.bars)) {
        g.push();
        g.translate(cx, cy);
        g.rotate(rotation);
        g.stroke(first);
        g.strokeWeight(radius * this.random(0.3, 0.6));
        g.strokeCap(this.p5.ROUND);
        g.line(-radius, 0, radius, this.random(-radius * 0.6, radius * 0.6));
        g.noStroke();
        g.pop();
        continue;
      }
      const angular = this.chance(p.angular);
      const points = angular ? Math.floor(this.random(3, 8)) : 72;
      const radii = [];
      const k1 = Math.floor(this.random(2, 4));
      const phase = this.random(TWO_PI);
      for (let point = 0; point < points; point++) {
        const angle = rotation + (point / points) * TWO_PI;
        const rr = angular ? radius * this.random(0.6, 1.35) : radius * (1 + p.wobble * 0.28 * Math.sin(k1 * angle + phase));
        radii.push([cx + rr * Math.cos(angle), cy + rr * Math.sin(angle)]);
      }
      g.fill(first);
      g.beginShape();
      radii.forEach(([x, y]) => g.vertex(x, y));
      g.endShape(this.p5.CLOSE);
      if (this.chance(p.patterned)) {
        const context = g.drawingContext;
        context.save();
        context.beginPath();
        radii.forEach(([x, y], point) => (point ? context.lineTo(x, y) : context.moveTo(x, y)));
        context.closePath();
        context.clip();
        context.fillStyle = second;
        const cell = Math.max(2, this.shortEdge * p.patternScale);
        for (let xx = cx - radius * 1.5, column = 0; xx < cx + radius * 1.5; xx += cell, column++) {
          if (column % 2 === 0) context.fillRect(xx, cy - radius * 1.5, cell, radius * 3);
        }
        context.restore();
      }
    }
    this.frame(g, p.frame);
  }

  drawMoire(g) {
    const p = this.params;
    const focusX = p.focusX * this.width;
    const focusY = p.focusY * this.height;
    const accents = this.palette.colors.slice(1);
    let maxRadius = 0;
    for (const [x, y] of [[0, 0], [this.width, 0], [0, this.height], [this.width, this.height]]) {
      maxRadius = Math.max(maxRadius, Math.hypot(x - focusX, y - focusY));
    }
    maxRadius *= 1.02;
    const ratio = Math.pow(0.004, 1 / p.bands);
    const duty = Math.pow(ratio, p.ink);
    const point = (radius, angle) => {
      const waved = radius * (1 + p.wave * Math.sin(Math.round(p.lobes) * angle));
      const twisted = angle + p.twist * Math.log(Math.max(waved, 0.000001) / maxRadius);
      return [focusX + waved * Math.cos(twisted), focusY + waved * Math.sin(twisted)];
    };
    for (let band = 0; band < p.bands; band++) {
      const outer = maxRadius * Math.pow(ratio, band);
      const inner = outer * duty;
      if (outer < 0.4) break;
      const steps = Math.max(64, Math.min(2048, Math.ceil(TWO_PI * outer * this.scale / 2)));
      g.fill(accents.length && this.chance(p.accent) ? this.pick(accents) : this.palette.colors[0]);
      g.beginShape();
      for (let step = 0; step <= steps; step++) g.vertex(...point(outer, (step / steps) * TWO_PI));
      for (let step = steps; step >= 0; step--) g.vertex(...point(inner, (step / steps) * TWO_PI));
      g.endShape(this.p5.CLOSE);
    }
    this.frame(g, p.frame, this.palette.colors[0]);
  }
}
