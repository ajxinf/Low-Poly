import { Vector3 } from "three";
import { CharState, Look, blinkAt, posed, reactSquash, runPose } from "../../../kit/toon/cast";
import type { PoseName } from "../../../kit/toon/poses";
import type { CaptionWord } from "../../../kit/toon/Captions";
import type { CrowdSpec } from "../../../kit/toon/crowd";
import { BUILDS, capHair } from "../../../kit/toon/extras";
import type { Expr } from "../../../kit/toon/face";
import { rng } from "../../../kit/toon/paint";
import type { Pose } from "../../../kit/toon/poses";
import { bottoms, campCollar, cap, headLayers, layers, nameTag, pattern } from "../../../kit/toon/wardrobe";
import type { Pen } from "../../../kit/toon/toon";
import type { Head } from "../../../kit/toon/face";
import WORDS from "../../../videos/zombie-supermarket-30-days/voice/words.json";
import { CHAD, DOCK, FRONT, RAMP_FOOT, RAMP_TOP, at } from "./build";

// Who is who, and every beat locked to words.json (composition frames, 30 fps).
export const FPS = 30;
export const words: CaptionWord[] = WORDS;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, "");
/** Start frame of the n-th word that reads exactly `t` (punctuation and key marks ignored). */
export const wordAt = (t: string, n = 0) => {
  const w = words.filter((x) => norm(x.text) === norm(t))[n];
  if (!w) throw new Error(`word "${t}" #${n} not in words.json`);
  return Math.round(w.start * FPS);
};
export const LAST = Math.round(words[words.length - 1].end * FPS);
export const LEAD = 2; // swaps land 2 frames before the word (guard: 0-3)

export const BEAT = {
  you: wordAt("you"),
  street: wordAt("street"),
  laughs: wordAt("laughs"),
  because: wordAt("because"),
  zombies: wordAt("zombies"),
  sound: wordAt("sound"),
  that: wordAt("that"),
  hardware: wordAt("hardware"),
  shutters: wordAt("shutters"),
  megaphone: wordAt("megaphone"),
  on1: wordAt("on"),
  day1: wordAt("day"),
  knocked: wordAt("knocked"),
  members: wordAt("members"),
  only: wordAt("only"),
  so: wordAt("so"),
  silence: wordAt("silence"),
  every: wordAt("every"),
  grabs: wordAt("grabs"),
  morning: wordAt("morning", 1),
  boy: wordAt("boy"),
  heads: wordAt("heads"),
  bang: wordAt("bang"),
  give: wordAt("give"),
  dave: wordAt("dave", 1),
  daveMight: wordAt("dave", 2),
  right: wordAt("right"),
  then: wordAt("then"),
  tape: wordAt("tape"),
  hedgehog: wordAt("hedgehog"),
  park: wordAt("park"),
  door1: wordAt("door", 1),
  asks: wordAt("asks"),
  point: wordAt("point"),
  generator1: wordAt("generator"),
  counting: wordAt("counting"),
  oneCan: wordAt("one", 1),
  day: wordAt("day", 1),
  day29: wordAt("day", 2),
  battery: wordAt("battery"),
  very: wordAt("very"),
  gently: wordAt("gently"),
  day30: wordAt("day", 3),
  generator2: wordAt("generator", 1),
  coughs: wordAt("coughs"),
  dies: wordAt("dies"),
  electric: wordAt("electric"),
  up: wordAt("up", 1),
  thats: wordAt("that's"),
  kick: wordAt("kick"),
  ramp2: wordAt("ramp", 1),
  bump: wordAt("bump"),
  scream: wordAt("scream"),
  once: wordAt("once"),
  see: wordAt("see"),
  shaken: wordAt("shaken"),
  now: wordAt("now"),
  town: wordAt("town"),
  and400: wordAt("400", 2),
  chase: wordAt("chase"),
  ball: wordAt("ball"),
  open: wordAt("open"),
  door2: wordAt("door", 2),
  chadRoof: wordAt("chad", 4),
  roof: wordAt("roof"),
  megaphone2: wordAt("megaphone", 2),
  but: wordAt("but"),
  thirty: wordAt("30", 1),
  doesnt: wordAt("doesn't"),
  soundEnd: wordAt("sound", 1),
};

