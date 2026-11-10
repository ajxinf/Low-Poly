import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useMemo } from "react";
import { AbsoluteFill, Easing, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { RepeatWrapping } from "three";
import { PS1Material, PS1MaterialProps } from "../kit/ps1/PS1Material";
import { PS1PostFX } from "../kit/ps1/PS1PostFX";
import { usePS1Texture } from "../kit/ps1/usePS1Texture";
import { steppedFrame } from "../kit/time";

const FOG = "#2a332e";
// Portrait output, so the 320×240 grid is turned on its side to keep snap cells square.
const PS1: PS1MaterialProps = { fogColor: FOG, fogNear: 3, fogFar: 20, snapResolution: [240, 320] };
const AISLE_LENGTH = 32;
const SHELF_X = 1.9;
const SHELF_HEIGHTS = [0.1, 0.8, 1.5];
const PALETTE = ["#c0392b", "#e6b422", "#2e86c1", "#d35400", "#f4f1de", "#27ae60"];

const makeChecker = () => {
  const c = document.createElement("canvas");
  c.width = c.height = 8;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#d8d8cc";
  ctx.fillRect(0, 0, 8, 8);
  ctx.fillStyle = "#4a524c";
  ctx.fillRect(0, 0, 4, 4);
  ctx.fillRect(4, 4, 4, 4);
  return c.toDataURL();
};

const products = [-1, 1].flatMap((side) =>
  SHELF_HEIGHTS.flatMap((y, level) =>
    Array.from({ length: 44 }, (_, i) => {
      const seed = `${side}-${level}-${i}`;
      const w = 0.4 + random(`w${seed}`) * 0.2;
      const h = 0.3 + random(`h${seed}`) * 0.3;
      return {
        key: seed,
        position: [side * (SHELF_X + 0.1), y + 0.05 + h / 2, 1 - i * 0.7] as const,
        size: [0.5, h, w] as const,
        color: PALETTE[Math.floor(random(`c${seed}`) * PALETTE.length)],
      };
    }),
  ),
);

const Aisle: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const camera = useThree((s) => s.camera);
  const checkerUrl = useMemo(makeChecker, []);
  const checker = usePS1Texture(checkerUrl);
  checker.wrapS = checker.wrapT = RepeatWrapping;
  checker.repeat.set(3, AISLE_LENGTH / 2);

  // Smooth 30fps camera push down the aisle.
  camera.position.set(0, 1.6, interpolate(frame, [0, durationInFrames], [3, -7], { easing: Easing.inOut(Easing.quad) }));
  const spin = steppedFrame(frame) * 0.06;

  return (
    <>
      <color attach="background" args={[FOG]} />
      <ambientLight intensity={0.8} />

      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 2 - AISLE_LENGTH / 2]}>
        {/* Subdivided so affine warping stays PS1-subtle instead of tearing across one huge quad. */}
        <planeGeometry args={[6, AISLE_LENGTH, 6, AISLE_LENGTH]} />
        <PS1Material {...PS1} map={checker} />
      </mesh>

      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * (SHELF_X + 0.45), 1.2, 2 - AISLE_LENGTH / 2]}>
            <boxGeometry args={[0.1, 2.4, AISLE_LENGTH]} />
            <PS1Material {...PS1} color="#6b7068" />
          </mesh>
          {SHELF_HEIGHTS.map((y) => (
            <mesh key={y} position={[side * (SHELF_X + 0.1), y, 2 - AISLE_LENGTH / 2]}>
              <boxGeometry args={[0.8, 0.05, AISLE_LENGTH]} />
              <PS1Material {...PS1} color="#9aa098" />
            </mesh>
          ))}
        </group>
      ))}

      {products.map((p) => (
        <mesh key={p.key} position={p.position}>
          <boxGeometry args={p.size} />
          <PS1Material {...PS1} color={p.color} />
        </mesh>
      ))}

      {Array.from({ length: 8 }, (_, i) => (
        <group key={i} position={[0, 3, 1 - i * 4]}>
          <mesh>
            <boxGeometry args={[0.35, 0.08, 2.2]} />
            <PS1Material {...PS1} color="black" emissive="#e4f2e0" />
          </mesh>
          {i % 2 === 0 && <pointLight position={[0, -0.2, 0]} intensity={6} distance={10} color="#e4f2e0" />}
        </group>
      ))}

      <mesh position={[0, 2.3, -6]} rotation={[0.3, spin, 0]}>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <PS1Material {...PS1} color="#e63946" />
      </mesh>

      <PS1PostFX />
    </>
  );
};

export const PS1Test: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill>
      <ThreeCanvas flat width={width} height={height} camera={{ fov: 60, near: 0.1, far: 40 }}>
        <Aisle />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
