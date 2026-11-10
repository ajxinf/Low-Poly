import { Matrix4, Vector3 } from "three";
import { box, facets, loft, P, Ring, solid, sym, toGeometry, transform, triCount, twoSided, V } from "./loft";

// Joint layout in metres at design height. Character faces +z, his left is +x.
export const PELVIS_Y = 0.94;
export const HIP = { x: 0.085, y: -0.05 };
export const THIGH = 0.4;
export const SHIN = 0.42; // ankle ends 0.07 above the floor
export const SPINE_Y = 0.05;
export const TORSO = 0.44;
export const SHOULDER = { x: 0.235, y: 0.4 };
export const UPPER_ARM = 0.28;
export const FOREARM = 0.25;
export const NECK = 0.07;
const HEAD_H = 0.275; // chin to crown; hair adds ~0.03
/** Hair top ≈ 1.80 m; head + hair ≈ 0.3 m ≈ 6 heads: a slightly big head. */
export const DESIGN_HEIGHT = 1.8;
export const HEAD_CENTER_Y = PELVIS_Y + SPINE_Y + TORSO + NECK + 0.14;
/** Right-hand attach point, in the wrist frame: palm centre (his right palm faces +x). */
export const HAND_GRIP: [number, number, number] = [0.025, -0.05, 0];

type Side = 1 | -1; // +1 = his left (+x)

// ---------- Head: 9 rings × 12, nose wedge, ears ----------

/** Face texture u: the front half (|θ|<90°) gets 80% of the texture so the face has the pixels. */
export const faceU = (th: number) => {
  const a = Math.abs(th);
  const u = a <= Math.PI / 2 ? 0.4 * Math.sin(a) : 0.4 + (0.1 * (a - Math.PI / 2)) / (Math.PI / 2);
  return 0.5 + Math.sign(th) * u;
};
const headUV = (p: P): [number, number] => [faceU(Math.atan2(p[0], p[2] - 0.005)), p[1] / HEAD_H];

// Half profiles back → his right → front (0°,30°…180° from the back).
const HEAD_RINGS: Ring[] = [
  { y: 0.0, r: sym([0.05, 0.05, 0.055, 0.06, 0.07, 0.075, 0.075]), z: 0.01, ao: 0.45 }, // under the jaw
  { y: 0.025, r: sym([0.07, 0.072, 0.066, 0.062, 0.064, 0.076, 0.098]), ao: sym([1, 1, 0.8, 0.75, 0.8, 0.9, 1]) }, // chin
  { y: 0.065, r: sym([0.088, 0.088, 0.085, 0.082, 0.08, 0.09, 0.11]) }, // jaw angle, mouth
  { y: 0.105, r: sym([0.094, 0.096, 0.093, 0.09, 0.095, 0.104, 0.112]) }, // cheekbones
  { y: 0.135, r: sym([0.098, 0.1, 0.096, 0.092, 0.094, 0.098, 0.104]) }, // eyes (sockets set in)
  { y: 0.163, r: sym([0.1, 0.1, 0.097, 0.093, 0.1, 0.112, 0.114]) }, // brow ridge
  { y: 0.2, r: sym([0.1, 0.098, 0.095, 0.09, 0.093, 0.099, 0.104]) }, // forehead
  { y: 0.24, r: sym([0.087, 0.085, 0.081, 0.078, 0.08, 0.085, 0.088]) },
  { y: 0.265, r: sym([0.055, 0.053, 0.05, 0.048, 0.05, 0.053, 0.055]) },
].map((ring, i) => (i >= 1 && i <= 6 ? { ...ring, r: ring.r.map((r, k) => ([2, 3, 4, 8, 9, 10].includes(k) ? r * 0.93 : r)) } : ring)); // narrower, longer-looking face

const nose: P[] = [
  [0, 0.155, 0.108], // bridge
  [0, 0.096, 0.139], // tip
  [0.019, 0.086, 0.112],
  [-0.019, 0.086, 0.112],
  [0, 0.083, 0.118], // under the tip
];
const ear = (s: Side) =>
  twoSided(
    facets(
      [
        [[s * 0.088, 0.152, 0.004], [s * 0.088, 0.094, 0.012], [s * 0.104, 0.098, -0.012]],
        [[s * 0.088, 0.152, 0.004], [s * 0.104, 0.098, -0.012], [s * 0.11, 0.146, -0.022]],
      ],
      [0, 0.12, 0],
      headUV,
      0.8,
    ),
  );

