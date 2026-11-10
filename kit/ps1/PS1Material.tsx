import { useEffect, useMemo } from "react";
import {
  Color,
  ColorRepresentation,
  MeshLambertMaterial,
  ShaderChunk,
  Texture,
  Vector2,
} from "three";

export type PS1MaterialProps = {
  color?: ColorRepresentation;
  emissive?: ColorRepresentation;
  map?: Texture | null;
  /** Virtual screen the vertices snap to. */
  snapResolution?: [number, number];
  fogColor?: ColorRepresentation;
  fogNear?: number;
  fogFar?: number;
};

const VERT_PARS = /* glsl */ `#include <common>
uniform vec2 uSnapRes;
varying float vFogDist;
#ifdef USE_MAP
varying vec3 vAffineUv;
#endif`;

const VERT_MAIN = /* glsl */ `#include <project_vertex>
vFogDist = length(mvPosition.xyz);
if (gl_Position.w > 0.0) {
  vec2 grid = uSnapRes * 0.5;
  gl_Position.xy = floor(gl_Position.xy / gl_Position.w * grid + 0.5) / grid * gl_Position.w;
}
#ifdef USE_MAP
// Perspective-correct interpolation of (uv*w, w) then dividing gives screen-linear (affine) UVs.
vAffineUv = vec3(vMapUv * gl_Position.w, gl_Position.w);
#endif`;

const FRAG_PARS = /* glsl */ `#include <common>
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
varying float vFogDist;
#ifdef USE_MAP
varying vec3 vAffineUv;
#endif`;

const FRAG_FOG = /* glsl */ `gl_FragColor.rgb = mix(gl_FragColor.rgb, uFogColor, clamp((vFogDist - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0));
#include <tonemapping_fragment>`;

/** MeshLambertMaterial with PS1 vertex snapping, affine texture warp and distance fog. Use as a mesh child. */
export const PS1Material: React.FC<PS1MaterialProps> = ({
  color = "white",
  emissive = "black",
  map = null,
  snapResolution = [320, 240],
  fogColor = "black",
  fogNear = 5,
  fogFar = 30,
}) => {
  const uniforms = useMemo(
    () => ({
      uSnapRes: { value: new Vector2() },
      uFogColor: { value: new Color() },
      uFogNear: { value: 0 },
      uFogFar: { value: 1 },
    }),
    [],
  );

  const material = useMemo(() => {
    const m = new MeshLambertMaterial();
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", VERT_PARS)
        .replace("#include <project_vertex>", VERT_MAIN);
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", FRAG_PARS)
        .replace(
          "#include <map_fragment>",
          ShaderChunk.map_fragment.replace("vMapUv", "(vAffineUv.xy / vAffineUv.z)"),
        )
        .replace("#include <tonemapping_fragment>", FRAG_FOG);
    };
    return m;
  }, [uniforms]);

  useEffect(() => () => material.dispose(), [material]);

  uniforms.uSnapRes.value.set(snapResolution[0], snapResolution[1]);
  uniforms.uFogColor.value.set(fogColor);
  uniforms.uFogNear.value = fogNear;
  uniforms.uFogFar.value = fogFar;
  material.color.set(color);
  material.emissive.set(emissive);
  if (material.map !== map) {
    material.map = map;
    material.needsUpdate = true; // USE_MAP define changes, so recompile
  }

  return <primitive object={material} attach="material" />;
};
