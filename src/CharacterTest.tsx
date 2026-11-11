import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Vector3 } from "three";
import { CharState, Character, blinkAt, posed, reactSquash, walkPose } from "../kit/toon/cast";
import { Composer, Dof, POST } from "../kit/toon/Composer";
import { glide } from "../kit/toon/camera";
import { Dust } from "../kit/toon/dust";
import { CastSpec, Plan, QAPlan, Shot, ShotCamera } from "../kit/toon/guard";
import { LIGHTS } from "../kit/toon/lights";
import { ToonWorld } from "../kit/toon/world";
import { DUST, SHADOW, SUN, Street, at } from "./ToonTest";

// 8 s in the dusk street. 0-3 s walk toward the lens, 3-5 s stop under the lamp and look around, 5-6 s hard cut to a
// shocked close-up, 6-8 s 10-frame dissolve to a wide with a slow push-in. Each shot is its own Sequence + canvas.
const FPS = 30;
const START = { s: 25.7, x: 3.75 }; // on the pavement all the way (a diagonal from the road sank him into the curb)
const WALK_Y = 0.02; // pavement height (build/street.tsx)
const STOP = { s: 22.6, x: 3.75 }; // under the lamp at s 22 (right side, in front of the warm facades)
const PATH = Math.hypot(START.s - STOP.s, START.x - STOP.x);
const WALK_END = 89, DECEL = 12;
const V = PATH / ((WALK_END - DECEL) / FPS + DECEL / FPS / 2);
const smooth = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const clamp01 = (t: number) => Math.min(Math.max(t, 0), 1);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Distance walked by frame f (constant speed, then a 12-frame stop). */
const walked = (f: number) => {
  const tc = WALK_END - DECEL;
  if (f <= tc) return (V * f) / FPS;
  const d = Math.min(f, WALK_END) - tc;
  return (V * tc) / FPS + (V * (d - (d * d) / (2 * DECEL))) / FPS;
};
const posAt = (f: number) => {
  const k = Math.min(walked(f) / PATH, 1);
  return at(lerp(START.s, STOP.s, k), lerp(START.x, STOP.x, k), WALK_Y);
};
const P = posAt(WALK_END); // where he stops

