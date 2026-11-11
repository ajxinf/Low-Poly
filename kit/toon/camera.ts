import { PerspectiveCamera, Vector3 } from "three";

/**
 * Camera presets. A shot is a base pose plus moves; every move is a function of eased progress u (0..1), so the
 * whole camera is driven by the frame number. Moves compose: `shot(base, [pushIn(2), arc(12)])`.
 *
 * Easing: smootherstep blended with 45 % linear, so a move never stops at its ends (no still hold: the ends still
 * creep at ~45 % of the average speed) while reading as a glide (peak ~1.5x average). Targets (skill): ~3 px/f typical, 10-25 px/f on moves, roll <= 5 deg, no still hold of
 * 12+ frames. Check with `python scripts/measure.py <video>`.
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
