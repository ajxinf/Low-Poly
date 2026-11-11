import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Vector3 } from "three";
import { CaptionWord, Captions } from "../kit/toon/Captions";
import { PRESETS } from "../kit/toon/build/presets";
import { Street } from "../kit/toon/build/street";
import { CamPose, arc, drift, pushIn, shot } from "../kit/toon/camera";
import { Character, blinkAt, posed } from "../kit/toon/cast";
import { Composer, DOF, Dof } from "../kit/toon/Composer";
import { Plan, QAPlan, Shot, ShotCamera } from "../kit/toon/guard";
import { LIGHTS, sunDirection } from "../kit/toon/lights";
import { ToonWorld } from "../kit/toon/world";

// Supermarket review shots (pilot location): lit wide, a medium with the protagonist in an aisle, and the
// abandoned night variant. Interior coordinates: at(s, x, y) = (x, y, -s), s from the front wall inwards.
const at = (s: number, x: number, y = 0) => new Vector3(x, y, -s);
const OPTS = { seed: 7 };
const DAY = PRESETS.supermarket_interior, NIGHT_P = PRESETS.supermarket_abandoned;

const spec = (id: string, night: boolean, pose: (f: number) => CamPose, sun?: Vector3, rest: Partial<Shot> = {}): Shot => {
  const light = (night ? NIGHT_P : DAY).light, p0 = pose(0);
  return { id, from: 0, frames: 90, pose, scene: night ? "supermarket night" : "supermarket day", light, sun: sun ?? sunDirection(LIGHTS[light], p0.pos, p0.look), ...rest };
};

const Scene: React.FC<{ shot: Shot; night?: boolean; dof?: Dof }> = ({ shot: s, night, dof }) => {
  const { width, height } = useVideoConfig();
  const f = useCurrentFrame();
  const preset = night ? NIGHT_P : DAY;
  return (
    <AbsoluteFill>
      <ThreeCanvas width={width} height={height}>
        <ShotCamera {...s} />
        <ToonWorld preset={LIGHTS[preset.light]} sunDir={s.sun!} shadow={{ center: at(18, 0), size: 26 }} />
        <Street preset={preset} light={LIGHTS[preset.light]} opts={OPTS} />
        {s.cast?.map((c) => <Character key={c.name} position={c.at(f)} state={c.state(f)} />)}
        <Composer dof={dof} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

/** Wide from just inside the entrance, between two checkouts, looking down the store; slow push-in. */
const WIDE = spec("SupermarketWide", false, shot({ pos: at(-2.2, 1.5, 1.7), look: at(30, 0.8, 1.15), fov: 60 }, [pushIn(2.4), drift(1.2)], 90));
const WIDE_PLAN: Plan = { slug: "SupermarketWide", shots: [WIDE] };
export const SupermarketWide: React.FC = () => (
  <>
    <QAPlan plan={WIDE_PLAN} />
    <Scene shot={WIDE} />
  </>
);

/** Demo caption line at ~3.7 words/s (key words marked like script.json). */
const LINE: CaptionWord[] = ["You", "have", "*thirty*", "days.", "The", "doors", "are", "*locked.*"].map((text, i) => {
  const start = 0.2 + i * 0.27 + (i >= 4 ? 0.25 : 0);
  return { text, start, end: start + 0.25 };
});

/** Medium: the protagonist in aisle 3/4 (between the shelves at x -1 and 3), holding a can; captions on. */
const P = at(23, 1.0);
const MED = spec("SupermarketMedium", false, shot({ pos: at(19.6, 1.25, 1.3), look: P.clone().setY(1.1), fov: 42 }, [arc(-10), pushIn(0.6)], 90), undefined, {
  cast: [{ name: "you", at: () => P, state: (f) => ({ pose: posed("hold", f / 30), expr: "worried", blink: blinkAt(f, 30, 4), fx: {}, prop: "can" }) }],
  subject: "you",
});
const MED_PLAN: Plan = { slug: "SupermarketMedium", shots: [MED], words: LINE };
export const SupermarketMedium: React.FC = () => (
  <AbsoluteFill>
    <QAPlan plan={MED_PLAN} />
    <Scene shot={MED} dof={DOF.medium(3.4)} />
    <Captions words={LINE} />
  </AbsoluteFill>
);

/**
 * Abandoned at night: from aisle 3/4 looking back at the front: moonlight streams in through the shop windows toward
 * the lens (window-shaped patches on the floor), barricaded doors, the exit sign glowing green, one strip flickering.
 */
const MOON = new Vector3(0.25, Math.sin((24 * Math.PI) / 180), 1).normalize(); // from outside the front (+z), slightly left
const NIGHT = spec("SupermarketNight", true, shot({ pos: at(15, 1.0, 1.6), look: at(-4, 0.4, 1.7), fov: 58 }, [pushIn(2.0), drift(1.4)], 90), MOON);
const NIGHT_PLAN: Plan = { slug: "SupermarketNight", shots: [NIGHT] };
export const SupermarketNight: React.FC = () => (
  <>
    <QAPlan plan={NIGHT_PLAN} />
    <Scene shot={NIGHT} night />
  </>
);
