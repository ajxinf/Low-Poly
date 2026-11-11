import { Color, ShaderMaterial, Texture, UniformsLib, UniformsUtils, Vector3 } from "three";
import { LightPreset, linear } from "./lights";

// Shared by every toon material, so one applyLight() relights the whole world.
const shared = {
  uSunDir: { value: new Vector3(0, 1, 0) },
  uLit: { value: new Vector3(1, 1, 1) },
  uShade: { value: new Vector3(0.3, 0.3, 0.3) },
  uLift: { value: new Vector3() },
  uSat: { value: 1 },
  uHazeColor: { value: new Color() },
  uHazeStart: { value: 60 },
  uHazeAmount: { value: 0 },
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
};

const vertex = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
varying vec3 vN;
varying vec2 vUv;
varying float vDist;
void main() {
  vUv = uv;
  vN = inverseTransformDirection(normalMatrix * normal, viewMatrix); // correct under non-uniform scale
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vDist = length(mvPosition.xyz);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const fragment = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform vec3 uColor;
uniform sampler2D uMap;
uniform float uHasMap, uMute, uFloor;
uniform vec3 uSunDir, uLit, uShade, uLift, uHazeColor;
uniform float uSat, uHazeStart, uHazeAmount;
varying vec3 vN;
varying vec2 vUv;
varying float vDist;
const vec3 W = vec3(0.2126, 0.7152, 0.0722);
void main() {
  vec3 a = uHasMap > 0.5 ? texture2D(uMap, vUv).rgb : vec3(1.0);
  a = mix(a, vec3(dot(a, W)), uMute) * uColor;
  a = mix(vec3(uFloor), vec3(1.0), a);
  // Two tones: a hard (1-2 px soft) terminator between lit and shade.
  float t = smoothstep(-0.03, 0.03, dot(normalize(vN), uSunDir));
  vec3 c = a * mix(uShade, uLit, t) + uLift * (1.0 - t);
  c = max(mix(vec3(dot(c, W)), c, uSat), 0.0);
  c = mix(c, uHazeColor, uHazeAmount * smoothstep(uHazeStart, uHazeStart * 2.0, vDist));
  gl_FragColor = vec4(c, 1.0);
  #include <fog_fragment>
}`;

export type ToonOpts = { color?: string; map?: Texture | null; mute?: number; floor?: number };

/** Two-tone toon material. `mute` (0-1) pulls the map toward grey, then `color` tints it; `floor` lifts its darkest value. */
export const toonMaterial = ({ color = "#ffffff", map = null, mute = 0, floor = 0 }: ToonOpts = {}) =>
  new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    fog: true,
    uniforms: {
      ...UniformsUtils.clone(UniformsLib.fog),
      ...shared,
      uColor: { value: linear(color) },
      uMap: { value: map },
      uHasMap: { value: map ? 1 : 0 },
      uMute: { value: mute },
      uFloor: { value: floor },
    },
  });
