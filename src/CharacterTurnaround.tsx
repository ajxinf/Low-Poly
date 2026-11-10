import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Protagonist } from "../kit/character/Protagonist";
import { HEAD_CENTER_Y, TRI_COUNT } from "../kit/character/rig";
import { PS1PostFX } from "../kit/ps1/PS1PostFX";
import { AisleSet, ps1TestDefaults } from "./PS1Test";

// One shot per 30 frames. The character turns (not the camera) so the aisle never clips the shot.
export const TURNAROUND_SHOTS = [
  { name: "front", turn: 0, cam: [0, 1.0, 2.7], look: 0.95 },
  { name: "threeQuarter", turn: -Math.PI / 4, cam: [0, 1.0, 2.7], look: 0.95 },
  { name: "side", turn: -Math.PI / 2, cam: [0, 1.0, 2.7], look: 0.95 },
  { name: "face", turn: -0.25, cam: [0, HEAD_CENTER_Y, 0.6], look: HEAD_CENTER_Y - 0.03 },
] as const;
const SPOT_Z = -5.6; // same spot as CharacterTest: lit from the fixture in front

const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const camera = useThree((s) => s.camera);
  const shot = TURNAROUND_SHOTS[Math.min(Math.floor(frame / 30), TURNAROUND_SHOTS.length - 1)];
  const [cx, cy, cz] = shot.cam;
  camera.position.set(cx, cy, SPOT_Z + cz);
  camera.lookAt(0, shot.look, SPOT_Z);
  return (
    <>
      <AisleSet {...ps1TestDefaults} heroBox={false} />
      <Protagonist position-z={SPOT_Z} rotation-y={shot.turn} pose="idle" />
      <PS1PostFX />
    </>
  );
};

/** Model sheet: front, 3/4, side, face close-up (30 frames each) for checking the protagonist. */
export const CharacterTurnaround: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill>
      <ThreeCanvas flat width={width} height={height} camera={{ fov: 60, near: 0.05, far: 40 }}>
        <Scene />
      </ThreeCanvas>
      <div style={{ position: "absolute", left: 24, bottom: 24, color: "#9f9", font: "28px monospace" }}>{TRI_COUNT} tris</div>
    </AbsoluteFill>
  );
};
