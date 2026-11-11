import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import {
  Color,
  DepthTexture,
  Fog,
  FloatType,
  HalfFloatType,
  Matrix4,
  Mesh,
  MeshNormalMaterial,
  NeutralToneMapping,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
} from "three";

/** Layer for character cards: drawn, but never inked by this pass (they carry their own plum ink). */
export const NOINK = 1;
/** Layer for the sky dome: colour pass only. */
export const SKY = 2;

/** Ink look values, in px at 1080x1920 (scaled by output height / 1920). */
export const INK = {
  color: "#030303",
  nearPx: 5.1,
  nearM: 6,
  farPx: 3.3,
  farM: 90,
  creaseDeg: 35,
  depthJump: 0.01,
  fogTint: 0.3,
  skyMaxM: 150, // no silhouette against the sky beyond this (keeps the horizon line-free)
};

const vert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const frag = /* glsl */ `
#include <common>
uniform sampler2D tColor, tNormal, tDepth;
uniform mat4 uProjInv;
uniform vec2 uTexel;
uniform float uPx, uNearPx, uNearM, uFarPx, uFarM, uCrease, uJump, uFogTint, uSkyMax, uFogNear, uFogFar;
uniform vec3 uInk, uFog;
varying vec2 vUv;

vec3 viewPos(vec2 uv, float d) {
  vec4 v = uProjInv * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
  return v.xyz / v.w;
}
float widthAt(float z) { return uPx * mix(uNearPx, uFarPx, clamp((z - uNearM) / (uFarM - uNearM), 0.0, 1.0)); }

// Edge strength (0..1) between the centre sample and the one at uv; zn = distance of the nearer surface.
float edgeAt(vec3 pc, vec3 nc, float zc, bool skyC, vec2 uv, out float zn) {
  zn = zc;
  vec4 nq4 = texture2D(tNormal, uv);
  if (nq4.a < 0.5) return -1.0; // neighbour is a NOINK card
  float dq = texture2D(tDepth, uv).x;
  bool skyQ = dq >= 1.0;
  if (skyC && skyQ) return 0.0;
  vec3 pq = viewPos(uv, dq);
  float zq = skyQ ? 1e9 : length(pq);
  zn = min(zc, zq);
  if (skyC || skyQ) return 1.0 - smoothstep(0.8 * uSkyMax, uSkyMax, zn);
  vec3 nq = normalize(nq4.xyz * 2.0 - 1.0);
  // Depth jump: one sample lies behind the other's tangent plane (signed, so concave joins stay clean).
  float off = max(dot(nc, pc - pq), dot(nq, pq - pc));
  // Crease: normals bend past the angle and the surface falls away (convex only).
  bool crease = dot(nc, nq) < uCrease && dot(nc, pq - pc) < -1e-4 * zn;
  return (off > uJump * zn || crease) ? 1.0 : 0.0;
}

void main() {
  vec3 col = texture2D(tColor, vUv).rgb;
  vec4 nc4 = texture2D(tNormal, vUv);
  float dc = texture2D(tDepth, vUv).x;
  bool skyC = dc >= 1.0;
  vec3 pc = viewPos(vUv, dc);
  vec3 nc = normalize(nc4.xyz * 2.0 - 1.0);
  float zc = skyC ? 1e9 : length(pc);

  float rMax = 0.5 * widthAt(uNearM);
  float cover = 0.0;
  float zInk = zc;
  if (nc4.a > 0.5) {
    for (int k = 0; k < 8; k++) {
      float a = float(k) * 0.7853982;
      vec2 dir = vec2(cos(a), sin(a));
      for (int i = 1; i <= 4; i++) {
        float r = rMax * float(i) / 4.0;
        vec2 uv = vUv + dir * r * uTexel;
        float zn, zn2;
        float e = edgeAt(pc, nc, zc, skyC, uv, zn);
        if (e < 0.0) break;
        // Must still be across the edge 1 px further on: drops 1-px tile cracks.
        if (e > 0.0) e = min(e, max(edgeAt(pc, nc, zc, skyC, uv + dir * uTexel, zn2), 0.0));
        if (e > 0.0) {
          float hw = 0.5 * widthAt(zn);
          float c = e * (1.0 - smoothstep(hw - 0.5, hw + 0.5, r - 0.5 * rMax / 4.0));
          if (c > cover) { cover = c; zInk = zn; }
          break;
        }
      }
    }
  }
  float fogF = smoothstep(uFogNear, uFogFar, zInk);
  cover *= 1.0 - smoothstep(0.8, 1.0, fogF); // lines vanish with the surface they outline
  vec3 ink = mix(uInk, uFog, uFogTint * fogF);
  gl_FragColor = vec4(mix(col, ink, cover), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/**
 * Takes over rendering: colour pass (HDR, MSAA 4) -> normal+depth pass -> ink lines -> NEUTRAL tone map.
 * Mount once inside <ThreeCanvas>. Later post (lens, bloom, grade) slots in after the ink.
 */
export const InkRenderer: React.FC = () => {
  const { gl, scene, camera } = useThree();

  const p = useMemo(() => {
    const size = gl.getDrawingBufferSize(new Vector2());
    const colorRT = new WebGLRenderTarget(size.x, size.y, { type: HalfFloatType, samples: 4 });
    const normalRT = new WebGLRenderTarget(size.x, size.y, { type: HalfFloatType });
    normalRT.depthTexture = new DepthTexture(size.x, size.y, FloatType);
    const normalMat = new MeshNormalMaterial();
    const noinkMat = new ShaderMaterial({
      vertexShader: "void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "void main(){ gl_FragColor = vec4(0.0); }",
    });
    const inkMat = new ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tColor: { value: colorRT.texture },
        tNormal: { value: normalRT.texture },
        tDepth: { value: normalRT.depthTexture },
        uProjInv: { value: new Matrix4() },
        uTexel: { value: new Vector2(1 / size.x, 1 / size.y) },
        uPx: { value: size.y / 1920 },
        uNearPx: { value: INK.nearPx },
        uNearM: { value: INK.nearM },
        uFarPx: { value: INK.farPx },
        uFarM: { value: INK.farM },
        uCrease: { value: Math.cos((INK.creaseDeg * Math.PI) / 180) },
        uJump: { value: INK.depthJump },
        uFogTint: { value: INK.fogTint },
        uSkyMax: { value: INK.skyMaxM },
        uFogNear: { value: 1e9 },
        uFogFar: { value: 2e9 },
        uInk: { value: new Color(INK.color) },
        uFog: { value: new Color() },
      },
    });
    gl.toneMapping = NeutralToneMapping; // set here: ThreeCanvas advances before child effects run
    const quad = new Mesh(new PlaneGeometry(2, 2), inkMat);
    quad.frustumCulled = false;
    const post = new Scene().add(quad);
    return { colorRT, normalRT, normalMat, noinkMat, inkMat, post, ortho: new OrthographicCamera() };
  }, [gl]);

  useEffect(() => {
    return () => {
      p.colorRT.dispose();
      p.normalRT.dispose();
    };
  }, [gl, p]);

  useFrame(() => {
    const cam = camera as PerspectiveCamera;
    const u = p.inkMat.uniforms;
    u.uProjInv.value.copy(cam.projectionMatrixInverse);
    if (scene.fog instanceof Fog) {
      u.uFog.value.copy(scene.fog.color);
      u.uFogNear.value = scene.fog.near;
      u.uFogFar.value = scene.fog.far;
    }
    const mask = cam.layers.mask;
    const clear = gl.getClearColor(new Color());
    const clearA = gl.getClearAlpha();

    cam.layers.enableAll();
    gl.setRenderTarget(p.colorRT);
    gl.clear();
    gl.render(scene, cam);

    // World normals + depth; NOINK cards write depth with alpha 0 so nothing gets inked around them.
    gl.setRenderTarget(p.normalRT);
    gl.setClearColor(0x8080ff, 1);
    gl.clear();
    scene.overrideMaterial = p.normalMat;
    cam.layers.set(0);
    gl.render(scene, cam);
    gl.autoClear = false;
    scene.overrideMaterial = p.noinkMat;
    cam.layers.set(NOINK);
    gl.render(scene, cam);
    gl.autoClear = true;
    scene.overrideMaterial = null;
    cam.layers.mask = mask;
    gl.setClearColor(clear, clearA);

    gl.setRenderTarget(null);
    gl.render(p.post, p.ortho);
  }, 1);

  return null;
};
