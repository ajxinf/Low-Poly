/**
 * Body poses (front view), independent of expression and build. Hands are placed relative to the shoulder in
 * units of full arm length: x + = outward, y + = down. Elbows are solved (2-bone IK) and bend outward by default.
 */
export type Grip = "mitt" | "fist" | "open" | "point";
export type Arm = {
  at: [number, number];
  /** +1 elbow out/down (default), -1 elbow in/up. */
  bend?: number;
  grip?: Grip;
  /** back = behind the torso, front = over the face (chin, facepalm). */
  layer?: "back" | "front";
};
export type Pose = {
  bob: number; // upper body up (+) / down (-), design px
  sway: number; // upper-body tilt, degrees (+ = toward the card's right)
  lift: [number, number]; // foot lift, left / right
  arms: [Arm, Arm]; // left, right
  look: number; // head turn -1 (card left) .. 1 (card right)
  knee?: number; // extra outward knee bend, px
  tilt?: number; // head tilt, degrees
  lean?: number; // 0..1 head forward toward the lens (bigger, lower)
  shrug?: number; // shoulders up, px
  squash?: number; // reaction squash (+) / stretch (-), 1 = 8 %
};

const hang: Arm = { at: [0.2, 0.92] };
export const REST: Pose = { bob: 0, sway: 0, lift: [0, 0], arms: [hang, hang], look: 0 };

const both = (a: Arm): [Arm, Arm] => [a, a];

/** Static poses; `posed()` adds breathing. */
export const POSES = {
  idle: REST,
  hips: { ...REST, arms: both({ at: [0.2, 0.58], grip: "fist" }), sway: -1.5 },
  crossed: { ...REST, arms: [{ at: [-0.5, 0.3], grip: "fist" }, { at: [-0.46, 0.22], grip: "fist" }], tilt: -3 },
  point: { ...REST, arms: [hang, { at: [0.7, -0.55], grip: "point" }], sway: 4, look: 0.4 },
  shrug: { ...REST, arms: both({ at: [0.66, 0.02], grip: "open" }), shrug: 22, tilt: 7 },
  chin: { ...REST, arms: [{ at: [-0.62, 0.48], grip: "fist" }, { at: [-0.16, -0.14], grip: "fist", layer: "front" }], tilt: 6, look: -0.3 },
  facepalm: { ...REST, arms: [hang, { at: [-0.1, -0.85], grip: "open", layer: "front" }], tilt: 10, bob: -6 },
  panic: { ...REST, arms: both({ at: [0.72, -0.55], grip: "open" }), bob: 10 },
  lean: { ...REST, arms: both({ at: [-0.08, 0.72], layer: "back" }), lean: 1, knee: 12, bob: -14, tilt: -5 },
  // Hands meet in front of the belly (inward from the shoulders) so a held prop sits between them.
  hold: { ...REST, arms: both({ at: [-0.24, 0.5], grip: "mitt" }), tilt: 3 },
  // Action poses (pilot critique 2026-11-13: hands must DO things on screen). Animated ones are in actionPose().
  knock: { ...REST, arms: [hang, { at: [0.36, 0.08], grip: "fist" }], lean: 0.3, look: 0.5 },
  tape: { ...REST, arms: [{ at: [-0.05, 0.42], grip: "mitt" }, { at: [0.5, 0.36], grip: "mitt" }], tilt: 5, lean: 0.4 },
  eat: { ...REST, arms: [{ at: [-0.22, 0.52], grip: "mitt" }, { at: [-0.14, -0.2], grip: "point", layer: "front" }], tilt: -3 },
  bang: { ...REST, arms: both({ at: [0.42, -0.42], grip: "fist" }), bob: 6 },
  wave: { ...REST, arms: [hang, { at: [0.55, -0.55], grip: "open" }], sway: 3, look: 0.3 },
  kick: { ...REST, arms: both({ at: [0.6, 0.2], grip: "open" }), lift: [0, 70], sway: -7, knee: 20 },
} satisfies Record<string, Pose>;
export type PoseName = keyof typeof POSES | "walk" | "run";
/**
 * Animated action poses at time t (s): knock (two raps a second), tape (arms pull a strip across), wave (hand
 * swings), bang (fists pound). Use them on the beat they belong to; `posed` gives the still versions.
 */
export const actionPose = (name: "knock" | "tape" | "wave" | "bang", t: number, look = 0): Pose => {
  const p: Pose = { ...POSES[name], look: look || POSES[name].look };
  const s = Math.sin(t * Math.PI * 2 * (name === "tape" ? 1.5 : 2.2));
  const a = p.arms.map((x) => ({ ...x, at: [...x.at] as [number, number] })) as [Arm, Arm];
  if (name === "knock") a[1].at = [0.36 + 0.08 * Math.max(s, 0), 0.08];
  if (name === "tape") a[1].at = [0.2 + 0.32 * (0.5 + 0.5 * s), 0.36];
  if (name === "wave") a[1].at = [0.55 + 0.14 * s, -0.55];
  if (name === "bang") { a[0].at = [0.42, -0.42 + 0.3 * Math.max(s, 0)]; a[1].at = [0.42, -0.42 + 0.3 * Math.max(-s, 0)]; }
  return { ...p, arms: a, bob: p.bob + 4 * Math.abs(s) };
};
export const POSE_NAMES: PoseName[] = [...(Object.keys(POSES) as (keyof typeof POSES)[]), "walk", "run"];

