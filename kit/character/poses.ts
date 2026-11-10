import { steppedFrame } from "../time";

/**
 * Joint rotations in radians (Euler XYZ, parent space). Character faces +z, his left is +x.
 * Arms/legs hang down: x < 0 swings forward. Elbow x < 0 bends, knee x > 0 bends.
 * Outward: left z > 0, right z < 0. Spine/neck x > 0 leans forward; neck y > 0 looks to his left.
 * `y` moves the pelvis (metres at design height): crouch/sit drop it.
 */
export const JOINTS = [
  "root", "spine", "neck",
  "shoulderL", "elbowL", "shoulderR", "elbowR",
  "hipL", "kneeL", "ankleL", "hipR", "kneeR", "ankleR",
] as const;
export type Joint = (typeof JOINTS)[number];
export type Rot = [number, number, number];
export type KeyPose = Partial<Record<Joint, Rot>> & { y?: number };
/** Keyposes played in a loop, `frames` (30fps) apart, interpolated. */
export type PoseClip = { frames: number; keys: KeyPose[] };

const swapSide = (j: Joint) => (j.endsWith("L") ? j.slice(0, -1) + "R" : j.endsWith("R") ? j.slice(0, -1) + "L" : j) as Joint;

/** Left-right mirror: swap sides, flip y/z rotations. */
export const mirror = (k: KeyPose): KeyPose => {
  const out: KeyPose = { y: k.y };
  for (const j of JOINTS) {
    const v = k[j];
    if (v) out[swapSide(j)] = [v[0], -v[1], -v[2]];
  }
  return out;
};

/** Symmetric pose: `left` holds left-side joints only (mirrored to the right), `center` the rest. */
const both = (left: KeyPose, center: KeyPose = {}): KeyPose => ({ ...left, ...mirror(left), ...center });

const relaxed = both({ shoulderL: [0.05, 0, 0.035], elbowL: [-0.2, 0, 0] }); // arms hang close, never an A-pose

const walkContact: KeyPose = {
  y: -0.025, spine: [0.04, 0.08, 0],
  hipR: [-0.45, 0, 0], kneeR: [0.1, 0, 0], ankleR: [0.15, 0, 0],
  hipL: [0.35, 0, 0], kneeL: [0.3, 0, 0], ankleL: [-0.1, 0, 0],
  shoulderR: [0.35, 0, -0.07], elbowR: [-0.15, 0, 0], shoulderL: [-0.35, 0, 0.07], elbowL: [-0.4, 0, 0],
};
const walkPass: KeyPose = {
  spine: [0.04, 0, 0],
  hipR: [0.05, 0, 0], kneeR: [0.05, 0, 0],
  hipL: [-0.2, 0, 0], kneeL: [0.8, 0, 0], ankleL: [-0.3, 0, 0],
  shoulderR: [0, 0, -0.07], elbowR: [-0.25, 0, 0], shoulderL: [0, 0, 0.07], elbowL: [-0.25, 0, 0],
};

const runStride: KeyPose = {
  y: -0.04, spine: [0.25, 0.12, 0], neck: [-0.15, 0, 0],
  hipR: [-0.9, 0, 0], kneeR: [0.5, 0, 0], ankleR: [0.2, 0, 0],
  hipL: [0.5, 0, 0], kneeL: [1.3, 0, 0], ankleL: [0.2, 0, 0],
  shoulderR: [0.8, 0, -0.1], elbowR: [-1.3, 0, 0], shoulderL: [-0.9, 0, 0.1], elbowL: [-1.5, 0, 0],
};
const runFlight: KeyPose = {
  y: 0.04, spine: [0.25, 0, 0], neck: [-0.15, 0, 0],
  hipR: [0.1, 0, 0], kneeR: [0.4, 0, 0],
  hipL: [-0.4, 0, 0], kneeL: [1.6, 0, 0], ankleL: [-0.2, 0, 0],
  shoulderR: [0.1, 0, -0.1], elbowR: [-1.4, 0, 0], shoulderL: [-0.1, 0, 0.1], elbowL: [-1.4, 0, 0],
};

const lookArms = both({ shoulderL: [0, 0, 0.15], elbowL: [-0.3, 0, 0] });
const lookLeft = { ...lookArms, neck: [0, 0.7, 0], spine: [0, 0.2, 0] } satisfies KeyPose;
const lookRight = mirror(lookLeft);

const phone: KeyPose = {
  // Solved numerically so the grip lands at the right ear; no wrist joint, so the elbow rides high.
  ...relaxed, neck: [0.05, 0, 0.06],
  shoulderR: [-1.7, 0.25, 0.15], elbowR: [-2.3, 0, 0],
};

