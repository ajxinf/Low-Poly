import {
  AddEquation,
  CustomBlending,
  DoubleSide,
  DstColorFactor,
  ShaderMaterial,
  Texture,
  UniformsLib,
  UniformsUtils,
  Vector2,
  Vector3,
  ZeroFactor,
} from "three";
import { MAX_LAMPS, shared } from "./shade";

/**
 * Card lighting, so a flat character belongs in the lit scene:
 * - two tones: key light tint on the lit side, ~35 % darker and ambient-tinted on the form-shadow side (a shade
 *   mask drawn with the character) and wherever the sun is blocked (real shadow map);
 * - warm light pools and an inner rim on the edge facing each nearby lamp;
 * - fog and depth of field like any surface (the card writes depth in the NOINK mask pass);
 * - a soft contact shadow and a projected cast shadow on the ground (multiply decals).
 */

/** 0 = colour pass, 1 = NOINK mask pass (alpha-tested depth, alpha 0 so the world ink skips the card). */
export const CARD_PASS = { value: 0 };

export const CARD_LOOK = {
  /** How strongly the card picks up the scene light (0 = flat albedo, 1 = same as the world). */
  light: 0.6,
  /** Shade side relative to the lit side, linear: .45 reads ~35 % darker on screen (sRGB). */
  shade: 0.45,
  /** Warm lamp rim strength. */
  rim: 0.6,
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
uniform sampler2D uMap, uMask;
uniform float uPass, uLight, uShadeK, uRim;
uniform vec2 uRimUv;
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
  // Two tones: the painted form-shadow side (mask, on the side away from the key) and real cast shadows. A card
  // keeps its split even when backlit: that split is the style, not physics.
  float t = 1.0 - smoothstep(0.35, 0.65, texture2D(uMask, vUv).a);
  #ifdef USE_SHADOWMAP
  t *= getShadowMask();
  #endif
  vec3 lit = mix(vec3(1.0), uLit, uLight);
  lit /= max(1.0, dot(lit, W) / 1.02); // keep the key's tint but stop saturated albedos (rust jacket) going neon
  // Shade side: ~35 % darker on screen than lit, tinted toward the scene ambient (luma-normalised shade colour).
  vec3 tint = uShade / max(dot(uShade, W), 1e-3);
  vec3 m = mix(lit * tint * uShadeK, lit, t) + uLift * (1.0 - t);
  vec3 rim = vec3(0.0);
  for (int i = 0; i < ${MAX_LAMPS}; i++) {
    vec3 d = uLampPos[i] - vW;
    float r = length(d);
    float f = 1.0 - smoothstep(0.0, uLampRadius, r);
    m += uLampColor * f * f * 0.5;
    // Warm inner rim just inside the outline on the edge facing the lamp: 2 outline widths toward the lamp is
    // empty, 1.1 widths is still card (so the outline itself stays ink).
    vec2 dir = normalize(vec2(dot(d, vRight), d.y) + 1e-4);
    float edge = (1.0 - texture2D(uMap, vUv + dir * uRimUv).a) * texture2D(uMap, vUv + dir * uRimUv * 0.55).a;
    float fr = 1.0 - smoothstep(0.0, uLampRadius * 1.3, r);
    rim += uLampColor * edge * fr * fr;
  }
  vec3 c = tex.rgb * m + rim * uRim * tex.a;
  gl_FragColor = vec4(c, tex.a);
  #include <fog_fragment>
}`;

export const cardMaterial = (map: Texture, mask: Texture) => {
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
      uMask: { value: mask },
      uPass: CARD_PASS,
      uLight: { value: CARD_LOOK.light },
      uShadeK: { value: CARD_LOOK.shade },
      uRim: { value: CARD_LOOK.rim },
      uRimUv: { value: new Vector2(0.03, 0.018) },
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
