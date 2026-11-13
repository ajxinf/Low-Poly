import { Vector3 } from "three";
import { ShotSize, arc, drift, frameOn, pullOut, pushIn, reframe, reveal, shot, smootherstep } from "../../../kit/toon/camera";
import { blinkAt, posed, reactSquash, walkPose } from "../../../kit/toon/cast";
import type { CharState, Look } from "../../../kit/toon/cast";
import { DOF, Dof, POST } from "../../../kit/toon/Composer";
import type { Expr } from "../../../kit/toon/face";
import { headHeight } from "../../../kit/toon/figure";
import type { CastSpec, Plan, Shot } from "../../../kit/toon/guard";
import { LIGHTS, sunDirection } from "../../../kit/toon/lights";
import type { PresetName } from "../../../kit/toon/build/presets";
import type { Pose } from "../../../kit/toon/poses";
import { youLook } from "../../../kit/toon/protagonist";
import { CART_IN, CHAD, CHAD_DOOR, CHAD_ROOF, CHART_AT, DOCK, FRONT, GENERATOR, HEAP, IN, PALLET, RAMP_TOP, ROOF_Y, WINDOW_SPOT, at } from "./build";
import { BEAT, FPS, LAST, LEAD, cartAt, chadLook, chadPyjamas, daveLook, exprAt, words } from "./roles";

/**
 * Shot plan for zombie-supermarket-30-days (80.6 s). Every shot is its own canvas; a shot that starts before the
 * previous one ends dissolves in over XF frames, one that starts after it is a hard cut. World per shot:
 *   ext-day / ext-dawn  the main street (FRESHMART left, CHAD'S HARDWARE right), the horde as an instanced crowd
 *   int-day / int-night the supermarket inside (power off: window daylight, or moonlight)
 * Characters are placed by COMPOSITION frame (continuity across cuts); shots convert to shot-local frames.
 */
export const XF = 10;
const wordsStart = (t: string, n: number) => {
  const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9']/g, "");
  const w = words.filter((x) => norm(x.text) === t)[n];
  if (!w) throw new Error(`word ${t} #${n}`);
  return Math.round(w.start * FPS);
};
const DAVE_ASKS = wordsStart("dave", 3), ON_DAY30 = wordsStart("on", 5), YOU_SEE = wordsStart("you", 8);
export const FRAMES = LAST + 6; // house rule (scripts/audio/events.py "auto")

export type World = "ext-day" | "ext-dawn" | "int-day" | "int-night";
export const WORLD: Record<World, { preset: PresetName; light: keyof typeof LIGHTS; scene: string; sun: Vector3 }> = {
  // One sun per world (light continuity): day key from the right-back of a camera looking across at Chad's.
  "ext-day": { preset: "modern_main_street", light: "day", scene: "street day", sun: sunDirection(LIGHTS.day, at(32, -2, 1.6), at(32, 8, 3)) },
  // Dawn: the low sun rises behind Chad's store (he is backlit, the street glows peach).
  "ext-dawn": { preset: "modern_main_street", light: "golden", scene: "street dawn", sun: sunDirection(LIGHTS.golden, at(32, -2, 1.6), at(32, 8, 3)) },
  // Inside, the light comes through the front windows (s -4), from outside and a little to the right.
  "int-day": { preset: "supermarket_dark_day", light: "sunInterior", scene: "store day", sun: new Vector3(0.3, Math.sin((26 * Math.PI) / 180), 1).normalize() },
  "int-night": { preset: "supermarket_abandoned", light: "moonInterior", scene: "store night", sun: new Vector3(0.25, Math.sin((24 * Math.PI) / 180), 1).normalize() },
};

export type S = Shot & { from: number; frames: number; dof: Dof; w: World; crowd?: boolean; motes?: { center: Vector3; size: Vector3; color: string } };

// ---------------------------------------------------------------- helpers

const H = (look: Look) => headHeight(look) + 0.17;
/** frameOn for a character standing at any height (frameOn assumes the ground at y 0): framed at y 0, lifted by pos.y. */
const fo = (pos: Vector3, from: Vector3, size: ShotSize, look: Look = youLook, o: Parameters<typeof frameOn>[3] = {}) => {
  const f = frameOn(pos.clone().setY(0), from.clone().setY(0), size, { head: H(look), ...o }), up = new Vector3(0, pos.y, 0);
  return { ...f, pos: f.pos.add(up), look: f.look.add(up) };
};
/** A hold: a barely-there push (refs hold still on beats, then move fast). */
const creep = (p: { pos: Vector3; look: Vector3; fov: number }, frames: number, k = 0.05) =>
  shot(p, [pushIn(k * p.pos.distanceTo(p.look)), drift(0.03 * p.pos.distanceTo(p.look))], frames);
