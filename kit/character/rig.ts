import { Matrix4 } from "three";
import { box, facets, loft, P, solid, toGeometry, transform, triCount, triNormal, twoSided, V } from "./loft";

// Joint layout in metres at design height. Character faces +z, his left is +x.
// Hip joint at 0.81 m of 1.71 m: legs ≈ 45–47% of height. Head + hair ≈ 0.3 m: slightly big.
export const PELVIS_Y = 0.86;
export const HIP = { x: 0.08, y: -0.05 };
export const THIGH = 0.37;
export const SHIN = 0.37; // ankle ends 0.07 above the floor
export const SPINE_Y = 0.05;
export const TORSO = 0.44;
export const SHOULDER = { x: 0.215, y: 0.4 };
export const UPPER_ARM = 0.27;
export const FOREARM = 0.24;
export const NECK = 0.06;
const BROW_Y = 0.175; // face texture spans chin (y=0) → brows (y=BROW_Y) on the head
export const DESIGN_HEIGHT = 1.71;
export const HEAD_CENTER_Y = PELVIS_Y + SPINE_Y + TORSO + NECK + 0.13;
/** Right-hand attach point, in the wrist frame: palm centre (his right palm faces +x). */
export const HAND_GRIP: [number, number, number] = [0.025, -0.055, 0.005];

type Side = 1 | -1; // +1 = his left (+x)

const withUV = (vs: V[], f: (p: P) => [number, number]) => vs.map((v) => ({ ...v, uv: f(v.p) }));

/**
 * Bevelled-box cross-section, 8 points in loft order (back → his right → front → his left).
 * `front` = half-width of the flat front face (defaults to w/2 - c); smaller makes wide slanted front panels.
 */
const chamfer = (w: number, d: number, c: number, front = w / 2 - c): [number, number][] => [
  [w / 2 - c, -d / 2], [-w / 2 + c, -d / 2], [-w / 2, -d / 2 + c], [-w / 2, d / 2 - c],
  [-front, d / 2], [front, d / 2], [w / 2, d / 2 - c], [w / 2, -d / 2 + c],
];
// Plain rectangle, 4 points in loft order.
const rect = (w: number, back: number, front: number): [number, number][] => [
  [w / 2, back], [-w / 2, back], [-w / 2, front], [w / 2, front],
];
const hex = (r: number) => Array(6).fill(r);

// ---------- Head: bevelled, tapered box (64 tris); the face lives in the texture ----------

const headAll = loft(
  [
    { y: 0, pts: chamfer(0.11, 0.15, 0.03), z: 0.012, ao: 0.5 }, // chin underside
    { y: 0.03, pts: chamfer(0.15, 0.2, 0.015), z: 0.01 },
    { y: BROW_Y, pts: chamfer(0.165, 0.205, 0.015), z: 0.01 },
    { y: 0.26, pts: chamfer(0.14, 0.15, 0.035), z: -0.008 }, // kept well inside the hair
  ],
  { capTop: 0.012, capBottom: true },
);
// The flat front below the brows gets the face (planar UVs); everything else is the skin swatch.
const FACE_W = 0.165 - 2 * 0.015; // front-face width at the brow line
const isFace = (t: V[]) => triNormal(t[0].p, t[1].p, t[2].p)[2] > 0.75 && Math.max(...t.map((v) => v.p[1])) <= BROW_Y + 1e-4;
const headTris = Array.from({ length: headAll.length / 3 }, (_, i) => headAll.slice(i * 3, i * 3 + 3));
const face = withUV(headTris.filter(isFace).flat(), (p) => [p[0] / FACE_W + 0.5, p[1] / BROW_Y]);
const headSkin = headTris.filter((t) => !isFace(t)).flat();

// ---------- Hair: 7 chunky clumps hugging the skull, swept to his right ----------

