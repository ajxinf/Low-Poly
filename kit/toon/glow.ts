import { AdditiveBlending, Camera, Color, DataTexture, Group, LinearFilter, Mesh, Object3D, PlaneGeometry, ShaderMaterial, Sprite, SpriteMaterial, Vector3 } from "three";
import { SKY } from "./ink";
import type { LightPreset } from "./lights";
import type { PracticalKind } from "./shade";

/**
 * Glows: the soft painted corona around light sources (lamps, lit windows, shop fronts, fires, the sun) that makes
 * a frame feel lit. Same falloff as the sun's corona: a tight bright core plus a wide gentle halo. Additive, colour
 * pass only (SKY layer: no ink, never blocks anything), hidden by walls in front of it (depth test), and nudged
 * toward the camera so the lamp it sits on never cuts it in half.
 */
const SIZE = 128;
const glowTex = (() => {
  const d = new Uint8Array(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const r = Math.hypot(x + 0.5 - SIZE / 2, y + 0.5 - SIZE / 2) / (SIZE / 2);
      const edge = 1 - Math.min(Math.max((r - 0.7) / 0.3, 0), 1);
      const v = (0.5 * Math.exp(-r * r * 22) + 0.5 * Math.exp(-r * 4.2)) * edge * edge;
      const i = (y * SIZE + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = Math.round(255 * Math.min(v, 1));
      d[i + 3] = 255;
    }
  const t = new DataTexture(d, SIZE, SIZE);
  t.magFilter = t.minFilter = LinearFilter;
  t.needsUpdate = true;
  return t;
})();

const toCam = new Vector3();

/** A soft glow `size` m across at `pos`, `strength` x its colour (linear; above ~1 the bloom adds to it). */
export const glowSprite = (pos: Vector3, color: string, size: number, strength: number) => {
  const m = new SpriteMaterial({ map: glowTex, color: new Color(color).multiplyScalar(strength), blending: AdditiveBlending, transparent: true, depthWrite: false, fog: false, toneMapped: false });
  const s = new Sprite(m);
  s.scale.setScalar(size);
  s.layers.set(SKY);
  s.raycast = () => {};
  s.onBeforeRender = (_r, _s, cam: Camera) => {
    toCam.setFromMatrixPosition(cam.matrixWorld).sub(pos);
    // A lens near (or inside) a halo washes the whole frame (pilot: generator shot 2 m from a floodlight): fade the
    // glow out as the camera comes within ~2 of its sizes.
    const d = toCam.length(), t = Math.min(Math.max((d - size * 0.9) / (size * 1.6), 0), 1);
    m.opacity = t * t * (3 - 2 * t);
    toCam.normalize();
    s.position.copy(pos).addScaledVector(toCam, size * 0.45);
    s.updateMatrixWorld();
  };
  s.position.copy(pos);
  return s;
};

/** Glow size (m across) and strength per practical kind. */
const GLOW: Record<PracticalKind, [number, number]> = { lamp: [1.7, 0.75], window: [2.0, 0.35], shop: [3.0, 0.45], fire: [2.4, 0.9] };

/**
 * Glows for every practical (all of them, not only the few that get real point lights). Off when the preset has
 * no `lamp` (lights off by day) unless the practical has its own colour (an exit sign stays on). `glowAt` places
 * the glow on the fixture when the light itself hangs elsewhere (fluorescent strips).
 */
export const practicalGlows = (list: { pos: Vector3; kind: PracticalKind; color?: [string, number]; glowAt?: Vector3 }[], p: LightPreset) => {
  const g = new Group();
  const on = Math.min((p.lamp?.[1] ?? 0) / 3, 1);
  for (const l of list) {
    const [size, k] = GLOW[l.kind];
    const strength = l.color ? k * Math.min(l.color[1], 1.5) : k * on;
    if (strength <= 0.02) continue;
    g.add(glowSprite(l.glowAt ?? l.pos, l.color?.[0] ?? p.lamp?.[0] ?? "#ffb35a", size, strength));
  }
  return g;
};

const discVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const discFrag = /* glsl */ `
uniform vec3 uHot, uEdge, uHalo;
varying vec2 vUv;
void main() {
  vec2 p = (vUv * 2.0 - 1.0) * 3.0;           // disc radius 1, halo out to 3
  float r = length(p);
  float disc = 1.0 - smoothstep(0.985, 1.0, r);
  // Painted sun: pale-hot middle warming to gold at the limb, a soft highlight up-left, a faint inner ring.
  vec3 col = mix(uHot, uEdge, pow(clamp(r, 0.0, 1.0), 2.6));
  col += 0.05 * (1.0 - smoothstep(0.0, 0.7, length(p - vec2(-0.32, 0.34))));
  col *= 1.0 - 0.035 * smoothstep(0.72, 0.8, r) * (1.0 - smoothstep(0.8, 0.9, r));
  // Corona: a tight bright rim plus a wide soft glow that tints the sky (bloom-free, so it never clips).
  float e = max(r - 1.0, 0.0);
  float halo = 0.5 * exp(-e * 1.7) + 0.35 * exp(-e * 8.0);
  halo *= 1.0 - smoothstep(1.6, 2.0, e);
  // Inside: the disc (its anti-aliased edge blends into the rim glow); outside: the corona over the sky.
  gl_FragColor = vec4(mix(uHalo, col, disc), disc + (1.0 - disc) * halo);
}`;

/**
 * A painted sun with depth: hot pale centre, gold limb, soft highlight, tight rim and a wide corona that tints the
 * sky around it. Billboard it toward the camera (`lookAt`). Sky layer (colour pass only). `radius` = the disc; the
 * plane spans 3x for the corona. Put it where the key light comes from (SUN = SUN_POS - camera, normalised).
 */
export const sunDisc = (radius: number, hot = "#fffbea", edge = "#ffc95e", halo = "#ffe2a8"): Object3D => {
  const m = new Mesh(
    new PlaneGeometry(radius * 6, radius * 6),
    new ShaderMaterial({
      vertexShader: discVert,
      fragmentShader: discFrag,
      transparent: true,
      depthWrite: false,
      fog: false,
      uniforms: { uHot: { value: new Color(hot) }, uEdge: { value: new Color(edge).multiplyScalar(0.92) }, uHalo: { value: new Color(halo) } },
    }),
  );
  m.layers.set(SKY);
  m.raycast = () => {};
  return m;
};

/**
 * A window-light patch on a floor or wall (refs: sun through slats on a floor, moon panes across a wall): a soft
 * additive decal with a pane pattern, lying on the surface (`normal`), `w` x `h` m, `panes` [cols, rows], bars
 * `bar` of a pane wide. Colour pass only. Not volumetric: it lights the surface, nothing in the air.
 */
export const lightPatch = (center: Vector3, normal: Vector3, w: number, h: number, color: string, strength = 0.6, panes: [number, number] = [2, 2], bar = 0.12) => {
  const m = new Mesh(
    new PlaneGeometry(w, h),
    new ShaderMaterial({
      uniforms: { uColor: { value: new Color(color).multiplyScalar(strength) }, uPanes: { value: panes }, uBar: { value: bar } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 uColor; uniform vec2 uPanes; uniform float uBar; varying vec2 vUv;
void main() {
  vec2 e = min(vUv, 1.0 - vUv);
  float edge = smoothstep(0.0, 0.06, e.x) * smoothstep(0.0, 0.06, e.y);
  vec2 p = vUv * uPanes, d = abs(p - floor(p + 0.5));
  vec2 inner = step(0.5, p) * step(p, uPanes - 0.5);
  vec2 bars = 1.0 - (1.0 - smoothstep(uBar * 0.5, uBar * 0.5 + 0.06, d)) * inner;
  gl_FragColor = vec4(uColor * edge * min(bars.x, bars.y), 1.0);
}`,
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  m.position.copy(center).addScaledVector(normal, 0.01);
  m.lookAt(center.clone().add(normal));
  m.layers.set(SKY);
  m.raycast = () => {};
  return m;
};
