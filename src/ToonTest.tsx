import { useThree, useLoader } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useLayoutEffect, useMemo } from "react";
import { AbsoluteFill, Easing, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Mesh, MeshStandardMaterial, Object3D, PerspectiveCamera, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { InkRenderer } from "../kit/toon/ink";
import { LIGHTS, sunDirection } from "../kit/toon/lights";
import { toonMaterial } from "../kit/toon/shade";
import { ToonWorld } from "../kit/toon/world";

const S = 8; // Kenney tile = 1 unit -> 8 m (tiles scaled x1.001 so they overlap and leave no cracks)
const kenney = (n: string) => staticFile(`kenney/city/${n}.glb`);
const NAMES = ["building-small-a", "building-small-b", "building-small-c", "building-small-d", "building-garage", "road-straight", "pavement"] as const;
type Name = (typeof NAMES)[number];

// shortcut: the bright Kenney atlas is muted and darkened here; paint.ts (Phase 0 step 3) replaces this.
const TINT: Record<Name, { color: string; mute: number; floor?: number }> = {
  "building-small-a": { color: "#d9c6ab", mute: 0.92 },
  "building-small-b": { color: "#cdb59a", mute: 0.92 },
  "building-small-c": { color: "#d6c9b8", mute: 0.92 },
  "building-small-d": { color: "#c9a98e", mute: 0.92 },
  "building-garage": { color: "#bdb3a6", mute: 0.92 },
  "road-straight": { color: "#b4b0aa", mute: 0.5, floor: 0.1 },
  pavement: { color: "#cdbfac", mute: 0.5, floor: 0.08 },
};

const useKit = () => {
  const gltfs = useLoader(GLTFLoader, NAMES.map(kenney));
  return useMemo(() => {
    const kit = {} as Record<Name, Object3D>;
    NAMES.forEach((n, i) => {
      const root = gltfs[i].scene;
      const mat = new Map<unknown, ReturnType<typeof toonMaterial>>();
      root.traverse((o) => {
        if (!(o instanceof Mesh)) return;
        const src = o.material as MeshStandardMaterial;
        if (!mat.has(src)) mat.set(src, toonMaterial({ map: src.map, ...TINT[n] }));
        o.material = mat.get(src)!;
      });
      kit[n] = root;
    });
    return kit;
  }, [gltfs]);
};

type Placed = { n: Name; x: number; z: number; ry: number };
const buildingNames: Name[] = ["building-small-a", "building-small-c", "building-small-b", "building-small-d", "building-garage"];

const LAYOUT: Placed[] = (() => {
  const out: Placed[] = [];
  for (let i = 0; i < 40; i++) {
    const z = 4 - i * S;
    // Road runs past fog far (300 m) so its end never draws a line at the horizon.
    out.push({ n: "road-straight", x: 0, z, ry: 0 });
    out.push({ n: "pavement", x: -S, z, ry: 0 }, { n: "pavement", x: S, z, ry: 0 });
    out.push({ n: buildingNames[i % 5], x: -2 * S, z, ry: Math.PI / 2 });
    out.push({ n: buildingNames[(i + 2) % 5], x: 2 * S, z, ry: -Math.PI / 2 });
  }
  return out;
})();

const Street: React.FC = () => {
  const kit = useKit();
  return (
    <>
      {LAYOUT.map((p, i) => (
        <primitive key={i} object={kit[p.n].clone()} position={[p.x, 0, p.z]} rotation={[0, p.ry, 0]} scale={[S * 1.001, p.n.startsWith("building") ? S : 2, S * 1.001]} />
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, -150]} material={useMemo(() => toonMaterial({ color: "#8f8a74" }), [])}>
        <planeGeometry args={[800, 800]} />
      </mesh>
    </>
  );
};

// Shot: slow push-in down the street at eye height.
const CAM0 = new Vector3(-1.2, 1.7, 6);
const LOOK = new Vector3(0.5, 3.2, -40);
const SUN = sunDirection(LIGHTS.day, CAM0, LOOK);

const Camera: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  useLayoutEffect(() => {
    const t = interpolate(frame, [0, durationInFrames - 1], [0, 1], { easing: Easing.inOut(Easing.sin) });
    camera.position.set(CAM0.x, CAM0.y, CAM0.z - 4 * t);
    camera.fov = 58;
    camera.near = 0.1;
    camera.far = 1000;
    camera.updateProjectionMatrix();
    camera.lookAt(LOOK);
  }, [frame, camera, durationInFrames]);
  return null;
};

export const ToonTest: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill>
      <ThreeCanvas width={width} height={height}>
        <Camera />
        <ToonWorld preset={LIGHTS.day} sunDir={SUN} />
        <Street />
        <InkRenderer />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