const head: V[] = [
  ...loft(HEAD_RINGS, { capTop: 0.012, capBottom: true, uMap: faceU, v: [0, 0.265 / HEAD_H] }),
  ...solid(nose, [[0, 2, 1], [0, 1, 3], [2, 4, 1], [3, 1, 4]], headUV),
  ...ear(1),
  ...ear(-1),
];

// ---------- Hair: skull cap + 25 swept shards ----------

const HAIR_C: P = [0, 0.175, -0.005];
const HAIR_R: P = [0.112, 0.12, 0.126];

const hairCap = loft(
  [
    // Hairline: low at the back, above the ears at the sides, high at the front.
    { y: sym([0.07, 0.085, 0.11, 0.16, 0.19, 0.205, 0.212]), r: sym([0.1, 0.102, 0.104, 0.104, 0.108, 0.114, 0.118]) },
    { y: sym([0.15, 0.16, 0.18, 0.2, 0.222, 0.232, 0.236]), r: sym([0.116, 0.114, 0.112, 0.108, 0.112, 0.118, 0.122]) },
    { y: sym([0.235, 0.24, 0.25, 0.258, 0.265, 0.27, 0.272]), r: sym([0.102, 0.1, 0.096, 0.094, 0.096, 0.1, 0.104]) },
    { y: 0.29, r: sym([0.07, 0.068, 0.065, 0.064, 0.065, 0.068, 0.07]) },
  ],
  { capTop: 0.022 },
);

/** [θ° round from the front (+ = his left), elevation°, sweep direction, length, width] */
type ShardSpec = [number, number, P, number, number];
const SHARDS: ShardSpec[] = [
  // top: broad clumps swept back and a little to his right, front ones lifting for volume
  [0, 75, [-0.2, 0.1, -1], 0.08, 0.05],
  [30, 60, [-0.1, 0.1, -1], 0.08, 0.05],
  [-30, 60, [-0.4, 0.1, -1], 0.08, 0.05],
  [65, 45, [0.1, 0, -1], 0.07, 0.045],
  [-65, 45, [-0.3, 0, -1], 0.07, 0.045],
  [15, 52, [-0.1, 0.5, -0.5], 0.07, 0.05],
  [-18, 52, [-0.3, 0.5, -0.5], 0.07, 0.05],
  // back volume, falling down the back of the head
  [180, 55, [0, -0.3, -1], 0.075, 0.045],
  [135, 45, [0.3, -0.5, -1], 0.07, 0.042],
  [-135, 45, [-0.3, -0.5, -1], 0.07, 0.042],
  [180, 25, [0, -1, -0.3], 0.07, 0.04],
  [125, 15, [0.4, -1, -0.2], 0.06, 0.035],
  [-125, 15, [-0.4, -1, -0.2], 0.06, 0.035],
  [155, 30, [0.1, -0.8, -0.6], 0.06, 0.04],
  [-155, 30, [-0.1, -0.8, -0.6], 0.06, 0.04],
  // fringe: one sharp V over the middle of the forehead, two short side clumps
  [0, 40, [0.05, -1, 0.4], 0.09, 0.035],
  [-20, 42, [-0.45, -0.8, 0.3], 0.06, 0.035],
  [22, 42, [0.45, -0.8, 0.3], 0.055, 0.035],
  // sides over the top of the ears
  [62, 22, [0.3, -1, -0.5], 0.05, 0.035],
  [-62, 22, [-0.3, -1, -0.5], 0.05, 0.035],
  [95, 32, [0.35, -0.6, -0.7], 0.06, 0.04],
  [-95, 32, [-0.35, -0.6, -0.7], 0.06, 0.04],
  [-45, 40, [-0.8, -0.4, 0], 0.06, 0.04],
];