// Deformed box: corners indexed x*4 + y*2 + z over {-,+} (e.g. 5 = +x, -y, +z).
const BOX_FACES = [[0, 1, 3, 2], [4, 5, 7, 6], [0, 1, 5, 4], [2, 3, 7, 6], [0, 2, 6, 4], [1, 3, 7, 5]];
const hairUV = (p: P): [number, number] => [(p[0] + 0.12) / 0.24, (p[1] - 0.03) / 0.3]; // side faces streak = strands
const clump = (c: P[]) => solid(c, BOX_FACES, hairUV);
const hair: V[] = [
  // crown: the main mass, front-right corner highest and swept out to his right
  ...clump([[-0.092, 0.16, -0.1], [-0.09, 0.2, 0.106], [-0.085, 0.3, -0.09], [-0.095, 0.3, 0.08],
    [0.09, 0.16, -0.1], [0.088, 0.21, 0.106], [0.07, 0.29, -0.09], [0.07, 0.285, 0.075]]), // front flush with the forehead
  // back of the head down to the nape
  ...clump([[-0.09, 0.04, -0.11], [-0.08, 0.04, -0.04], [-0.097, 0.25, -0.115], [-0.09, 0.25, 0],
    [0.09, 0.04, -0.11], [0.08, 0.04, -0.04], [0.097, 0.25, -0.115], [0.09, 0.25, 0]]),
  // his left side, over the temple
  ...clump([[0.07, 0.13, -0.07], [0.07, 0.15, 0.06], [0.07, 0.24, -0.07], [0.07, 0.24, 0.07],
    [0.092, 0.12, -0.07], [0.09, 0.16, 0.05], [0.094, 0.24, -0.07], [0.092, 0.24, 0.07]]),
  // his right side, fuller (the sweep lands here)
  ...clump([[-0.105, 0.11, -0.07], [-0.105, 0.15, 0.06], [-0.112, 0.25, -0.07], [-0.112, 0.25, 0.08],
    [-0.07, 0.13, -0.07], [-0.07, 0.15, 0.06], [-0.07, 0.24, -0.07], [-0.07, 0.24, 0.07]]),
  // front sweep over his right temple
  ...clump([[-0.106, 0.15, 0.0], [-0.1, 0.17, 0.09], [-0.112, 0.26, 0.0], [-0.11, 0.28, 0.1],
    [-0.03, 0.22, 0.03], [-0.025, 0.235, 0.119], [-0.03, 0.29, 0.03], [-0.02, 0.295, 0.105]]),
  // quiff lifting at the front-left of the top
  ...clump([[-0.01, 0.27, -0.02], [-0.01, 0.27, 0.09], [0.0, 0.32, -0.03], [-0.02, 0.325, 0.08],
    [0.07, 0.26, -0.02], [0.07, 0.25, 0.09], [0.06, 0.3, -0.03], [0.06, 0.305, 0.07]]),
  // the V spike over the forehead, just right of centre (his right)
  ...solid([[-0.035, 0.228, 0.118], [0.01, 0.228, 0.118], [-0.012, 0.25, 0.09], [-0.014, 0.188, 0.121]],
    [[0, 1, 3], [0, 3, 2], [1, 2, 3], [0, 2, 1]], hairUV),
];

const neck = loft([
  { y: -0.03, r: hex(0.055), ao: 0.7 },
  { y: 0.07, r: hex(0.05), ao: 0.5 }, // under the chin
]);

// ---------- Torso: t-shirt box with an open jacket shell over it ----------

const TEE_AO = [0.5, 0.5, 0.5, 0.55, 1, 1, 0.55, 0.5]; // dark where the jacket covers it
const tee = withUV(
  loft(
    [
      { y: 0, pts: chamfer(0.26, 0.17, 0.04), ao: TEE_AO },
      { y: 0.3, pts: chamfer(0.32, 0.2, 0.05), ao: TEE_AO },
      { y: 0.4, pts: chamfer(0.38, 0.18, 0.06), ao: TEE_AO },
      { y: 0.445, pts: chamfer(0.15, 0.12, 0.03) },
    ],
    { capTop: 0.005 },
  ),
  (p) => [p[0] / 0.16 + 0.5, p[1] / 0.445], // the shirt crop once across the front
);

// Jacket front edges stop ~4 cm either side of centre: the open front is the skipped column 4.
const jacketShell = loft(
  [
    { y: -0.08, pts: chamfer(0.3, 0.21, 0.035, 0.035) },
    { y: 0.3, pts: chamfer(0.36, 0.235, 0.04, 0.045) },
    { y: 0.41, pts: chamfer(0.41, 0.215, 0.05, 0.05), ao: [1, 1, 1, 0.6, 1, 1, 0.6, 1] }, // armpits
    { y: 0.465, pts: chamfer(0.17, 0.14, 0.035, 0.04) },
  ],
  { skip: [4] },
);
// Two flat collar flaps folded down either side of the neck, points toward the chest.
const collarFlap = (s: Side) =>
  twoSided(
    facets(
      [
        [[s * 0.07, 0.475, -0.02], [s * 0.045, 0.46, 0.085], [s * 0.075, 0.34, 0.125]],
        [[s * 0.07, 0.475, -0.02], [s * 0.075, 0.34, 0.125], [s * 0.15, 0.42, 0.075]],
      ],
      [0, 0.3, 0],
      () => [0, 0],
      (p) => (p[1] > 0.45 ? 0.75 : 1),
    ),
  );
