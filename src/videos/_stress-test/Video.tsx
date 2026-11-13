import { ThreeCanvas } from "@remotion/three";
import { useMemo } from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Object3D, Vector3 } from "three";
import { barrel } from "../../../kit/toon/build/props";
import { PRESETS, PresetName } from "../../../kit/toon/build/presets";
import { Street, StreetOpts, spine } from "../../../kit/toon/build/street";
import { drift, frameOn, pushIn, reframe, reveal, shot, ShotSize } from "../../../kit/toon/camera";
import { CaptionWord, Captions } from "../../../kit/toon/Captions";
import { Character, blinkAt, poseAt, posed, reactSquash, runPose, walkPose } from "../../../kit/toon/cast";
import type { CharState, Look } from "../../../kit/toon/cast";
import { Composer, DOF, Dof, POST } from "../../../kit/toon/Composer";
import { Dust } from "../../../kit/toon/dust";
import { EXTRAS } from "../../../kit/toon/extras";
import type { Expr } from "../../../kit/toon/face";
import { glowSprite, lightPatch, sunDisc } from "../../../kit/toon/glow";
import { CastSpec, Plan, QAPlan, Shot, ShotCamera } from "../../../kit/toon/guard";
import { LIGHTS, sunDirection } from "../../../kit/toon/lights";
import { youLook } from "../../../kit/toon/protagonist";
import { Insert } from "../../../kit/toon/Insert";
import { Stamp } from "../../../kit/toon/Stamp";
import { ToonWorld } from "../../../kit/toon/world";

/**
 * _stress-test v2: 20 s visual stress test (no audio, not for posting), rebuilt after the reference comparison
 * (2026-11-14): eleven 1.5-2.5 s shots in five places, reference staging (close-ups framed with frameOn, two-shots
 * that overlap and look at each other, foreground props framing the lens), camera rhythm (holds, then quick
 * reframes; a blurred whip), poses that ease, ink limbs, glows, light patches, captions and the DAY stamp.
 *   A   0-149 day suburb, backlit sun: A1 tracking MS walk, A2 CU reaction (cut), A3 wide + fast reframe (cut)
 *   B 140-289 golden west: B1 two-shot over a foreground barrel, B2 whip pan + impact kick (cut)
 *   C 290-409 night snow (hard cut): C1 crane reveal + run, C2 MS with lantern glow (cut)
 *   D 400-499 store by day: D1 MS framed by a shelf end, D2 reframe down the depth ladder (cut)
 *   E 492-599 abandoned store at night: E1 MS in slatted moonlight, E2 CU by the barricade (cut); captions + stamp
 *   F 600-659 2D x-ray insert (hard cut): the explainer-graphic layer (ref14)
 * 2026-11-13 reference pass: real holds (creep 0.05) and quick 10-14 f reframes, dust motes in the night and indoor
 * shots, foreground blur on the framing props, tighter shot sizes and the new grade.
 * Characters are placed by COMPOSITION frame (continuity across cuts); shot-local frames come in from Remotion.
 */
const XF = 8;
const E = Object.fromEntries(EXTRAS.map((x) => [x.name, x.look])) as Record<string, Look>;
const [THIN, ROUND, OLD, CHILD, PEAR, STOCKY] = ["tall thin + bowler", "short round + flat cap", "old + moustache", "child + glasses", "pear + bun", "stocky + nightcap"].map((n) => E[n]);
const ALLOW = { "Reaction timing": "stress test: no narration, swaps on a fixed clock" };

type W = { preset: PresetName; scene: string; light: keyof typeof LIGHTS; sun: Vector3; opts: StreetOpts; shadow: { center: Vector3; size: number }; sunPos?: Vector3; snow?: boolean; extras?: () => Object3D[]; motes?: { center: Vector3; size: Vector3; color: string } };
type S = Shot & { from: number; dof: Dof; w: W };