// ---------------------------------------------------------------- looks

/** Wrap-around dark sunglasses over the eyes (Chad's signature; off when he wakes up). */
const shades = (p: Pen, h: Head) => {
  const { cx, cy, u, facing } = h, fx = cx + 7 * u * facing;
  for (const s of [-1, 1]) p.ell(fx + s * 14 * u, cy + 1 * u, 12.5 * u, 9 * u, "#1e2a44", 2.6 * u);
  p.stroke([[fx - 2 * u, cy - 1 * u], [fx + 2 * u, cy - 1 * u]], 2.6 * u);
  p.ell(fx - 18 * u, cy - 2 * u, 3 * u, 2 * u, "rgba(200,225,255,0.55)"); // glint
};

/**
 * Chad (the rival who mocks): our own design, the opposite of "you" in silhouette and colour. Big stout build, white
 * tank top with a cobalt stripe, cobalt cap worn backwards, wrap-around shades, navy board shorts, white sneakers.
 * Signature: shades + backwards cap + megaphone.
 */
export const chadLook: Look = {
  build: { ...BUILDS.stocky, tw: 1.08 },
  seed: 71,
  jacket: "#f2efe6",
  pants: "#2e3e6a",
  shorts: "#2e3e6a",
  shoes: "#f2efe6",
  sneakers: true,
  outfit: layers((p, t) => p.poly([[t.cx - 2 * t.a, t.chin + 20 * t.u], [t.cx + 2 * t.a, t.chin + 20 * t.u], [t.cx + 2 * t.a, t.chin + 27 * t.u], [t.cx - 2 * t.a, t.chin + 27 * t.u]], "#2e4ab0"), bottoms("#2e3e6a", 0.86)),
  hair: headLayers(capHair("#4a3428", 0.3, 0.5), cap("#2e4ab0", true)),
  face: shades,
};
/** Chad at dawn on day 30: blue pinstripe pyjamas, bed hair, no shades (ring-eyed shock reads). */
export const chadPyjamas: Look = {
  ...chadLook,
  jacket: "#b8cfee",
  pants: "#b8cfee",
  shorts: undefined,
  shoes: "#6a4a3a",
  sneakers: false,
  outfit: layers(pattern("pinstripe", "#b8cfee", "#5a7ab0"), campCollar("#e8f0fa"), bottoms("#b8cfee", 0.9)),
  hair: capHair("#4a3428", 0.42, 0.4, 5),
  face: undefined,
};
/** Dave from the night shift: lanky teen, spiky hair, green FRESHMART vest over a white collar, name tag. */
export const daveLook: Look = {
  build: { ...BUILDS.tallThin, tw: 0.62 },
  seed: 88,
  jacket: "#3e8a5a",
  pants: "#3a3446",
  shoes: "#e8e0d0",
  sneakers: true,
  outfit: layers(campCollar("#f4f0e6"), nameTag("DAVE"), bottoms("#3a3446", 0.86)),
  hair: capHair("#6a4630", 0.46, 0.38, 7),
};

// ---------------------------------------------------------------- the horde (instanced crowd)

