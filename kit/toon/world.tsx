import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { BackSide, DirectionalLight, Fog, Mesh, Object3D, ShaderMaterial, Vector3 } from "three";
import { SKY } from "./ink";
import { LightPreset, linear } from "./lights";
import { applyLight } from "./shade";

const skyFrag = /* glsl */ `
uniform vec3 uTop, uMid, uHorizon, uSun, uSunDisc, uGlow, uCloudLit, uCloudShade;
uniform float uHasSun, uCloudCover;
varying vec3 vDir;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }
void main() {
  vec3 d = normalize(vDir);
  float h = pow(clamp(d.y / 0.75, 0.0, 1.0), 0.6);
  vec3 c = mix(mix(uHorizon, uMid, smoothstep(0.0, 0.5, h)), uTop, smoothstep(0.45, 1.0, h));
  c += uGlow * pow(max(dot(d, uSun), 0.0), 6.0) * (1.0 - h);
  if (uCloudCover > 0.0) {
    // A few painted cloud banks: flattened noise, a hard-ish edge, warm underside, violet top.
    vec2 p = vec2(atan(d.x, -d.z) * 2.6, d.y * 6.0);
    float n = fbm(p * vec2(1.0, 1.6) + vec2(3.1, 0.0));
    float band = smoothstep(0.04, 0.12, d.y) * (1.0 - smoothstep(0.42, 0.62, d.y));
    float m = smoothstep(1.0 - uCloudCover * 0.75, 1.03 - uCloudCover * 0.75, n) * band;
    float under = smoothstep(0.0, 0.08, fbm(p * vec2(1.0, 1.6) + vec2(3.1, -0.3)) - n + 0.04);
    vec3 cc = mix(uCloudShade, uCloudLit, under);
    c = mix(c, cc, m * 0.92);
  }
  if (uHasSun > 0.5) c = mix(c, uSunDisc * 4.0, smoothstep(0.99965, 0.99975, dot(d, uSun)));
  gl_FragColor = vec4(c, 1.0);
}`;

const skyVert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

/**
 * Sky dome, distance fog (= horizon colour), the toon light preset and the shadow-casting key for one shot.
 * `shadow` = centre and half-size (m) of the area that receives sharp cast shadows.
 */
export const ToonWorld: React.FC<{ preset: LightPreset; sunDir: Vector3; shadow?: { center: Vector3; size: number } }> = ({
  preset,
  sunDir,
  shadow = { center: new Vector3(), size: 40 },
}) => {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const sky = useRef<Mesh>(null);

  const mat = useMemo(() => {
    const skyMid = preset.skyMid ?? `#${linear(preset.skyHorizon).lerp(linear(preset.skyTop), 0.5).getHexString()}`;
    return new ShaderMaterial({
      vertexShader: skyVert,
      fragmentShader: skyFrag,
      side: BackSide,
      depthWrite: false,
      uniforms: {
        uTop: { value: linear(preset.skyTop) },
        uMid: { value: linear(skyMid) },
        uHorizon: { value: linear(preset.skyHorizon) },
        uSun: { value: sunDir.clone().normalize() },
        uSunDisc: { value: linear(preset.sunDisc ?? "#ffffff") },
        uHasSun: { value: preset.sunDisc ? 1 : 0 },
        uGlow: { value: preset.sunGlow ? linear(preset.sunGlow[0]).multiplyScalar(preset.sunGlow[1]) : linear("#000000") },
        uCloudLit: { value: linear(preset.clouds?.lit ?? "#ffffff") },
        uCloudShade: { value: linear(preset.clouds?.shade ?? "#ffffff") },
        uCloudCover: { value: preset.clouds?.cover ?? 0 },
      },
    });
  }, [preset, sunDir]);

  // Key light: only its shadow map is used (the toon shader does its own two-tone lighting).
  const key = useMemo(() => {
    const l = new DirectionalLight(0xffffff, 1);
    const s = shadow.size;
    l.castShadow = true;
    l.shadow.mapSize.set(4096, 4096);
    Object.assign(l.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 400 });
    l.shadow.camera.updateProjectionMatrix();
    l.shadow.bias = -0.0004;
    l.shadow.normalBias = 0.04;
    l.target = new Object3D();
    l.target.position.copy(shadow.center);
    l.position.copy(shadow.center).addScaledVector(sunDir.clone().normalize(), 150);
    return l;
  }, [sunDir, shadow.center, shadow.size]);

  useLayoutEffect(() => {
    scene.fog = new Fog(linear(preset.fog), preset.fogNear, preset.fogFar);
    applyLight(preset, sunDir);
    sky.current?.layers.set(SKY);
    scene.add(key, key.target);
    return () => void scene.remove(key, key.target);
  }, [scene, preset, sunDir, key]);

  // Keep the dome centred on the lens so it never parallaxes.
  useFrame(() => sky.current?.position.copy(camera.position));

  return (
    <mesh ref={sky} material={mat} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[900, 48, 24]} />
    </mesh>
  );
};