const st = (pose: CharState["pose"], expr: Expr, f: number, seed: number, extra: Partial<CharState> = {}): CharState => ({ pose, expr, blink: blinkAt(f, 30, seed), fx: {}, ...extra });
/** A character placed by composition frame F; `state` gets F too. Converted per shot to shot-local frames. */
type Role = { name: string; look: Look; at: (F: number) => Vector3; state: (F: number) => CharState };
const inShot = (from: number, roles: Role[]): CastSpec[] => roles.map((r) => ({ name: r.name, look: r.look, at: (f) => r.at(f + from), state: (f) => r.state(f + from) }));
const placed = (o: Object3D, at: Vector3) => (o.position.copy(at), o);
/** A hold: a barely-there push (refs R11/R13 hold still 13-18 % of frames, then move fast). */
const creep = (p: ReturnType<typeof frameOn>, frames: number, k = 0.05) => shot(p, [pushIn(k * p.pos.distanceTo(p.look)), drift(0.03 * p.pos.distanceTo(p.look))], frames);
const head = (look: Look) => (look === CHILD ? 1.25 : look === THIN ? 1.7 : 1.58);
const fo = (at: Vector3, from: Vector3, size: ShotSize, look: Look, o: Parameters<typeof frameOn>[3] = {}) => frameOn(at, from, size, { head: head(look), ...o });

// ===================================================================== A: day suburb, low backlit sun
const A = spine(0).at;
const SUN_A = sunDirection({ ...LIGHTS.day, az: 10, el: 13 }, A(-3, 0, 1.5), A(25, 0, 3.6));
const WA: W = {
  preset: "modern_suburb", scene: "suburb day", light: "day", sun: SUN_A,
  opts: { seed: 102, length: 60, curve: 0, lightCenter: A(14, 0, 2) }, shadow: { center: A(14, 0), size: 34 },
  sunPos: A(-3, 0, 1.5).addScaledVector(SUN_A, 150),
};
const walker = (name: string, look: Look, s0: number, x: number, v: number, seed: number, expr: Expr): Role => ({
  name, look, at: (F) => A(s0 - (v * F) / 30, x), state: (F) => st(walkPose((v * F) / 30, 1, x > 0.5 ? -0.25 : 0.25), expr, F, seed),
});
const YOU_A = walker("you", youLook, 15.5, 0.5, 1.2, 1, "determined");
const OLD_A: Role = {
  name: "old", look: OLD, at: () => A(9.5, -2.2),
  state: (F) => st({ ...poseAt([[0, "crossed"], [85, "panic"]], F, 4, 0.45), squash: reactSquash(F - 85) }, F < 85 ? "smug" : "shocked", F, 4, { fx: { bang: F >= 85 ? F - 85 : undefined } }),
};
const CROWD_A: Role[] = [
  walker("thin", THIN, 21, -1.6, 1.0, 2, "smug"),
  walker("round", ROUND, 25, 1.8, 1.4, 3, "laughing"),
  walker("child", CHILD, 29, 0.95, 1.5, 5, "relieved"),
  walker("pear", PEAR, 23, -2.6, 1.1, 6, "worried"),
  walker("stocky", STOCKY, 33, -0.5, 1.3, 7, "confused"),
];
const A1: S = {
  id: "_stress-test/A1-walk-ms", from: 0, frames: 60, scene: WA.scene, light: WA.light, sun: SUN_A, w: WA,
  // Tracking MS: the lens backs up at walking speed, a third off-axis; the crowd fills the street behind.
  pose: (f) => ({ ...fo(YOU_A.at(f), A(0, 1.2), "ms", youLook, { side: 0.45 }), roll: 0 }),
  cast: inShot(0, [YOU_A, OLD_A, ...CROWD_A]), subject: "you", dof: DOF.medium(1.8),
};
const A2_FROM = 60, A2_BASE = fo(OLD_A.at(0), A(14, -1.0), "mcu", OLD, { side: 0.05 });
const A2: S = {
  id: "_stress-test/A2-reaction-cu", from: A2_FROM, frames: 45, scene: WA.scene, light: WA.light, sun: SUN_A, w: WA,
  // Hold on the smirk, then punch in on the shock (reframe 22-34) and hold.
  pose: reframe(creep(A2_BASE, 45), { ...A2_BASE, fov: 32 }, 22, 32),
  cast: inShot(A2_FROM, [OLD_A, YOU_A]), subject: "old", allow: ALLOW, dof: DOF.closeup(1.0),
};
const A3_FROM = 105, A3_END = fo(YOU_A.at(140), A(7, 4.4), "fs", youLook); // seen from where the shot starts: the reframe mostly turns
const A3: S = {
  id: "_stress-test/A3-wide-reframe", from: A3_FROM, frames: 45, scene: WA.scene, light: WA.light, sun: SUN_A, w: WA,
  // Low wide from the verge across the crowd and the sun, then a quick motivated reframe onto "you".
  pose: reframe(shot({ pos: A(7, 4.4, 0.9), look: A(13.5, 0.8, 1.9), fov: 52 }, [pushIn(0.6)], 45), A3_END, 2, 44),
  whips: [[12, 36]], // a fast reframe (refs: 29-40 px/f, always blurred): the motion blur pass carries it
  cast: inShot(A3_FROM, [YOU_A, OLD_A, ...CROWD_A]), subject: "you", subjectFrom: 30, dof: POST.dof,
};

