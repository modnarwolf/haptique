import { CanvasTexture, Color, DoubleSide, MeshPhysicalMaterial, NoColorSpace, RepeatWrapping, SRGBColorSpace, Vector2 } from "three";
import HOLO_VERTEX_PRELUDE from "../shaders/01_holo_vertex_prelude.glsl?raw";
import HOLO_UV_VERTEX_INJECTION from "../shaders/02_holo_uv_vertex_injection.glsl?raw";
import HOLO_FRAGMENT_PRELUDE from "../shaders/03_holo_fragment_prelude.glsl?raw";
import HOLO_EMISSIVE_FRAGMENT from "../shaders/04_holo_emissivemap_fragment.glsl?raw";
import HOLO_AO_FRAGMENT from "../shaders/05_holo_aomap_fragment.glsl?raw";

function makeSeededRandom(n) {
  return () => {
    ((n |= 0), (n = (n + 1831565813) | 0));
    let t = Math.imul(n ^ (n >>> 15), 1 | n);
    return (
      (t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t),
      ((t ^ (t >>> 14)) >>> 0) / 4294967296
    );
  };
}

// --------------------------------------------------------------------------
// TEXTURE GENERATION
// Central-difference a scalar height field into a tangent-space normal map,
// drawn on a 2D canvas and uploaded as a CanvasTexture.
// --------------------------------------------------------------------------
function heightFieldToNormalMap(n, t, e) {
  const s = document.createElement("canvas");
  ((s.width = t), (s.height = t));
  const r = s.getContext("2d"),
    l = r.createImageData(t, t),
    c = l.data,
    f = (h, m) => n[((m + t) % t) * t + ((h + t) % t)];
  for (let h = 0; h < t; h++)
    for (let m = 0; m < t; m++) {
      const y = (f(m + 1, h) - f(m - 1, h)) * e,
        g = (f(m, h + 1) - f(m, h - 1)) * e,
        _ = 1 / Math.sqrt(y * y + g * g + 1),
        M = (h * t + m) * 4;
      ((c[M] = Math.round((-y * _ * 0.5 + 0.5) * 255)),
        (c[M + 1] = Math.round((g * _ * 0.5 + 0.5) * 255)),
        (c[M + 2] = Math.round((_ * 0.5 + 0.5) * 255)),
        (c[M + 3] = 255));
    }
  r.putImageData(l, 0, 0);
  const d = new CanvasTexture(s);
  return ((d.wrapS = d.wrapT = RepeatWrapping), d.repeat.set(2, 2), (d.colorSpace = NoColorSpace), d);
}
export function imageToNormalMap(n, t = 512, e = 1.6) {
  const s = document.createElement("canvas");
  ((s.width = t), (s.height = t));
  const r = s.getContext("2d");
  r.drawImage(n, 0, 0, t, t);
  const l = r.getImageData(0, 0, t, t).data,
    c = new Float32Array(t * t);
  for (let f = 0; f < c.length; f++)
    c[f] = (l[f * 4] * 0.2126 + l[f * 4 + 1] * 0.7152 + l[f * 4 + 2] * 0.0722) / 255;
  return heightFieldToNormalMap(c, t, e);
}
function makeNoiseRoughnessMap(n = 256, t = 4242) {
  const e = makeSeededRandom(t),
    s = document.createElement("canvas");
  ((s.width = n), (s.height = n));
  const r = s.getContext("2d"),
    l = r.createImageData(n, n),
    c = l.data;
  for (let d = 0; d < n * n; d++) {
    const h = Math.round(215 + (e() - 0.5) * 70);
    ((c[d * 4] = h), (c[d * 4 + 1] = h), (c[d * 4 + 2] = h), (c[d * 4 + 3] = 255));
  }
  r.putImageData(l, 0, 0);
  const f = new CanvasTexture(s);
  return ((f.wrapS = f.wrapT = RepeatWrapping), f.repeat.set(4, 4), (f.colorSpace = NoColorSpace), f);
}