type Role = { name: string; look: Look; at: (F: number) => Vector3; state: (F: number) => CharState };
const inShot = (from: number, roles: Role[]): CastSpec[] => roles.map((r) => ({ name: r.name, look: r.look, at: (f) => r.at(f + from), state: (f) => r.state(f + from) }));
const still = (p: Vector3) => () => p;
const st = (pose: Pose, expr: Expr, F: number, seed: number, extra: Partial<CharState> = {}): CharState => ({ pose, expr, blink: blinkAt(F, FPS, seed), fx: {}, ...extra });
/** Pose keys by composition frame, eased over 4 frames like poseAt. */
const pk = (keys: [number, Parameters<typeof posed>[0]][], F: number, look = 0) => {
  let i = 0;
  while (i + 1 < keys.length && keys[i + 1][0] <= F) i++;
  return posed(keys[i][1], F / FPS, look);
};
const withSquash = (p: Pose, squash: number): Pose => ({ ...p, squash });

// ---------------------------------------------------------------- roles (composition frames)

const youHeap: Role = {
  name: "you", look: youLook, at: still(HEAP),
  state: (F) => {
    const e = exprAt([[0, "determined"], [BEAT.laughs, "angry"]], F);
    return st(withSquash(pk([[0, "hold"]], F, 0.2), e.squash), e.expr, F, 1);
  },
};
/**
 * Chad's megaphone poses (props.ts puts the megaphone in his RIGHT hand): never across the chest or face, or the
 * megaphone cuts through his head card. low = hanging at his side, up = raised out to the side (laughing, flexing),
 * mouth = held out beside his mouth (bell out to the side).
 */