const ZOMBIE_SKIN = { color: "#9cb88c", t: 1 };
const ZLOOKS: Look[] = [
  { build: BUILDS.tallThin, seed: 101, jacket: "#6a7a6a", pants: "#3a3a44", shoes: "#3a2a24", hair: capHair("#5a4a3a", 0.35, 0.5, 3) },
  { build: BUILDS.shortRound, seed: 102, jacket: "#8a6a5a", pants: "#4a3a3a", shoes: "#2a2a30", hair: capHair("#3a2a24", 0.3, 0.5) },
  { build: BUILDS.pear, seed: 103, jacket: "#5a5a7a", pants: "#3a3446", shoes: "#3a2a24", hair: capHair("#7a6a5a", 0.5, 0.4, 4) },
  { build: BUILDS.old, seed: 104, jacket: "#7a7a5a", pants: "#4a4a5e", shoes: "#4a3428", hair: capHair("#9a948e", 0.25, 0.6) },
  { build: BUILDS.stocky, seed: 105, jacket: "#6a5a6a", pants: "#2e3446", shoes: "#2a2a30", outfit: pattern("plaid", "#6a5a6a", "#4a3a4a") },
  { build: BUILDS.tallThin, seed: 106, jacket: "#5a6a7a", pants: "#3a3a44", shoes: "#3a2a24", hair: capHair("#4a3a2a", 0.4, 0.45, 6) },
];
const zs = (pose: Pose, expr: Expr, extra: Partial<CharState["fx"]> = {}): CharState => ({ pose, expr, blink: false, fx: { fill: ZOMBIE_SKIN, ...extra } });
const armsUp = (p: Pose): Pose => ({ ...p, arms: [{ at: [0.62, -0.5], grip: "open" }, { at: [0.62, -0.45], grip: "open" }] });
export const Z = { idle: 0, sway: 1, tiltL: 2, tiltR: 3, runA: 4, runB: 5, bang: 6 } as const;
const ZSTATES: CharState[] = [
  zs({ ...posed("idle", 0, 0), tilt: 6, sway: -2 }, "tired"),
  zs({ ...posed("idle", 1.3, 0.3), tilt: -5, sway: 3 }, "tired"),
  zs({ ...posed("idle", 0, -1), tilt: 16 }, "neutral", { ringEyes: true }),
  zs({ ...posed("idle", 0, 1), tilt: -16 }, "neutral", { ringEyes: true }),
  zs(armsUp(runPose(0.25)), "laughing"),
  zs(armsUp(runPose(1.35)), "laughing"),
  zs({ ...posed("panic", 0), tilt: 8 }, "angry"),
];

const N_Z = 400;
const zr = rng(400);
/** Home spots: the street and both walks from s 8 to 58, keeping the ramp-to-door lane (s 29.5-34.5) clear. */
const HOME = Array.from({ length: N_Z }, (_, i) => {
  let s = 0, x = 0;
  do {
    s = 8 + zr() * 50;
    x = (zr() - 0.5) * 2 * (FRONT - 0.7);
  } while (Math.abs(s - DOCK.s) < 3.4 && x > -FRONT + 0.6); // the lane: cameras and the cart run there
  return { s, x, phase: zr() * 100, look: i % ZLOOKS.length, speed: 3.1 + zr() * 1.4, delay: Math.floor(zr() * 26), kind: zr() };
});
const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const clamp01 = (t: number) => Math.min(Math.max(t, 0), 1);

/** Where the crowd surges to on "heads" (Chad's shutters) and how it drains back. */
const SURGE = { from: BEAT.heads - 6, at: BEAT.bang - 4, back: BEAT.give + 8, home: BEAT.give + 70 };
const shutterSpot = (i: number) => at(CHAD.s - 3 + ((i * 37) % 60) / 10, FRONT - 0.5 - ((i * 13) % 40) / 10, 0);

/** The cart's path from the kick to inside Chad's shop (also used by props.ts). */
export const CART_RUN = { kick: BEAT.kick, foot: BEAT.kick + 26, door: BEAT.door2 - 30, stop: BEAT.door2 - 12 };
export const cartAt = (f: number): Vector3 => {
  const { kick, foot, door, stop } = CART_RUN;
  const inside = at(CHAD.s, FRONT + 2.0, 0.04);
  const doorP = at(CHAD.s, FRONT - 0.2, 0.02);
  if (f < kick + 2) return RAMP_TOP.clone();
  if (f < foot) {
    const t = ((f - kick - 2) / (foot - kick - 2)) ** 1.6; // accelerating down the ramp
    const p = RAMP_TOP.clone().lerp(RAMP_FOOT, t);
    const along = Math.max(0, (p.x - (RAMP_TOP.x + DOCK.landing / 2)) / DOCK.run);
    return p.setY(Math.max(DOCK.floor - (DOCK.floor - 0.02) * along, 0.02));
  }
  if (f < door) {
    const t = (f - foot) / (door - foot);
    return RAMP_FOOT.clone().lerp(doorP, 1 - (1 - t) ** 1.3).setY(0.02);
  }
  return doorP.lerp(inside, ease((f - door) / (stop - door)));
};