// ===================================================================== B: golden west
const B = spine(0).at;
const SUN_B = sunDirection(LIGHTS.golden, B(8, 0, 1.5), B(30, 0, 1.5));
const WB: W = {
  preset: "wild_west", scene: "west golden", light: "golden", sun: SUN_B,
  opts: { seed: 202, length: 50, curve: 0, lightCenter: B(14, 0, 2), extra: () => [placed(barrel(), B(10.2, -0.55))] },
  shadow: { center: B(13, 0), size: 26 },
};
const YOU_B: Role = {
  name: "you", look: youLook, at: () => B(12.2, 0.85),
  state: (F) => st(poseAt([[0, "hold"], [180, "point"], [230, "hold"]], F, 5, -0.45), F < 180 ? "smug" : "laughing", F, 8, { prop: F < 180 || F >= 230 ? "mug" : undefined }),
};
const STOCKY_B: Role = {
  name: "stocky", look: STOCKY, at: () => B(13.6, -0.75),
  state: (F) => st({ ...poseAt([[0, "crossed"], [170, "hips"]], F, 5, 0.45), squash: reactSquash(F - 170) }, F < 170 ? "deadpan" : "angry", F, 9),
};
const CHILD_B: Role = {
  name: "child", look: CHILD, at: () => B(15.6, 2.0),
  state: (F) => st({ ...poseAt([[0, "idle"], [265, "panic"]], F, 3, -0.3), squash: reactSquash(F - 265) }, F < 265 ? "neutral" : "shocked", F, 10, { fx: { ringEyes: F >= 265, bang: F >= 265 ? F - 265 : undefined } }),
};
const B1: S = {
  id: "_stress-test/B1-two-shot", from: 140, frames: 75, scene: WB.scene, light: WB.light, sun: SUN_B, w: WB,
  // Two-shot over the barrel: "you" foreground right (partly cut by the frame), stocky across; slow push.
  pose: shot({ pos: B(9.0, 0.7, 1.3), look: B(13, -0.25, 1.2), fov: 44 }, [pushIn(0.9), drift(-0.35)], 75),
  cast: inShot(140, [YOU_B, STOCKY_B, CHILD_B]), subject: "stocky", allow: ALLOW, dof: DOF.medium(3.6),
};
const B2_FROM = 215, B2_POS = B(10.4, 0.6, 1.4), WHIP: [number, number] = [18, 28], KICK = 50;
const B2: S = {
  id: "_stress-test/B2-whip-kick", from: B2_FROM, frames: 75, scene: WB.scene, light: WB.light, sun: SUN_B, w: WB,
  pose: (f) => {
    const t = Math.min(Math.max((f - WHIP[0]) / (WHIP[1] - WHIP[0]), 0), 1), e = t * t * (3 - 2 * t);
    const look = STOCKY_B.at(0).setY(1.35).lerp(CHILD_B.at(0).setY(1.05), e);
    const pos = B2_POS.clone().addScaledVector(look.clone().sub(B2_POS).normalize(), 0.03 * f).add(new Vector3(0.01 * f, 0.003 * f, 0));
    const k = f - KICK, kick = k >= 0 && k < 7 ? 0.03 * (1 - k / 7) * (k % 2 ? -1 : 1) : 0;
    const right = look.clone().sub(pos).cross(new Vector3(0, 1, 0)).normalize();
    return { pos: pos.addScaledVector(right, kick), look: look.addScaledVector(right, kick), fov: 40, roll: 0 };
  },
  whips: [WHIP], kicks: [[KICK, KICK + 7]],
  cast: inShot(B2_FROM, [STOCKY_B, CHILD_B]), subject: "child", subjectFrom: 30, allow: ALLOW, dof: DOF.medium(5.5),
};