// Jacket texture tiles (RepeatWrapping): 4 repeats round the body, one per 18 cm of height.
const tileV = (p: P) => (p[1] + 0.08) / 0.18;
const jacket = [
  ...jacketShell.map((v) => ({ ...v, uv: [v.uv[0] * 4, tileV(v.p)] as [number, number] })),
  ...withUV([...collarFlap(1), ...collarFlap(-1)], (p) => [p[0] / 0.06, tileV(p)]),
];

// ---------- Arms: 6-sided prisms, cuffs, mitten hands ----------

const sleeve = (vs: V[]) => vs.map((v) => ({ ...v, uv: [v.uv[0] * 2, v.p[1] / 0.18] as [number, number] }));
const upperArm = sleeve(loft([{ y: -UPPER_ARM, r: hex(0.047) }, { y: 0.03, r: hex(0.056) }], { capTop: true }));
const forearm = sleeve(
  loft(
    [
      { y: -FOREARM, r: hex(0.052), ao: 0.7 },
      { y: -0.205, r: hex(0.052) },
      { y: -0.205, r: hex(0.043) }, // cuff ledge
      { y: 0.01, r: hex(0.047) },
    ],
    {}, // the hand fills the cuff
  ),
);
// Mitten: one tapered block for palm + fingers, a thumb forward. Palm faces ±x, so it suits both sides.
const hand: V[] = [
  ...transform(box([0.034, 0.13, 0.085], () => [0.5, 0.5], 1, 0.72), new Matrix4().setPosition(0, -0.065, 0.003)),
  ...transform(box([0.022, 0.05, 0.024], () => [0.5, 0.5], 0.9), new Matrix4().makeRotationX(-0.5).setPosition(0, -0.04, 0.045)),
];

// ---------- Legs: prisms, cuffs, block boots ----------

const pelvis = loft(
  [
    { y: -0.08, pts: chamfer(0.24, 0.17, 0.04), ao: 0.5 },
    { y: 0.08, pts: chamfer(0.27, 0.18, 0.04) },
  ],
  { capBottom: 0.01 },
);
const thigh = loft([{ y: -THIGH, r: hex(0.058) }, { y: 0.03, r: hex(0.075) }], { v: [0.1, 1] });
const shin = loft(
  [
    { y: -0.34, r: hex(0.062), ao: 0.6 }, // hem over the boot
    { y: -0.3, r: hex(0.062) },
    { y: -0.3, r: hex(0.05) },
    { y: 0.02, r: hex(0.058) },
  ],
  { v: [0, 0.95] }, // bottom hidden in the boot
);
const boot = loft(
  [
    { y: -0.07, pts: rect(0.1, -0.06, 0.17), ao: 0.6 }, // sole
    { y: -0.045, pts: rect(0.106, -0.065, 0.176) }, // sole lip
    { y: 0.0, pts: rect(0.092, -0.052, 0.1) }, // instep
    { y: 0.09, pts: rect(0.088, -0.05, 0.04) }, // shaft
  ],
  { capBottom: true },
);

const PARTS = { face, headSkin, hair, neck, tee, jacket, pelvis, upperArm, forearm, hand, thigh, shin, boot };
const PAIRED = ["upperArm", "forearm", "hand", "thigh", "shin", "boot"];

/** Whole-figure triangle count (limbs counted per side). */
export const TRI_COUNT = Object.entries(PARTS).reduce((n, [k, vs]) => n + triCount(vs) * (PAIRED.includes(k) ? 2 : 1), 0);

export const GEO = Object.fromEntries(Object.entries(PARTS).map(([k, vs]) => [k, toGeometry(vs)])) as Record<
  keyof typeof PARTS,
  ReturnType<typeof toGeometry>
>;