const MEGA: Record<"low" | "up" | "mouth", Pose["arms"]> = {
  low: [{ at: [0.2, 0.58], grip: "fist" }, { at: [0.3, 0.86], grip: "fist" }],
  up: [{ at: [0.2, 0.58], grip: "fist" }, { at: [0.78, -0.25], grip: "fist" }],
  mouth: [{ at: [0.2, 0.58], grip: "fist" }, { at: [0.64, -0.12], grip: "fist" }],
};
const chadPose = (arms: keyof typeof MEGA, F: number, extra: Partial<Pose> = {}): Pose => ({ ...posed("hips", F / FPS, -0.2), arms: MEGA[arms], ...extra });
const chadMock: Role = {
  name: "chad", look: chadLook, at: still(CHAD_ROOF),
  state: (F) => {
    const e = exprAt([[0, "smug"], [BEAT.laughs, "laughing"], [BEAT.that, "smug"], [BEAT.megaphone, "laughing"]], F);
    const arms = F < BEAT.laughs - LEAD ? "low" : F < BEAT.that ? "up" : F < BEAT.megaphone - LEAD ? "low" : "up";
    return st(withSquash(chadPose(arms, F), e.squash), e.expr, F, 7, { blink: false });
  },
};
const YOU_SHUTTER = at(CHAD.s + 0.95, FRONT - 0.75, 0.02);
const youKnock: Role = {
  name: "you", look: youLook, at: still(YOU_SHUTTER),
  state: (F) => {
    const e = exprAt([[0, "relieved"], [BEAT.members, "confused"], [BEAT.only, "shocked"]], F);
    const pose = F < BEAT.knocked - LEAD ? "idle" : F < BEAT.members ? "point" : "idle";
    return st(withSquash(posed(pose, F / FPS, 0.6), e.squash), e.expr, F, 2, { fx: F >= BEAT.only - LEAD ? { ringEyes: true } : {} });
  },
};
const YOU_PALLET = PALLET.clone().add(new Vector3(-0.75, 0, 1.25)), DAVE_PALLET = PALLET.clone().add(new Vector3(0.55, 0, 1.15));
const youBeans: Role = { name: "you", look: youLook, at: still(YOU_PALLET), state: (F) => st(posed("hold", F / FPS, 0.3), "tired", F, 3, { prop: "can" }) };
const daveBeans: Role = { name: "dave", look: daveLook, at: still(DAVE_PALLET), state: (F) => st(posed("hold", F / FPS, -0.3), F < BEAT.silence - LEAD ? "worried" : "sad", F, 4, { prop: "can" }) };
const chadMorning: Role = {
  name: "chad", look: chadLook, at: still(CHAD_ROOF),
  state: (F) => {
    const e = exprAt([[0, "smug"], [BEAT.morning, "laughing"], [BEAT.heads, "smug"], [BEAT.give, "laughing"]], F);
    // A little roof dance while the horde bangs below (sway side to side).
    const dance = F >= BEAT.heads && F < BEAT.dave ? Math.sin((F / FPS) * Math.PI * 4) * 6 : 0;
    const pose = F < BEAT.grabs ? chadPose("low", F) : F < BEAT.heads ? chadPose("mouth", F) : chadPose("up", F, { sway: dance });
    return st(withSquash(pose, e.squash), e.expr, F, 7, { blink: false });
  },
};
const YOU_WIN = WINDOW_SPOT.clone().add(new Vector3(-1.3, 0, -0.6)), DAVE_WIN = WINDOW_SPOT.clone();
const daveWindow: Role = {
  name: "dave", look: daveLook, at: still(DAVE_WIN),
  state: (F) => {
    const e = exprAt([[0, "worried"], [BEAT.daveMight, "sad"], [BEAT.asks, "confused"]], F);
    return st(withSquash(posed("hold", F / FPS, F < BEAT.right ? 0.8 : -0.7), e.squash), e.expr, F, 4, { prop: "can" });
  },
};
const youWindow: Role = {
  name: "you", look: youLook, at: still(YOU_WIN),
  state: (F) => {
    const e = exprAt([[0, "tired"], [BEAT.point, "sneaky"]], F);
    return st(withSquash(posed(F >= BEAT.point - LEAD ? "point" : "hold", F / FPS, 0.6), e.squash), e.expr, F, 3, { prop: F < BEAT.point - LEAD ? "can" : undefined });
  },
};
const YOU_CART = CART_IN.clone().add(new Vector3(0.95, 0, -0.65));
const youTape: Role = {
  name: "you", look: youLook, at: still(YOU_CART),
  state: (F) => {
    const e = exprAt([[0, "determined"], [BEAT.hedgehog, "smug"]], F);
    return st(withSquash(posed(F < BEAT.hedgehog - LEAD ? "hold" : "hips", F / FPS, -0.5), e.squash), e.expr, F, 3);
  },
};
// Beside the cart (it stands behind you in the background), seen from the left of the store.
const YOU_DINO = CART_IN.clone().add(new Vector3(-1.0, 0, -0.2)), DAVE_DINO = CART_IN.clone().add(new Vector3(-1.2, 0, -1.4));
const youDino: Role = {
  name: "you", look: youLook, at: still(YOU_DINO),
  state: (F) => st(posed("hold", F / FPS, 0.2), F < BEAT.very - LEAD ? "worried" : "scared", F, 3, { fx: { sweat: Math.min(Math.max((F - BEAT.battery) / 40, 0), 1) } }),
};
const daveTorch: Role = { name: "dave", look: daveLook, at: still(DAVE_DINO), state: (F) => st(posed("hold", F / FPS, -0.6), "scared", F, 4, { prop: "flashlight" }) };
const chadWake: Role = {
  name: "chad", look: chadPyjamas, at: still(CHAD_DOOR),
  state: (F) => {
    const e = exprAt([[0, "tired"], [BEAT.up, "shocked"]], F);
    return st(withSquash(posed(F < BEAT.up - LEAD ? "hold" : "panic", F / FPS, 0), e.squash), e.expr, F, 7, { fx: F >= BEAT.up - LEAD ? { ringEyes: true, bang: F - BEAT.up + LEAD } : {} });
  },
};
const YOU_KICK = at(DOCK.s - 1.0, -FRONT + 0.4, DOCK.floor);
const youKick: Role = {
  name: "you", look: youLook, at: still(YOU_KICK),
  state: (F) => {
    const kick = F >= BEAT.kick - LEAD && F < BEAT.kick + 10;
    const pose: Pose = kick ? { ...posed("hips", F / FPS, 0.8), lift: [0, 58], sway: -6 } : posed("hips", F / FPS, 0.8);
    return st(withSquash(pose, reactSquash(F - BEAT.kick + LEAD)), F < BEAT.kick - LEAD ? "sneaky" : "determined", F, 3);
  },
};
const chadRoofEnd: Role = {
  name: "chad", look: chadPyjamas, at: still(CHAD_ROOF),
  state: (F) => {
    const late = F >= BEAT.but;
    // A slow tremble while he's scared (fast flips read as camera jitter in QA); dead still on the silent last line.
    const shake = late ? 0 : Math.sin(F * 0.8) * 2.5;
    // Left hand hangs with the toothbrush, right hand hugs the megaphone to his belly.
    const arms: Pose["arms"] = [{ at: [0.2, 0.92] }, { at: [-0.24, 0.5], grip: "mitt" }];
    return st({ ...posed("hold", F / FPS, -0.1), arms, sway: shake }, late ? "deadpan" : "scared", F, 7, { fx: { sweat: late ? 0.35 + 0.65 * Math.min((F - BEAT.but) / 60, 1) : ((F % 45) / 45) } });
  },
};
// The last shot: far below, over Chad's shoulder, you and Dave stroll out into the empty street; a tiny wave.
const youStroll: Role = {
  // On FRESHMART's front walk (the near street is hidden by Chad's roof edge from up here), screen right of Chad.
  name: "you", look: youLook, at: (F) => at(35.7 - (F - BEAT.but) * 0.004, -5.1, 0.02),
  state: (F) => (F < BEAT.doesnt - 6 ? st(walkPose((F - BEAT.but) * 0.012, 1, -0.5), "smug", F, 3) : st({ ...posed("point", F / FPS, 0.6), arms: [{ at: [0.2, 0.92] }, { at: [0.55, -0.35], grip: "open" }] }, "smug", F, 3)),
};
const daveStroll: Role = {
  name: "dave", look: daveLook, at: (F) => at(36.5 - (F - BEAT.but) * 0.004, -4.6, 0.02),
  state: (F) => st(walkPose((F - BEAT.but) * 0.012, 1, -0.5), "relieved", F, 4, { prop: "can" }),
};

