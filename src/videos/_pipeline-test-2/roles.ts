import { CharState, blinkAt, posed, reactSquash } from "../../../kit/toon/cast";
import { EXTRAS } from "../../../kit/toon/extras";
import type { CastSpec } from "../../../kit/toon/guard";
import { CaptionWord } from "../../../kit/toon/Captions";
import WORDS from "../../../videos/_pipeline-test-2/voice/words.json";
import { at } from "./build";

// Who is where, and every beat locked to words.json (composition frames, 30 fps).
export const FPS = 30;
export const words: CaptionWord[] = WORDS;
/** Start frame of the n-th word whose caption text contains `t`. */
const wordAt = (t: string, n = 0) => {
  const w = words.filter((x) => x.text.toLowerCase().includes(t))[n];
  if (!w) throw new Error(`word "${t}" not in words.json`);
  return Math.round(w.start * FPS);
};
export const BEAT = {
  laughs: wordAt("*laughs*"), // neighbour laughs (mocker)
  day: wordAt("day"), // DAY 90 stamp + thump
  heatwave: wordAt("heatwave"),
  white: wordAt("white", 1), // rays reach your roof
  away: wordAt("*away*"), // rays bounce off
  black: wordAt("black"), // rays reach his roof
  up: wordAt("*up*"), // his roof glows red-hot
  his: wordAt("his", 0), // hard cut to the ice cream
  chance: wordAt("*chance*"), // face fills red, ice cream gone
  so: wordAt("so", 1), // n=1: "soaks" also contains "so"
  laughing: wordAt("*laughing*"), // you laugh (the loop)
};
const LEAD = 2; // swaps land 2 frames before the word (guard: 0-3)
export const LAST = Math.round(words[words.length - 1].end * FPS);

// Yards are at y 0.015 and walks at 0.02 (street.tsx): feet stand on that ground, or the contact blob sinks under it.
export const YARD_Y = 0.015, WALK_Y = 0.02;
export const YOU_S1 = at(14.55, 6.05, YARD_Y); // in front of your shed, roller up on the roof
export const HIM_YARD = at(17.5, 6.0, YARD_Y); // his side of the fence
export const YOU_S5 = at(16.35, 5.0, WALK_Y); // on the walk by the fence, foreground of the last shot
const himLook = EXTRAS[0].look;

const youPainting = (f: number): CharState => ({ pose: posed("hold", f / FPS, 0.4), expr: "determined", blink: blinkAt(f, FPS, 3), fx: {} });
const youLaughing = (f: number): CharState => {
  if (f < BEAT.laughing - LEAD) return { pose: posed("hold", f / FPS, 0.3), expr: "smug", blink: blinkAt(f, FPS, 3), fx: {} };
  return { pose: { ...posed("hips", f / FPS, 0.3), squash: reactSquash(f - (BEAT.laughing - LEAD)) }, expr: "laughing", blink: false, fx: {} };
};
const himMocking = (f: number): CharState => {
  if (f < BEAT.laughs - LEAD) return { pose: posed("crossed", f / FPS + 1, -0.3), expr: "smug", blink: blinkAt(f, FPS, 8), fx: {} };
  return { pose: { ...posed("point", f / FPS + 1, -0.3), squash: reactSquash(f - (BEAT.laughs - LEAD)) }, expr: "laughing", blink: false, fx: {} };
};
/** Ice cream close-up: worried and sweating, then the face fills red on "chance". */
const himMelting = (f: number): CharState => {
  const r = f - (BEAT.chance - LEAD);
  return {
    pose: posed("hold", f / FPS + 1, 0),
    expr: r < 0 ? "worried" : "shocked",
    blink: r < 0 && blinkAt(f, FPS, 8),
    fx: { sweat: Math.min(Math.max(f - BEAT.his, 0) / 24, 1), ...(r >= 0 ? { fill: { color: "#e2462e", t: Math.min(r / 8, 1) }, ringEyes: true } : {}) },
  };
};
const himPainting = (f: number): CharState => ({ pose: posed("hold", f / FPS + 1, -0.2), expr: "tired", blink: blinkAt(f, FPS, 8), fx: { sweat: ((f % 40) / 40) } });

const fixed = (p: ReturnType<typeof at>) => () => p;
export const castS1 = (from: number): CastSpec[] => [
  { name: "you", at: fixed(YOU_S1), state: (lf) => youPainting(lf + from) },
  { name: "neighbour", look: himLook, at: fixed(HIM_YARD), state: (lf) => himMocking(lf + from) },
];
export const castWide = (from: number): CastSpec[] => [
  { name: "you", at: fixed(YOU_S1), state: (lf) => youPainting(lf + from) },
  { name: "neighbour", look: himLook, at: fixed(HIM_YARD), state: (lf) => ({ pose: posed("idle", (lf + from) / FPS, 0), expr: "tired", blink: blinkAt(lf + from, FPS, 8), fx: { sweat: 0.6 } }) },
];
export const castS4 = (from: number): CastSpec[] => [{ name: "neighbour", look: himLook, at: fixed(HIM_YARD), state: (lf) => himMelting(lf + from) }];
export const castS5 = (from: number): CastSpec[] => [
  { name: "neighbour", look: himLook, at: fixed(HIM_YARD), state: (lf) => himPainting(lf + from) },
  { name: "you", at: fixed(YOU_S5), state: (lf) => youLaughing(lf + from) },
];
