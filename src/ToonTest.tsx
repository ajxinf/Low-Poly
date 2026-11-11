import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useLayoutEffect } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { PerspectiveCamera, Vector3 } from "three";
import { Street as LibStreet, StreetOpts, spine, yaw } from "../kit/toon/build/street";
import { PRESETS } from "../kit/toon/build/presets";
import { LAMP_HEAD, barrel, crate, fence, lampPost } from "../kit/toon/build/props";
import { CamPose, applyCam, arc, drift, pushIn, shot } from "../kit/toon/camera";
import { Composer } from "../kit/toon/Composer";
import { Dust } from "../kit/toon/dust";
import { LIGHTS, sunDirection } from "../kit/toon/lights";
import { ToonWorld } from "../kit/toon/world";

// The dusk Victorian street from the building library: a cobbled street bending right to a square with a clock
// tower ~55 m from the lens. Other test shots (CharacterTest, CastLineup) stand characters in it.
const SP = spine(0.0032);
/** Point at arc position s, sideways offset x (m, + = right), height y. */
export const at = SP.at;

// Foreground framing for the opening lens (from the lens: f m ahead, x m to the side).
const c0 = at(0, -3.9, 0), fwd = at(52, 1.5).sub(c0).normalize(), side = new Vector3(-fwd.z, 0, fwd.x);
const fg = (f: number, x: number, y = 0) => c0.clone().addScaledVector(fwd, f).addScaledVector(side, x).setY(y);
const foreground = () => {
  const lamp = lampPost();
  lamp.position.copy(fg(4.4, -1.1));
  lamp.rotation.y = yaw(side) - Math.PI / 2;
  const items = [lamp, crate(0.8), crate(0.6), barrel(), fence(6)];
  items[1].position.copy(fg(4.3, 1.2));
  items[1].rotation.y = 0.35;
  items[2].position.copy(fg(4.4, 1.25, 0.8));
  items[2].rotation.y = 0.7;
  items[3].position.copy(fg(5.6, 1.85));
  items[4].position.copy(fg(3.6, -1.45));
  items[4].rotation.y = yaw(fwd) - Math.PI / 2;
  return items;
};
const FG_LAMP = (() => {
  const l = LAMP_HEAD.clone().applyAxisAngle(new Vector3(0, 1, 0), yaw(side) - Math.PI / 2);
  return l.add(fg(4.4, -1.1));
})();

export const STREET_OPTS: StreetOpts = {
  seed: 11,
  length: 50,
  curve: 0.0032,
  lamps: [[9, 1], [16, -1], [22, 1], [31, -1], [38, 1], [46, -1]],
  landmark: true,
  lightCenter: at(14, 0, 2),
  extra: foreground,
  extraLights: [{ pos: FG_LAMP, kind: "lamp" }],
};
/** The library street with this test's layout (props kept for older callers). */
export const Street: React.FC<{ bollards?: boolean }> = () => <LibStreet preset={PRESETS.victorian_town} light={LIGHTS.dusk} opts={STREET_OPTS} />;

// Lens: 1.2 m high on the left pavement, looking down the bend at the tower.
const BASE = { pos: at(0, -3.9, 1.2), look: at(52, 1.5, 9), fov: 60 };
export const SUN = sunDirection(LIGHTS.dusk, BASE.pos, BASE.look);
export const SHADOW = { center: at(26, 0), size: 42 };
export const DUST = { center: at(9, -0.5, 2.4), size: new Vector3(9, 4.5, 18) };

/**
 * 5 s move from the middle of the street: arc 18 deg around a subject point 12 m ahead (where a character would
 * stand) while pushing in 2.5 m and rising 0.6 m, with a slight roll. The arc turns the view itself, so the whole
 * frame drifts evenly (~3 px/f); translation alone barely moves a view that is mostly far away.
 * Lessons from earlier tries: from the pavement the arc carried the lens into a shop front, and a longer push passed
 * the foreground lamp and crates, sweeping them across the frame at 30-60 px/f.
 */
export const MOVE = shot({ pos: at(7, 0.6, 1.5), look: at(19, 0, 3.4), fov: 56 }, [arc(-18, 2), pushIn(2.5), drift(0, 0.6)], 150);

const Cam: React.FC<{ pose: (f: number) => CamPose }> = ({ pose }) => {
  const frame = useCurrentFrame();
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  useLayoutEffect(() => applyCam(camera, pose(frame)), [frame, camera, pose]);
  return null;
};

export const StreetScene: React.FC<{ pose: (f: number) => CamPose; children?: React.ReactNode; dof?: Parameters<typeof Composer>[0]["dof"] }> = ({ pose, children, dof }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill>
      <ThreeCanvas width={width} height={height}>
        <Cam pose={pose} />
        <ToonWorld preset={LIGHTS.dusk} sunDir={SUN} shadow={SHADOW} />
        <Street />
        <Dust center={DUST.center} size={DUST.size} />
        {children}
        <Composer dof={dof} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

export const ToonTest: React.FC = () => <StreetScene pose={MOVE} />;
