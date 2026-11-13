import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";
import {
  AddEquation, CanvasTexture, CustomBlending, DoubleSide, DstColorFactor, Group, InstancedBufferAttribute, InstancedMesh,
  LinearFilter, LinearMipmapLinearFilter, Matrix4, Object3D, PlaneGeometry, SRGBColorSpace, ShaderMaterial, UniformsLib,
  UniformsUtils, Vector3, ZeroFactor,
} from "three";
import { CARD_PASS, CARD_LOOK } from "./cardshade";
import { drawPerson } from "./figure";
import type { CharState, Look } from "./figure";
import { NOINK, SKY } from "./ink";
import { AERIAL, shared } from "./shade";
import { DESIGN, Pen } from "./toon";

/**
 * Instanced crowd (hundreds of extras in one draw): every look x state is drawn ONCE into an atlas (CELL_RES of the
 * hero card resolution), and each instance is a camera-facing card (yaw only) picking its atlas cell. Lit like the
 * hero cards (scene tint, fog, aerial haze, practicals), on the NOINK layer with the same mask pass, so ink and lens
 * blur treat them like characters. A soft contact blob sits under each one. Everything is frame-driven: `place(i, f)`
 * returns where instance i stands at composition frame f, which state it shows and whether it is visible.
 * Hero roles stay `<Character>`s (cast shadows, redraws, QA cast checks); the crowd is set dressing.
 */
export type CrowdSpec = {
  looks: Look[];
  states: CharState[];
  count: number;
  /** Instance i at composition frame f: soles position, state index, look index, hidden. */
  place: (i: number, f: number) => { pos: Vector3; state: number; look: number; hidden?: boolean };
};

const CELL_RES = 0.36; // design px -> atlas px (the hero card draws at 2.0)
const CW = Math.round(DESIGN.W * CELL_RES), CH = Math.round(DESIGN.H * CELL_RES);

const atlasOf = (looks: Look[], states: CharState[]) => {
  const cols = states.length, rows = looks.length;
  const canvas = document.createElement("canvas");
  canvas.width = cols * CW;
  canvas.height = rows * CH;
  const ctx = canvas.getContext("2d")!;
  looks.forEach((look, r) =>
    states.forEach((s, c) => {
      ctx.save();
      ctx.setTransform(CELL_RES, 0, 0, CELL_RES, c * CW, r * CH);
      ctx.beginPath();
      ctx.rect(0, 0, DESIGN.W, DESIGN.H);
      ctx.clip();
      drawPerson(new Pen(ctx), look, s);
      ctx.restore();
    }),
  );
  const t = new CanvasTexture(canvas);
  t.minFilter = LinearMipmapLinearFilter;
  t.magFilter = LinearFilter;
  t.anisotropy = 8;
  t.colorSpace = SRGBColorSpace;
  return { texture: t, cols, rows };
};