const panicA: KeyPose = {
  y: -0.03, spine: [-0.15, 0, 0], neck: [-0.2, 0.3, 0],
  ...both({ hipL: [-0.15, 0, 0.1], kneeL: [0.25, 0, 0], ankleL: [-0.1, 0, 0] }),
  shoulderL: [-0.8, 0, 1.2], elbowL: [-1.6, 0, 0], shoulderR: [-0.6, 0, -1.3], elbowR: [-1.7, 0, 0],
};
const panicB: KeyPose = {
  ...panicA, neck: [-0.2, -0.3, 0],
  shoulderL: [-1.2, 0, 0.9], elbowL: [-2.0, 0, 0], shoulderR: [-1.0, 0, -1.0], elbowR: [-1.3, 0, 0],
};

const pointAt: KeyPose = { ...relaxed, spine: [0, -0.15, 0], neck: [0, -0.1, 0], shoulderR: [-1.5, 0, 0.05], elbowR: [-0.05, 0, 0] };

export const POSES = {
  idle: {
    frames: 30,
    keys: [
      { ...relaxed, neck: [0.05, 0, 0] },
      { ...both({ shoulderL: [0.05, 0, 0.05], elbowL: [-0.24, 0, 0] }), spine: [0.03, 0, 0], neck: [0.02, 0, 0], y: -0.005 },
    ],
  },
  walk: { frames: 8, keys: [walkContact, walkPass, mirror(walkContact), mirror(walkPass)] },
  run: { frames: 5, keys: [runStride, runFlight, mirror(runStride), mirror(runFlight)] },
  crouch: {
    frames: 30,
    keys: [
      both(
        { hipL: [-1.2, 0, 0.15], kneeL: [2.0, 0, 0], ankleL: [-0.8, 0, 0], shoulderL: [-0.6, 0, 0.1], elbowL: [-0.9, 0, 0] },
        { y: -0.33, spine: [0.45, 0, 0], neck: [-0.3, 0, 0] },
      ),
    ],
  },
  // On the floor, legs out: no seat needed.
  sit: {
    frames: 30,
    keys: [
      both(
        { hipL: [-1.6, 0, 0.1], kneeL: [0.3, 0, 0], ankleL: [0.4, 0, 0], shoulderL: [-0.5, 0, 0.15], elbowL: [-0.6, 0, 0] },
        { y: -0.665, spine: [-0.1, 0, 0], neck: [0.1, 0, 0] },
      ),
    ],
  },
  lookAround: { frames: 15, keys: [lookLeft, lookLeft, lookRight, lookRight] },
  phoneToEar: { frames: 30, keys: [phone, { ...phone, neck: [0.08, 0.05, 0.08], spine: [0.02, 0, 0] }] },
  // Right arm up to a high shelf.
  reach: {
    frames: 20,
    keys: [
      { ...relaxed, spine: [-0.1, -0.15, 0], neck: [-0.4, 0, 0], shoulderR: [-2.2, 0, 0.1], elbowR: [-0.1, 0, 0] },
      { ...relaxed, spine: [-0.12, -0.15, 0], neck: [-0.45, 0, 0], shoulderR: [-2.4, 0, 0.1], elbowR: [-0.05, 0, 0], y: 0.015 },
    ],
  },
  panic: { frames: 4, keys: [panicA, panicB] },
  point: { frames: 12, keys: [pointAt, { ...pointAt, shoulderR: [-1.45, 0, 0.05], spine: [0.03, -0.15, 0] }] },
} satisfies Record<string, PoseClip>;

export type PoseName = keyof typeof POSES;
export const POSE_NAMES = Object.keys(POSES) as PoseName[];

const ZERO: Rot = [0, 0, 0];

/** Pose at `frame`, stepped to 15fps and linearly blended between the clip's keyposes. */
export const samplePose = (name: PoseName, frame: number) => {
  const { frames, keys }: PoseClip = POSES[name];
  const t = steppedFrame(frame) / frames;
  const i = Math.floor(t);
  const w = t - i;
  const a = keys[i % keys.length];
  const b = keys[(i + 1) % keys.length];
  const mix = (p: number, q: number) => p + (q - p) * w;
  return {
    y: mix(a.y ?? 0, b.y ?? 0),
    rot: (j: Joint): Rot => {
      const p = a[j] ?? ZERO;
      const q = b[j] ?? ZERO;
      return [mix(p[0], q[0]), mix(p[1], q[1]), mix(p[2], q[2])];
    },
  };
};
