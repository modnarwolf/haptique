import { Vector3 } from "three";
import { OceanWaveField, applySeededClothVariation } from "../haptique-features.js";
import { INITIAL_DRAPE } from "../data/initial-drape.js";

export const CLOTH_DT = 1 / 120;
export const CLOTH_MAX_SUBSTEPS = 4;

const MAX_DROPLETS = 700;
const LIQUID_DT = 1 / 120;
const LIQUID_MAX_SUBSTEPS = 4;
const LIQUID_HASH_X = 73856093;
const LIQUID_HASH_Y = 19349663;
const LIQUID_HASH_Z = 83492791;

export class ClothSim {
  constructor(t, e, s, r) {
    ((this.width = t),
      (this.height = e),
      (this.segX = s),
      (this.segY = r),
      (this.cols = s + 1),
      (this.rows = r + 1),
      (this.count = this.cols * this.rows),
      (this.positions = new Float32Array(this.count * 3)),
      (this.prev = new Float32Array(this.count * 3)),
      (this.rest = new Float32Array(this.count * 3)),
      this.initPositions());
    const l = [],
      c = [],
      f = [],
      d = (h, m) => m * this.cols + h;
    for (let h = 0; h < this.rows; h++)
      for (let m = 0; m < this.cols; m++)
        (m + 1 < this.cols && (l.push(d(m, h)), c.push(d(m + 1, h)), f.push(1)),
          h + 1 < this.rows && (l.push(d(m, h)), c.push(d(m, h + 1)), f.push(1)),
          m + 1 < this.cols &&
            h + 1 < this.rows &&
            (l.push(d(m, h)),
            c.push(d(m + 1, h + 1)),
            f.push(0.85),
            l.push(d(m + 1, h)),
            c.push(d(m, h + 1)),
            f.push(0.85)),
          m + 2 < this.cols && (l.push(d(m, h)), c.push(d(m + 2, h)), f.push(0.35)),
          h + 2 < this.rows && (l.push(d(m, h)), c.push(d(m, h + 2)), f.push(0.35)));
    ((this.cA = new Int32Array(l)),
      (this.cB = new Int32Array(c)),
      (this.cMul = new Float32Array(f)),
      (this.cRest = new Float32Array(l.length)),
      this.computeRestLengths(),
      (this.neighbors = new Int32Array(this.count * 4).fill(-1)));
    for (let h = 0; h < this.rows; h++)
      for (let m = 0; m < this.cols; m++) {
        const y = d(m, h) * 4;
        ((this.neighbors[y + 0] = m > 0 ? d(m - 1, h) : -1),
          (this.neighbors[y + 1] = m + 1 < this.cols ? d(m + 1, h) : -1),
          (this.neighbors[y + 2] = h > 0 ? d(m, h - 1) : -1),
          (this.neighbors[y + 3] = h + 1 < this.rows ? d(m, h + 1) : -1));
      }
  }
  width;
  height;
  segX;
  segY;
  cols;
  rows;
  count;
  positions;
  prev;
  rest;
  cA;
  cB;
  cRest;
  cMul;
  neighbors;
  grab = null;
  accumulator = 0;
  initPositions() {
    const t = INITIAL_DRAPE,
      e = t.cols,
      s = t.rows,
      r = this.width / t.width,
      l = this.height / t.height,
      c = (r + l) / 2;
    let f = 0;
    for (let d = 0; d < this.rows; d++)
      for (let h = 0; h < this.cols; h++) {
        const m = (h / this.segX) * (e - 1),
          y = (d / this.segY) * (s - 1),
          g = Math.min(e - 2, Math.floor(m)),
          _ = Math.min(s - 2, Math.floor(y)),
          M = m - g,
          E = y - _;
        for (let S = 0; S < 3; S++) {
          const x = (_ * e + g) * 3 + S,
            w = (_ * e + g + 1) * 3 + S,
            A = ((_ + 1) * e + g) * 3 + S,
            T = ((_ + 1) * e + g + 1) * 3 + S,
            P = t.data[x] * (1 - M) + t.data[w] * M,
            R = t.data[A] * (1 - M) + t.data[T] * M,
            U = S === 0 ? r : S === 1 ? l : c;
          this.positions[f + S] = (P * (1 - E) + R * E) * U;
        }
        f += 3;
      }
    (this.prev.set(this.positions), this.rest.set(this.positions));
  }

