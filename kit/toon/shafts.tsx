import { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import { AdditiveBlending, Color, CylinderGeometry, DoubleSide, Group, Mesh, Quaternion, ShaderMaterial, Vector3 } from "three";
import { NOINK } from "./ink";

/**
 * Volumetric light shafts (LOOK_SPEC / skill "Light": god rays through windows, doors, gaps between houses and tree
 * canopies). Each shaft is an open cone from `from` (the opening, radius r0) to `to` (where it lands, radius r1),
 * drawn additively with soft edges (view-angle falloff), a fade along its length and slow drifting dust bands.
 * Frame-driven (`useCurrentFrame`), no ink (NOINK layer), never raycast (the QA guard and ground probes ignore it).
 * Opacity 0.10-0.25 by day, up to 0.35 in dark interiors and at night.
 */
export type Shaft = { from: Vector3; to: Vector3; r0: number; r1: number; color?: string; opacity?: number };

const vert = /* glsl */ `
varying float vAlong; varying float vEdge; varying vec2 vUv;
void main() {
  vUv = uv; vAlong = 1.0 - uv.y;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec3 n = normalize(mat3(modelMatrix) * normal);
  vec3 v = normalize(cameraPosition - wp.xyz);
  float e = abs(dot(n, v));
  vEdge = e == e ? clamp(e, 0.0, 1.0) : 0.0; // NaN guard
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const frag = /* glsl */ `
uniform vec3 uColor; uniform float uOpacity, uTime;
varying float vAlong; varying float vEdge; varying vec2 vUv;
void main() {
  float soft = pow(max(vEdge, 1e-4), 1.6);                                   // bright in the middle of the beam, gone at its rim
  float len = smoothstep(0.0, 0.12, vAlong) * (1.0 - smoothstep(0.55, 1.0, vAlong));
  float dust = 0.82 + 0.18 * sin(vUv.x * 37.0 + vAlong * 9.0 - uTime * 0.7) * sin(vUv.x * 13.0 - uTime * 0.4);
  vec3 c = uColor * uOpacity * soft * len * dust;
  gl_FragColor = vec4(max(c, vec3(0.0)), 1.0);
}`;

const beam = (s: Shaft) => {
  const d = s.to.clone().sub(s.from), len = d.length();
  const m = new Mesh(
    new CylinderGeometry(s.r0, s.r1, len, 32, 1, true),
    new ShaderMaterial({
      uniforms: { uColor: { value: new Color(s.color ?? "#ffe7b8") }, uOpacity: { value: s.opacity ?? 0.16 }, uTime: { value: 0 } },
      vertexShader: vert,
      fragmentShader: frag,
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      fog: false,
    }),
  );
  m.position.copy(s.from).addScaledVector(d, 0.5);
  m.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, -1, 0), d.normalize())); // top (r0) at `from`
  m.layers.set(NOINK);
  m.raycast = () => {}; // not geometry: guard probes, creep rays and ground checks pass through
  m.renderOrder = 10;
  return m;
};

export const LightShafts: React.FC<{ shafts: Shaft[] }> = ({ shafts }) => {
  const frame = useCurrentFrame();
  const g = useMemo(() => {
    const grp = new Group();
    shafts.forEach((s) => grp.add(beam(s)));
    return grp;
  }, [shafts]);
  g.children.forEach((m) => (((m as Mesh).material as ShaderMaterial).uniforms.uTime.value = frame / 30));
  return <primitive object={g} />;
};
