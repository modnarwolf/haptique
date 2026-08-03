import { ACESFilmicToneMapping, AgXToneMapping, BufferAttribute, CanvasTexture, Clock, Color, DataTexture, DirectionalLight, DynamicDrawUsage, EquirectangularReflectionMapping, FloatType, HalfFloatType, InstancedMesh, LinearFilter, LinearSRGBColorSpace, MathUtils, Matrix4, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MOUSE, NeutralToneMapping, PerspectiveCamera, Plane, PlaneGeometry, PMREMGenerator, Raycaster, RGBAFormat, Scene, SphereGeometry, SRGBColorSpace, Vector2, Vector3, WebGLRenderer, WebGLRenderTarget } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { MarchingCubes } from "three/addons/objects/MarchingCubes.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { normalizeSubdivision } from "../haptique-features.js";
import { INITIAL_DRAPE } from "../data/initial-drape.js";
import { DecalSurface, createHoloMaterial, imageToNormalMap } from "../rendering/materials.js";
import { DepthOfFieldPass } from "../rendering/depth-of-field-pass.js";
import { CLOTH_DT, CLOTH_MAX_SUBSTEPS, ClothSim, LiquidSim } from "../simulation/physics.js";
import GRAIN_VERTEX from "../shaders/10_grain_vertex.glsl?raw";
import GRAIN_FRAGMENT from "../shaders/11_grain_fragment.glsl?raw";

const TONE_MAPPING = { AgX: AgXToneMapping, ACES: ACESFilmicToneMapping, Neutral: NeutralToneMapping };
const DEFAULT_CLOTH_SIZE = 3;
const DEFAULT_CLOTH_SEGMENTS = 48;
const WHITE = new Color(0xffffff);
const LIQUID_SCALE = 2.2;
const LIQUID_RESOLUTION = 64;
const DROP_SIZE_SCALE = 1.25;
const GRAIN_SHADER = {
  uniforms: { tDiffuse: { value: null }, uAmount: { value: 0.08 }, uTime: { value: 0 } },
  vertexShader: GRAIN_VERTEX,
  fragmentShader: GRAIN_FRAGMENT,
};

