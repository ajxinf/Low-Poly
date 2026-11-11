import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import {
  Color,
  DepthTexture,
  Fog,
  FloatType,
  HalfFloatType,
  LinearFilter,
  Matrix4,
  Mesh,
  MeshNormalMaterial,
  NoToneMapping,
  OrthographicCamera,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Texture,
  Vector2,
  WebGLRenderTarget,
} from "three";
import { CARD_PASS } from "./cardshade";
import { NOINK, inkMaterial } from "./ink";

/** Post look values. Pixel sizes are at 1080x1920 and scale with output height / 1920. */
export const POST = {
  dof: { maxPx: 6.5, near: 14, far: 45 }, // background lens blur: 0 px before `near` m, maxPx past `far` m
  bloom: { threshold: 1.0, intensity: 0.5, levels: 6, radius: 0.6 },
  grade: { sat: 1.22, contrast: 1.06, lift: 0.035, vignette: 0.85, warm: 0.02 },
};

const vert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const pass = (frag: string, uniforms: Record<string, { value: unknown }>) =>
  new ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });

// Background-only lens blur: gather on a Vogel disc; sharp foreground samples never spread onto the background.
const dofFrag = /* glsl */ `
uniform sampler2D tColor, tDepth;
uniform mat4 uProjInv;
uniform vec2 uTexel;
uniform float uMax, uNear, uFar;
varying vec2 vUv;
float dist(vec2 uv) {
  float d = texture2D(tDepth, uv).x;
  if (d >= 1.0) return 1e6;
  vec4 v = uProjInv * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
  return length(v.xyz / v.w);
}
float coc(vec2 uv) { return uMax * smoothstep(uNear, uFar, dist(uv)); }
void main() {
  float c0 = coc(vUv);
  vec3 sum = texture2D(tColor, vUv).rgb;
  float wsum = 1.0;
  if (c0 > 0.5) {
    for (int i = 0; i < 32; i++) {
      float r = sqrt((float(i) + 0.5) / 32.0) * c0;
      float a = float(i) * 2.39996;
      vec2 uv = vUv + vec2(cos(a), sin(a)) * r * uTexel;
      float w = clamp(coc(uv) - r + 1.0, 0.0, 1.0);
      sum += texture2D(tColor, uv).rgb * w;
      wsum += w;
    }
  }
  gl_FragColor = vec4(sum / wsum, 1.0);
}`;

const downFrag = /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 uTexel;
uniform float uThreshold, uFirst;
varying vec2 vUv;
void main() {
  vec3 c = 0.25 * (texture2D(tSrc, vUv + uTexel * vec2(-1.0, -1.0)).rgb + texture2D(tSrc, vUv + uTexel * vec2(1.0, -1.0)).rgb
                 + texture2D(tSrc, vUv + uTexel * vec2(-1.0, 1.0)).rgb + texture2D(tSrc, vUv + uTexel * vec2(1.0, 1.0)).rgb);
  if (uFirst > 0.5) { float b = max(c.r, max(c.g, c.b)); c *= max(b - uThreshold, 0.0) / max(b, 1e-4); }
  gl_FragColor = vec4(c, 1.0);
}`;

const upFrag = /* glsl */ `
uniform sampler2D tSrc, tLow;
uniform vec2 uTexel;
uniform float uRadius;
varying vec2 vUv;
void main() {
  vec3 t = vec3(0.0);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++)
    t += texture2D(tLow, vUv + uTexel * vec2(x, y)).rgb * (x == 0 ? 2.0 : 1.0) * (y == 0 ? 2.0 : 1.0);
  gl_FragColor = vec4(mix(texture2D(tSrc, vUv).rgb, t / 16.0, uRadius), 1.0);
}`;

// Bloom add -> NEUTRAL tone map -> grade (saturation, contrast, warm split, vignette) -> sRGB.
const finalFrag = /* glsl */ `
uniform sampler2D tColor, tBloom;
uniform float uBloom, uSat, uContrast, uLift, uVignette, uWarm, uAspect;
varying vec2 vUv;
vec3 neutral(vec3 color) {
  const float S = 0.76, D = 0.15;
  float x = min(color.r, min(color.g, color.b));
  float off = x < 0.08 ? x - 6.25 * x * x : 0.04;
  color -= off;
  float peak = max(color.r, max(color.g, color.b));
  if (peak < S) return color;
  float d = 1.0 - S;
  float np = 1.0 - d * d / (peak + d - S);
  color *= np / peak;
  float g = 1.0 - 1.0 / (D * (peak - np) + 1.0);
  return mix(color, vec3(np), g);
}
vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
void main() {
  vec3 c = texture2D(tColor, vUv).rgb + uBloom * texture2D(tBloom, vUv).rgb;
  c = neutral(max(c, 0.0));
  c = toSRGB(clamp(c, 0.0, 1.0));
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, uSat);
  c = (c - 0.5) * uContrast + 0.5 + uLift;
  c += uWarm * vec3(1.0, 0.2, -0.6) * (l - 0.35); // warm highlights, cooler shadows
  vec2 q = (vUv - 0.5) * vec2(uAspect, 1.0) * 2.0;
  c *= mix(1.0, uVignette, smoothstep(0.35, 1.25, dot(q, q)));
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

