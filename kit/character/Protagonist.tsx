import { ThreeElements } from "@react-three/fiber";
import { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import { BufferGeometry, Texture } from "three";
import { PS1Material, PS1MaterialProps } from "../ps1/PS1Material";
import { paintTexture } from "../ps1/paintTexture";
import { usePS1Textures } from "../ps1/usePS1Texture";
import { DEFAULT_OUTFIT, Outfit } from "./outfits";
import { PoseName, samplePose } from "./poses";
import {
  DESIGN_HEIGHT, FOREARM, GEO, HAND_GRIP, HIP, NECK, PELVIS_Y, SHIN, SHOULDER, SPINE_Y, THIGH, TORSO, UPPER_ARM,
} from "./rig";
import { DEFAULT_FACE, FaceColors, paintFace, paintHair, paintSkin } from "./textures";

export type ProtagonistProps = Omit<ThreeElements["group"], "scale"> & {
  pose?: PoseName;
  face?: FaceColors;
  /** Metres, hair included. Scales the whole rig. */
  height?: number;
  outfit?: Outfit;
  /** Anything held in the right hand (e.g. <BrickPhone />), placed at the palm. */
  rightHand?: React.ReactNode;
  /** Scene overrides for the PS1 material (fog, snap…). */
  fx?: PS1MaterialProps;
};

const Part: React.FC<{ g: BufferGeometry; map: Texture; fx?: PS1MaterialProps }> = ({ g, map, fx }) => (
  <mesh geometry={g}>
    <PS1Material {...fx} map={map} />
  </mesh>
);

/** The channel's recurring guy: rigid segmented PS1 rig, posed from poses.ts at 15fps. */
export const Protagonist: React.FC<ProtagonistProps> = ({
  pose = "idle",
  face = DEFAULT_FACE,
  height = DESIGN_HEIGHT,
  outfit = DEFAULT_OUTFIT,
  rightHand,
  fx,
  ...group
}) => {
  const frame = useCurrentFrame();
  const { skin, brow, eye, mouth } = face;
  const faceUrls = useMemo(
    () => [paintFace({ skin, brow, eye, mouth }), paintSkin(skin), paintHair()],
    [skin, brow, eye, mouth],
  );
  const outfitUrls = useMemo(() => [outfit.torso, outfit.sleeves, outfit.legs, outfit.boots].map((p) => paintTexture(p)), [outfit]);
  const [faceTex, skinTex, hairTex, torsoTex, sleeveTex, legTex, bootTex] = usePS1Textures([...faceUrls, ...outfitUrls]);

  const { y, rot } = samplePose(pose, frame);
  const P = (g: BufferGeometry, map: Texture) => <Part g={g} map={map} fx={fx} />;

  const arm = (side: "L" | "R") => (
    <group key={side} position={[(side === "L" ? 1 : -1) * SHOULDER.x, SHOULDER.y, 0]} rotation={rot(`shoulder${side}`)}>
      {P(GEO.upperArm, sleeveTex)}
      <group position-y={-UPPER_ARM} rotation={rot(`elbow${side}`)}>
        {P(GEO.forearm, sleeveTex)}
        <group position-y={-FOREARM}>
          {P(GEO.hand, skinTex)}
          {side === "R" && <group position={HAND_GRIP}>{rightHand}</group>}
        </group>
      </group>
    </group>
  );

  const leg = (side: "L" | "R") => (
    <group key={side} position={[(side === "L" ? 1 : -1) * HIP.x, HIP.y, 0]} rotation={rot(`hip${side}`)}>
      {P(GEO.thigh, legTex)}
      <group position-y={-THIGH} rotation={rot(`knee${side}`)}>
        {P(GEO.shin, legTex)}
        <group position-y={-SHIN} rotation={rot(`ankle${side}`)}>
          {P(GEO.foot, bootTex)}
        </group>
      </group>
    </group>
  );

  return (
    <group {...group} scale={height / DESIGN_HEIGHT}>
      <group position-y={PELVIS_Y + y} rotation={rot("root")}>
        {P(GEO.pelvis, legTex)}
        {leg("L")}
        {leg("R")}
        <group position-y={SPINE_Y} rotation={rot("spine")}>
          {P(GEO.torso, torsoTex)}
          {arm("L")}
          {arm("R")}
          <group position-y={TORSO} rotation={rot("neck")}>
            {P(GEO.neck, skinTex)}
            <group position-y={NECK}>
              {P(GEO.head, faceTex)}
              {P(GEO.hair, hairTex)}
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};
