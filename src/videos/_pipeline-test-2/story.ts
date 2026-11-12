import { Quaternion, Vector3 } from "three";
import { CamPose, arc, drift, pushIn, shot, smootherstep } from "../../../kit/toon/camera";
import { DOF, Dof, POST } from "../../../kit/toon/Composer";
import type { Plan, Shot } from "../../../kit/toon/guard";
import type { Shaft } from "../../../kit/toon/shafts";
import { LIGHTS, sunDirection } from "../../../kit/toon/lights";
import { FENCE_S, HIS, SHED, YOURS, at, roofPoint, roofY } from "./build";
import { BEAT, HIM_S5, HIM_YARD, LAST, YOU_S1, YOU_S5, castS1, castS4, castS5, words } from "./roles";

// Shot plan for _pipeline-test-2 (448 f, 14.9 s). Five shots, 10-frame dissolves, one hard cut into the insert:
//  S1    0-107 road-side medium: you painting your roof white, the neighbour laughing over the fence (hook + mocker)
//  S2   98-177 crane down from the huge sun to both sheds; DAY 90 stamp on "Day"
//  S3  168-285 high wide over both roofs: rays bounce off yours ("away"), sink into his, it glows red ("up")
//  S4  286-352 hard cut, close-up: his ice cream melts, his face fills red on "chance"
//  S5  343-447 mirror of S1 at his shed: he paints his roof white, you laugh in the foreground on "laughing" (loop)
export const FRAMES = LAST + 6;
export const XF = 10;

const S1_BASE = { pos: at(15.9, -0.9, 3.4), look: at(15.9, 6.6, 1.6), fov: 66 }; // both leads in frame // high enough to see the roofs
export const SUN = sunDirection(LIGHTS.day, S1_BASE.pos, S1_BASE.look); // one sun for the whole scene

type S = Shot & { from: number; dof: Dof; sunDisc?: boolean; rays?: boolean };
const base = { scene: "suburb day", light: "day" as const, sun: SUN };

const S1: S = {
  ...base, id: "_pipeline-test-2/S1-mocker", from: 0, frames: 108,
  pose: shot(S1_BASE, [pushIn(0.9), arc(7, 0.6), drift(0.9)], 150, -25),
  cast: castS1(0), subject: "you", dof: DOF.medium(6.5),
};

// S2: the look eases from the sun (high over the houses) down to the sheds while the camera keeps a slow push.
export const SUN_POS = at(4, 140, 2 + 140 * Math.tan((33 * Math.PI) / 180)); // screen right of the stamp
const S2_FROM = 98, S2_BASE = { pos: at(16.0, -2.5, 2.0), look: at(16.0, 7.2, 1.5), fov: 62 };
const S2_AIM = S2_BASE.pos.clone().add(SUN_POS.clone().sub(S2_BASE.pos).normalize().applyAxisAngle(new Vector3(0, 0, 1), (-4 * Math.PI) / 180).multiplyScalar(20));
const s2push = shot(S2_BASE, [pushIn(0.9)], 120, -10);
const S2: S = {
  ...base, id: "_pipeline-test-2/S2-heatwave", from: S2_FROM, frames: 80,
  pose: (lf: number): CamPose => {
    const p = s2push(lf), e = smootherstep(Math.min(Math.max(lf / 78, 0), 1));
    return { ...p, look: S2_AIM.clone().lerp(p.look, e) };
  },
  dof: POST.dof, sunDisc: true, // nobody outside in the heat (the cast would sit under the captions)
};

const S3_FROM = 168;
const S3: S = {
  ...base, id: "_pipeline-test-2/S3-rays", from: S3_FROM, frames: 286 - S3_FROM,
  pose: shot({ pos: at(16.2, -4.0, 7.0), look: at(16.2, 7.9, 1.6), fov: 70 }, [pushIn(2.6), drift(-1.2), arc(-5, 0.5)], 170, -30),
  dof: POST.dof, rays: true,
};

const S4_FROM = 286;
const S4: S = {
  ...base, id: "_pipeline-test-2/S4-icecream", from: S4_FROM, frames: 353 - S4_FROM,
  pose: shot({ pos: at(17.3, 3.55, 1.45), look: at(17.3, 5.6, 1.12), fov: 46 }, [pushIn(0.3), drift(0.12)], 90, -10),
  cast: castS4(S4_FROM), subject: "neighbour", dof: DOF.closeup(1.6),
};

const S5_FROM = 343;
const S5: S = {
  ...base, id: "_pipeline-test-2/S5-loop", from: S5_FROM, frames: FRAMES - S5_FROM,
  pose: shot({ pos: at(17.75, -0.6, 2.6), look: at(17.75, 6.4, 1.15), fov: 62 }, [pushIn(1.8), drift(0.45), arc(-3, 0.4)], 200, -50), // still gliding on the last word
  cast: castS5(S5_FROM), subject: "you", dof: DOF.medium(4.6),
};
export const SHOTS = [S1, S2, S3, S4, S5];

/**
 * Heatwave light shafts. The sun sits high behind the houses (shadows fall toward the road), so each shaft starts
 * just in front of a facade (x 10.2) and slants down into the yard: a bright beam against the shaded wall reads;
 * one traced back to the sun would be hidden by the houses.
 */