// ---------------------------------------------------------------- shots

const ROOF_HEAD = CHAD_ROOF.clone().setY(CHAD_ROOF.y + H(chadLook) - 0.25);
/** Low angle from the street up at Chad on his roof (A2 and its mirror, A22). */
// From the far walk across the street, telephoto: Chad full figure over his roof edge.
const LOW_ON_CHAD = { pos: at(CHAD.s + 2.6, -4.9, 1.9), look: CHAD_ROOF.clone().setY(CHAD_ROOF.y + 1.05), fov: 22 };

const A1: S = {
  id: "zombie/A1-toys", from: 0, frames: 126, w: "int-day",
  pose: creep(fo(HEAP, IN(2.6, -8.3), "mcu", youLook, { side: 0.25 }), 126, 0.16),
  cast: inShot(0, [youHeap]), subject: "you", dof: DOF.medium(2.0),
  motes: { center: HEAP.clone().setY(1.6), size: new Vector3(4, 2.6, 4), color: "#ffe6c0" },
};
const A2_FROM = 120;
const A2: S = {
  id: "zombie/A2-chad-laughs", from: A2_FROM, frames: 150, w: "ext-day", crowd: true,
  // Hold on Chad laughing, then a fast pull-out and crane up over the street full of zombies (whip, blurred).
  pose: (f) => {
    const p = reframe(creep(LOW_ON_CHAD, 150, 0.12), { pos: at(13, -2.5, 15), look: at(38, 0.5, 0), fov: 52 }, BEAT.because - A2_FROM, BEAT.because - A2_FROM + 30)(f);
    const k = Math.max(f - (BEAT.because - A2_FROM + 30), 0) * 0.035; // the wide keeps craning up and over
    return { ...p, pos: p.pos.clone().add(new Vector3(0, k * 0.5, -k)) };
  },
  whips: [[BEAT.because - A2_FROM, BEAT.because - A2_FROM + 30]],
  cast: inShot(A2_FROM, [chadMock]), subject: "chad", subjectFrom: 0, dof: POST.dof,
  allow: { "Subject in frame": "the pull-out leaves Chad behind on purpose: the horde is the subject after 'because'" },
};
const A3_FROM = 262;
const A3: S = {
  id: "zombie/A3-chads-fortress", from: A3_FROM, frames: BEAT.on1 - 4 - A3_FROM, w: "ext-day", crowd: true,
  // Crane up the shutters to Chad on the roof (starts low on the steel, tilts up as the camera rises).
  pose: shot({ pos: at(CHAD.s - 0.5, 0.4, 4.2), look: ROOF_HEAD.clone().add(new Vector3(0, 0.1, 0)), fov: 42 }, [reveal(3.0, 5.6), pullOut(0.8)], BEAT.megaphone - A3_FROM),
  cast: inShot(A3_FROM, [chadMock]), subject: "chad", subjectFrom: BEAT.hardware - A3_FROM, dof: POST.dof,
};
const A4_FROM = BEAT.on1 - 4;
const A4_BASE = fo(YOU_SHUTTER, at(CHAD.s + 2.2, -1.5), "mcu", youLook, { side: -0.35 });
const A4: S = {
  id: "zombie/A4-members-only", from: A4_FROM, frames: BEAT.so - A4_FROM + 6, w: "ext-day",
  // Flashback, day 1: you at the shutter; the peep slot opens, then slams on "only" (impact kick).
  pose: (f) => {
    const p = reframe(creep(A4_BASE, BEAT.so - A4_FROM + 6, 0.12), { ...A4_BASE, fov: A4_BASE.fov - 6 }, BEAT.members - A4_FROM - 6, BEAT.members - A4_FROM + 6)(f);
    const k = f - (BEAT.only - A4_FROM), kick = k >= 0 && k < 7 ? 0.025 * (1 - k / 7) * (k % 2 ? -1 : 1) : 0;
    return { ...p, pos: p.pos.clone().add(new Vector3(0, kick, kick)), look: p.look.clone().add(new Vector3(0, kick, kick)) };
  },
  kicks: [[BEAT.only - A4_FROM, BEAT.only - A4_FROM + 7]],
  cast: inShot(A4_FROM, [youKnock]), subject: "you", dof: DOF.medium(2.2),
};
const A5_FROM = BEAT.so - 4;
const A5: S = {
  id: "zombie/A5-beans", from: A5_FROM, frames: BEAT.every - A5_FROM + 8, w: "int-night",
  // Slow lateral glide past the two of you eating cold beans on the pallet, moonlight from the windows.
  pose: shot({ pos: PALLET.clone().add(new Vector3(-0.15, 1.25, 5.4)), look: PALLET.clone().add(new Vector3(-0.3, 1.1, 1.2)), fov: 50 }, [drift(-0.5), pushIn(0.4)], BEAT.every - A5_FROM + 8),
  cast: inShot(A5_FROM, [youBeans, daveBeans]), subject: "you", dof: DOF.medium(3.6),
  motes: { center: PALLET.clone().setY(1.5), size: new Vector3(5, 2.4, 5), color: "#c8c0ff" },
};
const A6_FROM = BEAT.every - 2;
const A6: S = {
  id: "zombie/A6-morning-toy-boy", from: A6_FROM, frames: BEAT.heads - 14 - A6_FROM, w: "ext-dawn", crowd: true,
  // Low angle push on Chad with the megaphone; sound rings ripple out over the street on "Morning".
  pose: reframe(creep({ ...LOW_ON_CHAD, pos: at(CHAD.s - 1.8, -4.9, 1.7), fov: 26 }, BEAT.heads - 14 - A6_FROM, 0.08), { pos: at(CHAD.s - 1.8, -4.9, 1.7), look: ROOF_HEAD.clone(), fov: 15 }, BEAT.morning - A6_FROM - 10, BEAT.morning - A6_FROM + 4),
  cast: inShot(A6_FROM, [chadMorning]), subject: "chad", dof: POST.dof,
};
const A7_FROM = BEAT.heads - 14;
const A7: S = {
  id: "zombie/A7-horde-bangs", from: A7_FROM, frames: BEAT.dave - A7_FROM + 6, w: "ext-dawn", crowd: true,
  // High crane over the horde: it surges to Chad's steel, bangs, gives up and drains away like a tide.
  pose: shot({ pos: at(22, -3.5, 15), look: at(32.5, 3.2, 1), fov: 50 }, [arc(-12, 0.6), pushIn(2.5)], BEAT.dave - A7_FROM + 6),
  cast: inShot(A7_FROM, [chadMorning]), dof: POST.dof, // the horde is the subject
};
const A8_FROM = BEAT.dave - 4;
const A8_BASE = { pos: IN(1.6, 4.6, 1.3), look: DAVE_WIN.clone().setY(1.35), fov: 40 };
const A8: S = {
  id: "zombie/A8-dave-window", from: A8_FROM, frames: BEAT.then - A8_FROM + 6, w: "int-day",
  // Two-shot by the front glass; punch in on Dave on "Dave might be right".
  pose: reframe(creep(A8_BASE, BEAT.then - A8_FROM + 6), fo(DAVE_WIN, IN(1.6, 5.4), "mcu", daveLook), BEAT.daveMight - A8_FROM - 6, BEAT.daveMight - A8_FROM + 8),
  cast: inShot(A8_FROM, [daveWindow, youWindow]), subject: "dave", dof: DOF.medium(3.0),
  motes: { center: DAVE_WIN.clone().setY(1.6), size: new Vector3(5, 2.6, 4), color: "#ffe6c0" },
};
const A9_FROM = BEAT.then - 4;
const A9: S = {
  id: "zombie/A9-hedgehog", from: A9_FROM, frames: BEAT.park - A9_FROM + 6, w: "int-day",
  // Slow orbit around the cart as it fills with taped toys.
  pose: shot({ pos: CART_IN.clone().add(new Vector3(-1.2, 1.7, 2.8)), look: CART_IN.clone().add(new Vector3(0.75, 0.95, -0.5)), fov: 48 }, [arc(26, 0.8), pushIn(0.5)], BEAT.park - A9_FROM + 6),
  cast: inShot(A9_FROM, [youTape]), subject: "you", dof: DOF.medium(2.6),
  motes: { center: CART_IN.clone().setY(1.6), size: new Vector3(5, 2.6, 5), color: "#ffe6c0" },
};
const A10_FROM = BEAT.park - 4;
const A10: S = {
  id: "zombie/A10-ramp-line", from: A10_FROM, frames: DAVE_ASKS - A10_FROM + 2, w: "ext-day", crowd: true,
  // From behind the cart at the top of the ramp, push down the line to Chad's door.
  // Behind and above the cart (it sits low in frame), the line runs down the ramp and across to Chad's shutter.
  pose: shot({ pos: RAMP_TOP.clone().add(new Vector3(-2.3, 2.1, 0.4)), look: at(CHAD.s, FRONT, 0.8), fov: 46 }, [pushIn(1.5)], DAVE_ASKS - A10_FROM + 2),
  dof: POST.dof,
};
const A11_FROM = DAVE_ASKS - 2;
const A11: S = {
  id: "zombie/A11-point", from: A11_FROM, frames: BEAT.generator1 - 6 - A11_FROM, w: "int-day",
  pose: reframe(creep({ pos: IN(1.2, 3.8, 1.3), look: YOU_WIN.clone().setY(1.3), fov: 40 }, BEAT.generator1 - 6 - A11_FROM), fo(YOU_WIN, IN(1.6, 4.2), "mcu", youLook), BEAT.point - A11_FROM - 14, BEAT.point - A11_FROM + 6),
  cast: inShot(A11_FROM, [youWindow, daveWindow]), subject: "you", dof: DOF.medium(3.0),
};
const A12_FROM = BEAT.generator1 - 6;
const A12: S = {
  id: "zombie/A12-generator", from: A12_FROM, frames: BEAT.counting - 18 - A12_FROM + 6, w: "ext-day",
  // Insert: Chad's generator and the neat stack of red cans (hard cut on "generator").
  // Low, from the street side: the generator's panel, gauges and CHAD'S stencil, the red cans beside it.
  pose: creep({ pos: GENERATOR.clone().add(new Vector3(-3.3, 1.05, 2.7)), look: GENERATOR.clone().add(new Vector3(0.2, 0.6, 0.6)), fov: 44 }, BEAT.counting - 18 - A12_FROM + 6, 0.12),
  dof: DOF.medium(3.2),
};
const A13_FROM = BEAT.counting - 18;
const chartPoint = (u: number, v: number) => CHART_AT.clone().add(new Vector3(-0.03, (0.5 - v) * 1.34, -(u - 0.5) * 1.9));
const A13: S = {
  id: "zombie/A13-tally", from: A13_FROM, frames: BEAT.day29 - 8 - A13_FROM, w: "int-night",
  // By flashlight: pan across the tally chart and stop on the last can (circled, skull) on "day".
  pose: (f) => {
    const u = Math.min(Math.max(f / (BEAT.day - A13_FROM + 4), 0), 1), t = 0.5 * u + 0.5 * u * u * (3 - 2 * u); // half linear: an even pan (peak 1.25x the mean speed)
    const look = chartPoint(0.42, 0.45).lerp(chartPoint(0.879, 0.836), t);
    return { pos: look.clone().add(new Vector3(-2.6, 0.05, 0)), look, fov: 32, roll: 0 };
  },
  dof: POST.dof,
};
const A14_FROM = BEAT.day29 - 8;
const A14_FROM_DIR = YOU_DINO.clone().add(new Vector3(-3, 0, 0.7));
const A14_BASE = fo(YOU_DINO, A14_FROM_DIR, "mcu");
const A14: S = {
  id: "zombie/A14-battery", from: A14_FROM, frames: ON_DAY30 - A14_FROM + 4, w: "int-night",
  // Moonlight; you slide a battery into a dinosaur like a bomb squad; slow push, shallow focus.
  pose: reframe(creep(A14_BASE, 150, 0.3), fo(YOU_DINO, A14_FROM_DIR, "cu"), BEAT.very - A14_FROM - 6, BEAT.very - A14_FROM + 8),
  cast: inShot(A14_FROM, [youDino, daveTorch]), subject: "you", dof: DOF.closeup(1.6),
  motes: { center: YOU_DINO.clone().setY(1.4), size: new Vector3(4, 2.4, 4), color: "#c8c0ff" },
};
const A15_FROM = ON_DAY30 - 6;
const A15: S = {
  id: "zombie/A15-generator-dies", from: A15_FROM, frames: BEAT.electric - 12 - A15_FROM + 4, w: "ext-dawn",
  // Dawn, day 30: the generator coughs a sad smoke ring and dies; the floodlights go out one by one.
  // Low from the street side, looking up: the generator against the dawn sky, a floodlight on its pole beyond it.
  pose: creep({ pos: GENERATOR.clone().add(new Vector3(-3.6, 0.85, -2.9)), look: GENERATOR.clone().add(new Vector3(0.3, 1.25, 0.9)), fov: 50 }, BEAT.electric - A15_FROM, 0.14),
  dof: POST.dof,
};
const A16_FROM = BEAT.electric - 12;
const A16: S = {
  id: "zombie/A16-shutter-up", from: A16_FROM, frames: BEAT.thats - A16_FROM + 4, w: "ext-dawn", crowd: true,
  // Tilt up with the rising shutter: Chad inside in pyjamas, toothbrush, ring-eyed shock on "up".
  pose: (f) => {
    const t = smootherstep(Math.min(Math.max((f - 8) / (BEAT.up - A16_FROM - 8), 0), 1));
    const pos = at(CHAD.s - 0.2, 0.2, 1.3 + 0.2 * t);
    return { pos, look: CHAD_DOOR.clone().setY(0.35 + 1.15 * t), fov: 40 - 4 * t, roll: 0 };
  },
  cast: inShot(A16_FROM, [chadWake]), subject: "chad", subjectFrom: BEAT.up - A16_FROM - 4, dof: DOF.medium(5.6),
};
const A17_FROM = BEAT.thats - 4;
const A17: S = {
  id: "zombie/A17-kick", from: A17_FROM, frames: BEAT.kick + 8 - A17_FROM, w: "ext-dawn", crowd: true,
  pose: creep(fo(YOU_KICK, YOU_KICK.clone().add(new Vector3(2.4, 0, 2.6)), "ms"), BEAT.kick + 8 - A17_FROM, 0.04),
  cast: inShot(A17_FROM, [youKick]), subject: "you", dof: DOF.medium(3.4),
};
const A18_FROM = BEAT.kick + 8;
const A18: S = {
  id: "zombie/A18-cart-pov", from: A18_FROM, frames: BEAT.bump - 4 - A18_FROM, w: "ext-dawn", crowd: true,
  // Object POV: riding the front of the cart down the ramp toward Chad's open door.
  pose: (f) => {
    const F = f + A18_FROM, c = cartAt(F), ahead = cartAt(F + 6);
    const pos = c.clone().add(new Vector3(0.45, 1.5, 0));
    return { pos, look: at(CHAD.s, FRONT + 1.0, 1.4 + 0.3 * Math.sin(F * 0.9)), fov: 56, roll: 2.5 * Math.sin(F * 1.3) + (ahead.y < c.y ? -2 : 0) };
  },
  whips: [[0, BEAT.bump - 4 - A18_FROM]],
  dof: POST.dof,
};
const A19_FROM = BEAT.bump - 4;
const A19: S = {
  id: "zombie/A19-trail", from: A19_FROM, frames: YOU_SEE - A19_FROM, w: "ext-dawn", crowd: true,
  // Side-on follow: the cart rattles across the street trailing a rainbow of noise.
  pose: (f) => {
    const c = cartAt(f + A19_FROM);
    return { pos: c.clone().add(new Vector3(-1.2, 1.5, 6.2)), look: c.clone().add(new Vector3(0.6, 0.7, 0)), fov: 46, roll: 0 };
  },
  dof: POST.dof,
};
/** INSERT (x-ray of a toy, 2D in Video.tsx) is a hard cut between A19 and A20. */
export const INSERT = { from: YOU_SEE, to: BEAT.now - 6 };
const A20_FROM = BEAT.now - 6;
const A20: S = {
  id: "zombie/A20-heads-swing", from: A20_FROM, frames: BEAT.and400 - A20_FROM + 6, w: "ext-dawn", crowd: true,
  pose: creep({ pos: at(40, 3.5, 9), look: at(32, 2.2, 0.5), fov: 50 }, BEAT.and400 - A20_FROM + 6, 0.08),
  dof: POST.dof,
};
const A21_FROM = BEAT.and400 - 4;
const A21: S = {
  id: "zombie/A21-stampede", from: A21_FROM, frames: BEAT.chadRoof - A21_FROM + 4, w: "ext-dawn", crowd: true,
  // Crane up from the street to an extreme wide as the horde pours through Chad's door.
  pose: shot({ pos: at(20, -1.5, 1.6), look: at(32, 4.5, 1.6), fov: 50 }, [reveal(-12, -6), pullOut(5), arc(-8, 0.8)], BEAT.chadRoof - A21_FROM + 4),
  dof: POST.dof,
};
const A22_FROM = BEAT.chadRoof;
const A22: S = {
  id: "zombie/A22-chad-roof", from: A22_FROM, frames: BEAT.but - A22_FROM + 4, w: "ext-dawn", crowd: true,
  pose: creep({ pos: at(CHAD.s - 2.4, 3.2, 8.2), look: ROOF_HEAD.clone().add(new Vector3(0, -0.4, 0)), fov: 36 }, BEAT.but - A22_FROM + 4, 0.1),
  cast: inShot(A22_FROM, [chadRoofEnd]), subject: "chad", dof: DOF.medium(4.2),
};
const A23_FROM = BEAT.but;
const A23: S = {
  id: "zombie/A23-silence", from: A23_FROM, frames: FRAMES - A23_FROM, w: "ext-dawn", crowd: true,
  // Close on Chad from behind his roof: silent, sweating; far below, over his shoulder, you and Dave stroll out and wave.
  // Straight behind Chad, aimed a little to screen right (+s) so you two show beside him far below.
  pose: shot({ pos: at(CHAD.s + 0.4, FRONT + 3.3, ROOF_Y + 2.35), look: CHAD_ROOF.clone().setY(ROOF_Y + 0.72).add(new Vector3(-0.35, 0, -0.18)), fov: 42 }, [pushIn(0.3), drift(-0.15)], FRAMES - A23_FROM),
  cast: inShot(A23_FROM, [chadRoofEnd, youStroll, daveStroll]), subject: "chad", dof: DOF.medium(2.9),
};

/** Every shot carries its world's scene tag, light and sun (QA "Light continuity"). */
export const SHOTS: S[] = [A1, A2, A3, A4, A5, A6, A7, A8, A9, A10, A11, A12, A13, A14, A15, A16, A17, A18, A19, A20, A21, A22, A23].map((x) => ({ ...x, scene: WORLD[x.w].scene, light: WORLD[x.w].light, sun: WORLD[x.w].sun }));
export const PLAN: Plan = { slug: "zombie-supermarket-30-days", shots: SHOTS, words };
