import { useLayoutEffect, useMemo, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { BufferAttribute, BufferGeometry, Color, Points, ShaderMaterial, Vector3 } from "three";
import { SKY } from "../ink";
import { rng } from "../paint";

const vert = /* glsl */ `
uniform float uTime, uPx;
uniform vec3 uWind;
attribute vec3 aSeed;
varying float vA;
void main() {
  // Each puff loops over 6 s: rises ~3 m, drifts downwind, grows, fades. Driven by frame time only.
  float t = fract(uTime / 6.0 + aSeed.x);
  vec3 p = position + vec3(0.0, t * 3.0, 0.0) + uWind * t * t * 2.5 + vec3(sin(t * 6.0 + aSeed.y * 6.3), 0.0, cos(t * 5.0 + aSeed.z * 6.3)) * 0.15 * t;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uPx * (0.35 + 0.9 * t) * 1100.0 / -mv.z;
  vA = smoothstep(0.0, 0.12, t) * (1.0 - smoothstep(0.45, 1.0, t)) * 0.55;
}`;

const frag = /* glsl */ `
uniform vec3 uColor;
varying float vA;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float a = vA * (1.0 - smoothstep(0.5, 1.0, r));
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor, a);
}`;

const WIND = new Vector3(0.8, 0, 0.3);

/** Chimney smoke: soft puffs rising from each point (colour pass only, no ink). */
export const Smoke: React.FC<{ from: Vector3[]; color?: string; wind?: Vector3; perChimney?: number }> = ({
  from,
  color = "#d8cfe0",
  wind = WIND,
  perChimney = 14,
}) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const ref = useRef<Points>(null);
  const { geo, mat } = useMemo(() => {
    const r = rng(9);
    const n = from.length * perChimney;
    const pos = new Float32Array(n * 3), seed = new Float32Array(n * 3);
    from.forEach((p, i) => {
      for (let j = 0; j < perChimney; j++) {
        const k = i * perChimney + j;
        pos.set([p.x, p.y, p.z], k * 3);
        seed.set([j / perChimney + r() * 0.05, r(), r()], k * 3);
      }
    });
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new BufferAttribute(seed, 3));
    const m = new ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: { value: 0 }, uPx: { value: height / 1920 }, uColor: { value: new Color(color) }, uWind: { value: wind } },
    });
    return { geo: g, mat: m };
  }, [from, color, wind, perChimney, height]);
  mat.uniforms.uTime.value = frame / fps;
  useLayoutEffect(() => ref.current?.layers.set(SKY), []);
  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} />;
};