// ===================================================================== C: night snow village
const C = spine(0).at;
const SUN_C = sunDirection(LIGHTS.night, C(-2, 0, 4.5), C(30, 0, 2));
const WC: W = { preset: "snowy_village", scene: "village night", light: "night", sun: SUN_C, opts: { seed: 404, length: 60, curve: 0, lightCenter: C(12, 0, 2) }, shadow: { center: C(12, 0), size: 30 }, snow: true };
// Air you can see: motes drifting in the light (ref13); warm by lamps, lavender by moonlight.
const WARM_MOTES = (at: Vector3) => ({ center: at.clone().setY(1.6), size: new Vector3(5, 2.6, 5), color: "#ffc98a" });
const RUN_END = 350;
const YOU_C: Role = {
  name: "you", look: youLook, at: (F) => C(15.5 - (3.4 * (Math.min(F, RUN_END) - 290)) / 30, 0.4),
  state: (F) => (F < RUN_END ? st(runPose((3.4 * (F - 290)) / 30), "scared", F, 12, { fx: { sweat: (F % 20) / 20 } }) : st(posed("idle", F / 30, 0.3), F < 380 ? "worried" : "determined", F, 12, { prop: "lantern" })), // lantern hand stays put: its glow sprite is fixed
};
const SIDE_C: Role[] = [
  { name: "thin", look: THIN, at: () => C(8, -2.6), state: (F) => st(posed("crossed", F / 30, 0.3), "deadpan", F, 13) },
  { name: "pear", look: PEAR, at: () => C(13, 2.7), state: (F) => st(posed("chin", F / 30, -0.3), "worried", F, 14) },
];
const C1: S = {
  id: "_stress-test/C1-crane-run", from: 290, frames: 60, scene: WC.scene, light: WC.light, sun: SUN_C, w: WC,
  pose: shot({ pos: C(1.5, 0.3, 3.0), look: C(20, 0, 2.2), fov: 56 }, [reveal(2.2, 1.6), pushIn(2.2)], 60), // starts 0.8 m up, never under the snow
  cast: inShot(290, [YOU_C, ...SIDE_C]), subject: "you", dof: POST.dof,
};
/** Where a held lantern hangs (right hand, low) as seen from `cam`: screen-right of the card, 0.6 m up. */
const lanternAt = (at: Vector3, cam: Vector3) => {
  const dir = cam.clone().sub(at).setY(0).normalize();
  return at.clone().add(new Vector3(-dir.z, 0, dir.x).multiplyScalar(-0.24)).setY(0.6);
};
const C2_BASE = fo(YOU_C.at(RUN_END), C(2, -0.6), "ms", youLook);
const C2: S = {
  id: "_stress-test/C2-lantern-ms", from: 350, frames: 60, scene: WC.scene, light: WC.light, sun: SUN_C, w: { ...WC, motes: WARM_MOTES(YOU_C.at(RUN_END)), extras: () => [glowSprite(lanternAt(YOU_C.at(RUN_END), C2_BASE.pos), "#ffb35a", 1.0, 1.4)] },
  pose: reframe(creep(C2_BASE, 60), fo(YOU_C.at(RUN_END), C(2, -0.6), "mcu", youLook), 30, 42),
  cast: inShot(350, [YOU_C, ...SIDE_C]), subject: "you", allow: ALLOW, dof: DOF.medium(1.8),
};

