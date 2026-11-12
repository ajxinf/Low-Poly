import { Vector3 } from "three";
import { CamPose, arc, drift, pushIn, reveal, shot } from "../../../kit/toon/camera";
import { DOF, Dof, POST } from "../../../kit/toon/Composer";
import type { Plan, Shot } from "../../../kit/toon/guard";
import { LIGHTS, sunDirection } from "../../../kit/toon/lights";
import { CAFE, STOOL, TALL, TOAST_HALF, at } from "./build";
import { BEAT, castCafe, castTall, words } from "./roles";

// Shot plan for _pipeline-test (450 f, 15 s). Six shots: 10-frame dissolves, one hard cut into the insert:
//  S1    0-119 push-in on you walking up to the café table (hook)
//  S2  110-241 lateral truck along the table: the toast tumbles half a turn, "Splat" (impact kick), friend's "½" card
//  S3a 232-291 tight on the 10-foot tabletop and you: the toast slides off the edge (no ladder, no friend)
//  S3b 292-339 insert, hard cut: low close-up, the toast drops in and lands butter-side up on "up"
//  S3c 330-410 low angle on you at the 10-foot table, smug on "table" (still no ladder, no friend)
//  S3d 401-449 reveal on "Your friend": the friend on a ladder, worried on "ladder" (punchline)
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

/** set: which world build the shot's canvas mounts (cafe = S1-2, tall = 10-foot table without ladder, reveal = with). */
type S = Shot & { from: number; dof: Dof; set: "cafe" | "tall" | "reveal" };
const base = { scene: "café street day", light: "day" as const, sun: SUN };

const S1: S = {
  ...base, id: "_pipeline-test/S1-pushin", from: 0, frames: 120, set: "cafe",
  // Eased over 160 f from 20 f before the shot (measure.py found the eased start still for 19 f; the guard did not).
  pose: shot({ pos: at(19.6, 1.1, 1.55), look: at(15.0, -0.05, 0.9), fov: 46 }, [pushIn(1.6), drift(0.6)], 160, -20),
  cast: castCafe(0, false), subject: "you", dof: DOF.medium(4.2),
};
const S2_FROM = 110, KICK = BEAT.splat - S2_FROM;
const S2: S = {
  ...base, id: "_pipeline-test/S2-truck", from: S2_FROM, frames: 132, set: "cafe",
  // Eased over 185 f starting 20 f before the shot: S2 enters and leaves its dissolves mid-glide (no still ends).
  pose: kick(shot(S2_BASE, [drift(-2.0, 0.14), pushIn(0.85)], 185, -20), KICK, 0.035),
  kicks: [[KICK, KICK + 7]],
  cast: castCafe(S2_FROM, true), subject: "you", dof: DOF.medium(4.1),
};
// Where the S3 toast lands (toastTall below): on open ground in front of the table's -x side.
const LAND = at(TALL.s + 0.25, TALL.x - 0.7, 0.05);
const S3A = 232, S3B = 292, S3C = 330, S3D = BEAT.yourFriend - 2; // the reveal dissolve starts 2 f before its word
const S3a: S = {
  ...base, id: "_pipeline-test/S3a-tabletop", from: S3A, frames: S3B - S3A, set: "tall",
  // Tight on the tabletop edge and you, up at 3 m (a crane position); slow push + arc, eased past both ends.
  pose: shot({ pos: at(18.6, -0.75, 3.3), look: at(15.7, -0.2, 3.25), fov: 56 }, [pushIn(0.45), arc(-8, 1)], 100, -20),
  cast: castTall(S3A, false), subject: "you", dof: DOF.medium(2.6),
};
const S3b: S = {
  ...base, id: "_pipeline-test/S3b-insert", from: S3B, frames: S3C + XF - S3B, set: "tall",
  // Low insert on the landing spot: the 27 cm toast fills ~35 % of the frame width when it lands on "up".
  pose: shot({ pos: LAND.clone().add(at(TALL.s + 1.35, 0.25, 0.4).sub(at(TALL.s, 0, 0))), look: LAND.clone().setY(0.12), fov: 54 }, [pushIn(0.25), drift(0.15)], 80, -16),
  cast: [], dof: DOF.closeup(1.25),
};
const S3c: S = {
  ...base, id: "_pipeline-test/S3c-low-angle", from: S3C, frames: S3D + XF - S3C, set: "tall",
  // Low angle (height = authority): the whole 3 m table and you on the stool above it.
  pose: shot({ pos: at(19.8, -1.7, 0.55), look: at(STOOL.s + 0.4, -0.1, 2.75), fov: 56 }, [arc(10, 1.5), reveal(0.35, 0.3)], 120, -20),
  cast: castTall(S3C, false), subject: "you", dof: POST.dof,
};
const S3d: S = {
  ...base, id: "_pipeline-test/S3d-reveal", from: S3D, frames: FRAMES - S3D, set: "reveal",
  // Wide low angle with the ladder in front of the table: the friend half-way up it.
  pose: shot({ pos: at(21.4, 1.9, 1.45), look: at(15.8, 0.5, 2.25), fov: 58 }, [arc(10, 1.5), pushIn(0.5)], 90, -20),
  cast: castTall(S3D, true), subject: "friend", dof: POST.dof,
  allow: { "Card penetration": "friend stands on a ladder tread, between the rails (intended)" },
};
export const SHOTS = [S1, S2, S3a, S3b, S3c, S3d];
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
