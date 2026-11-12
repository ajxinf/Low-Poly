import { CharState, Look, blinkAt, posed, reactSquash } from "../../../kit/toon/cast";
import { BUILDS, capHair } from "../../../kit/toon/extras";
import { bottoms, campCollar, headLayers, layers, pattern, shadesUp, tache, visor } from "../../../kit/toon/wardrobe";
import type { CastSpec } from "../../../kit/toon/guard";
import { CaptionWord } from "../../../kit/toon/Captions";
import WORDS from "../../../videos/_pipeline-test-2/voice/words.json";
import { HIS, LADDER_H, LADDER_X, YOURS, at } from "./build";

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
// The painters stand on the top platforms of their step ladders (build.ts), so the pole clears the eave.
export const YOU_S1 = at(YOURS.s + 0.4, LADDER_X, LADDER_H); // on your ladder, roller up on the roof
export const HIM_S5 = at(HIS.s + 0.2, LADDER_X, LADDER_H); // on his ladder in the last shot
export const HIM_YARD = at(17.3, 5.6, YARD_Y); // his side of the fence, in front of his (bigger) shed
export const YOU_S5 = at(16.95, 4.55, WALK_Y); // on the walk by the fence, foreground of the last shot
/**
 * Gary, the neighbour (the mocker): our own rival design, built from kit/toon/wardrobe. Silhouette: tall and thin with
 * a long visor peak. Signature: loud turquoise flower shirt, sunglasses pushed up on his forehead, a walrus moustache,
 * khaki shorts with white socks and sandals. Turquoise vs your rust: opposite colours.
 */
const himLook: Look = {
  build: { ...BUILDS.tallThin, tw: 0.66 },
  seed: 19,
  jacket: "#2fa8a0",
  pants: "#c8ad7a",
  shorts: "#c8ad7a",
  socks: "#f4f0e6",
  shoes: "#7a4e30",
  brim: true,
  outfit: layers(pattern("flowers", "#2fa8a0", "#f6a3c0", "#fbe58a"), campCollar("#f4f0e6"), bottoms("#c8ad7a", 0.88)),
  hair: headLayers(capHair("#7a6a62", 0.3, 0.5), visor("#f4f0e6", "#2fa8a0"), shadesUp()),
  face: tache("walrus", "#6a4a38"),
};

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
  { name: "neighbour", look: himLook, at: fixed(HIM_S5), state: (lf) => himPainting(lf + from) },
  { name: "you", at: fixed(YOU_S5), state: (lf) => youLaughing(lf + from) },
];
