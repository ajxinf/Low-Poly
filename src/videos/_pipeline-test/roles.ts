import { CharState, blinkAt, posed, reactSquash, walkPose } from "../../../kit/toon/cast";
import { EXTRAS } from "../../../kit/toon/extras";
import type { CastSpec } from "../../../kit/toon/guard";
import { CaptionWord } from "../../../kit/toon/Captions";
import WORDS from "../../../videos/_pipeline-test/voice/words.json";
import { STOOL, TREAD, at } from "./build";

// Who is where, and every beat locked to words.json (composition frames, 30 fps).
export const FPS = 30;
export const words: CaptionWord[] = WORDS;
/** Start frame of the n-th word whose caption text contains `t` (expression swaps land on this frame - 2). */
const wordAt = (t: string, n = 0) => {
  const w = words.filter((x) => x.text.toLowerCase().includes(t))[n];
  if (!w) throw new Error(`word "${t}" not in words.json`);
  return Math.round(w.start * FPS);
};
export const BEAT = {
  splat: wordAt("splat"), // toast lands, impact kick, you: shocked
  up: wordAt("*up*"), // second toast lands butter-side up
  table: wordAt("table.", 0), // you: smug
  ladder: wordAt("ladder"), // friend: worried, pop sting
};
const LEAD = 2; // swaps land 2 frames before the word (guard: 0-3)

// ---- you: walk to the café table (shot 1), nudge the toast (2), stand on the stool at the tall table (3)
const START = { s: 11.6, x: -0.45 }, STOP = { s: 15.0, x: -0.6 }; // right of the table in S1: feet clear its back edge
const WALK_END = 95, DECEL = 14;
const PATH = Math.hypot(STOP.s - START.s, STOP.x - START.x);
const V = PATH / ((WALK_END - DECEL) / FPS + DECEL / FPS / 2);
const walked = (f: number) => {
  const tc = WALK_END - DECEL;
  if (f <= tc) return (V * Math.max(f, 0)) / FPS;
  const d = Math.min(f, WALK_END) - tc;
  return (V * tc) / FPS + (V * (d - (d * d) / (2 * DECEL))) / FPS;
};
const youGround = (f: number) => {
  const k = Math.min(walked(f) / PATH, 1);
  return at(START.s + (STOP.s - START.s) * k, START.x + (STOP.x - START.x) * k, 0);
};
const NUDGE = BEAT.splat - 34; // you reach for the toast, it slides
const youCafe = (f: number): CharState => {
  const blink = blinkAt(f, FPS, 3);
  if (f < WALK_END) return { pose: walkPose(walked(f), Math.min((WALK_END - f) / DECEL, 1)), expr: "neutral", blink, fx: {} };
  const t = (f - WALK_END) / FPS;
  if (f < BEAT.splat - LEAD) return { pose: posed(f < NUDGE ? "idle" : "point", t, 0.5), expr: "neutral", blink, fx: {} };
  const r = f - (BEAT.splat - LEAD);
  return { pose: { ...posed("panic", t, 0.3), squash: reactSquash(r) }, expr: "shocked", blink: false, fx: { ringEyes: true, bang: r, sweat: Math.min(r / 24, 1) } };
};
const youTall = (f: number): CharState => {
  const t = f / FPS, blink = blinkAt(f, FPS, 3);
  if (f < BEAT.table - LEAD) return { pose: posed("idle", t, 0.4), expr: "neutral", blink, fx: {} };
  return { pose: { ...posed("hips", t), squash: reactSquash(f - (BEAT.table - LEAD)) }, expr: "smug", blink, fx: {} };
};

// ---- friend: next to the café table holding up the "½" card (2), on the ladder (3)
export const FRIEND_CAFE = at(16.45, -0.45, 0);
export const CARD_UP = BEAT.splat + 6;
const friendLook = EXTRAS[1].look;
/** "point" mirrored: the LEFT arm up (screen left in S2, toward you), holding the card's stick. */
const leftUp = (t: number) => {
  const p = posed("point", t, 0.3);
  return { ...p, arms: [p.arms[1], p.arms[0]] as typeof p.arms, sway: -p.sway };
};
const friendCafe = (f: number): CharState => ({
  pose: f < CARD_UP ? posed("idle", f / FPS + 1, -0.3) : leftUp(f / FPS + 1),
  expr: "deadpan",
  blink: blinkAt(f, FPS, 8),
  fx: {},
});
const friendLadder = (f: number): CharState => {
  const worried = f >= BEAT.ladder - LEAD;
  return { pose: posed("panic", f / FPS + 1, 0), expr: worried ? "worried" : "deadpan", blink: blinkAt(f, FPS, 8), fx: worried ? { sweat: Math.min((f - BEAT.ladder + LEAD) / 24, 1) } : {} };
};

/** Cast for a shot starting at composition frame `from` (CastSpec functions take shot-local frames). */
export const castCafe = (from: number, withFriend: boolean): CastSpec[] => [
  { name: "you", at: (lf) => youGround(lf + from), state: (lf) => youCafe(lf + from) },
  ...(withFriend ? [{ name: "friend", look: friendLook, at: () => FRIEND_CAFE, state: (lf: number) => friendCafe(lf + from) }] : []),
];
export const castTall = (from: number): CastSpec[] => [
  { name: "you", at: () => at(STOOL.s, STOOL.x, STOOL.h), state: (lf) => youTall(lf + from) },
  { name: "friend", look: friendLook, at: () => TREAD, state: (lf) => friendLadder(lf + from) },
];