/** Zombie i at composition frame f. */
const zombie = (i: number, f: number) => {
  const h = HOME[i], home = at(h.s, h.x, 0);
  const wob = new Vector3(Math.sin((f + h.phase) / 23) * 0.12, 0, Math.cos((f + h.phase) / 31) * 0.12);
  const milling = (Math.floor((f + h.phase) / 18) % 2 ? Z.sway : Z.idle) as number;
  // Line 2: every head tilts toward the sound on "sound", one after another.
  if (f >= BEAT.sound - 4 && f < BEAT.that) return { pos: home.add(wob), state: f >= BEAT.sound - 4 + (h.delay % 8) ? (h.kind < 0.5 ? Z.tiltL : Z.tiltR) : milling, look: h.look };
  // Line 7: surge to Chad's shutters, bang, give up, drift home.
  if (f >= SURGE.from && f < SURGE.home) {
    const spot = shutterSpot(i);
    const go = ease((f - SURGE.from - h.delay) / (SURGE.at - SURGE.from)), back = ease((f - SURGE.back - h.delay) / (SURGE.home - SURGE.back));
    const pos = home.clone().lerp(spot, go * (1 - back)).add(wob);
    const moving = (go > 0 && go < 1) || (back > 0 && back < 1);
    const state = moving ? ((Math.floor(f / 5) + i) % 2 ? Z.runA : Z.runB) : go >= 1 && back <= 0 ? (f >= BEAT.bang - 2 && f < BEAT.give ? Z.bang : Z.idle) : milling;
    return { pos, state, look: h.look };
  }
  // Line 18: on "now" every head swings toward the cart.
  if (f >= BEAT.now - 2 && f < BEAT.and400) {
    const c = cartAt(f);
    return { pos: home.add(wob), state: f >= BEAT.now - 2 + (h.delay % 6) ? (c.x < home.x ? Z.tiltL : Z.tiltR) : milling, look: h.look };
  }
  // Line 19: everyone chases the cart through Chad's open door; inside the door they vanish (the shop fills).
  if (f >= BEAT.and400) {
    const t = (f - BEAT.and400 - h.delay) / FPS;
    if (t <= 0) return { pos: home.add(wob), state: c2(h.kind), look: h.look };
    // Spread across the whole shutter opening, not one point (they stacked into one blob in the pilot).
    const door = at(CHAD.s + (((i * 0.618) % 1) - 0.5) * (CHAD.shutterW - 0.8), FRONT + 0.2, 0);
    const d = home.distanceTo(door), run = Math.min(t * h.speed, d);
    if (run >= d - 0.4) return { pos: door, state: Z.idle, look: h.look, hidden: true };
    const pos = home.clone().lerp(door, run / d);
    return { pos, state: (Math.floor(f / 4) + i) % 2 ? Z.runA : Z.runB, look: h.look };
  }
  return { pos: home.add(wob), state: milling, look: h.look };
};
const c2 = (k: number) => (k < 0.5 ? Z.tiltL : Z.tiltR);

export const HORDE: CrowdSpec = { looks: ZLOOKS, states: ZSTATES, count: N_Z, place: zombie };
export { clamp01 };

// ---------------------------------------------------------------- character states

type Keys = [number, PoseName][];
const timeline = (keys: Keys, f: number, look = 0): Pose => {
  let i = 0;
  while (i + 1 < keys.length && keys[i + 1][0] <= f) i++;
  return posed(keys[i][1], f / FPS, look);
};
export const st = (pose: Pose, expr: Expr, f: number, seed: number, extra: Partial<CharState> = {}): CharState => ({ pose, expr, blink: blinkAt(f, FPS, seed), fx: {}, ...extra });
/** Expression by word: [[frame, expr]...], swaps land LEAD frames early and squash for 4 frames. */
export const exprAt = (keys: [number, Expr][], f: number): { expr: Expr; squash: number } => {
  let i = 0;
  while (i + 1 < keys.length && keys[i + 1][0] - LEAD <= f) i++;
  return { expr: keys[i][1], squash: i > 0 ? reactSquash(f - (keys[i][0] - LEAD)) : 0 };
};
export { timeline };
export const HOME_OF = (i: number) => HOME[i];