export class HaptiqueScene {
  constructor(t) {
    this.host = t;
    const e = t.clientWidth || window.innerWidth,
      s = t.clientHeight || window.innerHeight;
    ((this.renderer = new WebGLRenderer({
      antialias: !1,
      powerPreference: "high-performance",
      stencil: !1,
      alpha: !0,
    })),
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)),
      this.renderer.setSize(e, s),
      (this.renderer.toneMapping = AgXToneMapping),
      (this.renderer.toneMappingExposure = 1.1),
      t.appendChild(this.renderer.domElement),
      (this.scene = new Scene()),
      (this.scene.background = this.background),
      (this.camera = new PerspectiveCamera(38, e / s, 0.1, 200)),
      this.camera.position.set(...INITIAL_DRAPE.camera));
    const r = new PMREMGenerator(this.renderer),
      l = r.fromScene(new RoomEnvironment(), 0.04).texture;
    ((this.scene.environment = l), (this.defaultEnvTexture = l), r.dispose());
    const c = new DirectionalLight(8377599, 1.1);
    c.position.set(-4, 2.5, -3);
    const f = new DirectionalLight(16751317, 0.9);
    f.position.set(4.5, -1.5, -2.5);
    const d = new DirectionalLight(16777215, 0.7);
    (d.position.set(1.5, 3, 4), this.scene.add(c, f, d), (this.surface = new DecalSurface()));
    const h = createHoloMaterial(this.surface.texture);
    ((this.holoMaterial = h.material), (this.holoUniforms = h.uniforms));
    const m = this.renderer.capabilities.getMaxAnisotropy();
    (this.holoMaterial.roughnessMap && (this.holoMaterial.roughnessMap.anisotropy = m),
      (this.surface.texture.anisotropy = m),
      (this.clothMesh = new Mesh(void 0, this.holoMaterial)),
      (this.clothMesh.frustumCulled = !1),
      (this.clothMesh.visible = !1),
      this.buildCloth(1),
      this.scene.add(this.clothMesh),
      this.buildLiquid());
    const y = this.renderer.domElement;
    (y.addEventListener("pointerdown", this.onPointerDown),
      y.addEventListener("pointermove", this.onPointerMove),
      y.addEventListener("pointerup", this.onPointerUp),
      y.addEventListener("pointercancel", this.onPointerUp),
      y.addEventListener("wheel", this.onWheel, { passive: !1 }),
      window.addEventListener("keydown", this.onKeyDown),
      window.addEventListener("keyup", this.onKeyUp),
      window.addEventListener("blur", this.onWindowBlur),
      (this.controls = new OrbitControls(this.camera, y)),
      (this.controls.enableDamping = !0),
      (this.controls.dampingFactor = 0.08),
      (this.controls.minDistance = 1.6),
      (this.controls.maxDistance = 30),
      this.controls.target.set(...INITIAL_DRAPE.target),
      this.controls.update());
    const g = new WebGLRenderTarget(e, s, { samples: 8, type: HalfFloatType });
    ((this.composer = new EffectComposer(this.renderer, g)),
      this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2)),
      this.composer.addPass(new RenderPass(this.scene, this.camera)),
      (this.dofPass = new DepthOfFieldPass(this.scene, this.camera)),
      (this.dofPass.enabled = !1),
      this.composer.addPass(this.dofPass),
      (this.bloomPass = new UnrealBloomPass(new Vector2(e, s), 0.18, 0.85, 1)),
      this.composer.addPass(this.bloomPass),
      this.composer.addPass(new OutputPass()),
      (this.grainPass = new ShaderPass(GRAIN_SHADER)),
      this.composer.addPass(this.grainPass),
      (this.resizeObserver = new ResizeObserver(() => this.onResize())),
      this.resizeObserver.observe(t),
      this.renderer.setAnimationLoop(this.tick));
  }
  host;
  renderer;
  scene;
  camera;
  controls;
  composer;
  bloomPass;
  dofPass;
  grainPass;
  cavityAttr;
  sim;
  clothMesh;
  clothGeometry;
  holoUniforms;
  holoMaterial;
  surface;
  bumpSource = null;
  thumbCache = new WeakMap();
  perfProfile = "High";
  clothSegments = DEFAULT_CLOTH_SEGMENTS;
  currentPR = Math.min(window.devicePixelRatio, 2);
  liquid = new LiquidSim();
  metaballs;
  dropSpheres;
  waterMaterial;
  chromeMaterial;
  background = new Color("#0b0c12");
  clock = new Clock();
  elapsed = 0;
  raycaster = new Raycaster();
  pointerNdc = new Vector2();
  dragPlane = new Plane();
  grabbing = !1;
  grabPointerId = null;
  draggingDecal = !1;
  decalGrabOffset = { u: 0, v: 0 };
  pickingFocus = !1;
  focusVertex = null;
  pickReleaseId = null;
  spaceHeld = !1;
  focusTmp = new Vector3();
  editMode = !1;
  prevUseImage = !1;
  hoverCursor = "default";
  resizeObserver;
  params = null;
  disposed = !1;
  onDecalSelect = null;
  onImagesChanged = null;
  clothAspect = 1;
  wireframeMesh = null;
  environmentTexture = null;
  defaultEnvTexture = null;
  patternCanvas = null;

  // Build or update the synchronized wireframe overlay mesh
  buildWireframeMesh() {
    if (this.wireframeMesh) {
      this.scene.remove(this.wireframeMesh);
      this.wireframeMesh.material.dispose();
      this.wireframeMesh = null;
    }
    const mat = new MeshBasicMaterial({ color: 5218303, transparent: true, opacity: 0.75, wireframe: true });
    this.wireframeMesh = new Mesh(this.clothGeometry, mat);
    this.wireframeMesh.frustumCulled = false;
    this.wireframeMesh.visible = !!this.params?.render?.wireframe;
    if (this.params?.render?.wireframeColor) {
      this.wireframeMesh.material.color.set(this.params.render.wireframeColor);
    }
    this.scene.add(this.wireframeMesh);
  }

  buildCloth(t) {
    this.clothAspect = t;
    const e = t >= 1 ? DEFAULT_CLOTH_SIZE : DEFAULT_CLOTH_SIZE * t,
      s = t >= 1 ? DEFAULT_CLOTH_SIZE / t : DEFAULT_CLOTH_SIZE,
      r = this.clothSegments,
      l = t >= 1 ? r : Math.max(10, Math.round(r * t)),
      c = t >= 1 ? Math.max(10, Math.round(r / t)) : r;
    this.sim = new ClothSim(e, s, l, c);
    const f = new PlaneGeometry(e, s, l, c),
      d = new BufferAttribute(this.sim.positions, 3);
    (d.setUsage(DynamicDrawUsage),
      f.setAttribute("position", d),
      (this.cavityAttr = new BufferAttribute(new Float32Array(this.sim.count), 1)),
      this.cavityAttr.setUsage(DynamicDrawUsage),
      f.setAttribute("aCavity", this.cavityAttr),
      f.computeVertexNormals());
    const h = this.clothMesh.geometry;
    ((this.clothMesh.geometry = f),
      (this.clothGeometry = f),
      h && h.dispose(),
      this.holoUniforms.uClothSize.value.set(e, s),
      (this.focusVertex = null),
      this.cancelInteraction());
    this.buildWireframeMesh();
  }
  buildLiquid() {
    ((this.waterMaterial = new MeshPhysicalMaterial({
      color: 16777215,
      transmission: 1,
      ior: 1.33,
      thickness: 0.3,
      roughness: 0.02,
      metalness: 0,
      clearcoat: 0.4,
      clearcoatRoughness: 0.05,
      attenuationColor: new Color("#d3ecff"),
      attenuationDistance: 1.5,
      specularIntensity: 1,
    })),
      (this.chromeMaterial = new MeshPhysicalMaterial({ color: 15659509, metalness: 1, roughness: 0.04 })),
      (this.metaballs = new MarchingCubes(LIQUID_RESOLUTION, this.waterMaterial, !1, !1, 12e4)),
      this.metaballs.scale.setScalar(LIQUID_SCALE),
      (this.metaballs.isolation = 80),
      (this.metaballs.frustumCulled = !1),
      this.scene.add(this.metaballs));
    const t = new SphereGeometry(1, 28, 20);
    ((this.dropSpheres = new InstancedMesh(t, this.waterMaterial, 700)),
      this.dropSpheres.instanceMatrix.setUsage(DynamicDrawUsage),
      (this.dropSpheres.count = 0),
      (this.dropSpheres.frustumCulled = !1),
      this.scene.add(this.dropSpheres));
  }
  updateMetaballs() {
    const t = this.metaballs;
    t.reset();
    const e = (this.params?.liquid?.dropSize ?? 0.07) * DROP_SIZE_SCALE,
      s = e / (2 * LIQUID_SCALE),
      r = 12,
      l = (t.isolation + r) * s * s,
      c = this.liquid.pos,
      f = this.liquid.neighborCount,
      d = new Matrix4();
    let h = 0;
    for (let m = 0; m < this.liquid.count; m++) {
      const y = c[m * 3],
        g = c[m * 3 + 1],
        _ = c[m * 3 + 2],
        M = y / (2 * LIQUID_SCALE) + 0.5,
        E = g / (2 * LIQUID_SCALE) + 0.5,
        S = _ / (2 * LIQUID_SCALE) + 0.5,
        x = M >= 0 && M <= 1 && E >= 0 && E <= 1 && S >= 0 && S <= 1;
      f[m] === 0 || !x
        ? (d.makeScale(e, e, e), d.setPosition(y, g, _), this.dropSpheres.setMatrixAt(h++, d))
        : t.addBall(M, E, S, l, r);
    }
    (t.update(), (this.dropSpheres.count = h), (this.dropSpheres.instanceMatrix.needsUpdate = !0));
  }
  clearLiquid() {
    (this.liquid.clear(), this.updateMetaballs());
  }
  cancelInteraction() {
    (this.grabPointerId !== null &&
      this.renderer.domElement.hasPointerCapture(this.grabPointerId) &&
      this.renderer.domElement.releasePointerCapture(this.grabPointerId),
      (this.grabbing = !1),
      (this.draggingDecal = !1),
      (this.grabPointerId = null),
      this.sim.endGrab(),
      this.controls && (this.controls.enabled = !0));
  }
  applyParams(t) {
    ((this.params = t), t.performance !== this.perfProfile && this.applyPerfProfile(t.performance));

    // Dynamic mesh subdivision density update
    const subdivision = normalizeSubdivision(t.physics?.subdivision, this.clothSegments);
    if (subdivision !== this.clothSegments) {
      this.clothSegments = subdivision;
      this.buildCloth(this.clothAspect);
    }

    // Wireframe overlay toggle and color update
    if (this.wireframeMesh) {
      this.wireframeMesh.visible = !!t.render?.wireframe;
      if (t.render?.wireframeColor) {
        this.wireframeMesh.material.color.set(t.render.wireframeColor);
      }
    }

    // Dynamic HDR environment toggle
    if (t.render?.useHDR !== undefined) {
      this.scene.environment = t.render.useHDR
        ? (this.environmentTexture || this.defaultEnvTexture)
        : null;
    }
    this.scene.environmentRotation.set(
      0,
      ((Number(t.render?.environmentRotation) || 0) * Math.PI) / 180,
      0,
    );

    const e = this.holoMaterial;
    (e.color.set(t.material.baseColor),
      (e.roughness = t.material.roughness),
      (e.metalness = t.material.metalness),
      (e.clearcoat = t.material.clearcoat),
      (e.clearcoatRoughness = t.material.coatRoughness),
      (e.sheen = t.material.sheen),
      e.sheenColor.set(t.material.baseColor).lerp(WHITE, 0.5),
      (e.iridescence = t.material.iridescence),
      e.normalScale.set(t.material.bump, t.material.bump),
      e.normalMap && e.normalMap.repeat.set(t.material.bumpTiling, t.material.bumpTiling),
      (this.scene.environmentIntensity = t.render.environment));
    const s = this.holoUniforms;
    ((s.uHoloIntensity.value = t.material.holoIntensity),
      (s.uHoloScale.value = t.material.holoScale),
      (s.uBandFreq.value = t.material.bandFreq),
      (s.uSaturation.value = t.material.saturation),
      (s.uHueShift.value = t.material.hueShift),
      (s.uSparkle.value = t.material.sparkle),
      (s.uSpecTint.value = t.material.specTint),
      (s.uSurfaceOpacity.value = t.images.opacity),
      (s.uCornerRound.value = t.images.cornerRadius),
      this.background.set(t.render.background),
      (this.renderer.toneMappingExposure = t.render.exposure));
    const r = TONE_MAPPING[t.render.toneMapping] ?? AgXToneMapping;
    (this.renderer.toneMapping !== r && (this.renderer.toneMapping = r),
      (this.bloomPass.strength = t.render.bloom),
      (this.bloomPass.threshold = t.render.bloomThreshold),
      (this.grainPass.uniforms.uAmount.value = t.render.noise),
      (s.uCavityAmount.value = t.render.occlusion ? t.render.occlusionStrength : 0),
      (this.dofPass.enabled = t.render.dof),
      this.dofPass.setParams(
        t.render.dofAperture * 0.01,
        t.render.dofBlur,
        t.render.dofRange * 0.5,
      ),
      (this.editMode = t.images.edit),
      (this.controls.enableZoom = !this.editMode));
    const l = !!t.liquid;
    if (((this.metaballs.visible = l), (this.dropSpheres.visible = l), t.liquid)) {
      const f = t.liquid.type === "Chrome" ? this.chromeMaterial : this.waterMaterial;
      this.metaballs.material !== f &&
        ((this.metaballs.material = f), (this.dropSpheres.material = f));
    }
    (this.prevUseImage && !t.images.useImage && this.surface.clothImage && this.removeClothImage(),
      (this.prevUseImage = t.images.useImage));
    const c = this.surface.selected;
    c &&
      (c.scale !== t.images.scale || c.rotation !== t.images.rotation) &&
      ((c.scale = t.images.scale), (c.rotation = t.images.rotation), this.surface.redraw());
  }

  // Reset cloth simulation with seed value
  resetCloth(seed) {
    (this.sim.reset(seed ?? this.params?.physics?.seed ?? 1),
      (this.clothGeometry.attributes.position.needsUpdate = !0),
      this.clothGeometry.computeVertexNormals());
  }

  resetFlatCloth() {
    (this.sim.resetFlat(),
      (this.clothGeometry.attributes.position.needsUpdate = !0),
      this.clothGeometry.computeVertexNormals());
  }

  // Set a custom HDR, EXR, or standard-image environment texture map.
  setEnvironment(source) {
    this.environmentTexture?.dispose();
    this.environmentTexture = null;
    if (!source) {
      this.scene.environment = this.params?.render?.useHDR ? this.defaultEnvTexture : null;
      return;
    }
    const isHighDynamicRange = source.kind === "hdr" || source.kind === "exr";
    const tex =
      isHighDynamicRange
        ? new DataTexture(source.data, source.width, source.height, RGBAFormat, FloatType)
        : new CanvasTexture(source.image);
    tex.colorSpace = isHighDynamicRange ? LinearSRGBColorSpace : SRGBColorSpace;
    tex.needsUpdate = true;
    tex.mapping = EquirectangularReflectionMapping;
    const pmrem = new PMREMGenerator(this.renderer);
    const env = pmrem.fromEquirectangular(tex).texture;
    pmrem.dispose();
    tex.dispose();
    this.environmentTexture = env;
    if (this.params?.render?.useHDR ?? true) {
      this.scene.environment = this.environmentTexture;
    }
  }
  resetEnvironment() {
    this.setEnvironment(null);
  }
  poke() {
    this.sim.poke(1);
  }
  addDecal(t) {
    const e = this.surface.addDecal(t);
    (this.onDecalSelect?.(e.scale, e.rotation), this.onImagesChanged?.());
  }
  setClothImage(t) {
    this.patternCanvas = null;
    const e = t.naturalWidth || t.width || 1,
      s = t.naturalHeight || t.height || 1,
      r = Math.min(3, Math.max(1 / 3, e / s));
    (this.surface.setClothImage(t),
      this.surface.setAspect(r) && this.rebindSurfaceTexture(),
      this.buildCloth(r),
      this.onImagesChanged?.());
  }
  setPatternCanvas(canvas, width, height) {
    const aspect = Math.max(0.005, Math.min(200, width / Math.max(1, height)));
    this.patternCanvas = canvas;
    this.surface.setClothImage(canvas);
    this.surface.setAspect(aspect) && this.rebindSurfaceTexture();
    Math.abs(aspect - this.clothAspect) > 1e-6 && this.buildCloth(aspect);
  }
  clearImages() {
    this.patternCanvas = null;
    (this.surface.clear(),
      this.surface.setAspect(1) && this.rebindSurfaceTexture(),
      this.buildCloth(1),
      this.onImagesChanged?.());
  }
  removeClothImage() {
    this.patternCanvas = null;
    (this.surface.setClothImage(null),
      this.surface.setAspect(1) && this.rebindSurfaceTexture(),
      this.buildCloth(1),
      this.onImagesChanged?.());
  }
  get hasClothImage() {
    return this.surface.clothImage !== null;
  }
  reveal() {
    this.clothMesh.visible = !0;
  }
  thumbnailOf(t) {
    let e = this.thumbCache.get(t);
    if (e) return e;
    const s = t.naturalWidth || t.width || 1,
      r = t.naturalHeight || t.height || 1,
      l = 96 / Math.max(s, r),
      c = document.createElement("canvas");
    return (
      (c.width = Math.max(1, Math.round(s * l))),
      (c.height = Math.max(1, Math.round(r * l))),
      c.getContext("2d").drawImage(t, 0, 0, c.width, c.height),
      (e = c.toDataURL("image/png")),
      this.thumbCache.set(t, e),
      e
    );
  }
  getClothThumbnail() {
    return this.surface.clothImage ? this.thumbnailOf(this.surface.clothImage) : null;
  }
  getDecalThumbnails() {
    return this.surface.decals.map((t) => this.thumbnailOf(t.img));
  }
  removeDecal(t) {
    const e = this.surface.decals[t];
    e &&
      (this.surface.decals.splice(t, 1),
      this.surface.selected === e && (this.surface.selected = null),
      this.surface.redraw(),
      this.onImagesChanged?.());
  }
  snapshotImages() {
    return {
      clothImage: this.surface.clothImage,
      decals: this.surface.decals.map((t) => ({ ...t })),
    };
  }
  restoreImages(t) {
    this.patternCanvas = null;
    ((this.surface.clothImage = t.clothImage),
      (this.surface.decals = t.decals.map((s) => ({ ...s }))),
      (this.surface.selected = null));
    let e = 1;
    if (t.clothImage) {
      const s = t.clothImage.naturalWidth || t.clothImage.width || 1,
        r = t.clothImage.naturalHeight || t.clothImage.height || 1;
      e = Math.min(3, Math.max(1 / 3, s / r));
    }
    (this.surface.setAspect(e) && this.rebindSurfaceTexture(),
      e !== this.clothAspect && this.buildCloth(e),
      this.onImagesChanged?.());
  }
  applyPerfProfile(t) {
    this.perfProfile = t;
    const e = window.devicePixelRatio;
    this.currentPR = t === "Low" ? 1 : t === "Medium" ? Math.min(e, 1.5) : Math.min(e, 2);
    const s = t === "Low" ? 0 : t === "Medium" ? 4 : 8,
      r = t === "Low" ? 28 : t === "Medium" ? 36 : 48,
      l = this.host.clientWidth || window.innerWidth,
      c = this.host.clientHeight || window.innerHeight;
    (this.renderer.setPixelRatio(this.currentPR),
      this.renderer.setSize(l, c),
      this.composer.setPixelRatio(this.currentPR),
      (this.composer.renderTarget1.samples = s),
      (this.composer.renderTarget2.samples = s),
      this.composer.renderTarget1.dispose(),
      this.composer.renderTarget2.dispose(),
      this.composer.setSize(l, c),
      r !== this.clothSegments && ((this.clothSegments = r), this.buildCloth(this.clothAspect)));
  }
  setBumpMap(t) {
    const e = this.holoMaterial.normalMap;
    let s = null;
    if (t) {
      ((s = imageToNormalMap(t)), (s.anisotropy = this.renderer.capabilities.getMaxAnisotropy()));
      const r = this.params?.material.bumpTiling ?? 3;
      s.repeat.set(r, r);
    }
    ((this.bumpSource = t),
      (this.holoMaterial.normalMap = s),
      !!e != !!s && (this.holoMaterial.needsUpdate = !0),
      e && e.dispose(),
      this.onImagesChanged?.());
  }
  get hasBumpMap() {
    return this.bumpSource !== null;
  }
  getBumpThumbnail() {
    return this.bumpSource ? this.thumbnailOf(this.bumpSource) : null;
  }
  rebindSurfaceTexture() {
    ((this.surface.texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy()),
      (this.holoUniforms.uSurfaceMap.value = this.surface.texture));
  }
  exportPNG(t = !1) {
    const e = this.host.clientWidth || window.innerWidth,
      s = this.host.clientHeight || window.innerHeight,
      r = this.currentPR,
      l = Math.min(4, Math.max(2, 3200 / Math.max(e, s)));
    (t && ((this.scene.background = null), this.renderer.setClearColor(0, 0)),
      this.renderer.setPixelRatio(l),
      this.composer.setPixelRatio(l),
      this.renderer.setSize(e, s),
      this.composer.setSize(e, s),
      this.composer.render());
    const c = this.renderer.domElement.toDataURL("image/png");
    (t && ((this.scene.background = this.background), this.renderer.setClearColor(0, 1)),
      this.renderer.setPixelRatio(r),
      this.composer.setPixelRatio(r),
      this.renderer.setSize(e, s),
      this.composer.setSize(e, s));
    const f = document.createElement("a");
    f.href = c;
    const d = t ? "haptique-nobg" : "haptique";
    ((f.download = `${d}-${new Date().toISOString().replace(/[:.]/g, "-")}.png`), f.click());
  }
  updatePointer(t) {
    const e = this.renderer.domElement.getBoundingClientRect();
    this.pointerNdc.set(
      ((t.clientX - e.left) / e.width) * 2 - 1,
      -((t.clientY - e.top) / e.height) * 2 + 1,
    );
  }
  raycastCloth() {
    (this.raycaster.setFromCamera(this.pointerNdc, this.camera),
      this.clothGeometry.computeBoundingSphere());
    const t = this.raycaster.intersectObject(this.clothMesh, !1);
    return t.length > 0 ? t[0] : null;
  }
  startPickFocus() {
    ((this.pickingFocus = !0), (this.renderer.domElement.style.cursor = "crosshair"));
  }
  clearPickFocus() {
    this.focusVertex = null;
  }
  onKeyDown = (t) => {
    if (t.code !== "Space" || t.repeat) return;
    const e = t.target;
    (e && (e.tagName === "INPUT" || e.tagName === "TEXTAREA" || e.isContentEditable)) ||
      (t.preventDefault(),
      (this.spaceHeld = !0),
      (this.controls.mouseButtons.LEFT = MOUSE.PAN),
      !this.grabbing &&
        !this.draggingDecal &&
        !this.pickingFocus &&
        (this.renderer.domElement.style.cursor = "grab"));
  };
  onKeyUp = (t) => {
    t.code === "Space" && ((this.spaceHeld = !1), (this.controls.mouseButtons.LEFT = MOUSE.ROTATE));
  };
  onWindowBlur = () => {
    ((this.spaceHeld = !1), (this.controls.mouseButtons.LEFT = MOUSE.ROTATE));
  };
  onPointerDown = (t) => {
    if (t.button !== 0 || this.grabbing || this.draggingDecal) return;
    if ((this.updatePointer(t), this.pickingFocus)) {
      ((this.pickingFocus = !1), (this.renderer.domElement.style.cursor = "default"));
      const l = this.raycastCloth();
      if (l) {
        const c = this.sim.positions;
        let f = 0,
          d = 1 / 0;
        for (let h = 0; h < this.sim.count; h++) {
          const m = c[h * 3] - l.point.x,
            y = c[h * 3 + 1] - l.point.y,
            g = c[h * 3 + 2] - l.point.z,
            _ = m * m + y * y + g * g;
          _ < d && ((d = _), (f = h));
        }
        this.focusVertex = f;
      }
      ((this.pickReleaseId = t.pointerId), (this.controls.enabled = !1));
      return;
    }
    if (this.spaceHeld) return;
    const e = this.raycastCloth();
    if (!e) return;
    if (this.editMode) {
      if (!e.uv) return;
      const l = this.surface.hitTest(e.uv.x, e.uv.y);
      if (!l) return;
      ((this.surface.selected = l),
        (this.draggingDecal = !0),
        (this.decalGrabOffset.u = l.u - e.uv.x),
        (this.decalGrabOffset.v = l.v - e.uv.y),
        (this.grabPointerId = t.pointerId),
        (this.controls.enabled = !1),
        this.renderer.domElement.setPointerCapture(t.pointerId),
        (this.renderer.domElement.style.cursor = "move"),
        this.onDecalSelect?.(l.scale, l.rotation));
      return;
    }
    const s = this.params?.physics.grabRadius ?? 0.45;
    if (!this.sim.startGrab(e.point, s)) return;
    ((this.grabbing = !0), (this.grabPointerId = t.pointerId), (this.controls.enabled = !1));
    const r = new Vector3();
    (this.camera.getWorldDirection(r),
      this.dragPlane.setFromNormalAndCoplanarPoint(r, e.point),
      this.renderer.domElement.setPointerCapture(t.pointerId),
      (this.renderer.domElement.style.cursor = "grabbing"));
  };
  onPointerMove = (t) => {
    if ((this.grabbing || this.draggingDecal) && t.pointerId !== this.grabPointerId) return;
    if ((this.updatePointer(t), this.draggingDecal)) {
      const r = this.raycastCloth(),
        l = this.surface.selected;
      r?.uv &&
        l &&
        ((l.u = r.uv.x + this.decalGrabOffset.u),
        (l.v = r.uv.y + this.decalGrabOffset.v),
        this.surface.redraw());
      return;
    }
    if (!this.grabbing) return;
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const s = new Vector3();
    this.raycaster.ray.intersectPlane(this.dragPlane, s) && this.sim.moveGrab(s);
  };
  onPointerUp = (t) => {
    if (t.pointerId === this.pickReleaseId) {
      ((this.pickReleaseId = null), (this.controls.enabled = !0));
      return;
    }
    !(this.grabbing || this.draggingDecal) ||
      t.pointerId !== this.grabPointerId ||
      ((this.grabbing = !1),
      (this.draggingDecal = !1),
      (this.grabPointerId = null),
      this.sim.endGrab(),
      (this.controls.enabled = !0),
      this.renderer.domElement.hasPointerCapture(t.pointerId) &&
        this.renderer.domElement.releasePointerCapture(t.pointerId),
      (this.renderer.domElement.style.cursor = this.hoverCursor));
  };
  onWheel = (t) => {
    if (!this.editMode) return;
    const e = this.surface.selected;
    e &&
      (t.preventDefault(),
      t.stopImmediatePropagation(),
      (e.scale = MathUtils.clamp(e.scale * Math.exp(-t.deltaY * 0.0012), 0.02, 2.5)),
      this.surface.redraw(),
      this.onDecalSelect?.(e.scale, e.rotation));
  };
  onResize() {
    const t = this.host.clientWidth || window.innerWidth,
      e = this.host.clientHeight || window.innerHeight;
    t === 0 ||
      e === 0 ||
      ((this.camera.aspect = t / e),
      this.camera.updateProjectionMatrix(),
      this.renderer.setSize(t, e),
      this.composer.setSize(t, e));
  }
  tick = () => {
    if (this.disposed) return;
    const t = this.clock.getDelta();
    ((this.elapsed += t), (this.grainPass.uniforms.uTime.value = this.elapsed % 61.7));
    const e = this.params?.liquid?.paused ?? !1;
    if (
      (this.params &&
        !e &&
        (this.sim.step(t, this.params.physics),
        (this.clothGeometry.attributes.position.needsUpdate = !0),
        this.clothGeometry.computeVertexNormals(),
        this.params.liquid &&
          (this.liquid.step(
            t,
            this.params.liquid,
            this.sim,
            this.clothGeometry.attributes.normal.array,
          ),
          this.updateMetaballs())),
      this.params?.render.occlusion &&
        (this.sim.computeCavity(this.clothGeometry.attributes.normal.array, this.cavityAttr.array),
        (this.cavityAttr.needsUpdate = !0)),
      this.params?.render.dof)
    ) {
      let s;
      if (this.focusVertex !== null && this.focusVertex < this.sim.count) {
        const r = this.sim.positions,
          l = this.focusVertex * 3;
        (this.focusTmp.set(r[l], r[l + 1], r[l + 2]),
          (s = this.camera.position.distanceTo(this.focusTmp)));
      } else s = this.camera.position.distanceTo(this.controls.target);
      this.dofPass.setFocus(s);
    }
    if (
      !this.grabbing &&
      !this.draggingDecal &&
      !this.pickingFocus &&
      !this.spaceHeld &&
      this.perfProfile !== "Low"
    ) {
      const s = this.raycastCloth();
      let r = "default";
      (s &&
        (r = this.editMode
          ? s.uv && this.surface.hitTest(s.uv.x, s.uv.y)
            ? "move"
            : "default"
          : "grab"),
        r !== this.hoverCursor &&
          ((this.hoverCursor = r), (this.renderer.domElement.style.cursor = r)));
    }
    (this.controls.update(), this.composer.render());
  };
  dispose() {
    ((this.disposed = !0), this.renderer.setAnimationLoop(null), this.resizeObserver.disconnect());
    const t = this.renderer.domElement;
    (t.removeEventListener("pointerdown", this.onPointerDown),
      t.removeEventListener("pointermove", this.onPointerMove),
      t.removeEventListener("pointerup", this.onPointerUp),
      t.removeEventListener("pointercancel", this.onPointerUp),
      t.removeEventListener("wheel", this.onWheel),
      window.removeEventListener("keydown", this.onKeyDown),
      window.removeEventListener("keyup", this.onKeyUp),
      window.removeEventListener("blur", this.onWindowBlur),
      this.controls.dispose(),
      this.dofPass.dispose(),
      this.composer.dispose(),
      this.clothGeometry.dispose(),
      this.holoMaterial.dispose(),
      this.waterMaterial.dispose(),
      this.chromeMaterial.dispose(),
      this.surface.dispose(),
      this.wireframeMesh?.material.dispose(),
      this.environmentTexture?.dispose(),
      this.defaultEnvTexture?.dispose(),
      this.scene.traverse((e) => {
        const s = e;
        s.geometry && s.geometry !== this.clothGeometry && s.geometry.dispose();
      }),
      this.renderer.dispose(),
      t.remove());
  }
}