export function createHoloMaterial(n) {
  const t = makeNoiseRoughnessMap(),
    e = new MeshPhysicalMaterial({
      color: new Color("#9aa1ad"),
      metalness: 0.95,
      roughness: 0.1,
      roughnessMap: t,
      normalScale: new Vector2(0.5, 0.5),
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      sheen: 0.35,
      sheenRoughness: 0.55,
      sheenColor: new Color("#cfd6ff"),
      iridescence: 1,
      iridescenceIOR: 1.35,
      iridescenceThicknessRange: [120, 480],
      side: DoubleSide,
    }),
    s = {
      uHoloIntensity: { value: 1 },
      uHoloScale: { value: 110 },
      uBandFreq: { value: 3 },
      uRadialFreq: { value: 1.6 },
      uSaturation: { value: 0.8 },
      uHueShift: { value: 0 },
      uSparkle: { value: 0.6 },
      uSpecTint: { value: 0.85 },
      uSurfaceMap: { value: n },
      uSurfaceOpacity: { value: 1 },
      uCavityAmount: { value: 0 },
      uCornerRound: { value: 0 },
      uClothSize: { value: new Vector2(3, 3) },
    };
  return (
    (e.alphaToCoverage = !0),
    (e.onBeforeCompile = (r) => {
      Object.assign(r.uniforms, s);
      r.vertexShader = HOLO_VERTEX_PRELUDE + r.vertexShader.replace(
        "#include <uv_vertex>",
        HOLO_UV_VERTEX_INJECTION,
      );
      r.fragmentShader = HOLO_FRAGMENT_PRELUDE + r.fragmentShader
        .replace("#include <emissivemap_fragment>", HOLO_EMISSIVE_FRAGMENT)
        .replace("#include <aomap_fragment>", HOLO_AO_FRAGMENT);
    }),
    { material: e, uniforms: s }
  );
}

const SURFACE_TEX_SIZE = 2048;

export class DecalSurface {
  canvas;
  texture;
  decals = [];
  clothImage = null;
  selected = null;
  ctx;
  constructor() {
    ((this.canvas = document.createElement("canvas")),
      (this.canvas.width = SURFACE_TEX_SIZE),
      (this.canvas.height = SURFACE_TEX_SIZE),
      (this.ctx = this.canvas.getContext("2d")),
      (this.texture = new CanvasTexture(this.canvas)),
      (this.texture.colorSpace = SRGBColorSpace),
      this.redraw());
  }
  setAspect(t) {
    const e = t >= 1 ? SURFACE_TEX_SIZE : Math.round(SURFACE_TEX_SIZE * t),
      s = t >= 1 ? Math.round(SURFACE_TEX_SIZE / t) : SURFACE_TEX_SIZE;
    return this.canvas.width === e && this.canvas.height === s
      ? (this.redraw(), !1)
      : ((this.canvas.width = e),
        (this.canvas.height = s),
        this.texture.dispose(),
        (this.texture = new CanvasTexture(this.canvas)),
        (this.texture.colorSpace = SRGBColorSpace),
        this.redraw(),
        !0);
  }
  addDecal(t) {
    const e = { img: t, u: 0.5, v: 0.5, scale: 0.35, rotation: 0 };
    return (this.decals.push(e), (this.selected = e), this.redraw(), e);
  }
  setClothImage(t) {
    ((this.clothImage = t), this.redraw());
  }
  clear() {
    ((this.decals = []), (this.clothImage = null), (this.selected = null), this.redraw());
  }
  hitTest(t, e) {
    const s = this.canvas.width,
      r = this.canvas.height,
      l = t * s,
      c = (1 - e) * r;
    for (let f = this.decals.length - 1; f >= 0; f--) {
      const d = this.decals[f],
        { w: h, h: m } = this.decalPixelSize(d),
        y = d.u * s,
        g = (1 - d.v) * r,
        _ = (-d.rotation * Math.PI) / 180,
        M = l - y,
        E = c - g,
        S = M * Math.cos(_) - E * Math.sin(_),
        x = M * Math.sin(_) + E * Math.cos(_);
      if (Math.abs(S) <= h / 2 && Math.abs(x) <= m / 2) return d;
    }
    return null;
  }
  decalPixelSize(t) {
    const e = this.canvas.width,
      s = t.img.naturalWidth || t.img.width || 300,
      r = t.img.naturalHeight || t.img.height || 300,
      l = t.scale * e,
      c = (l * r) / s;
    return { w: l, h: c };
  }
  redraw() {
    const { ctx: t, canvas: e } = this;
    (t.clearRect(0, 0, e.width, e.height),
      this.clothImage && t.drawImage(this.clothImage, 0, 0, e.width, e.height));
    for (const s of this.decals) {
      const { w: r, h: l } = this.decalPixelSize(s);
      (t.save(),
        t.translate(s.u * e.width, (1 - s.v) * e.height),
        t.rotate((s.rotation * Math.PI) / 180),
        t.drawImage(s.img, -r / 2, -l / 2, r, l),
        t.restore());
    }
    this.texture.needsUpdate = !0;
  }
  dispose() {
    this.texture.dispose();
  }
}
