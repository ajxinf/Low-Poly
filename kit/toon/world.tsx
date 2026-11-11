import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { BackSide, Fog, Mesh, ShaderMaterial, Vector3 } from "three";
import { SKY } from "./ink";
import { LightPreset, linear } from "./lights";
import { applyLight } from "./shade";

const skyFrag = /* glsl */ `
uniform vec3 uTop, uHorizon, uSun, uSunDisc;
uniform float uHasSun;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  vec3 c = mix(uHorizon, uTop, pow(clamp(d.y / 0.7, 0.0, 1.0), 0.55));
  if (uHasSun > 0.5) c = mix(c, uSunDisc * 4.0, smoothstep(0.99965, 0.99975, dot(d, uSun)));
  gl_FragColor = vec4(c, 1.0);
}`;

const skyVert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

/** Sky dome, distance fog (= horizon colour) and the toon light preset for one shot. */
export const ToonWorld: React.FC<{ preset: LightPreset; sunDir: Vector3 }> = ({ preset, sunDir }) => {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const sky = useRef<Mesh>(null);

  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        side: BackSide,
        depthWrite: false,
        uniforms: {
          uTop: { value: linear(preset.skyTop) },
          uHorizon: { value: linear(preset.skyHorizon) },
          uSun: { value: sunDir.clone().normalize() },
          uSunDisc: { value: linear(preset.sunDisc ?? "#ffffff") },
          uHasSun: { value: preset.sunDisc ? 1 : 0 },
        },
      }),
    [preset, sunDir],
  );

  useLayoutEffect(() => {
    scene.fog = new Fog(linear(preset.fog), preset.fogNear, preset.fogFar);
    applyLight(preset, sunDir);
    sky.current?.layers.set(SKY);
  }, [scene, preset, sunDir]);

  // Keep the dome centred on the lens so it never parallaxes.
  useFrame(() => sky.current?.position.copy(camera.position));

  return (
    <mesh ref={sky} material={mat} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[900, 32, 16]} />
    </mesh>
  );
};
