import { ThreeCanvas } from "@remotion/three";
import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Vector3 } from "three";
import { CaptionWord, Captions } from "../kit/toon/Captions";
import { PRESETS } from "../kit/toon/build/presets";
import { Street } from "../kit/toon/build/street";
import { CamPose, drift, pushIn, shot } from "../kit/toon/camera";
import { Character, blinkAt, posed } from "../kit/toon/cast";
import { Composer, DOF, Dof } from "../kit/toon/Composer";
import { ShotCamera } from "../kit/toon/guard";
import { LIGHTS, sunDirection } from "../kit/toon/lights";
import { ToonWorld } from "../kit/toon/world";

// Supermarket review shots (pilot location): lit wide, a medium with the protagonist in an aisle, and the
// abandoned night variant. Interior coordinates: at(s, x, y) = (x, y, -s), s from the front wall inwards.
const at = (s: number, x: number, y = 0) => new Vector3(x, y, -s);
const OPTS = { seed: 7 };

const Scene: React.FC<{ id: string; night?: boolean; pose: (f: number) => CamPose; frames: number; dof?: Dof; sunDir?: Vector3; children?: React.ReactNode }> = ({ id, night, pose, frames, dof, sunDir, children }) => {
  const { width, height } = useVideoConfig();
  const preset = night ? PRESETS.supermarket_abandoned : PRESETS.supermarket_interior;
  const light = LIGHTS[preset.light];
  const p0 = pose(0);
  const sun = useMemo(() => sunDir ?? sunDirection(light, p0.pos, p0.look), [sunDir, light, p0.pos, p0.look]);
  return (
    <AbsoluteFill>
      <ThreeCanvas width={width} height={height}>
        <ShotCamera id={id} pose={pose} frames={frames} />
        <ToonWorld preset={light} sunDir={sun} shadow={{ center: at(18, 0), size: 26 }} />
        <Street preset={preset} light={light} opts={OPTS} />
        {children}
        <Composer dof={dof} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

/** Wide from just inside the entrance, between two checkouts, looking down the store; slow push-in. */
const WIDE = shot({ pos: at(-2.2, 1.5, 1.7), look: at(30, 0.8, 1.15), fov: 60 }, [pushIn(1.2), drift(0.3)], 90);
export const SupermarketWide: React.FC = () => <Scene id="SupermarketWide" pose={WIDE} frames={90} />;

/** Demo caption line at ~3.7 words/s (key words marked like script.json). */
const LINE: CaptionWord[] = ["You", "have", "*thirty*", "days.", "The", "doors", "are", "*locked.*"].map((text, i) => {
  const start = 0.2 + i * 0.27 + (i >= 4 ? 0.25 : 0);
  return { text, start, end: start + 0.25 };
});

/** Medium: the protagonist in aisle 3/4 (between the shelves at x -1 and 3), holding a can; captions on. */
const P = at(23, 1.0);
const MED = shot({ pos: at(19.6, 1.25, 1.3), look: P.clone().setY(1.1), fov: 42 }, [pushIn(0.35)], 90);
export const SupermarketMedium: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Scene id="SupermarketMedium" pose={MED} frames={90} dof={DOF.medium(3.4)}>
        <Character position={P} state={{ pose: posed("hold", f / 30), expr: "worried", blink: blinkAt(f, 30, 4), fx: {}, prop: "can" }} />
      </Scene>
      <Captions words={LINE} />
    </AbsoluteFill>
  );
};

/**
 * Abandoned at night: from aisle 3/4 looking back at the front: moonlight streams in through the shop windows toward
 * the lens (window-shaped patches on the floor), barricaded doors, the exit sign glowing green, one strip flickering.
 */
const NIGHT = shot({ pos: at(15, 1.0, 1.6), look: at(-4, 0.4, 1.7), fov: 58 }, [pushIn(0.8), drift(0.25)], 90);
const MOON = new Vector3(0.25, Math.sin((24 * Math.PI) / 180), 1).normalize(); // from outside the front (+z), slightly left
export const SupermarketNight: React.FC = () => <Scene id="SupermarketNight" night pose={NIGHT} frames={90} sunDir={MOON} />;
