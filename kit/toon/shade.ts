import { Color, Group, PointLight, ShaderMaterial, Texture, UniformsLib, UniformsUtils, Vector2, Vector3 } from "three";
import { LightPreset, linear } from "./lights";

// Shared by every toon material, so one applyLight() relights the whole world.
export const shared = {
  uSunDir: { value: new Vector3(0, 1, 0) },
  uLit: { value: new Vector3(1, 1, 1) },
  uShade: { value: new Vector3(0.3, 0.3, 0.3) },
  uLift: { value: new Vector3() },
  uSat: { value: 1 },
  uHazeColor: { value: new Color() },
  uHazeStart: { value: 30 },
  uHazeAmount: { value: 0 },
};

/** Practical light positions (world), for the lamp-thrown card shadow; the lights themselves are three PointLights. */
export const practicals: { pos: Vector3; reach: number }[] = [];

const W = [0.2126, 0.7152, 0.0722];
const luma = (v: number[]) => v[0] * W[0] + v[1] * W[1] + v[2] * W[2];

/**
 * Sunlit vs shade: lit is at most `litMax` (1.6) x the shade luma (both pulled toward each other around their
 * geometric mean, so exposure holds), and its hue is pulled 75 % toward the preset's palette tint (peach at dusk,
 * not orange).
 */
export const litAndShade = (p: LightPreset) => {
  let lit = [...p.lit], shade = [...p.shade];
  const ratio = luma(lit) / luma(shade), max = p.litMax ?? 1.6;
  if (ratio > max) {
    const k = Math.sqrt(ratio / max);
    lit = lit.map((v) => v / k);
    shade = shade.map((v) => v * k);
  }
  if (p.litTint) {
    const t = linear(p.litTint), tv = [t.r, t.g, t.b], L = luma(lit), tl = luma(tv);
    lit = lit.map((v, i) => L * (0.25 * (v / L) + 0.75 * (tv[i] / tl)));
  }
  return { lit: lit as [number, number, number], shade: shade as [number, number, number] };
};

export const applyLight = (p: LightPreset, sunDir: Vector3) => {
  const { lit, shade } = litAndShade(p);
  shared.uSunDir.value.copy(sunDir).normalize();
  shared.uLit.value.set(...lit);
  shared.uShade.value.set(...shade);
  shared.uLift.value.set(...p.lift);
  shared.uSat.value = p.sat;
  shared.uHazeColor.value.copy(linear(p.haze.color));
  shared.uHazeStart.value = p.haze.start;
  shared.uHazeAmount.value = p.haze.amount;
};

export type PracticalKind = "lamp" | "window" | "shop" | "fire";
/** Reach (m) and strength (x the preset's lamp strength) per kind: a lamp pool on the ground is ~3.5 m wide. */
const PRACTICAL = { lamp: [4.4, 1], window: [3.0, 0.45], shop: [3.6, 0.6], fire: [4.0, 1.2] } as const;

/**
 * Real point lights for practicals (lamps, lit windows, shop fronts, fires). They light the world and the character
 * cards with a plateau-then-edge falloff (see the shaders). Off when the preset has no `lamp`.
 */
export const practicalLights = (list: { pos: Vector3; kind: PracticalKind }[], p: LightPreset) => {
  const g = new Group();
  practicals.length = 0;
  for (const { pos, kind } of list) {
    const [reach, k] = PRACTICAL[kind];
    const l = new PointLight(p.lamp?.[0] ?? "#000000", (p.lamp?.[1] ?? 0) * k, reach, 0);
    l.position.copy(pos);
    g.add(l);
    practicals.push({ pos: pos.clone(), reach });
  }
  return g;
};

/** GLSL: sum of practical point lights at a view-space point with view-space normal (plateau, then a soft edge). */
export const POINT_LIGHTS = /* glsl */ `
vec3 practicalLight(vec3 vp, vec3 vn) {
  vec3 sum = vec3(0.0);
  #if NUM_POINT_LIGHTS > 0
  for (int i = 0; i < NUM_POINT_LIGHTS; i++) {
    vec3 L = pointLights[i].position - vp;
    float r = length(L);
    float D = pointLights[i].distance;
    float f = 1.0 - smoothstep(0.55 * D, D, r);
    sum += pointLights[i].color * f * (0.35 + 0.65 * max(dot(vn, L / max(r, 1e-3)), 0.0));
  }
  #endif
  return sum;
}`;

/** GLSL: aerial perspective, from uHazeStart m: desaturate and mix toward the horizon colour (up to uHazeAmount). */
export const AERIAL = /* glsl */ `
vec3 aerial(vec3 c, float dist) {
  float k = uHazeAmount * smoothstep(uHazeStart, uHazeStart * 3.0, dist);
  c = mix(c, vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), k * 0.8);
  return mix(c, uHazeColor, k);
}`;

