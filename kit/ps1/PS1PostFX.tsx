import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import {
  HalfFloatType,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
} from "three";
import { HOUSE_LOOK } from "./houseLook";

const FRAG = /* glsl */ `
uniform sampler2D tScene;
uniform float uDitherScale;
varying vec2 vUv;
const float BAYER[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
vec3 toSRGB(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
void main() {
  vec3 c = toSRGB(clamp(texture2D(tScene, vUv).rgb, 0.0, 1.0));
  ivec2 p = ivec2(mod(floor(gl_FragCoord.xy / uDitherScale), 4.0));
  float t = (BAYER[p.y * 4 + p.x] + 0.5) / 16.0;
  c += (t - 0.5) / 31.0; // dither by up to half a 5-bit step
  gl_FragColor = vec4(floor(c * 31.0 + 0.5) / 31.0, 1.0); // then quantize to 5 bits per channel
}`;

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

/**
 * Full-screen 4×4 Bayer dither + 15-bit color, at full output resolution.
 * ditherScale = screen pixels per Bayer cell (3 → each cell covers 3×3 pixels).
 * Render targets skip tone mapping, so use <ThreeCanvas flat> to look the same with enabled={false}.
 */
export const PS1PostFX: React.FC<{ enabled?: boolean; ditherScale?: number }> = ({
  enabled = HOUSE_LOOK.postFX,
  ditherScale = HOUSE_LOOK.ditherScale,
}) => {
  const { gl, scene, camera } = useThree();

  const { target, quad, quadCamera } = useMemo(() => {
    const target = new WebGLRenderTarget(1, 1, { type: HalfFloatType });
    const quad = new Mesh(
      new PlaneGeometry(2, 2),
      new ShaderMaterial({
        uniforms: { tScene: { value: target.texture }, uDitherScale: { value: 3 } },
        vertexShader: VERT,
        fragmentShader: FRAG,
        depthTest: false,
        depthWrite: false,
      }),
    );
    return { target, quad, quadCamera: new OrthographicCamera(-1, 1, 1, -1, 0, 1) };
  }, []);

  useEffect(
    () => () => {
      target.dispose();
      quad.geometry.dispose();
      quad.material.dispose();
    },
    [target, quad],
  );

  // Priority 1 makes R3F hand rendering to us; ThreeCanvas calls this once per Remotion frame.
  useFrame(() => {
    gl.setRenderTarget(null);
    if (!enabled) {
      gl.render(scene, camera);
      return;
    }
    const size = gl.getDrawingBufferSize(new Vector2());
    target.setSize(size.x, size.y);
    quad.material.uniforms.uDitherScale.value = ditherScale;
    gl.setRenderTarget(target);
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    gl.render(quad, quadCamera);
  }, 1);

  return null;
};
