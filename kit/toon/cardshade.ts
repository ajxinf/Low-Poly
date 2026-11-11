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
import { AERIAL, shared } from "./shade";

/**
 * Card lighting (lighting.md 5 / 9.2, adapted): the form shading (head crescent, torso gradient, thick-thin ink) is
 * painted into the card, so the shader only places it in the scene:
 * - the scene light colour as a tint (`char.tint` per preset; heads stay V >= .86, no emissive "pasted-on" glow);
 * - the street shadow (shadow map, probed at chest and knees) dims the whole card only to `char.shade`;
 * - nearby practicals warm it multiplicatively (ink stays dark);
 * - fog, aerial haze and depth of field like any surface (the card writes depth in the NOINK mask pass);
 * - a soft contact blob in the scene's own shadow colour, and a lamp-thrown decal shadow (multiply decals).
 */

/** 0 = colour pass, 1 = NOINK mask pass (alpha-tested depth, alpha 0 so the world ink skips the card). */
export const CARD_PASS = { value: 0 };

export const CARD_LOOK = {
  /** Contact blob strength toward the scene's shade/lit ratio (measured blob Y ratio .52-.74). */
  contact: 0.6,
  /** Lamp-thrown shadow strength right under a lamp (fades out over the lamp radius). */
  lampCast: 0.55,
  /** How much a practical (x its HDR colour) warms the card at its centre. */
  practical: 0.3,
};

const cardVert = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
#include <shadowmap_pars_vertex>
uniform vec3 uProbeA, uProbeB;
varying vec2 vUv;
varying vec4 vProbeA;
varying vec4 vProbeB;
varying vec3 vView;
void main() {
  vUv = uv;
  #include <begin_vertex>
  #include <project_vertex>
  vView = mvPosition.xyz;
  #if defined(USE_SHADOWMAP) && NUM_DIR_LIGHT_SHADOWS > 0
  vProbeA = directionalShadowMatrix[0] * vec4(uProbeA, 1.0);
  vProbeB = directionalShadowMatrix[0] * vec4(uProbeB, 1.0);
  #endif
  #include <fog_vertex>
}`;

const cardFrag = /* glsl */ `
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
uniform sampler2D uMap;
uniform float uPass, uCharShade, uPractical;
uniform vec3 uCharTint, uHazeColor;
uniform float uHazeStart, uHazeAmount;
varying vec3 vView;
varying vec2 vUv;
varying vec4 vProbeA;
varying vec4 vProbeB;
${AERIAL}
void main() {
  vec4 tex = texture2D(uMap, vUv);
  if (uPass > 0.5) {
    if (tex.a < 0.5) discard;
    gl_FragColor = vec4(0.0);
    return;
  }
  // Street shadow: one value for the whole card, sampled at the chest and knees.
  float street = 1.0;
  #if defined(USE_SHADOWMAP) && NUM_DIR_LIGHT_SHADOWS > 0
  DirectionalLightShadow ds = directionalLightShadows[0];
  street = 0.5 * (getShadow(directionalShadowMap[0], ds.shadowMapSize, 1.0, ds.shadowBias, ds.shadowRadius, vProbeA)
                + getShadow(directionalShadowMap[0], ds.shadowMapSize, 1.0, ds.shadowBias, ds.shadowRadius, vProbeB));
  #endif
  vec3 m = uCharTint * mix(uCharShade, 1.0, street);
  #if NUM_POINT_LIGHTS > 0
  for (int i = 0; i < NUM_POINT_LIGHTS; i++) {
    float r = length(pointLights[i].position - vView), D = pointLights[i].distance;
    m *= 1.0 + pointLights[i].color * (1.0 - smoothstep(0.0, D, r)) * uPractical;
  }
  #endif
  vec3 c = aerial(tex.rgb * m, length(vView));
  gl_FragColor = vec4(c, tex.a);
  #include <fog_fragment>
}`;

export const cardMaterial = (map: Texture) =>
  new ShaderMaterial({
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
      uPractical: { value: CARD_LOOK.practical },
      uProbeA: { value: new Vector3() },
      uProbeB: { value: new Vector3() },
    },
  });

const multiply = { blending: CustomBlending, blendEquation: AddEquation, blendSrc: DstColorFactor, blendDst: ZeroFactor, transparent: true, depthWrite: false };

// Lamp-thrown silhouette: card vertices projected from the lantern onto the ground; multiplies the ground by the
// scene's shade/lit ratio, i.e. turns it into the same coloured shade the world uses.
const castVert = /* glsl */ `
uniform vec3 uLampP;
uniform float uGround;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  worldPosition.y = min(worldPosition.y, uLampP.y - 0.3);
  worldPosition.xyz = uLampP + (worldPosition.xyz - uLampP) * ((uLampP.y - uGround) / (uLampP.y - worldPosition.y));
  worldPosition.y = uGround + 0.012;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}`;

const castFrag = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uLit, uShade;
uniform float uStrength;
varying vec2 vUv;
void main() {
  float a = texture2D(uMap, vUv).a;
  vec3 ratio = min(uShade / uLit, vec3(1.0));
  gl_FragColor = vec4(mix(vec3(1.0), ratio, smoothstep(0.3, 0.7, a) * uStrength), 1.0);
}`;

/** Lamp-thrown card shadow: away from `uLampP` (set per frame). */
export const lampShadowMaterial = (map: Texture, ground = 0) =>
  new ShaderMaterial({
    vertexShader: castVert,
    fragmentShader: castFrag,
    side: DoubleSide,
    ...multiply,
    uniforms: {
      ...shared,
      uMap: { value: map },
      uGround: { value: ground },
      uLampP: { value: new Vector3() },
      uStrength: { value: 0.55 },
    },
  });

const contactFrag = /* glsl */ `
uniform vec3 uLit, uShade;
uniform float uStrength;
varying vec2 vUv;
void main() {
  float r = length((vUv - 0.5) * 2.0);
  vec3 ratio = min(uShade / uLit, vec3(1.0));
  gl_FragColor = vec4(mix(vec3(1.0), ratio, uStrength * (1.0 - smoothstep(0.3, 1.0, r))), 1.0);
}`;

/** Soft blob under the feet in the scene's coloured shade (apply to a ground-aligned plane). */
export const contactMaterial = () =>
  new ShaderMaterial({
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: contactFrag,
    ...multiply,
    uniforms: { ...shared, uStrength: { value: CARD_LOOK.contact } },
  });
