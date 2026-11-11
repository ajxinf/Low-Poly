import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useLayoutEffect } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { PerspectiveCamera } from "three";
import { Character, blinkAt, posed } from "../kit/toon/cast";
import { Composer } from "../kit/toon/Composer";
import { EXTRAS } from "../kit/toon/extras";
import { Look } from "../kit/toon/figure";
import { LIGHTS } from "../kit/toon/lights";
import { Expr } from "../kit/toon/protagonist";
import { youLook } from "../kit/toon/protagonist";
import { PoseName } from "../kit/toon/poses";
import { ToonWorld } from "../kit/toon/world";
import { DUST, SHADOW, SUN, Street, at } from "./ToonTest";
import { Dust } from "../kit/toon/dust";

// Landscape review shot: the protagonist and the six extras side by side in the dusk street, near the s 22 lamp.
const S = 22;
const CAST: { look: Look; x: number; expr: Expr; pose: PoseName }[] = [
  { look: EXTRAS[0].look, x: -2.75, expr: "smug", pose: "crossed" },
  { look: EXTRAS[2].look, x: -1.85, expr: "tired", pose: "idle" },
  { look: EXTRAS[3].look, x: -1.05, expr: "laughing", pose: "panic" },
  { look: youLook, x: -0.15, expr: "neutral", pose: "hips" },
  { look: EXTRAS[1].look, x: 0.75, expr: "angry", pose: "hips" },
  { look: EXTRAS[4].look, x: 1.65, expr: "worried", pose: "chin" },
  { look: EXTRAS[5].look, x: 2.55, expr: "deadpan", pose: "hold" },
];

const Cam: React.FC = () => {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  useLayoutEffect(() => {
    camera.position.copy(at(S - 5.6, 0.1, 1.0));
    camera.fov = 34;
    camera.near = 0.05;
    camera.far = 1200;
    camera.updateProjectionMatrix();
    camera.lookAt(at(S, 0.1, 0.92));
  }, [camera]);
  return null;
};

export const CastLineup: React.FC = () => {
  const f = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <ThreeCanvas width={width} height={height}>
        <Cam />
        <ToonWorld preset={LIGHTS.dusk} sunDir={SUN} shadow={SHADOW} />
        <Street bollards={false} />
        <Dust center={DUST.center} size={DUST.size} />
        {CAST.map((c, i) => (
          <Character key={i} position={at(S + (i % 2) * 0.25, c.x)} look={c.look} state={{ pose: posed(c.pose, f / fps + i), expr: c.expr, blink: blinkAt(f, fps, i + 5), fx: {}, prop: c.pose === "hold" ? "can" : undefined }} />
        ))}
        <Composer />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
