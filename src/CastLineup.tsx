import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useLayoutEffect } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { PerspectiveCamera, Vector3 } from "three";
import { Character, blinkAt, posed } from "../kit/toon/cast";
import { Composer, Dof } from "../kit/toon/Composer";
import { Dust } from "../kit/toon/dust";
import { EXTRAS } from "../kit/toon/extras";
import { Look } from "../kit/toon/figure";
import { LIGHTS } from "../kit/toon/lights";
import { PoseName } from "../kit/toon/poses";
import { Expr, youLook } from "../kit/toon/protagonist";
import { ToonWorld } from "../kit/toon/world";
import { DUST, SHADOW, SUN, Street, at } from "./ToonTest";

// Review shots in the dusk street near the s 22 lamp: a 9:16 medium-wide of four characters (the left one stands in
// the street shadow) and a 9:16 close-up of the protagonist.
const S = 22;
const CAST: { look: Look; x: number; ds: number; expr: Expr; pose: PoseName }[] = [
  { look: EXTRAS[0].look, x: -1.3, ds: 0.35, expr: "smug", pose: "crossed" },
  { look: EXTRAS[3].look, x: -0.64, ds: -0.1, expr: "laughing", pose: "panic" },
  { look: youLook, x: 0.05, ds: 0, expr: "determined", pose: "hips" },
  { look: EXTRAS[4].look, x: 0.75, ds: 0.3, expr: "worried", pose: "chin" },
];

const Cam: React.FC<{ pos: Vector3; look: Vector3; fov: number }> = ({ pos, look, fov }) => {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  useLayoutEffect(() => {
    camera.position.copy(pos);
    camera.fov = fov;
    camera.near = 0.05;
    camera.far = 1200;
    camera.updateProjectionMatrix();
    camera.lookAt(look);
  }, [camera, pos, look, fov]);
  return null;
};

const Scene: React.FC<{ cam: { pos: Vector3; look: Vector3; fov: number }; dof?: Dof; cast: typeof CAST }> = ({ cam, dof, cast }) => {
  const f = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <ThreeCanvas width={width} height={height}>
        <Cam {...cam} />
        <ToonWorld preset={LIGHTS.dusk} sunDir={SUN} shadow={SHADOW} />
        <Street bollards={false} />
        <Dust center={DUST.center} size={DUST.size} />
        {cast.map((c, i) => (
          <Character key={i} position={at(S + c.ds, c.x)} look={c.look} state={{ pose: posed(c.pose, f / fps + i), expr: c.expr, blink: blinkAt(f, fps, i + 5), fx: {} }} />
        ))}
        <Composer dof={dof} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

const WIDE = { pos: at(S - 5.3, -0.25, 1.1), look: at(S, -0.25, 1.15), fov: 44 };
export const CastLineup: React.FC = () => <Scene cam={WIDE} cast={CAST} />;

const CU = { pos: at(S - 2.2, 0.25, 1.32), look: at(S, 0.05, 1.36), fov: 36 };
export const CloseUp: React.FC = () => <Scene cam={CU} cast={[CAST[2]]} dof={{ maxPx: 13, near: 2.8, far: 6.5 }} />;