const vert = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
attribute vec2 aCell;
uniform vec2 uGrid;
varying vec2 vUv;
varying vec3 vView;
void main() {
  vec3 c = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 toCam = cameraPosition - c; toCam.y = 0.0;
  vec3 fwd = normalize(toCam + vec3(1e-4, 0.0, 0.0));
  vec3 right = vec3(fwd.z, 0.0, -fwd.x);
  float s = length(instanceMatrix[0].xyz);
  vec3 w = c + (right * position.x + vec3(0.0, 1.0, 0.0) * position.y) * s;
  vUv = (aCell + uv) / uGrid;
  vec4 mvPosition = viewMatrix * vec4(w, 1.0);
  vView = mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const frag = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
#include <lights_pars_begin>
uniform sampler2D uMap;
uniform float uPass, uCharShade, uPractical;
uniform vec3 uCharTint, uHazeColor, uInkFrom, uCharInk;
uniform float uHazeStart, uHazeAmount;
varying vec2 vUv;
varying vec3 vView;
${AERIAL}
void main() {
  vec4 tex = texture2D(uMap, vUv);
  if (uPass > 0.5) {
    if (tex.a < 0.5) discard;
    gl_FragColor = vec4(0.0);
    return;
  }
  if (tex.a < 0.02) discard;
  vec3 m = uCharTint * mix(uCharShade, 1.0, 0.85);
  vec3 lamp = vec3(0.0);
  #if NUM_POINT_LIGHTS > 0
  for (int i = 0; i < NUM_POINT_LIGHTS; i++) {
    float r = length(pointLights[i].position - vView), D = pointLights[i].distance;
    lamp += pointLights[i].color * (1.0 - smoothstep(0.0, D, r));
  }
  m *= 1.0 + lamp * uPractical;
  #endif
  float inkness = 1.0 - smoothstep(0.005, 0.012, distance(tex.rgb, uInkFrom));
  vec3 base = mix(tex.rgb, uCharInk, inkness);
  gl_FragColor = vec4(aerial(base * m, length(vView)), tex.a);
  #include <fog_fragment>
}`;

const blobVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }`;
const blobFrag = /* glsl */ `
uniform vec3 uLit, uShade;
varying vec2 vUv;
void main() {
  float r = length((vUv - 0.5) * 2.0);
  vec3 ratio = min(uShade / uLit, vec3(1.0));
  gl_FragColor = vec4(mix(vec3(1.0), ratio, ${CARD_LOOK.contact.toFixed(2)} * (1.0 - smoothstep(0.3, 1.0, r))), 1.0);
}`;

const tmp = new Object3D(), HIDE = new Matrix4().makeScale(0, 0, 0);

/** `avoid`: the lens position; extras within `clear` m of it (on the ground plane) are hidden, never a face in the lens. */
export const Crowd: React.FC<{ spec: CrowdSpec; f: number; avoid?: Vector3; clear?: number }> = ({ spec, f, avoid, clear = 3 }) => {
  useThree();
  const p = useMemo(() => {
    const { texture, cols, rows } = atlasOf(spec.looks, spec.states);
    const w = DESIGN.W / DESIGN.PX_PER_M, h = DESIGN.H / DESIGN.PX_PER_M;
    const geo = new PlaneGeometry(w, h);
    geo.translate(0, h / 2 - (DESIGN.H - DESIGN.SOLE) / DESIGN.PX_PER_M, 0);
    const cell = new InstancedBufferAttribute(new Float32Array(spec.count * 2), 2);
    geo.setAttribute("aCell", cell);
    const mat = new ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      fog: true,
      lights: true,
      side: DoubleSide,
      alphaToCoverage: true,
      uniforms: {
        ...UniformsUtils.clone(UniformsLib.fog),
        ...UniformsUtils.clone(UniformsLib.lights),
        ...shared,
        uMap: { value: texture },
        uGrid: { value: [cols, rows] },
        uPass: CARD_PASS,
        uPractical: { value: CARD_LOOK.practical },
      },
    });
    const cards = new InstancedMesh(geo, mat, spec.count);
    cards.frustumCulled = false;
    const blobGeo = new PlaneGeometry(0.55, 0.3).rotateX(-Math.PI / 2);
    const blobs = new InstancedMesh(
      blobGeo,
      new ShaderMaterial({ vertexShader: blobVert, fragmentShader: blobFrag, uniforms: { ...shared }, blending: CustomBlending, blendEquation: AddEquation, blendSrc: DstColorFactor, blendDst: ZeroFactor, transparent: true, depthWrite: false }),
      spec.count,
    );
    blobs.frustumCulled = false;
    const g = new Group().add(cards, blobs);
    return { g, cards, blobs, cell, cols };
  }, [spec]);
  useLayoutEffect(() => {
    p.cards.layers.set(NOINK);
    p.blobs.layers.set(SKY);
  }, [p]);
  useFrame(() => {
    for (let i = 0; i < spec.count; i++) {
      const q = spec.place(i, f);
      if (q.hidden || (avoid && Math.hypot(q.pos.x - avoid.x, q.pos.z - avoid.z) < clear)) {
        p.cards.setMatrixAt(i, HIDE);
        p.blobs.setMatrixAt(i, HIDE);
        continue;
      }
      tmp.position.copy(q.pos);
      tmp.rotation.set(0, 0, 0);
      tmp.scale.setScalar(1);
      tmp.updateMatrix();
      p.cards.setMatrixAt(i, tmp.matrix);
      tmp.position.y += 0.014;
      tmp.updateMatrix();
      p.blobs.setMatrixAt(i, tmp.matrix);
      p.cell.setXY(i, q.state, spec.looks.length - 1 - q.look);
    }
    p.cards.instanceMatrix.needsUpdate = true;
    p.blobs.instanceMatrix.needsUpdate = true;
    p.cell.needsUpdate = true;
  }, -1);
  return <primitive object={p.g} />;
};
