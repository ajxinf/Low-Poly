import { Color, ShaderMaterial, Texture, UniformsLib, UniformsUtils, Vector2, Vector3 } from "three";
import { LightPreset, linear } from "./lights";

export const MAX_LAMPS = 12;

// Shared by every toon material, so one applyLight() relights the whole world.
export const shared = {
  uSunDir: { value: new Vector3(0, 1, 0) },
  uLit: { value: new Vector3(1, 1, 1) },
  uShade: { value: new Vector3(0.3, 0.3, 0.3) },
  uLift: { value: new Vector3() },
  uSat: { value: 1 },
  uHazeColor: { value: new Color() },
  uHazeStart: { value: 60 },
  uHazeAmount: { value: 0 },
  uLampPos: { value: Array.from({ length: MAX_LAMPS }, () => new Vector3(0, -1e4, 0)) },
  uLampColor: { value: new Color() },
  uLampRadius: { value: 6 },
};

export const applyLight = (p: LightPreset, sunDir: Vector3) => {
  shared.uSunDir.value.copy(sunDir).normalize();
  shared.uLit.value.set(...p.lit);
  shared.uShade.value.set(...p.shade);
  shared.uLift.value.set(...p.lift);
  shared.uSat.value = p.sat;
  shared.uHazeColor.value.copy(linear(p.haze.color));
  shared.uHazeStart.value = p.haze.start;
  shared.uHazeAmount.value = p.haze.amount;
  shared.uLampColor.value.copy(linear(p.lamp?.[0] ?? "#000000")).multiplyScalar(p.lamp?.[1] ?? 0);
};

/** Warm light pools around practical lights (lamp heads, shop windows). Unused slots stay far below ground. */
export const setLamps = (pos: Vector3[], radius = 6) => {
  shared.uLampPos.value.forEach((v, i) => (pos[i] ? v.copy(pos[i]) : v.set(0, -1e4, 0)));
  shared.uLampRadius.value = radius;
};

const vertex = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
#include <shadowmap_pars_vertex>
uniform vec2 uRepeat;
varying vec3 vN;
varying vec3 vW;
varying vec2 vUv;
varying float vDist;
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
uniform vec3 uSunDir, uLit, uShade, uLift, uHazeColor, uLampColor;
uniform float uSat, uHazeStart, uHazeAmount, uLampRadius;
uniform vec3 uLampPos[${MAX_LAMPS}];
varying vec3 vN;
varying vec3 vW;
varying vec2 vUv;
varying float vDist;
const vec3 W = vec3(0.2126, 0.7152, 0.0722);
void main() {
  vec3 a = uHasMap > 0.5 ? texture2D(uMap, vUv).rgb : vec3(1.0);
  a = mix(a, vec3(dot(a, W)), uMute) * uColor;
  a = mix(vec3(uFloor), vec3(1.0), a);
  vec3 n = normalize(vN);
  // Two tones: a hard (1-2 px soft) terminator between lit and shade, then cast shadows.
  float t = smoothstep(-0.03, 0.03, dot(n, uSunDir));
  #ifdef USE_SHADOWMAP
  t *= getShadowMask();
  #endif
  vec3 c = a * mix(uShade, uLit, t) + uLift * (1.0 - t);
  // Practical light pools: soft, warm, stronger on faces turned toward the lamp.
  for (int i = 0; i < ${MAX_LAMPS}; i++) {
    vec3 d = uLampPos[i] - vW;
    float r = length(d);
    float f = 1.0 - smoothstep(0.0, uLampRadius, r);
    c += a * uLampColor * f * f * (0.35 + 0.65 * max(dot(n, d / max(r, 1e-3)), 0.0));
  }
  c = max(mix(vec3(dot(c, W)), c, uSat), 0.0);
  c = mix(c, uHazeColor, uHazeAmount * smoothstep(uHazeStart, uHazeStart * 2.0, vDist));
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
};

/** Two-tone toon material. `mute` (0-1) pulls the map toward grey, then `color` tints it; `floor` lifts its darkest value. */
export const toonMaterial = ({ color = "#ffffff", map = null, repeat = [1, 1], mute = 0, floor = 0, emissive }: ToonOpts = {}) =>
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
    },
  });