// A 4-sided spike (4 tris) rooted under the cap surface. v runs root → tip so strands follow the spike.
const shard = ([thDeg, elDeg, sweep, len, w]: ShardSpec): V[] => {
  const th = (thDeg * Math.PI) / 180;
  const el = (elDeg * Math.PI) / 180;
  const unit = new Vector3(Math.cos(el) * Math.sin(th), Math.sin(el), Math.cos(el) * Math.cos(th));
  const root = new Vector3(HAIR_R[0] * unit.x, HAIR_R[1] * unit.y, HAIR_R[2] * unit.z).add(new Vector3(...HAIR_C));
  const n = unit.clone().normalize();
  const dir = new Vector3(...sweep).normalize().addScaledVector(n, 0.25).normalize();
  const across = new Vector3().crossVectors(dir, n).normalize();
  const up = new Vector3().crossVectors(across, dir).normalize();
  const base = root.clone().addScaledVector(n, -0.012);
  const corner = (a: number, b: number) => base.clone().addScaledVector(across, a * w).addScaledVector(up, b * w * 0.45).toArray() as P;
  const ps: P[] = [corner(1, 1), corner(-1, 1), corner(-1, -1), corner(1, -1), base.clone().addScaledVector(dir, len).toArray() as P];
  const tip = new Vector3(...ps[4]);
  const vOf = (p: P) => new Vector3(...p).distanceTo(tip) < 1e-6 ? 1 : 0;
  const uOf = (p: P) => (new Vector3(...p).sub(base).dot(across) > 0 ? 0.25 : 0.75) + thDeg / 1000;
  return solid(ps, [[0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]], (p) => [uOf(p), vOf(p)], (p) => 0.75 + 0.25 * vOf(p));
};

const hair: V[] = [...hairCap, ...SHARDS.flatMap(shard)];

// ---------- Torso (t-shirt) and jacket shell ----------

// Torso half profiles at waist, belly, chest, armpit, shoulder, neck base.
const TORSO_Y = [0, 0.12, 0.25, 0.34, 0.4, 0.445];
const TORSO_R = [
  [0.09, 0.1, 0.13, 0.145, 0.13, 0.102, 0.095],
  [0.095, 0.105, 0.135, 0.15, 0.137, 0.108, 0.1],
  [0.1, 0.115, 0.15, 0.165, 0.157, 0.128, 0.118],
  [0.1, 0.12, 0.16, 0.18, 0.162, 0.128, 0.112],
  [0.09, 0.115, 0.18, 0.215, 0.17, 0.105, 0.09],
  [0.06, 0.068, 0.085, 0.09, 0.085, 0.07, 0.065],
];
// Tee lives inside the jacket: dark where the jacket covers it, lit down the open front.
const TEE_AO = sym([0.45, 0.45, 0.5, 0.5, 0.6, 0.85, 1]);
const tee = loft(
  TORSO_Y.map((y, i) => ({ y, r: sym(TORSO_R[i]), ao: i === 3 ? TEE_AO.map((a) => a * 0.8) : TEE_AO })).filter((_, i) => i !== 1),
  { capTop: 0.01 }, // bottom sits inside the jeans
);

const OPEN = [5, 6]; // the two front quad columns: open jacket
const jacketShell = loft(
  [
    { y: -0.075, r: sym([0.128, 0.138, 0.162, 0.178, 0.165, 0.14, 0.132]), ao: 0.85 },
    ...TORSO_Y.slice(1, 5).map((y, i) => ({
      y,
      r: sym(TORSO_R[i + 1].map((r) => r + 0.02)),
      ao: i === 2 ? sym([1, 1, 0.8, 0.55, 0.8, 1, 1]) : 1, // armpits
    })),
    { y: 0.455, r: sym([0.08, 0.085, 0.1, 0.108, 0.1, 0.088, 0.08]) },
  ],
  { skip: OPEN },
);
// Inner face of the open front so you never see through the jacket edge.
const jacketLining = loft(
  [
    { y: -0.075, r: sym([0.126, 0.136, 0.16, 0.176, 0.163, 0.138, 0.13]) },
    ...TORSO_Y.slice(1, 5).map((y, i) => ({ y, r: sym(TORSO_R[i + 1].map((r) => r + 0.018)) })),
    { y: 0.453, r: sym([0.078, 0.083, 0.098, 0.106, 0.098, 0.086, 0.078]) },
  ],
  { skip: [0, 1, 2, 3, 6, 7, 8, 9, 10, 11], flip: true },
).map((v) => ({ ...v, ao: 0.4 }));