// ===================================================================== D: store by day
const D = (s: number, x: number, y = 0) => new Vector3(x, y, -s);
const SUN_D = sunDirection(LIGHTS.interior, D(3, 1, 1.3), D(30, 1, 1.2));
const WD: W = { preset: "supermarket_interior", scene: "store day", light: "interior", sun: SUN_D, opts: { seed: 7 }, shadow: { center: D(18, 0), size: 26 }, motes: { center: D(11, 1, 1.8), size: new Vector3(4, 2.4, 8), color: "#fff2d8" } };
const D_CAST: Role[] = [
  { name: "you", look: youLook, at: () => D(10, 1.1), state: (F) => st(poseAt([[0, "hold"], [440, "shrug"]], F, 5, 0.2), F < 440 ? "worried" : "confused", F, 15, { prop: F < 440 ? "can" : undefined }) },
  { name: "pear", look: PEAR, at: () => D(12.6, 0.35), state: (F) => st(posed("hold", F / 30, 0.4), "smug", F, 16, { prop: "box" }) },
  { name: "child", look: CHILD, at: () => D(17, 1.5), state: (F) => st(posed("point", F / 30), "laughing", F, 17) },
  { name: "thin", look: THIN, at: () => D(23, 0.7), state: (F) => st(posed("idle", F / 30), "tired", F, 18, { prop: "phone" }) },
  { name: "stocky", look: STOCKY, at: () => D(31, 1.2), state: (F) => st(posed("shrug", F / 30), "confused", F, 19) },
];
const D1: S = {
  id: "_stress-test/D1-shelf-ms", from: 400, frames: 55, scene: WD.scene, light: WD.light, sun: SUN_D, w: WD,
  // MS framed by the shelf end on the right, pear overlapping behind.
  pose: creep({ pos: D(6.9, 2.15, 1.3), look: D(10, 0.95, 1.25), fov: 46 }, 55),
  cast: inShot(400, D_CAST), subject: "you", allow: ALLOW, dof: DOF.medium(2.6),
};
const D2: S = {
  id: "_stress-test/D2-depth-ladder", from: 455, frames: 45, scene: WD.scene, light: WD.light, sun: SUN_D, w: WD,
  // Down the aisle past five characters (3 m to 30 m), then a quick reframe tight on the far one (thin ink at range).
  pose: reframe(creep({ pos: D(6.5, 0.55, 1.35), look: D(30, 1.0, 1.2), fov: 50 }, 45, 0.02), { pos: D(7.2, 0.55, 1.35), look: D(31, 1.2, 1.0), fov: 26 }, 14, 32),
  cast: inShot(455, D_CAST), subject: "stocky", allow: ALLOW, dof: POST.dof,
};

// ===================================================================== E: abandoned store, night
const MOON = new Vector3(0.25, Math.sin((24 * Math.PI) / 180), 1).normalize();
const WE: W = {
  preset: "supermarket_abandoned", scene: "store night", light: "moonInterior", sun: MOON, opts: { seed: 7 }, shadow: { center: D(18, 0), size: 26 },
  // Slatted moonlight across the floor and up the end of a shelf (light patches, no volumetrics).
  motes: { center: D(9.5, 1, 1.6), size: new Vector3(4, 2.4, 6), color: "#c8c0ff" },
  extras: () => [lightPatch(D(9.2, 0.9, 0), new Vector3(0, 1, 0), 2.6, 1.6, "#b8b0f0", 0.55, [1, 5], 0.45), lightPatch(D(8.2, 2.53, 1.0), new Vector3(-1, 0, 0), 1.5, 1.2, "#b8b0f0", 0.4, [1, 4], 0.4)],
};
const YOU_E: Role = {
  name: "you", look: youLook, at: (F) => D(10.4 - (0.5 * Math.min(F - 492, 50)) / 30, 1.0),
  state: (F) => (F < 542 ? st(walkPose((0.5 * (F - 492)) / 30, 1, 0.2), "scared", F, 20, { prop: "flashlight" }) : st(posed("idle", F / 30, 0.3), "worried", F, 20, { prop: "flashlight" })),
};
const OLD_E: Role = { name: "old", look: OLD, at: () => D(5.2, -2.6), state: (F) => st(posed("idle", F / 30, 0.4), F < 575 ? "worried" : "scared", F, 21, { prop: "lantern" }) };
const E1: S = {
  id: "_stress-test/E1-slats-ms", from: 492, frames: 56, scene: WE.scene, light: WE.light, sun: MOON, w: WE,
  pose: creep(fo(YOU_E.at(520), D(14, 1.4), "ms", youLook), 56),
  cast: inShot(492, [YOU_E, OLD_E]), subject: "you", allow: ALLOW, dof: DOF.medium(1.8),
};
const E2_BASE = fo(OLD_E.at(0), D(9, -1.2), "cu", OLD);
const E2: S = {
  id: "_stress-test/E2-barricade-cu", from: 548, frames: 52, scene: WE.scene, light: WE.light, sun: MOON, w: { ...WE, extras: () => [...WE.extras!(), glowSprite(lanternAt(OLD_E.at(0), E2_BASE.pos), "#ffb35a", 0.9, 1.2)] },
  pose: reframe(creep(E2_BASE, 52), { ...E2_BASE, fov: 36.5 }, 20, 32),
  cast: inShot(548, [OLD_E, YOU_E]), subject: "old", allow: ALLOW, dof: DOF.closeup(1.0),
};

const SHOTS = [A1, A2, A3, B1, B2, C1, C2, D1, D2, E1, E2];
const INSERT_FROM = 600;
export const STRESS_FRAMES = 660;

