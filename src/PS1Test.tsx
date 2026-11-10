import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { zColor } from "@remotion/zod-types";
import { useMemo } from "react";
import { AbsoluteFill, Easing, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { BoxGeometry, CylinderGeometry, RepeatWrapping, Texture } from "three";
import { z } from "zod";
import { PS1Material, PS1MaterialProps } from "../kit/ps1/PS1Material";
import { PS1PostFX } from "../kit/ps1/PS1PostFX";
import { usePS1Texture, usePS1Textures } from "../kit/ps1/usePS1Texture";
import { steppedFrame } from "../kit/time";
import {
  LABEL_KINDS,
  LABEL_VARIANTS,
  LabelKind,
  makeFloorTile,
  makeGrimyPanel,
  makeLabelTextures,
} from "./ps1test/textures";

export const ps1TestSchema = z.object({
  snapWidth: z.number().int().min(16).max(1920),
  snapHeight: z.number().int().min(16).max(1920),
  affine: z.boolean(),
  fogColor: zColor(),
  fogNear: z.number().min(0).max(40).step(0.5),
  fogFar: z.number().min(1).max(60).step(0.5),
  postFX: z.boolean(),
  ditherScale: z.number().int().min(1).max(8),
  ambient: z.number().min(0).max(3).step(0.05),
  lightIntensity: z.number().min(0).max(100).step(1),
  lightDistance: z.number().min(0).max(20).step(0.5),
  lightY: z.number().min(0.5).max(3.1).step(0.1),
});
type PS1TestProps = z.infer<typeof ps1TestSchema>;

export const ps1TestDefaults: PS1TestProps = {
  snapWidth: 240,
  snapHeight: 180,
  affine: true,
  fogColor: "#2a332e",
  fogNear: 4,
  fogFar: 16,
  postFX: true,
  ditherScale: 3,
  ambient: 0.15,
  lightIntensity: 12,
  lightDistance: 6,
  lightY: 1.9,
};

const AISLE_LENGTH = 32;
const AISLE_Z = 2 - AISLE_LENGTH / 2; // aisle runs from z=2 to z=-30
const ROOM_HEIGHT = 3.2;
const SHELF_X = 1.9;
const SHELF_HEIGHTS = [0.1, 0.8, 1.5];
// 6m apart so floor vertices (every 2m) alternate between under-a-light and between-lights.
const FIXTURE_Z = [2, -4, -10, -16, -22];

const GEO = {
  cereal: new BoxGeometry(0.15, 0.55, 0.38),
  can: new CylinderGeometry(0.1, 0.1, 0.26, 8),
  bottle: new CylinderGeometry(0.1, 0.1, 0.32, 8),
  neck: new CylinderGeometry(0.04, 0.07, 0.14, 6),
};
const HEIGHT: Record<LabelKind, number> = { cereal: 0.55, can: 0.26, bottle: 0.32 };
const SPACING: Record<LabelKind, number> = { cereal: 0.42, can: 0.24, bottle: 0.26 };

// Shelves stock runs of 3–6 identical items, like a real store. Stops where fog is solid anyway.
const products = [-1, 1].flatMap((side) =>
  SHELF_HEIGHTS.flatMap((shelfY, level) => {
    const items = [];
    let z = 1.5;
    for (let run = 0; z > -22; run++) {
      const seed = `${side}-${level}-${run}`;
      const k = Math.floor(random(`k${seed}`) * LABEL_KINDS.length);
      const kind = LABEL_KINDS[k];
      const tex = k * LABEL_VARIANTS + Math.floor(random(`v${seed}`) * LABEL_VARIANTS);
      const count = 3 + Math.floor(random(`n${seed}`) * 4);
      for (let i = 0; i < count && z > -22; i++) {
        items.push({ key: `${seed}-${i}`, kind, tex, side, y: shelfY + 0.025, z });
        z -= SPACING[kind];
      }
      z -= 0.08;
    }
    return items;
  }),
);

const tiled = (t: Texture, x: number, y: number) => {
  const c = t.clone();
  c.wrapS = c.wrapT = RepeatWrapping;
  c.repeat.set(x, y);
  c.needsUpdate = true;
  return c;
};

const Aisle: React.FC<PS1TestProps> = (p) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const camera = useThree((s) => s.camera);

  const urls = useMemo(() => ({ labels: makeLabelTextures(), floor: makeFloorTile(), panel: makeGrimyPanel() }), []);
  const labels = usePS1Textures(urls.labels);
  const floorTex = usePS1Texture(urls.floor);
  const panelTex = usePS1Texture(urls.panel);
  const tex = useMemo(
    () => ({
      floor: tiled(floorTex, 6, AISLE_LENGTH), // 1m tiles
      ceiling: tiled(panelTex, 3, AISLE_LENGTH / 2), // 2m panels
      sideWall: tiled(panelTex, AISLE_LENGTH / 2, ROOM_HEIGHT / 2),
      farWall: tiled(panelTex, 3, ROOM_HEIGHT / 2),
    }),
    [floorTex, panelTex],
  );

  const fx: PS1MaterialProps = {
    snapResolution: [p.snapWidth, p.snapHeight],
    fogColor: p.fogColor,
    fogNear: p.fogNear,
    fogFar: p.fogFar,
    affine: p.affine,
  };

  // Smooth 30fps camera push down the aisle.
  camera.position.set(0, 1.6, interpolate(frame, [0, durationInFrames], [3, -7], { easing: Easing.inOut(Easing.quad) }));
  const spin = steppedFrame(frame) * 0.06;

  return (
    <>
      <color attach="background" args={[p.fogColor]} />
      <ambientLight intensity={p.ambient} />

      {/* Large quads (one per 2×2 tiles) so affine warp and Gouraud lighting show, like real PS1 geometry. */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, AISLE_Z]}>
        <planeGeometry args={[6, AISLE_LENGTH, 3, AISLE_LENGTH / 2]} />
        <PS1Material {...fx} map={tex.floor} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, ROOM_HEIGHT, AISLE_Z]}>
        <planeGeometry args={[6, AISLE_LENGTH, 3, AISLE_LENGTH / 2]} />
        <PS1Material {...fx} map={tex.ceiling} />
      </mesh>
      <mesh position={[0, ROOM_HEIGHT / 2, 2 - AISLE_LENGTH]}>
        <planeGeometry args={[6, ROOM_HEIGHT, 3, 2]} />
        <PS1Material {...fx} map={tex.farWall} />
      </mesh>

      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh rotation-y={(-side * Math.PI) / 2} position={[side * 2.45, ROOM_HEIGHT / 2, AISLE_Z]}>
            <planeGeometry args={[AISLE_LENGTH, ROOM_HEIGHT, AISLE_LENGTH / 2, 2]} />
            <PS1Material {...fx} map={tex.sideWall} />
          </mesh>
          <mesh position={[side * (SHELF_X + 0.45), 1.2, AISLE_Z]}>
            <boxGeometry args={[0.1, 2.4, AISLE_LENGTH, 1, 2, AISLE_LENGTH / 2]} />
            <PS1Material {...fx} color="#6b7068" />
          </mesh>
          {SHELF_HEIGHTS.map((y) => (
            <mesh key={y} position={[side * (SHELF_X + 0.1), y, AISLE_Z]}>
              <boxGeometry args={[0.8, 0.05, AISLE_LENGTH, 1, 1, AISLE_LENGTH / 2]} />
              <PS1Material {...fx} color="#9aa098" />
            </mesh>
          ))}
        </group>
      ))}

      {products.map((it) => (
        <group key={it.key} position={[it.side * 1.85, it.y, it.z]} rotation-y={(it.side * Math.PI) / 2}>
          <mesh geometry={GEO[it.kind]} position-y={HEIGHT[it.kind] / 2}>
            <PS1Material {...fx} map={labels[it.tex]} />
          </mesh>
          {it.kind === "bottle" && (
            <mesh geometry={GEO.neck} position-y={HEIGHT.bottle + 0.07}>
              <PS1Material {...fx} color="#d8d8d8" />
            </mesh>
          )}
        </group>
      ))}

      {FIXTURE_Z.map((z) => (
        <group key={z} position={[0, ROOM_HEIGHT - 0.05, z]}>
          <mesh>
            <boxGeometry args={[0.35, 0.08, 2.2]} />
            <PS1Material {...fx} color="black" emissive="#e4f2e0" />
          </mesh>
          {/* Hung below the fixture: from ceiling height, decay-2 falloff is too flat to give bright/dark pools. */}
          <pointLight position-y={p.lightY - (ROOM_HEIGHT - 0.05)} intensity={p.lightIntensity} distance={p.lightDistance} decay={2} color="#e4f2e0" />
        </group>
      ))}

      <mesh position={[0, 2.3, -6]} rotation={[0.3, spin, 0]}>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <PS1Material {...fx} color="#e63946" />
      </mesh>

      <PS1PostFX enabled={p.postFX} ditherScale={p.ditherScale} />
    </>
  );
};

export const PS1Test: React.FC<PS1TestProps> = (props) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill>
      <ThreeCanvas flat width={width} height={height} camera={{ fov: 60, near: 0.1, far: 40 }}>
        <Aisle {...props} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