  computeRestLengths() {
    const t = this.width / this.segX,
      e = this.height / this.segY;
    for (let s = 0; s < this.cA.length; s++) {
      const r = this.cA[s],
        l = this.cB[s],
        c = r % this.cols,
        f = Math.floor(r / this.cols),
        d = l % this.cols,
        h = Math.floor(l / this.cols),
        m = (c - d) * t,
        y = (f - h) * e;
      this.cRest[s] = Math.hypot(m, y);
    }
  }

  oceanWaves = new OceanWaveField();

  applySeedVariation(seed, amplitude) {
    applySeededClothVariation(this.positions, this.prev, seed, {
      columns: this.cols,
      rows: this.rows,
      amplitude,
    });
  }

  // Reset cloth positions with optional seed-controlled deterministic perturbation
  reset(seed = 1) {
    this.initPositions();
    this.grab = null;
    this.oceanWaves.reset();
    this.applySeedVariation(seed);
  }

  poke(t = 0.5) {
    const e = this.positions,
      s = Math.floor(Math.random() * this.count),
      r = e[s * 3],
      l = e[s * 3 + 1],
      c = e[s * 3 + 2],
      f = new Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
        .normalize()
        .multiplyScalar(t * 0.09),
      d = Math.max(this.width, this.height) * 0.28;
    for (let h = 0; h < this.count; h++) {
      const m = e[h * 3] - r,
        y = e[h * 3 + 1] - l,
        g = e[h * 3 + 2] - c,
        _ = Math.sqrt(m * m + y * y + g * g);
      if (_ > d) continue;
      const M = 1 - _ / d,
        E = M * M * (3 - 2 * M);
      ((this.prev[h * 3] -= f.x * E),
        (this.prev[h * 3 + 1] -= f.y * E),
        (this.prev[h * 3 + 2] -= f.z * E));
    }
  }
  startGrab(t, e) {
    const s = this.positions,
      r = [],
      l = [],
      c = [];
    let f = 1 / 0;
    for (let d = 0; d < this.count; d++) {
      const h = s[d * 3] - t.x,
        m = s[d * 3 + 1] - t.y,
        y = s[d * 3 + 2] - t.z,
        g = Math.sqrt(h * h + m * m + y * y);
      if (((f = Math.min(f, g)), g > e)) continue;
      const _ = 1 - g / e,
        M = _ * _ * (3 - 2 * _);
      (r.push(d), l.push(M), c.push(h, m, y));
    }
    return r.length === 0 || f > e
      ? !1
      : ((this.grab = { indices: r, weights: l, offsets: new Float32Array(c), target: t.clone() }),
        !0);
  }
  moveGrab(t) {
    this.grab && this.grab.target.copy(t);
  }
  endGrab() {
    this.grab = null;
  }
  get isGrabbing() {
    return this.grab !== null;
  }
  applyImpulse(t, e, s, r) {
    ((this.prev[t * 3] -= e), (this.prev[t * 3 + 1] -= s), (this.prev[t * 3 + 2] -= r));
  }
  cavityScratch = null;
  computeCavity(t, e, s = 6) {
    const r = this.positions,
      l = this.neighbors,
      c = this.count,
      f = 1 / Math.min(this.width / this.segX, this.height / this.segY);
    (!this.cavityScratch || this.cavityScratch.length < c) &&
      (this.cavityScratch = new Float32Array(c));
    const d = this.cavityScratch;
    for (let h = 0; h < c; h++) {
      let m = 0,
        y = 0,
        g = 0,
        _ = 0;
      for (let A = 0; A < 4; A++) {
        const T = l[h * 4 + A];
        T < 0 || ((m += r[T * 3]), (y += r[T * 3 + 1]), (g += r[T * 3 + 2]), _++);
      }
      if (_ === 0) {
        d[h] = 0;
        continue;
      }
      const M = 1 / _,
        E = m * M - r[h * 3],
        S = y * M - r[h * 3 + 1],
        x = g * M - r[h * 3 + 2],
        w = (E * t[h * 3] + S * t[h * 3 + 1] + x * t[h * 3 + 2]) * f;
      d[h] = Math.min(1, Math.max(0, w * s));
    }
    for (let h = 0; h < c; h++) {
      let m = 0,
        y = 0;
      for (let g = 0; g < 4; g++) {
        const _ = l[h * 4 + g];
        _ < 0 || ((m += d[_]), y++);
      }
      e[h] = y > 0 ? d[h] * 0.5 + (m / y) * 0.5 : d[h];
    }
  }
  step(t, e) {
    this.accumulator += Math.min(t, 0.05);
    let s = 0;
    for (; this.accumulator >= CLOTH_DT && s < CLOTH_MAX_SUBSTEPS;) (this.substep(e), (this.accumulator -= CLOTH_DT), s++);
    s === CLOTH_MAX_SUBSTEPS && (this.accumulator = 0);
  }
  substep(t) {
    const e = this.positions,
      s = this.prev,
      r = this.count,
      l = Math.pow(1 - Math.min(t.viscosity, 0.99), CLOTH_DT * 60);
    for (let _ = 0; _ < r * 3; _++) {
      const M = e[_],
        E = (M - s[_]) * l;
      ((s[_] = M), (e[_] = M + E));
    }
    this.oceanWaves.apply(e, this.cols, this.rows, CLOTH_DT, t);
    if (t.smoothing > 0) {
      const _ = t.smoothing * 0.5,
        M = this.neighbors;
      for (let E = 0; E < r; E++) {
        let S = 0,
          x = 0,
          w = 0,
          A = 0;
        for (let P = 0; P < 4; P++) {
          const R = M[E * 4 + P];
          R < 0 || ((S += e[R * 3]), (x += e[R * 3 + 1]), (w += e[R * 3 + 2]), A++);
        }
        if (A === 0) continue;
        const T = 1 / A;
        ((e[E * 3] += (S * T - e[E * 3]) * _),
          (e[E * 3 + 1] += (x * T - e[E * 3 + 1]) * _),
          (e[E * 3 + 2] += (w * T - e[E * 3 + 2]) * _));
      }
    }
    const c = Math.max(1, Math.round(t.iterations)),
      f = t.stiffness,
      d = this.cA,
      h = this.cB,
      m = this.cRest,
      y = this.cMul,
      g = d.length;
    for (let _ = 0; _ < c; _++) {
      for (let M = 0; M < g; M++) {
        const E = d[M] * 3,
          S = h[M] * 3,
          x = e[S] - e[E],
          w = e[S + 1] - e[E + 1],
          A = e[S + 2] - e[E + 2],
          T = Math.sqrt(x * x + w * w + A * A);
        if (T < 1e-9) continue;
        const P = ((T - m[M]) / T) * 0.5 * f * y[M],
          R = x * P,
          U = w * P,
          b = A * P;
        ((e[E] += R),
          (e[E + 1] += U),
          (e[E + 2] += b),
          (e[S] -= R),
          (e[S + 1] -= U),
          (e[S + 2] -= b));
      }
      this.applyGrab();
    }
  }
  applyGrab() {
    const t = this.grab;
    if (!t) return;
    const e = this.positions;
    for (let s = 0; s < t.indices.length; s++) {
      const r = t.indices[s] * 3,
        l = t.weights[s],
        c = t.target.x + t.offsets[s * 3],
        f = t.target.y + t.offsets[s * 3 + 1],
        d = t.target.z + t.offsets[s * 3 + 2];
      ((e[r] += (c - e[r]) * l),
        (e[r + 1] += (f - e[r + 1]) * l),
        (e[r + 2] += (d - e[r + 2]) * l));
    }
  }
}