const stateAt = (f: number): CharState => {
  const look = interpolate(f, [90, 98, 110, 122, 134, 149], [0, -1, -1, 1, 1, 0.2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const amount = interpolate(f, [WALK_END - DECEL, WALK_END], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const t = (f - WALK_END) / FPS;
  const pose = f < WALK_END ? walkPose(walked(f), amount) : posed(f < 112 ? "idle" : "chin", t, look);
  if (f < 90) return { pose, expr: "neutral", blink: blinkAt(f, FPS, 3), fx: {} };
  if (f < 150) return { pose, expr: "worried", blink: blinkAt(f, FPS, 3), fx: {} };
  // Reaction: squash/stretch over 4 frames, arms up.
  // Hands up beside the head: the panic pose's hands sit outside a head-and-shoulders frame (arms read as a rope).
  const up = { at: [0.3, -0.62] as [number, number], grip: "open" as const };
  return { pose: { ...posed("panic", t, 0), arms: [up, up], squash: reactSquash(f - 150) }, expr: "shocked", blink: false, fx: { ringEyes: true, sweat: clamp01((f - 152) / 24), ...(f < 190 ? { bang: f - 150 } : {}) } };
};

type Cam = { pos: Vector3; look: Vector3; fov: number; dof: Dof };
const v0 = (() => {
  const camEnd = at(STOP.s - 5.1, STOP.x + 0.4, 0); // wall side of him, so the street is behind him
  return camEnd.sub(P).setY(0);
})();
const camAt = (f: number, wide: boolean): Cam => {
  if (wide) {
    const t = glide((f - 180) / 59); // never stops at its ends (smooth() held still for 15 frames)
    return { pos: at(lerp(10.4, 12.0, t), 0.5, 1.75), look: at(26, lerp(2.2, 3.4, t), 2.4) /* pan: a push alone reads as still */, fov: 54, dof: POST.dof };
  }
  if (f < 90) {
    // Low, ahead of him, slowly pulling back.
    const c = posAt(f), cs = lerp(START.s, STOP.s, Math.min(walked(f) / PATH, 1));
    const d = lerp(4.2, 5.1, smooth(f / 89));
    const pos = at(cs - d, lerp(START.x, STOP.x, Math.min(walked(f) / PATH, 1)) + 0.4, 0.9);
    return { pos, look: c.clone().setY(1.0), fov: 50, dof: { maxPx: 8, near: d + 2, far: d + 18 } };
  }
  if (f < 150) {
    // Arc toward the street and push in to a medium shot.
    const t = smooth((f - 90) / 59);
    const r = lerp(5.1, 2.5, t), th = lerp(0, 0.2, t); // + swings toward the wall, the view opens onto the street
    const dir = v0.clone().normalize().applyAxisAngle(new Vector3(0, 1, 0), th);
    return { pos: P.clone().addScaledVector(dir, r).setY(lerp(0.9, 1.12, t)), look: P.clone().setY(lerp(1.0, 1.12, t)), fov: lerp(50, 42, t), dof: { maxPx: 10, near: r + 1.2, far: r + 10 } };
  }
  // Hard cut: close-up, creeping in.
  const t = (f - 150) / 40;
  const r = lerp(2.35, 2.15, t); // head and shoulders: frame width ~ .37 r at fov 36
  // Looks along the street (the facade is only 1.65 m away: no room on the wall side); a slow 4 deg arc away from
  // the wall keeps the hold creeping (the 20 cm push alone moved the background < 0.5 px/f).
  const dir = v0.clone().normalize().applyAxisAngle(new Vector3(0, 1, 0), 0.08 - 0.07 * t);
  return { pos: P.clone().addScaledVector(dir, r).setY(1.3), look: P.clone().setY(1.36), fov: 36, dof: { maxPx: 13, near: r + 0.6, far: r + 4 } };
};

/** Plan (QA layer 1): the same functions draw the card and feed the checks; frames are shot-local. */
const you = (from: number): CastSpec => ({
  name: "you",
  at: (lf) => (lf + from < WALK_END ? posAt(lf + from) : P),
  state: (lf) => stateAt(lf + from),
});
const spec = (id: string, from: number, frames: number, wide: boolean, kicks?: Shot["kicks"]): Shot => ({
  kicks,
  id: `CharacterTest/${id}`,
  from,
  frames,
  pose: (lf) => ({ ...camAt(lf + from, wide), roll: 0 }),
  cast: [you(from)],
  subject: "you",
  scene: "dusk street",
  light: "dusk",
  sun: SUN,
});
const SHOTS = [spec("walk", 0, 150, false), spec("closeup", 150, 40, false, [[0, 4]]) /* the shock squash + bang lands on the cut */, spec("wide", 180, 60, true)];
const PLAN: Plan = { slug: "CharacterTest", shots: SHOTS };

const ShotView: React.FC<{ shot: Shot; wide?: boolean }> = ({ shot, wide = false }) => {
  const lf = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <ThreeCanvas width={width} height={height}>
      <ShotCamera {...shot} />
      <ToonWorld preset={LIGHTS.dusk} sunDir={SUN} shadow={SHADOW} />
      <Street bollards={false} />
      <Dust center={DUST.center} size={DUST.size} />
      {shot.cast?.map((c) => <Character key={c.name} position={c.at(lf)} state={c.state(lf)} />)}
      <Composer dof={camAt(lf + (shot.from ?? 0), wide).dof} />
    </ThreeCanvas>
  );
};

const Dissolve: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const opacity = interpolate(useCurrentFrame(), [0, 10], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export const CharacterTest: React.FC = () => (
  <AbsoluteFill style={{ background: "black" }}>
    <QAPlan plan={PLAN} />
    <Sequence durationInFrames={150}>
      <ShotView shot={SHOTS[0]} />
    </Sequence>
    <Sequence from={150} durationInFrames={40}>
      <ShotView shot={SHOTS[1]} />
    </Sequence>
    <Sequence from={180}>
      <Dissolve>
        <ShotView shot={SHOTS[2]} wide />
      </Dissolve>
    </Sequence>
  </AbsoluteFill>
);