/** F: x-ray of "you" after 30 days in the store (flat SVG, 100 x 178 units): bones, an empty stomach that pulses. */
const XRay: React.FC = () => {
  const pulse = 0.55 + 0.45 * Math.sin((useCurrentFrame() / 30) * Math.PI * 2.2);
  const bone = { stroke: "#cfefff", strokeWidth: 2.2, strokeLinecap: "round" as const, fill: "none" };
  return (
    <g>
      <circle cx={50} cy={46} r={17} {...bone} fill="#7fd4ff22" />
      <circle cx={44} cy={44} r={3.6} fill="#02060f" /><circle cx={56} cy={44} r={3.6} fill="#02060f" />
      <path d="M43 55 h14" {...bone} strokeWidth={1.6} />
      <path d="M50 63 V120" {...bone} />
      {[72, 78, 84, 90].map((y) => <path key={y} d={`M50 ${y} q-14 2 -16 9 M50 ${y} q14 2 16 9`} {...bone} strokeWidth={1.5} />)}
      <ellipse cx={51} cy={106} rx={8} ry={6} fill={`rgba(255,90,61,${0.25 + 0.5 * pulse})`} stroke="#ff8a5a" strokeWidth={1} />
      <path d="M38 122 q12 -6 24 0" {...bone} />
      <path d="M41 124 L37 165 M59 124 L63 165 M36 74 L26 112 M64 74 L74 112" {...bone} />
    </g>
  );
};

/** Caption + key-word test over D-E (no audio: timing only exercises the caption renderer). */
const WORDS: CaptionWord[] = ["You", "have", "*thirty*", "days.", "The", "lights", "are", "*dying.*", "Something", "*moved.*"].map((text, i) => {
  const start = (i < 5 ? 13.5 + i * 0.36 : 16.6 + (i - 5) * 0.34);
  return { text, start, end: start + 0.32 };
});
const PLAN: Plan = { slug: "_stress-test", shots: SHOTS, words: WORDS };

const SunDisc: React.FC<{ at: Vector3; cam: Vector3 }> = ({ at, cam }) => {
  const m = useMemo(() => sunDisc(10), []);
  m.position.copy(at);
  m.lookAt(cam);
  return <primitive object={m} />;
};

const ShotView: React.FC<{ s: S }> = ({ s }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const w = s.w, preset = PRESETS[w.preset], light = LIGHTS[preset.light];
  const extras = useMemo(() => w.extras?.() ?? [], [w]);
  return (
    <ThreeCanvas width={width} height={height}>
      <ShotCamera {...s} />
      <ToonWorld preset={light} sunDir={w.sun} shadow={w.shadow} />
      <Street preset={preset} light={light} opts={w.opts} />
      {w.sunPos && <SunDisc at={w.sunPos} cam={s.pose(f).pos} />}
      {w.snow && <Dust center={C(10, 0, 3)} size={new Vector3(14, 6, 26)} color="#f4f6ff" strength={1.6} count={1400} />}
      {w.motes && <Dust center={w.motes.center} size={w.motes.size} color={w.motes.color} strength={0.9} count={260} />}
      {extras.map((o, i) => <primitive key={i} object={o} />)}
      {s.cast?.map((c) => <Character key={c.name} position={c.at(f)} state={c.state(f)} look={c.look} />)}
      <Composer dof={s.dof} />
    </ThreeCanvas>
  );
};

const Dissolve: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const opacity = interpolate(useCurrentFrame(), [0, XF], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export const StressTest: React.FC = () => (
  <AbsoluteFill style={{ background: "black" }}>
    <QAPlan plan={PLAN} />
    {SHOTS.map((s, i) => (
      <Sequence key={s.id} from={s.from} durationInFrames={s.frames}>
        {i > 0 && s.from < SHOTS[i - 1].from + SHOTS[i - 1].frames ? <Dissolve><ShotView s={s} /></Dissolve> : <ShotView s={s} />}
      </Sequence>
    ))}
    <Sequence from={INSERT_FROM} durationInFrames={STRESS_FRAMES - INSERT_FROM}>
      <Insert kind="xray" title="X-RAY" readout="STOMACH: EMPTY"><XRay /></Insert>
    </Sequence>
    <Stamp text="DAY 30" at={462} hold={34} />
    <Captions words={WORDS} />
  </AbsoluteFill>
);