/** One step (m). A full walk cycle is two steps. */
export const STRIDE = 0.8;

/**
 * Front-view walk at distance `dist` (m); `amount` 0..1 blends from rest (starts and stops).
 * Feet alternate lifting, the body bobs (highest at the passing pose) and leans over the planted leg,
 * arms swing against the legs.
 */
export const walkPose = (dist: number, amount = 1, look = 0): Pose => {
  const s = Math.sin((dist / (2 * STRIDE)) * Math.PI * 2), k = amount;
  return {
    ...REST,
    bob: 26 * Math.abs(s) * k,
    sway: 2.5 * s * k,
    lift: [Math.max(0, s) * 32 * k, Math.max(0, -s) * 32 * k],
    knee: 4 * k,
    arms: [
      { at: [0.2 - 0.06 * s * k, 0.93 - 0.14 * s * k] },
      { at: [0.2 + 0.06 * s * k, 0.93 + 0.14 * s * k] },
    ],
    look,
  };
};

/** Run: bigger lifts, pumping bent arms with fists, forward head. `dist` in m (strides are 1.4 x longer). */
export const runPose = (dist: number, look = 0): Pose => {
  const s = Math.sin((dist / (2.8 * STRIDE)) * Math.PI * 2);
  return {
    ...REST,
    bob: 20 + 26 * Math.abs(s),
    sway: 5 * s,
    lift: [Math.max(0, s) * 70, Math.max(0, -s) * 70],
    knee: 16,
    arms: [
      { at: [0.24, 0.42 - 0.22 * s], grip: "fist" },
      { at: [0.24, 0.42 + 0.22 * s], grip: "fist" },
    ],
    lean: 0.4,
    tilt: -4 * s,
    look,
  };
};

/** Pose by name at time t (s): breathing bob and a slow weight shift on top of the static poses. */
export const posed = (name: PoseName, t = 0, look?: number): Pose => {
  if (name === "walk") return walkPose(t * 1.3, 1, look);
  if (name === "run") return runPose(t * 3.2, look);
  const p: Pose = POSES[name];
  const breath = Math.sin((t * Math.PI * 2) / 3);
  return {
    ...p,
    bob: p.bob + 5 * breath,
    sway: p.sway + 0.8 * Math.sin((t * Math.PI * 2) / 4.3),
    arms: p.arms.map((a) => ({ ...a, at: [a.at[0], a.at[1] - 0.012 * breath] })) as [Arm, Arm],
    look: look ?? p.look,
  };
};

/** Standing idle (kept for older shots). */
export const idlePose = (t: number, look = 0) => posed("idle", t, look);

/**
 * Squash and stretch on a reaction, `f` frames after it: squash, overshoot into a stretch, settle (4 frames, ~8 %).
 */
export const reactSquash = (f: number) => (f < 0 || f > 3 ? 0 : [1, -0.8, -0.3, 0.1][Math.floor(f)]);

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** In-between of two poses (t 0..1): numbers and hand targets blend, grips switch halfway. */
export const blendPose = (a: Pose, b: Pose, t: number): Pose => {
  const k = Math.min(Math.max(t, 0), 1), e = k * k * (3 - 2 * k);
  const num = (x?: number, y?: number) => lerp(x ?? 0, y ?? 0, e);
  return {
    ...(e < 0.5 ? a : b),
    bob: num(a.bob, b.bob), sway: num(a.sway, b.sway), look: num(a.look, b.look),
    lift: [num(a.lift[0], b.lift[0]), num(a.lift[1], b.lift[1])],
    tilt: num(a.tilt, b.tilt), lean: num(a.lean, b.lean), shrug: num(a.shrug, b.shrug), knee: num(a.knee, b.knee),
    arms: [0, 1].map((i) => ({ ...(e < 0.5 ? a.arms[i] : b.arms[i]), at: [lerp(a.arms[i].at[0], b.arms[i].at[0], e), lerp(a.arms[i].at[1], b.arms[i].at[1], e)] })) as [Arm, Arm],
  };
};
/**
 * A pose timeline: [frame, pose name] keys; each change eases over `ease` frames (4 by default, refs never pop a
 * pose in one frame). Breathing from `posed` stays on.
 */
export const poseAt = (keys: [number, PoseName][], f: number, ease = 4, look?: number): Pose => {
  let i = 0;
  while (i + 1 < keys.length && keys[i + 1][0] <= f) i++;
  const cur = posed(keys[i][1], f / 30, look);
  if (i === 0 || f - keys[i][0] >= ease) return cur;
  return blendPose(posed(keys[i - 1][1], f / 30, look), cur, (f - keys[i][0]) / ease);
};