// Big collar stands round the back of the neck and folds down onto the shoulders.
const collar = twoSided(
  loft(
    [
      { y: 0.445, r: sym([0.085, 0.09, 0.104, 0.112, 0.104, 0.092, 0.085]), ao: 0.5 },
      { y: sym([0.5, 0.5, 0.495, 0.488, 0.47, 0.46, 0.46]), r: sym([0.09, 0.095, 0.11, 0.118, 0.115, 0.105, 0.1]) },
      { y: sym([0.46, 0.46, 0.455, 0.445, 0.425, 0.415, 0.415]), r: sym([0.112, 0.117, 0.132, 0.14, 0.14, 0.13, 0.12]) }, // folded down, lying close
    ],
    { skip: [4, 5, 6, 7], v: [0.92, 1] },
  ),
);

const jacketUV = (p: P): [number, number] => [0.5 + Math.atan2(p[0], p[2]) / (2 * Math.PI), (p[1] + 0.075) / 0.53];
// Lapels: flat flaps folded back along the open front, wide notch at the top.
const lapel = (s: Side) =>
  facets(
    [
      [[s * 0.05, 0.44, 0.1], [s * 0.06, 0.2, 0.15], [s * 0.115, 0.37, 0.14]],
      [[s * 0.05, 0.44, 0.1], [s * 0.115, 0.37, 0.14], [s * 0.12, 0.44, 0.1]],
    ],
    [0, 0.3, 0],
    (p) => [0.82 + (p[0] * s - 0.05) * 2, 0.25 + (p[1] - 0.2) * 1.2], // plain side panel, clear of seams
    (p) => (p[0] * s < 0.08 ? 0.8 : 1),
  );
// Chest pocket flap on his left; the pocket itself is painted on the jacket texture.
const pocket = transform(
  box([0.07, 0.022, 0.01], (p) => jacketUV([p[0] + 0.115, p[1] + 0.33, p[2] + 0.13])),
  new Matrix4().makeRotationY(0.78).setPosition(0.117, 0.33, 0.122),
);

const jacket: V[] = [...jacketShell, ...jacketLining, ...collar, ...lapel(1), ...lapel(-1), ...pocket];

// ---------- Arms ----------

// Sleeves: inner side (toward the body) darkens up by the armpit.
const sleeveAO = (s: Side, a: number) => Array.from({ length: 8 }, (_, k) => (k === (s > 0 ? 2 : 6) ? a : 1));
const upperArm = (s: Side) =>
  loft(
    [
      { y: -0.28, r: sym([0.048, 0.049, 0.05, 0.05, 0.048]) },
      { y: -0.13, r: sym([0.055, 0.056, 0.057, 0.058, 0.056]), ao: sleeveAO(s, 0.75) },
      { y: -0.02, r: sym([0.062, 0.064, 0.066, 0.066, 0.064]), ao: sleeveAO(s, 0.5) },
      { y: 0.04, r: sym([0.04, 0.045, 0.05, 0.05, 0.045]) },
    ],
    { capTop: true, v: [0.12, 0.95] },
  );
const forearm = loft(
  [
    { y: -0.25, r: sym([0.05, 0.051, 0.052, 0.052, 0.051]), ao: 0.7 }, // cuff
    { y: -0.215, r: sym([0.05, 0.051, 0.052, 0.052, 0.051]) },
    { y: -0.205, r: sym([0.043, 0.044, 0.045, 0.045, 0.044]) },
    { y: 0.02, r: sym([0.05, 0.051, 0.052, 0.052, 0.051]) },
  ],
  { capBottom: true, v: [0, 0.85] },
).map((v) => (v.p[1] < -0.24 && Math.abs(v.p[0]) < 1e-6 && Math.abs(v.p[2]) < 1e-6 ? { ...v, ao: 0.2 } : v));

// Hand (36 tris): palm block, finger block, thumb forward. Palm faces ±x, so one shape serves both sides.
const skinUV = (p: P): [number, number] => [p[2] * 5 + 0.5, p[1] * 5 + 0.9];
const hand: V[] = [
  ...transform(box([0.035, 0.085, 0.09], skinUV, 1, 0.95), new Matrix4().setPosition(0, -0.042, 0.003)),
  ...transform(box([0.029, 0.075, 0.082], skinUV, 0.9, 0.8), new Matrix4().makeRotationX(0.12).setPosition(0, -0.118, 0.0)),
  ...transform(box([0.022, 0.05, 0.022], skinUV, 0.95, 0.8), new Matrix4().makeRotationX(-0.55).setPosition(0, -0.04, 0.045)),
];

