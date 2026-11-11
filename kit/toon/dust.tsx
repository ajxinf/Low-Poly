import { useLayoutEffect, useMemo, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Points, ShaderMaterial, Vector3 } from "three";
import { SKY } from "./ink";
import { rng } from "./paint";

const vert = /* glsl */ `
uniform float uTime, uPx;
attribute vec4 aSeed;
varying float vA;
void main() {
  // Slow drift + gentle wobble, all from frame time.
  vec3 p = position + vec3(sin(uTime * 0.4 + aSeed.x * 6.3) * 0.35 + uTime * 0.12, sin(uTime * 0.3 + aSeed.y * 6.3) * 0.25 - uTime * 0.03, cos(uTime * 0.35 + aSeed.z * 6.3) * 0.3);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(uPx * (2.0 + 3.0 * aSeed.w) * 9.0 / -mv.z, 1.2 * uPx, 9.0 * uPx);
  vA = 0.35 + 0.65 * aSeed.w;
}`;

const frag = /* glsl */ `
uniform vec3 uColor;
varying float vA;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  gl_FragColor = vec4(uColor * vA * (1.0 - smoothstep(0.3, 1.0, r)), 1.0);
}`;

/** Drifting dust motes in a box (colour pass only, additive, HDR so the brightest bloom a little). */
export const Dust: React.FC<{ center: Vector3; size: Vector3; count?: number; color?: string; strength?: number }> = ({
  center,
  size,
  count = 900,
  color = "#ffc98a",
  strength = 2.4,
}) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const ref = useRef<Points>(null);
  const { geo, mat } = useMemo(() => {
    const r = rng(42);
    const pos = new Float32Array(count * 3), seed = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      pos.set([center.x + (r() - 0.5) * size.x, center.y + (r() - 0.5) * size.y, center.z + (r() - 0.5) * size.z], i * 3);
      seed.set([r(), r(), r(), r() ** 3], i * 4);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new BufferAttribute(seed, 4));
    const m = new ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPx: { value: height / 1920 }, uColor: { value: new Color(color).multiplyScalar(strength) } },
    });
    return { geo: g, mat: m };
  }, [center, size, count, color, strength, height]);
  mat.uniforms.uTime.value = frame / fps;
  useLayoutEffect(() => ref.current?.layers.set(SKY), []);
  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} />;
};
