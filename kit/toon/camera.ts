import { PerspectiveCamera, Vector3 } from "three";

/**
 * Camera presets. A shot is a base pose plus moves; every move is a function of eased progress u (0..1), so the
 * whole camera is driven by the frame number. Moves compose: `shot(base, [pushIn(2), arc(12)])`.
 *
 * Easing: smootherstep blended with 45 % linear, so a move never stops at its ends (no still hold: the ends still
 * creep at ~45 % of the average speed) while reading as a glide (peak ~1.5x average). Targets (skill): real holds on beats (up to 60 f), quick 10-15 f moves up to
 * ~50 px/f, roll <= 5 deg. Check with `python scripts/measure.py <video>`.
 */
export type CamPose = { pos: Vector3; look: Vector3; fov: number; roll: number };
export type Move = (p: CamPose, u: number) => CamPose;

export const smootherstep = (t: number) => {
  const x = Math.min(Math.max(t, 0), 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
};
/** Glide easing: smootherstep with a 45 % linear floor so the start and end still creep. */
export const glide = (t: number) => {
  const x = Math.min(Math.max(t, 0), 1);
  return 0.55 * smootherstep(x) + 0.45 * x;
};

const UP = new Vector3(0, 1, 0);
const clone = (p: CamPose): CamPose => ({ pos: p.pos.clone(), look: p.look.clone(), fov: p.fov, roll: p.roll });
const clampRoll = (deg: number) => Math.max(-5, Math.min(5, deg));

/** Slow sideways drift (m, + = camera right) with an optional rise; the look point drifts half as far. */
export const drift = (side: number, rise = 0): Move => (p, u) => {
  const q = clone(p);
  const right = q.look.clone().sub(q.pos).cross(UP).normalize();
  q.pos.addScaledVector(right, side * u).y += rise * u;
  q.look.addScaledVector(right, side * u * 0.5);
  return q;
};

/** Move toward the look point by `dist` m; optional fov change (deg) for a dolly-zoom flavour. */
export const pushIn = (dist: number, fovTo?: number): Move => (p, u) => {
  const q = clone(p);
  const dir = q.look.clone().sub(q.pos).normalize();
  q.pos.addScaledVector(dir, dist * u);
  if (fovTo !== undefined) q.fov = p.fov + (fovTo - p.fov) * u;
  return q;
};

export const pullOut = (dist: number, fovTo?: number): Move => pushIn(-dist, fovTo);

/** Orbit around the look point by `deg` (+ = counter-clockwise from above), with an optional roll lean. */
export const arc = (deg: number, roll = 0): Move => (p, u) => {
  const q = clone(p);
  const off = q.pos.clone().sub(q.look).applyAxisAngle(UP, (deg * Math.PI * u) / 180);
  q.pos.copy(q.look).add(off);
  q.roll = clampRoll(q.roll + roll * Math.sin(Math.PI * u));
  return q;
};

/** Follow a moving target: the look point tracks `target(u)`, the lens trails it at a fixed offset and tilts. */
export const followTilt = (target: (u: number) => Vector3, offset: Vector3, tiltDeg = 0): Move => (p, u) => {
  const q = clone(p);
  const t = target(u);
  q.look.copy(t).y += Math.tan((tiltDeg * Math.PI * u) / 180) * offset.length();
  q.pos.copy(t).add(offset);
  return q;
};

/** Reveal: start low and looking down at `downM` below the look point, crane up `rise` m and tilt up to the subject. */
export const reveal = (rise: number, downM: number): Move => (p, u) => {
  const q = clone(p);
  q.pos.y += rise * (u - 1);
  q.look.y -= downM * (1 - u);
  return q;
};

/** Constant roll lean (deg, clamped to +-5) that eases in with the move. */
export const roll = (deg: number): Move => (p, u) => ({ ...clone(p), roll: clampRoll(p.roll + deg * u) });

/** A shot: base pose + moves over `frames`, starting at frame `from`. Returns the pose at frame f. */
export const shot = (base: Omit<CamPose, "roll"> & { roll?: number }, moves: Move[], frames: number, from = 0) => (f: number): CamPose => {
  const u = glide((f - from) / Math.max(frames - 1, 1));
  return moves.reduce((p, m) => m(p, u), { pos: base.pos.clone(), look: base.look.clone(), fov: base.fov, roll: base.roll ?? 0 });
};

/** Put a pose on a three camera (call in a layout effect every frame). */
export const applyCam = (camera: PerspectiveCamera, p: CamPose) => {
  camera.position.copy(p.pos);
  camera.fov = p.fov;
  camera.near = 0.05;
  camera.far = 1200;
  camera.updateProjectionMatrix();
  camera.up.set(0, 1, 0);
  camera.lookAt(p.look);
  camera.rotateZ((p.roll * Math.PI) / 180);
};

/**
 * Shot sizes from the references, as the frame HEIGHT in m around a standing card character (heads are 0.5 m wide,
 * so in a 9:16 frame a "close-up" with the head at ~45 % of the width also shows the torso, exactly as the refs do):
 * cu head ~45 % of the width, mcu ~36 %, ms ~30 %, fs ~19 % (whole body + ground), ws the place.
 */
// 2026-11-13: tighter (ms was 3.0 and read full-length; refs crop mediums at the waist, mcu at the chest).
export const SHOT_SIZE = { cu: 1.45, mcu: 1.75, ms: 2.1, fs: 4.6, ws: 9 } as const;
export type ShotSize = keyof typeof SHOT_SIZE;
/**
 * Base pose framing a character standing at `at` (soles), camera toward `from` (any point on the camera side),
 * at eye level by default. `size` sets the distance from the fov so the framed span fills the frame height; the
 * eyes land about a third down the frame.
 */
export const frameOn = (at: Vector3, from: Vector3, size: ShotSize, o: { fov?: number; head?: number; height?: number; side?: number } = {}) => {
  const fov = o.fov ?? (size === "cu" ? 34 : size === "mcu" ? 38 : size === "ms" ? 42 : 48), head = o.head ?? 1.55;
  const span = SHOT_SIZE[size], dist = span / 2 / Math.tan((fov * Math.PI) / 360);
  // Eyes about a third down the frame for every size (refs), never looking below the knees.
  const eye = head - 0.17, lookY = Math.max(eye - span * 0.18, 0.5);
  const dir = from.clone().sub(at).setY(0).normalize();
  const right = new Vector3(-dir.z, 0, dir.x);
  const pos = at.clone().addScaledVector(dir, dist).addScaledVector(right, o.side ?? 0).setY(o.height ?? lookY - 0.12); // slightly below the look point: a gentle low angle (refs), not eye level
  return { pos, look: at.clone().setY(lookY), fov };
};

/**
 * Reframe inside a shot: glide the pose toward the framing `to` between shot-local frames `a` and `b`
 * (smootherstep: ~10 f in, ~10 f out, the reference's motivated move), holding before and after. The base pose's
 * own push keeps the holds creeping. Reference rhythm: hold 1-3 s, glide 15-25 f at up to ~22 px/f, hold again.
 */
export const reframe = (pose: (f: number) => CamPose, to: Omit<CamPose, "roll">, a: number, b: number) => (f: number): CamPose => {
  const p = pose(f), t = smootherstep((f - a) / Math.max(b - a, 1));
  if (t <= 0) return p;
  const d = pose(b); // the base pose's own drift carries on after the glide
  return {
    pos: p.pos.clone().lerp(to.pos.clone().add(p.pos.clone().sub(d.pos)), t),
    look: p.look.clone().lerp(to.look.clone().add(p.look.clone().sub(d.look)), t),
    fov: p.fov + (to.fov - p.fov) * t,
    roll: p.roll,
  };
};