/**
 * Takes over rendering: shadows -> colour (HDR, MSAA 4) -> normal+depth -> ink -> lens blur -> bloom ->
 * NEUTRAL tone map -> grade. Mount once inside <ThreeCanvas>.
 */
export type Dof = { maxPx: number; near: number; far: number };

export const Composer: React.FC<{ dof?: Dof }> = ({ dof = POST.dof }) => {
  const { gl, scene, camera } = useThree();

  const p = useMemo(() => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = PCFShadowMap;
    gl.shadowMap.autoUpdate = false;
    gl.toneMapping = NoToneMapping; // tone map lives in the final pass
    const size = gl.getDrawingBufferSize(new Vector2());
    const px = size.y / 1920;
    const rt = (w: number, h: number, samples = 0) =>
      new WebGLRenderTarget(Math.max(1, w), Math.max(1, h), { type: HalfFloatType, samples, minFilter: LinearFilter, magFilter: LinearFilter });
    const colorRT = rt(size.x, size.y, 4);
    const normalRT = rt(size.x, size.y);
    normalRT.depthTexture = new DepthTexture(size.x, size.y, FloatType);
    const inkRT = rt(size.x, size.y);
    const dofRT = rt(size.x, size.y);
    const B = POST.bloom;
    const down = Array.from({ length: B.levels }, (_, i) => rt(size.x >> (i + 1), size.y >> (i + 1)));
    const up = Array.from({ length: B.levels }, (_, i) => rt(size.x >> (i + 1), size.y >> (i + 1)));

    const ink = inkMaterial(size);
    ink.uniforms.tColor.value = colorRT.texture;
    ink.uniforms.tNormal.value = normalRT.texture;
    ink.uniforms.tDepth.value = normalRT.depthTexture;
    const dof = pass(dofFrag, {
      tColor: { value: inkRT.texture },
      tDepth: { value: normalRT.depthTexture },
      uProjInv: { value: new Matrix4() },
      uTexel: { value: new Vector2(1 / size.x, 1 / size.y) },
      uMax: { value: POST.dof.maxPx * px },
      uNear: { value: POST.dof.near },
      uFar: { value: POST.dof.far },
    });
    const downM = pass(downFrag, { tSrc: { value: null }, uTexel: { value: new Vector2() }, uThreshold: { value: B.threshold }, uFirst: { value: 0 } });
    const upM = pass(upFrag, { tSrc: { value: null }, tLow: { value: null }, uTexel: { value: new Vector2() }, uRadius: { value: B.radius } });
    const G = POST.grade;
    const fin = pass(finalFrag, {
      tColor: { value: dofRT.texture },
      tBloom: { value: up[0].texture },
      uBloom: { value: B.intensity },
      uSat: { value: G.sat },
      uContrast: { value: G.contrast },
      uLift: { value: G.lift },
      uVignette: { value: G.vignette },
      uWarm: { value: G.warm },
      uAspect: { value: size.x / size.y },
    });
    const quad = new Mesh(new PlaneGeometry(2, 2), ink);
    quad.frustumCulled = false;
    const post = new Scene().add(quad);
    const targets = [colorRT, normalRT, inkRT, dofRT, ...down, ...up];
    return { targets, colorRT, normalRT, inkRT, dofRT, down, up, ink, dof, downM, upM, fin, quad, post, normalMat: new MeshNormalMaterial(), ortho: new OrthographicCamera() };
  }, [gl]);

  useEffect(() => () => p.targets.forEach((t) => t.dispose()), [p]);

  useFrame(() => {
    const cam = camera as PerspectiveCamera;
    const draw = (mat: ShaderMaterial, target: WebGLRenderTarget | null) => {
      p.quad.material = mat;
      gl.setRenderTarget(target);
      gl.render(p.post, p.ortho);
    };
    const u = p.ink.uniforms;
    u.uProjInv.value.copy(cam.projectionMatrixInverse);
    p.dof.uniforms.uProjInv.value.copy(cam.projectionMatrixInverse);
    p.dof.uniforms.uMax.value = dof.maxPx * (p.dofRT.height / 1920);
    p.dof.uniforms.uNear.value = dof.near;
    p.dof.uniforms.uFar.value = dof.far;
    if (scene.fog instanceof Fog) {
      u.uFog.value.copy(scene.fog.color);
      u.uFogNear.value = scene.fog.near;
      u.uFogFar.value = scene.fog.far;
    }
    const mask = cam.layers.mask;
    const clear = gl.getClearColor(new Color());
    const clearA = gl.getClearAlpha();

    // R3F resets shadowMap.enabled from <Canvas shadows> on every re-render (each Remotion frame): force it back on.
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = PCFShadowMap;
    gl.shadowMap.needsUpdate = true; // once per frame, in the colour pass only
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
    // Cards render their own alpha-tested mask (depth + alpha 0), so ink and lens blur follow the silhouette.
    scene.overrideMaterial = null;
    CARD_PASS.value = 1;
    cam.layers.set(NOINK);
    gl.render(scene, cam);
    CARD_PASS.value = 0;
    gl.autoClear = true;
    scene.overrideMaterial = null;
    cam.layers.mask = mask;
    gl.setClearColor(clear, clearA);

    draw(p.ink, p.inkRT);
    draw(p.dof, p.dofRT);

    // Bloom: threshold + 4-tap downsample chain, then tent upsample back up.
    let src: Texture = p.dofRT.texture;
    let w = p.dofRT.width, h = p.dofRT.height;
    p.down.forEach((t, i) => {
      p.downM.uniforms.tSrc.value = src;
      p.downM.uniforms.uTexel.value.set(0.5 / w, 0.5 / h);
      p.downM.uniforms.uFirst.value = i === 0 ? 1 : 0;
      draw(p.downM, t);
      src = t.texture;
      w = t.width;
      h = t.height;
    });
    const n = p.down.length;
    for (let i = n - 2; i >= 0; i--) {
      const low = i === n - 2 ? p.down[n - 1] : p.up[i + 1];
      p.upM.uniforms.tSrc.value = p.down[i].texture;
      p.upM.uniforms.tLow.value = low.texture;
      p.upM.uniforms.uTexel.value.set(1 / low.width, 1 / low.height);
      draw(p.upM, p.up[i]);
    }
    draw(p.fin, null);
  }, 1);

  return null;
};