const vertex = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
#include <shadowmap_pars_vertex>
uniform vec2 uRepeat;
varying vec3 vN;
varying vec3 vW;
varying vec2 vUv;
varying float vDist;
varying vec3 vView;
varying vec3 vNV;
void main() {
  vUv = uv * uRepeat;
  #include <beginnormal_vertex>
  #include <defaultnormal_vertex>
  #include <begin_vertex>
  #include <project_vertex>
  vN = inverseTransformDirection(transformedNormal, viewMatrix); // correct under non-uniform scale
  vec4 wp = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
  wp = instanceMatrix * wp;
  #endif
  vW = (modelMatrix * wp).xyz;
  vDist = length(mvPosition.xyz);
  vView = mvPosition.xyz;
  vNV = normalize(transformedNormal);
  #include <worldpos_vertex>
  #include <shadowmap_vertex>
  #include <fog_vertex>
}`;

const fragment = /* glsl */ `
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
uniform vec3 uColor, uEmissive;
uniform sampler2D uMap;
uniform float uHasMap, uMute, uFloor;
uniform vec3 uSunDir, uLit, uShade, uLift, uHazeColor;
uniform float uSat, uHazeStart, uHazeAmount, uWear, uWearC, uWearW;
uniform vec2 uRepeat;
varying vec3 vN;
varying vec3 vW;
varying vec2 vUv;
varying float vDist;
varying vec3 vView;
varying vec3 vNV;
${POINT_LIGHTS}
${AERIAL}
const vec3 W = vec3(0.2126, 0.7152, 0.0722);
void main() {
  vec3 a = uHasMap > 0.5 ? texture2D(uMap, vUv).rgb : vec3(1.0);
  if (uWear > 0.0) {
    // Worn path: smoother (blurred mip) and slightly polished where feet and wheels pass (uv.x = lateral metres).
    float k = uWear * (1.0 - smoothstep(uWearW * 0.5, uWearW, abs(vUv.x / uRepeat.x - uWearC)));
    a = mix(a, texture2D(uMap, vUv, 3.5).rgb * 1.06, k);
  }
  a = mix(a, vec3(dot(a, W)), uMute) * uColor;
  a = mix(vec3(uFloor), vec3(1.0), a);
  vec3 n = normalize(vN);
  // Two tones: a hard (1-2 px soft) terminator between lit and shade, then cast shadows.
  float t = smoothstep(-0.03, 0.03, dot(n, uSunDir));
  #ifdef USE_SHADOWMAP
  t *= getShadowMask();
  #endif
  vec3 c = a * mix(uShade, uLit, t) + uLift * (1.0 - t);
  // Practicals: real point lights (lamps, windows, fires).
  c += a * practicalLight(vView, normalize(vNV));
  c = max(mix(vec3(dot(c, W)), c, uSat), 0.0);
  c = aerial(c, vDist);
  c += uEmissive * a; // HDR glow keeps the map's frames and mullions dark
  gl_FragColor = vec4(c, 1.0);
  #include <fog_fragment>
}`;

export type ToonOpts = {
  color?: string;
  map?: Texture | null;
  /** UV multiplier (map tiles per face). */
  repeat?: [number, number];
  mute?: number;
  floor?: number;
  /** HDR self-light: colour and strength (strength > 1 feeds the bloom). */
  emissive?: [string, number];
  /** Worn smoother path along uv.y, centred at uv.x = center (m), `width` m wide (ground ribbons). */
  wear?: { center: number; width: number; amount: number };
};

/** Two-tone toon material. `mute` (0-1) pulls the map toward grey, then `color` tints it; `floor` lifts its darkest value. */
export const toonMaterial = ({ color = "#ffffff", map = null, repeat = [1, 1], mute = 0, floor = 0, emissive, wear }: ToonOpts = {}) =>
  new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    fog: true,
    lights: true,
    uniforms: {
      ...UniformsUtils.clone(UniformsLib.fog),
      ...UniformsUtils.clone(UniformsLib.lights),
      ...shared,
      uColor: { value: linear(color) },
      uMap: { value: map },
      uHasMap: { value: map ? 1 : 0 },
      uRepeat: { value: new Vector2(...repeat) },
      uMute: { value: mute },
      uFloor: { value: floor },
      uEmissive: { value: emissive ? linear(emissive[0]).multiplyScalar(emissive[1]) : new Color(0, 0, 0) },
      uWear: { value: wear?.amount ?? 0 },
      uWearC: { value: wear?.center ?? 0 },
      uWearW: { value: wear?.width ?? 1 },
    },
  });
