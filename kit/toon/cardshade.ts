import {
  AddEquation,
  CustomBlending,
  DoubleSide,
  DstColorFactor,
  ShaderMaterial,
  Texture,
  UniformsLib,
  UniformsUtils,
  Vector3,
  ZeroFactor,
} from "three";
import { MAX_LAMPS, shared } from "./shade";

/**
 * Card lighting, so a flat character belongs in the lit scene:
 * - key light tint where the sun reaches it (real shadow map), scene ambient (the shade colour) where it doesn't;
 * - warm light pools from nearby lamps, stronger on the side of the card facing each lamp;
 * - fog and depth of field like any surface (the card writes depth in the NOINK mask pass);
 * - a soft contact shadow and a projected cast shadow on the ground (multiply decals).
 */

/** 0 = colour pass, 1 = NOINK mask pass (alpha-tested depth, alpha 0 so the world ink skips the card). */
export const CARD_PASS = { value: 0 };

export const CARD_LOOK = {
  /** How strongly the card picks up the scene light (0 = flat albedo, 1 = same as the world). */
  light: 0.6,
  /** How much the card's sides turn toward / away from lights (fake roundness). */
  round: 1.4,
  contact: 0.75,
  cast: 0.7,
  /** Lamp-thrown shadow strength right under a lamp (fades out over the lamp radius). */
  lampCast: 0.55,
};

const cardVert = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
#include <shadowmap_pars_vertex>
varying vec2 vUv;
varying vec3 vW;
varying vec3 vRight;
varying vec3 vFront;
void main() {
  vUv = uv;
  #include <beginnormal_vertex>
  #include <defaultnormal_vertex>
  #include <begin_vertex>
  #include <project_vertex>
  vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
  vW = worldPosition.xyz;
  vRight = normalize(modelMatrix[0].xyz);
  vFront = normalize(modelMatrix[2].xyz);
  #include <shadowmap_vertex>
  #include <fog_vertex>
}`;

const cardFrag = /* glsl */ `
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
uniform sampler2D uMap;
uniform float uPass, uLight, uRound;
uniform vec3 uSunDir, uLit, uShade, uLift, uLampColor;
uniform float uSat, uLampRadius;
uniform vec3 uLampPos[${MAX_LAMPS}];
varying vec2 vUv;
varying vec3 vW;
varying vec3 vRight;
varying vec3 vFront;
const vec3 W = vec3(0.2126, 0.7152, 0.0722);
void main() {
  vec4 tex = texture2D(uMap, vUv);
  if (uPass > 0.5) {
    if (tex.a < 0.5) discard;
    gl_FragColor = vec4(0.0);
    return;
  }
  // Fake roundness: the card's left/right edges face sideways.
  vec3 n = normalize(vRight * (vUv.x - 0.5) * 2.0 * uRound + vFront);
  float t = smoothstep(-0.06, 0.06, dot(n, uSunDir));
  #ifdef USE_SHADOWMAP
  t *= getShadowMask();
  #endif
  vec3 m = mix(uShade, uLit, t) + uLift * (1.0 - t);
  for (int i = 0; i < ${MAX_LAMPS}; i++) {
    vec3 d = uLampPos[i] - vW;
    float r = length(d);
    float f = 1.0 - smoothstep(0.0, uLampRadius, r);
    m += uLampColor * f * f * (0.25 + 0.75 * max(dot(n, d / max(r, 1e-3)), 0.0));
  }
  vec3 c = tex.rgb * mix(vec3(1.0), m, uLight); // no world saturation boost: the card is already flat colour
  gl_FragColor = vec4(c, tex.a);
  #include <fog_fragment>
}`;

export const cardMaterial = (map: Texture) => {
  const m = new ShaderMaterial({
    vertexShader: cardVert,
    fragmentShader: cardFrag,
    fog: true,
    lights: true,
    side: DoubleSide,
    alphaToCoverage: true,
    uniforms: {
      ...UniformsUtils.clone(UniformsLib.fog),
      ...UniformsUtils.clone(UniformsLib.lights),
      ...shared,
      uMap: { value: map },
      uPass: CARD_PASS,
      uLight: { value: CARD_LOOK.light },
      uRound: { value: CARD_LOOK.round },
    },
  });
  return m;
};

const multiply = { blending: CustomBlending, blendEquation: AddEquation, blendSrc: DstColorFactor, blendDst: ZeroFactor, transparent: true, depthWrite: false };

// Projected silhouette: card vertices slid along the sun direction onto the ground; skipped where the ground is
// already in shadow. Multiplies the ground by shade/lit, i.e. turns it into the same shade the world uses.
const castVert = /* glsl */ `
#include <common>
#include <shadowmap_pars_vertex>
uniform vec3 uSunDir, uLampP;
uniform float uGround, uMode;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  if (uMode < 0.5) {
    // Sun: parallel projection along the key direction.
    float h = max(worldPosition.y - uGround, 0.0);
    worldPosition.xyz -= uSunDir * (h / max(uSunDir.y, 0.08));
  } else {
    // Lamp: point projection from the lantern.
    worldPosition.y = min(worldPosition.y, uLampP.y - 0.3);
    worldPosition.xyz = uLampP + (worldPosition.xyz - uLampP) * ((uLampP.y - uGround) / (uLampP.y - worldPosition.y));
  }
  worldPosition.y = uGround + 0.012;
  vec3 transformedNormal = (viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz;
  #include <shadowmap_vertex>
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}`;

const castFrag = /* glsl */ `
#include <common>
#include <packing>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
uniform sampler2D uMap;
uniform vec3 uLit, uShade;
uniform float uStrength, uMode;
varying vec2 vUv;
void main() {
  float a = texture2D(uMap, vUv).a;
  float lit = 1.0;
  #ifdef USE_SHADOWMAP
  if (uMode < 0.5) lit = getShadowMask(); // no sun shadow where the ground is already shaded
  #endif
  vec3 ratio = min(uShade / uLit, vec3(1.0));
  gl_FragColor = vec4(mix(vec3(1.0), ratio, smoothstep(0.3, 0.7, a) * lit * uStrength), 1.0);
}`;

/** mode "sun": projected along the key light; "lamp": thrown away from `uLampP` (set per frame). */
export const castShadowMaterial = (map: Texture, mode: "sun" | "lamp" = "sun", ground = 0) =>
  new ShaderMaterial({
    vertexShader: castVert,
    fragmentShader: castFrag,
    lights: true,
    side: DoubleSide,
    ...multiply,
    uniforms: {
      ...UniformsUtils.clone(UniformsLib.lights),
      ...shared,
      uMap: { value: map },
      uGround: { value: ground },
      uMode: { value: mode === "sun" ? 0 : 1 },
      uLampP: { value: new Vector3() },
      uStrength: { value: CARD_LOOK.cast },
    },
  });

const contactFrag = /* glsl */ `
uniform float uStrength;
varying vec2 vUv;
void main() {
  float r = length((vUv - 0.5) * 2.0);
  gl_FragColor = vec4(vec3(1.0 - uStrength * (1.0 - smoothstep(0.15, 1.0, r))), 1.0);
}`;

/** Soft dark ellipse under the feet (apply to a ground-aligned plane). */
export const contactMaterial = () =>
  new ShaderMaterial({
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: contactFrag,
    ...multiply,
    uniforms: { uStrength: { value: CARD_LOOK.contact } },
  });
