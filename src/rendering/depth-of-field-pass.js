import { Color, HalfFloatType, LinearFilter, MeshDepthMaterial, NearestFilter, NoBlending, RGBADepthPacking, ShaderMaterial, WebGLRenderTarget } from "three";
import { FullScreenQuad, Pass } from "three/addons/postprocessing/Pass.js";
import DOF_DEPTH_GLSL from "../shaders/06_dof_depth_coc.glsl?raw";
import DOF_GATHER_GLSL from "../shaders/07_dof_gather.glsl?raw";
import DOF_COMPOSITE_GLSL from "../shaders/08_dof_composite.glsl?raw";
import FULLSCREEN_VERT_GLSL from "../shaders/09_fullscreen_quad_vertex.glsl?raw";

function makeDofUniforms() {
  return {
    tDepth: { value: null },
    focus: { value: 5.2 },
    focalDepth: { value: 0.15 },
    aperture: { value: 0.4 },
    maxblur: { value: 0.04 },
    nearClip: { value: 0.1 },
    farClip: { value: 200 },
  };
}
export class DepthOfFieldPass extends Pass {
  sceneRef;
  cameraRef;
  depthMaterial;
  depthRT;
  blurRT;
  gatherMat;
  compositeMat;
  fsQuad;
  clearColorTmp = new Color();
  constructor(t, e) {
    (super(),
      (this.sceneRef = t),
      (this.cameraRef = e),
      (this.needsSwap = !0),
      (this.depthMaterial = new MeshDepthMaterial()),
      (this.depthMaterial.depthPacking = RGBADepthPacking),
      (this.depthMaterial.blending = NoBlending),
      (this.depthRT = new WebGLRenderTarget(1, 1, { minFilter: NearestFilter, magFilter: NearestFilter })),
      (this.blurRT = new WebGLRenderTarget(1, 1, { minFilter: LinearFilter, magFilter: LinearFilter, type: HalfFloatType })),
      (this.gatherMat = new ShaderMaterial({
        uniforms: { ...makeDofUniforms(), tColor: { value: null } },
        vertexShader: FULLSCREEN_VERT_GLSL,
        fragmentShader: DOF_DEPTH_GLSL + DOF_GATHER_GLSL,
      })),
      (this.compositeMat = new ShaderMaterial({
        uniforms: { ...makeDofUniforms(), tSharp: { value: null }, tBlur: { value: null } },
        vertexShader: FULLSCREEN_VERT_GLSL,
        fragmentShader: DOF_DEPTH_GLSL + DOF_COMPOSITE_GLSL,
      })),
      (this.fsQuad = new FullScreenQuad(this.gatherMat)));
  }
  setBoth(t, e) {
    ((this.gatherMat.uniforms[t].value = e), (this.compositeMat.uniforms[t].value = e));
  }
  setParams(t, e, s) {
    (this.setBoth("aperture", t), this.setBoth("maxblur", e), this.setBoth("focalDepth", s));
  }
  setFocus(t) {
    this.setBoth("focus", t);
  }
  setSize(t, e) {
    (this.depthRT.setSize(t, e), this.blurRT.setSize(Math.max(1, t >> 1), Math.max(1, e >> 1)));
  }
  render(t, e, s) {
    (this.setBoth("nearClip", this.cameraRef.near),
      this.setBoth("farClip", this.cameraRef.far),
      t.getClearColor(this.clearColorTmp));
    const r = t.getClearAlpha(),
      l = t.autoClear;
    ((t.autoClear = !1),
      (this.sceneRef.overrideMaterial = this.depthMaterial),
      t.setClearColor(16777215, 1),
      t.setRenderTarget(this.depthRT),
      t.clear(),
      t.render(this.sceneRef, this.cameraRef),
      (this.sceneRef.overrideMaterial = null),
      t.setClearColor(this.clearColorTmp, r),
      (this.gatherMat.uniforms.tColor.value = s.texture),
      (this.gatherMat.uniforms.tDepth.value = this.depthRT.texture),
      (this.fsQuad.material = this.gatherMat),
      t.setRenderTarget(this.blurRT),
      this.fsQuad.render(t),
      (this.compositeMat.uniforms.tSharp.value = s.texture),
      (this.compositeMat.uniforms.tBlur.value = this.blurRT.texture),
      (this.compositeMat.uniforms.tDepth.value = this.depthRT.texture),
      (this.fsQuad.material = this.compositeMat),
      t.setRenderTarget(this.renderToScreen ? null : e),
      this.fsQuad.render(t),
      (t.autoClear = l));
  }
  dispose() {
    (this.depthMaterial.dispose(),
      this.depthRT.dispose(),
      this.blurRT.dispose(),
      this.gatherMat.dispose(),
      this.compositeMat.dispose(),
      this.fsQuad.dispose());
  }
}