export class LiquidSim {
  pos = new Float32Array(MAX_DROPLETS * 3);
  vel = new Float32Array(MAX_DROPLETS * 3);
  neighborCount = new Uint16Array(MAX_DROPLETS);
  count = 0;
  accumulator = 0;
  emitCarry = 0;
  grid = new Map();
  clothGrid = new Map();
  dir = new Vector3(0, -1, 0);
  clear() {
    ((this.count = 0), (this.emitCarry = 0));
  }
  updateDir(t) {
    (this.dir.set(0, -1, 0),
      this.dir.applyAxisAngle(new Vector3(0, 0, 1), MathUtils.degToRad(-t.tiltX)),
      this.dir.applyAxisAngle(new Vector3(1, 0, 0), MathUtils.degToRad(t.tiltZ)),
      this.dir.normalize());
  }
  step(t, e, s, r) {
    (this.updateDir(e), (this.accumulator += Math.min(t, 0.05)));
    let l = 0;
    for (; this.accumulator >= LIQUID_DT && l < LIQUID_MAX_SUBSTEPS;)
      (this.substep(e, s, r), (this.accumulator -= LIQUID_DT), l++);
    l === LIQUID_MAX_SUBSTEPS && (this.accumulator = 0);
  }
  emit(t) {
    if (!t.flow) return;
    this.emitCarry += t.amount * LIQUID_DT;
    const e = this.dir,
      s = new Vector3(1, 0, 0);
    (Math.abs(e.x) > 0.9 && s.set(0, 0, 1), s.cross(e).normalize());
    const r = new Vector3().crossVectors(e, s);
    for (; this.emitCarry >= 1 && this.count < MAX_DROPLETS;) {
      this.emitCarry -= 1;
      const l = this.count++,
        c = Math.random() * Math.PI * 2,
        f = Math.sqrt(Math.random()) * t.spread,
        d = Math.cos(c) * f,
        h = Math.sin(c) * f;
      ((this.pos[l * 3] = -e.x * 2.3 + s.x * d + r.x * h),
        (this.pos[l * 3 + 1] = -e.y * 2.3 + s.y * d + r.y * h),
        (this.pos[l * 3 + 2] = -e.z * 2.3 + s.z * d + r.z * h),
        (this.vel[l * 3] = e.x * t.speed),
        (this.vel[l * 3 + 1] = e.y * t.speed),
        (this.vel[l * 3 + 2] = e.z * t.speed));
    }
    this.count >= MAX_DROPLETS && (this.emitCarry = 0);
  }
  cellKey(t, e, s, r) {
    return (
      (Math.floor(t * r) * LIQUID_HASH_X) ^
      (Math.floor(e * r) * LIQUID_HASH_Y) ^
      (Math.floor(s * r) * LIQUID_HASH_Z)
    ) | 0;
  }
  buildGrid(t, e, s, r) {
    t.clear();
    for (let l = 0; l < s; l++) {
      const c = this.cellKey(e[l * 3], e[l * 3 + 1], e[l * 3 + 2], r),
        f = t.get(c);
      f ? f.push(l) : t.set(c, [l]);
    }
  }
  substep(t, e, s) {
    this.emit(t);
    const r = LIQUID_DT,
      l = this.pos,
      c = this.vel,
      f = t.dropSize,
      d = this.dir,
      h = t.gravity;
    for (let x = 0; x < this.count; x++)
      ((c[x * 3] += d.x * h * r), (c[x * 3 + 1] += d.y * h * r), (c[x * 3 + 2] += d.z * h * r));
    const m = Math.max(3 * f, 0.12),
      y = 1 / m;
    this.buildGrid(this.grid, l, this.count, y);
    const g = 3.2 * t.cohesion;
    this.neighborCount.fill(0, 0, this.count);
    for (let x = 0; x < this.count; x++) {
      const w = l[x * 3],
        A = l[x * 3 + 1],
        T = l[x * 3 + 2];
      for (let P = -1; P <= 1; P++)
        for (let R = -1; R <= 1; R++)
          for (let U = -1; U <= 1; U++) {
            const b = this.cellKey(w + P * m, A + R * m, T + U * m, y),
              L = this.grid.get(b);
            if (L)
              for (const N of L) {
                if (N <= x) continue;
                const z = l[N * 3] - w,
                  G = l[N * 3 + 1] - A,
                  q = l[N * 3 + 2] - T,
                  K = Math.sqrt(z * z + G * G + q * q);
                if (K < 1e-6 || K > 3 * f) continue;
                K < 2.6 * f && (this.neighborCount[x]++, this.neighborCount[N]++);
                let W = 0;
                K < 2 * f ? (W = -22 * (2 * f - K)) : (W = (g * (K - 2 * f) * (3 * f - K)) / f);
                const I = (z / K) * W * r,
                  V = (G / K) * W * r,
                  Y = (q / K) * W * r;
                ((c[x * 3] += I),
                  (c[x * 3 + 1] += V),
                  (c[x * 3 + 2] += Y),
                  (c[N * 3] -= I),
                  (c[N * 3 + 1] -= V),
                  (c[N * 3 + 2] -= Y));
                const $ = 0.18 * r * 60,
                  st = (c[N * 3] - c[x * 3]) * $,
                  B = (c[N * 3 + 1] - c[x * 3 + 1]) * $,
                  J = (c[N * 3 + 2] - c[x * 3 + 2]) * $;
                ((c[x * 3] += st * 0.5),
                  (c[x * 3 + 1] += B * 0.5),
                  (c[x * 3 + 2] += J * 0.5),
                  (c[N * 3] -= st * 0.5),
                  (c[N * 3 + 1] -= B * 0.5),
                  (c[N * 3 + 2] -= J * 0.5));
              }
          }
    }
    const _ = f + 0.02,
      M = _ + 0.07,
      E = 1 / M;
    this.buildGrid(this.clothGrid, e.positions, e.count, E);
    const S = e.positions;
    for (let x = 0; x < this.count; x++) {
      const w = l[x * 3],
        A = l[x * 3 + 1],
        T = l[x * 3 + 2];
      let P = -1,
        R = M * M;
      for (let _t = -1; _t <= 1; _t++)
        for (let Ot = -1; Ot <= 1; Ot++)
          for (let Xt = -1; Xt <= 1; Xt++) {
            const Vt = this.cellKey(w + _t * M, A + Ot * M, T + Xt * M, E),
              oe = this.clothGrid.get(Vt);
            if (oe)
              for (const ie of oe) {
                const he = S[ie * 3] - w,
                  de = S[ie * 3 + 1] - A,
                  fe = S[ie * 3 + 2] - T,
                  Se = he * he + de * de + fe * fe;
                Se < R && ((R = Se), (P = ie));
              }
          }
      if (P < 0) continue;
      let U = s[P * 3],
        b = s[P * 3 + 1],
        L = s[P * 3 + 2];
      const N = w - S[P * 3],
        z = A - S[P * 3 + 1],
        G = T - S[P * 3 + 2];
      U * N + b * z + L * G < 0 && ((U = -U), (b = -b), (L = -L));
      const q = N * U + z * b + G * L;
      if (q < _ * 1.7) {
        const _t = 2.5 * t.cohesion * r;
        ((c[x * 3] -= U * _t), (c[x * 3 + 1] -= b * _t), (c[x * 3 + 2] -= L * _t));
      }
      if (q >= _) continue;
      const K = _ - q;
      ((l[x * 3] += U * K), (l[x * 3 + 1] += b * K), (l[x * 3 + 2] += L * K));
      const W = c[x * 3] * U + c[x * 3 + 1] * b + c[x * 3 + 2] * L;
      if (W < 0) {
        ((c[x * 3] -= U * W), (c[x * 3 + 1] -= b * W), (c[x * 3 + 2] -= L * W));
        const _t = Math.min(-W, 6) * 0.004 * t.splash;
        e.applyImpulse(P, -U * _t, -b * _t, -L * _t);
      }
      const I = d.x * U + d.y * b + d.z * L,
        V = Math.abs(I) * t.gravity,
        Y = (d.x - U * I) * t.gravity,
        $ = (d.y - b * I) * t.gravity,
        st = (d.z - L * I) * t.gravity,
        B = Math.sqrt(Y * Y + $ * $ + st * st),
        J = c[x * 3] * U + c[x * 3 + 1] * b + c[x * 3 + 2] * L,
        ut = c[x * 3] - U * J,
        Et = c[x * 3 + 1] - b * J,
        Dt = c[x * 3 + 2] - L * J,
        rt = Math.sqrt(ut * ut + Et * Et + Dt * Dt);
      !(B > 0.6 * V + 0.05) && rt < 0.6
        ? ((c[x * 3] -= Y * r + ut * 0.6),
          (c[x * 3 + 1] -= $ * r + Et * 0.6),
          (c[x * 3 + 2] -= st * r + Dt * 0.6))
        : ((c[x * 3] -= ut * 0.08), (c[x * 3 + 1] -= Et * 0.08), (c[x * 3 + 2] -= Dt * 0.08));
    }
    for (let x = 0; x < this.count; x++) {
      ((l[x * 3] += c[x * 3] * r),
        (l[x * 3 + 1] += c[x * 3 + 1] * r),
        (l[x * 3 + 2] += c[x * 3 + 2] * r));
      const w = l[x * 3] * d.x + l[x * 3 + 1] * d.y + l[x * 3 + 2] * d.z,
        A = l[x * 3] ** 2 + l[x * 3 + 1] ** 2 + l[x * 3 + 2] ** 2;
      if (w > 5 || A > 64) {
        const T = --this.count;
        for (let P = 0; P < 3; P++) ((l[x * 3 + P] = l[T * 3 + P]), (c[x * 3 + P] = c[T * 3 + P]));
        ((this.neighborCount[x] = this.neighborCount[T]), x--);
      }
    }
  }
}