// ---------- Legs ----------

const legAO = (s: Side, a: number) => Array.from({ length: 8 }, (_, k) => (k === (s > 0 ? 2 : 6) ? a : 1));
const pelvis = loft(
  [
    { y: -0.08, r: sym([0.085, 0.09, 0.11, 0.122, 0.11, 0.09, 0.085]), ao: 0.45 },
    { y: 0.0, r: sym([0.105, 0.11, 0.135, 0.15, 0.135, 0.11, 0.105]) },
    { y: 0.075, r: sym([0.097, 0.102, 0.127, 0.142, 0.127, 0.104, 0.1]) },
  ],
  { capBottom: 0.01 }, // top sits inside the tee
);
const thigh = (s: Side) =>
  loft(
    [
      { y: -0.425, r: sym([0.052, 0.055, 0.057, 0.06, 0.064]) },
      { y: -0.37, r: sym([0.054, 0.056, 0.058, 0.058, 0.058]) },
      { y: -0.15, r: sym([0.07, 0.072, 0.074, 0.073, 0.07]), ao: legAO(s, 0.7) },
      { y: 0.04, r: sym([0.078, 0.082, 0.085, 0.082, 0.078]), ao: legAO(s, 0.4) }, // between the legs
    ],
    { v: [0.1, 1] },
  );
const shin = loft(
  [
    { y: -0.38, r: sym([0.064, 0.064, 0.064, 0.064, 0.064]), ao: 0.6 }, // hem over the boot
    { y: -0.335, r: sym([0.062, 0.062, 0.062, 0.062, 0.062]) },
    { y: -0.325, r: sym([0.05, 0.05, 0.05, 0.05, 0.05]) },
    { y: -0.15, r: sym([0.06, 0.058, 0.055, 0.054, 0.054]) }, // calf
    { y: 0.03, r: sym([0.056, 0.058, 0.06, 0.063, 0.068]) }, // knee
  ],
  { capBottom: true, v: [0, 0.95] },
);
// Boot, ankle at y=0: sole with a lip, toe cap, instep, shaft.
const boot = loft(
  [
    { y: -0.07, r: sym([0.052, 0.055, 0.058, 0.095, 0.14]), z: 0.035, ao: 0.6 },
    { y: -0.048, r: sym([0.056, 0.059, 0.062, 0.1, 0.145]), z: 0.035 },
    { y: -0.01, r: sym([0.05, 0.052, 0.055, 0.08, 0.11]), z: 0.03 },
    { y: 0.03, r: sym([0.048, 0.05, 0.051, 0.058, 0.065]), z: 0.015 },
    { y: 0.1, r: sym([0.05, 0.051, 0.052, 0.052, 0.052]) },
  ],
  { capBottom: true },
);

const neck = loft(
  [
    { y: -0.03, r: sym([0.058, 0.06, 0.062, 0.062, 0.06]), ao: 0.7 },
    { y: 0.09, r: sym([0.054, 0.055, 0.056, 0.056, 0.055]), ao: 0.45 }, // under the chin
  ],
  { v: [0, 1] },
);

const PARTS = {
  head, hair, neck, tee, jacket, pelvis, hand, forearm, shin, boot,
  upperArmL: upperArm(1), upperArmR: upperArm(-1), thighL: thigh(1), thighR: thigh(-1),
};

/** Whole-figure triangle count (hands, arms, legs counted per side). */
export const TRI_COUNT = Object.entries(PARTS).reduce(
  (n, [k, vs]) => n + triCount(vs) * (["hand", "forearm", "shin", "boot"].includes(k) ? 2 : 1),
  0,
);
export const PART_TRIS = Object.fromEntries(Object.entries(PARTS).map(([k, vs]) => [k, triCount(vs)]));

export const GEO = Object.fromEntries(Object.entries(PARTS).map(([k, vs]) => [k, toGeometry(vs)])) as Record<keyof typeof PARTS, ReturnType<typeof toGeometry>>;

