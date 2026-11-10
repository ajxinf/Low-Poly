import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { zColor } from "@remotion/zod-types";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { OUTFITS, OutfitName } from "../kit/character/outfits";
import { POSE_NAMES } from "../kit/character/poses";
import { Protagonist } from "../kit/character/Protagonist";
import { DESIGN_HEIGHT, HEAD_CENTER_Y } from "../kit/character/rig";
import { DEFAULT_FACE } from "../kit/character/textures";
import { PS1PostFX } from "../kit/ps1/PS1PostFX";
import { BrickPhone } from "../kit/props/BrickPhone";
import { AisleSet, ps1TestDefaults } from "./PS1Test";

export const characterTestSchema = z.object({
  skinColor: zColor(),
  browColor: zColor(),
  eyeColor: zColor(),
  mouthColor: zColor(),
  height: z.number().min(1.4).max(2.1).step(0.01),
  outfit: z.enum(Object.keys(OUTFITS) as [OutfitName, ...OutfitName[]]),
});
type CharacterTestProps = z.infer<typeof characterTestSchema>;

export const characterTestDefaults: CharacterTestProps = {
  skinColor: DEFAULT_FACE.skin,
  browColor: DEFAULT_FACE.brow,
  eyeColor: DEFAULT_FACE.eye,
  mouthColor: DEFAULT_FACE.mouth,
  height: DESIGN_HEIGHT,
  outfit: "default",
};

// phoneToEar last, so the face close-up lands on it.
const ORDER = [...POSE_NAMES.filter((p) => p !== "phoneToEar"), "phoneToEar" as const];
const POSE_FRAMES = 30;
const SPOT_Z = -5.6; // behind the fixture at z=-4, so the light falls on his face without blowing it out
const ORBIT_END = 240;

const Scene: React.FC<CharacterTestProps> = (p) => {
  const frame = useCurrentFrame();
  const camera = useThree((s) => s.camera);
  const pose = ORDER[Math.min(Math.floor(frame / POSE_FRAMES), ORDER.length - 1)];

  // Slow elliptical orbit (the aisle is only ~3 m wide), then push in on the face.
  const angle = interpolate(frame, [0, ORBIT_END], [0, Math.PI * 2], {
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.sin),
  });
  const push = interpolate(frame, [ORBIT_END, ORBIT_END + 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const headY = (HEAD_CENTER_Y * p.height) / DESIGN_HEIGHT;
  const mix = (a: number, b: number) => a + (b - a) * push;
  camera.position.set(
    mix(Math.sin(angle) * 1.3, 0.1),
    mix(1.3, headY - 0.05),
    SPOT_Z + mix(Math.cos(angle) * 2.8, 0.85),
  );
  camera.lookAt(0, mix(1.0, headY - 0.1), SPOT_Z);

  return (
    <>
      <AisleSet {...ps1TestDefaults} heroBox={false} />
      <Protagonist
        position-z={SPOT_Z}
        pose={pose}
        height={p.height}
        outfit={OUTFITS[p.outfit]}
        face={{ skin: p.skinColor, brow: p.browColor, eye: p.eyeColor, mouth: p.mouthColor }}
        rightHand={pose === "phoneToEar" ? <BrickPhone rotation-z={Math.PI} /> : null}
      />
      <PS1PostFX />
    </>
  );
};

export const CharacterTest: React.FC<CharacterTestProps> = (props) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill>
      <ThreeCanvas flat width={width} height={height} camera={{ fov: 60, near: 0.05, far: 40 }}>
        <Scene {...props} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
