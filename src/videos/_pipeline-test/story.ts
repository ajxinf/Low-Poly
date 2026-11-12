import { Vector3 } from "three";
import { CamPose, arc, drift, pushIn, reveal, shot } from "../../../kit/toon/camera";
import { DOF, Dof, POST } from "../../../kit/toon/Composer";
import type { Plan, Shot } from "../../../kit/toon/guard";
import { LIGHTS, sunDirection } from "../../../kit/toon/lights";
import { CAFE, TALL, TOAST_HALF, at } from "./build";
import { BEAT, castCafe, castTall, words } from "./roles";

// Shot plan for _pipeline-test (450 f, 15 s). Three shots, two 10-frame dissolves:
//  S1   0-119 push-in on you walking up to the café table (hook)
//  S2 110-241 lateral truck along the table: the toast tumbles half a turn, "Splat" (impact kick), friend's "½" card
//  S3 232-449 crane up from the second toast landing butter-side up to you on the 10-foot table, orbiting (punchline)
export const FRAMES = 450;
export const XF = 10;

// One sun for the whole scene (light continuity), from the S2 axis.
const S2_BASE = { pos: at(16.0, 4.35, 1.25), look: at(15.95, 0.2, 0.85), fov: 66 };
export const SUN = sunDirection(LIGHTS.day, S2_BASE.pos, S2_BASE.look);

/** Impact kick: flips sign every frame, decays over 7 frames (skill). Sideways in the image, `amp` m at frame 0. */
const kick = (pose: (f: number) => CamPose, at0: number, amp: number) => (f: number): CamPose => {
  const p = pose(f), k = f - at0;
  if (k < 0 || k >= 7) return p;
  const right = p.look.clone().sub(p.pos).cross(new Vector3(0, 1, 0)).normalize();
  const d = amp * (1 - k / 7) * (k % 2 ? -1 : 1);
  return { ...p, pos: p.pos.clone().addScaledVector(right, d), look: p.look.clone().addScaledVector(right, d) };
};

type S = Shot & { from: number; dof: Dof; tall: boolean };
const base = { scene: "café street day", light: "day" as const, sun: SUN };

const S1: S = {
  ...base, id: "_pipeline-test/S1-pushin", from: 0, frames: 120, tall: false,
  // Eased over 160 f from 20 f before the shot (measure.py found the eased start still for 19 f; the guard did not).
  pose: shot({ pos: at(19.6, 1.1, 1.55), look: at(15.0, -0.05, 0.9), fov: 46 }, [pushIn(1.6), drift(0.6)], 160, -20),
  cast: castCafe(0, false), subject: "you", dof: DOF.medium(4.2),
};
const S2_FROM = 110, KICK = BEAT.splat - S2_FROM;
const S2: S = {
  ...base, id: "_pipeline-test/S2-truck", from: S2_FROM, frames: 132, tall: false,
  // Eased over 185 f starting 20 f before the shot: S2 enters and leaves its dissolves mid-glide (no still ends).
  pose: kick(shot(S2_BASE, [drift(-2.0, 0.14), pushIn(0.85)], 185, -20), KICK, 0.035),
  kicks: [[KICK, KICK + 7]],
  cast: castCafe(S2_FROM, true), subject: "you", dof: DOF.medium(4.1),
};
const S3_FROM = 232;
const S3: S = {
  ...base, id: "_pipeline-test/S3-crane-orbit", from: S3_FROM, frames: FRAMES - S3_FROM, tall: true,
  // Ends low and wide (low angle = height): the whole 3 m table, you on top, the friend half-way up the ladder.
  pose: shot({ pos: at(21.4, 1.9, 1.45), look: at(15.8, 0.5, 2.25), fov: 58 }, [reveal(1.05, 2.15), arc(16, 2)], FRAMES - S3_FROM),
  cast: castTall(S3_FROM), dof: POST.dof,
  allow: { "Card penetration": "friend stands on a ladder tread, between the rails (intended)" },
};
export const SHOTS = [S1, S2, S3];
export const PLAN: Plan = { slug: "_pipeline-test", shots: SHOTS, words };

// ---- the toast (a world prop): rests on the table, slides off +x, falls with gravity easing while it turns.
type Toast = { pos: Vector3; rotZ: number };
const fall = (f: number, s: number, x: number, top: number, slide: number, f0: number, f1: number, turns: number, dir = 1): Toast => {
  const y0 = top + TOAST_HALF, y1 = TOAST_HALF;
  if (f < f0 - 10) return { pos: at(s, x, y0), rotZ: 0 };
  if (f < f0) return { pos: at(s, x + (dir * slide * (f - f0 + 10)) / 10, y0), rotZ: 0 };
  const t = Math.min((f - f0) / (f1 - f0), 1);
  return { pos: at(s, x + dir * (slide + 0.25 * t), y0 + (y1 - y0) * t * t), rotZ: -dir * Math.PI * turns * t };
};
/** S1/S2: half a turn off the 0.75 m table, landing butter-down on "Splat" (starts near the centre: in frame in S1). */
export const toastCafe = (f: number) => fall(f, CAFE.s, CAFE.x + 0.1, CAFE.h, 0.35, BEAT.splat - 18, BEAT.splat, 1);
/** S3: a full turn off the 3 m table's -x edge (away from the ladder), landing butter-up on open ground on "up". */
export const toastTall = (f: number) => fall(f, TALL.s + 0.25, TALL.x - 0.15, TALL.h, 0.3, BEAT.up - 40, BEAT.up, 2, -1);
/** The "½" card beside the friend's head, above the raised right hand (screen right in S2 = +s). */
export const CARD_POS = at(16.45 - 0.36, -0.45, 1.42); // beside the friend (s 16.45, roles.ts), toward you