const SHAFT_DIR = new Vector3(0.45, 1, 0.05).normalize();
export const SHAFTS: Shaft[] = [at(12.0, 6.4), at(16.6, 6.6), at(20.6, 6.5)].map((p, i) => ({
  from: p.clone().addScaledVector(SHAFT_DIR, (10.2 - p.x) / SHAFT_DIR.x), to: p, r0: 0.55 + 0.15 * i, r1: 1.5,
  color: "#ffd890", opacity: 0.32,
}));
export const PLAN: Plan = { slug: "_pipeline-test-2", shots: SHOTS, words };

// ---- story props (composition frames) ----
const ramp = (f: number, a: number, b: number) => smootherstep(Math.min(Math.max((f - a) / (b - a), 0), 1));
const ROOF_L = SHED.w + 0.3;
/** Paint coverage of each roof (0..1 along s, growing from the fence-far end). */
export const paintCover = (f: number, whose: "yours" | "his") =>
  whose === "yours" ? (f < S2_FROM ? 0.35 + 0.4 * ramp(f, 0, 108) : 1) : f < S5_FROM ? 0 : 0.2 + 0.55 * ramp(f, S5_FROM, FRAMES);
/**
 * The paint slab spans local z 0..len, and local +z is toward lower s. Yours grows from the high-s end; his from the
 * low-s end (the fence side), the half of his roof that S5 sees. `start` = the slab's z = 0 end, `edge` = wet edge.
 */
const fromLow = (whose: "yours" | "his") => whose === "his";
export const paintStart = (s: number, cover: number, whose: "yours" | "his") =>
  at(fromLow(whose) ? s - ROOF_L / 2 + cover * ROOF_L : s + ROOF_L / 2, SHED.x, (SHED.front + SHED.back) / 2 + 0.08 + 0.05);
export const paintEdge = (s: number, cover: number, whose: "yours" | "his") =>
  at(fromLow(whose) ? s - ROOF_L / 2 + cover * ROOF_L : s + ROOF_L / 2 - cover * ROOF_L, SHED.x - SHED.d / 2 + 0.35, roofY(0.175) + 0.12);
/** Hand height for a roller pole held in front of the body (toward the camera). */
export const handAt = (p: Vector3) => p.clone().add(new Vector3(0.12, 1.02, 0)); // chest height, toward the shed
export const ROLLER_FOR = { yours: { s: YOURS.s, who: YOU_S1 }, his: { s: HIS.s, who: HIM_S5 } };

/** Sun rays: start (sky) and end (roof) points, grown over 14 frames from `from`. Bounce = reflected off the roof. */
// Steep (sun high over the houses): traced 9 m back from a roof, a ray stays in front of the facades (guard "Moving props").
const RAY_DIR = new Vector3(-0.22, -1, 0.05).normalize();
const N = new Vector3(-Math.sin(Math.atan2(SHED.back - SHED.front, SHED.d)), Math.cos(Math.atan2(SHED.back - SHED.front, SHED.d)), 0);
const REFLECT = RAY_DIR.clone().sub(N.clone().multiplyScalar(2 * RAY_DIR.dot(N)));
export type Rod = { a: Vector3; b: Vector3; color: string };
const grow = (from: Vector3, dir: Vector3, len: number, t: number): Rod | null =>
  t <= 0 ? null : { a: from.clone(), b: from.clone().addScaledVector(dir, len * t), color: "#ffd54a" };
export const rays = (f: number): Rod[] => {
  const out: (Rod | null)[] = [];
  for (const ds of [-0.75, 0, 0.75]) {
    const mine = roofPoint(YOURS.s, 0.5, ds), his = roofPoint(HIS.s, 0.5, ds);
    // incoming rays drawn from the roof back up toward the sun, growing downward: a = sky end, b = roof
    const inMine = ramp(f, BEAT.white - 6, BEAT.white + 8), inHis = ramp(f, BEAT.black - 6, BEAT.black + 8);
    if (inMine > 0) out.push({ a: mine.clone().addScaledVector(RAY_DIR, -9), b: mine.clone().addScaledVector(RAY_DIR, -9 + 9 * inMine), color: "#ffd54a" });
    if (inHis > 0) out.push({ a: his.clone().addScaledVector(RAY_DIR, -9), b: his.clone().addScaledVector(RAY_DIR, -9 + 9 * inHis), color: "#ffd54a" });
    out.push(grow(mine, REFLECT, 8, ramp(f, BEAT.away - 4, BEAT.away + 10)));
  }
  return out.filter((r): r is Rod => r !== null);
};
/** His roof's red-hot glow (opacity): rises on "up", stays through S4, fades under the new paint in S5. */
export const roofHeat = (f: number) => 0.6 * ramp(f, BEAT.up - 4, BEAT.up + 10) * (1 - ramp(f, S5_FROM, S5_FROM + 40));
/** Ice cream: scoop scale melts from "His" to "chance"; the drip slides down from the scoop. */
export const melt = (f: number) => ({ scoop: 1 - 0.8 * ramp(f, BEAT.his, BEAT.chance), drip: ramp(f, BEAT.his + 8, BEAT.chance + 10) });
export const CONE_AT = HIM_YARD.clone().add(new Vector3(-0.2, 0.8, 0)); // chest, under the chin (guard: not in the head)
export const LEMON_AT = YOU_S5.clone().add(new Vector3(-0.2, 0.78, 0.08));
export const FENCE = FENCE_S;

/** Place a unit-height Y-cylinder between a and b. */
export const stretch = (m: { position: Vector3; quaternion: Quaternion; scale: Vector3 }, a: Vector3, b: Vector3) => {
  const d = b.clone().sub(a), len = d.length();
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), d.normalize());
  m.scale.set(1, Math.max(len, 1e-4), 1);
};
