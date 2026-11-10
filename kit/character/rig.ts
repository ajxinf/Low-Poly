import { Matrix4 } from "three";
import { box, facets, loft, P, solid, toGeometry, transform, triCount, triNormal, twoSided, V } from "./loft";
import { cellU, Slot } from "./textures";

// Joint layout in metres at design height. Character faces +z, his left is +x.
// ~1.65 m with hair, head + hair ≈ 0.3 m → ~5.5 heads. Hip joint at 0.765 m ≈ 46% of height.
export const PELVIS_Y = 0.815;
export const HIP = { x: 0.085, y: -0.05 };
export const THIGH = 0.35;
export const SHIN = 0.345; // ankle ends 0.07 above the floor
export const SPINE_Y = 0.05;
export const TORSO = 0.45;
export const SHOULDER = { x: 0.235, y: 0.4 }; // a bit broad
export const UPPER_ARM = 0.26;
export const FOREARM = 0.23;
export const NECK = 0.05;
export const DESIGN_HEIGHT = 1.65;
const HEAD = { w: 0.2, d: 0.17, h: 0.2, c: 0.035 }; // wider than deep; face front is h × w = square, so 32×32 maps 1:1
export const HEAD_CENTER_Y = PELVIS_Y + SPINE_Y + TORSO + NECK + 0.11;
/** Right-hand attach point, in the wrist frame: palm centre (his right palm faces +x). */
export const HAND_GRIP: [number, number, number] = [0.028, -0.05, 0.005];

type Side = 1 | -1; // +1 = his left (+x)

/** Paint a part from the palette: base tone, shadow tone where `shadow(p)` (default: the back half). */
const tone = (vs: V[], slot: Slot, shadow: (p: P) => boolean = (p) => p[2] < 0) =>
  vs.map((v) => ({ ...v, uv: [cellU(slot, shadow(v.p)), 0.5] as [number, number] }));

/** Rounded-box cross-section, 8 points in loft order (back → his right → front → his left). */
const chamfer = (w: number, d: number, c: number, front = w / 2 - c): [number, number][] => [
  [w / 2 - c, -d / 2], [-w / 2 + c, -d / 2], [-w / 2, -d / 2 + c], [-w / 2, d / 2 - c],
  [-front, d / 2], [front, d / 2], [w / 2, d / 2 - c], [w / 2, -d / 2 + c],
];
const rect = (w: number, back: number, front: number): [number, number][] => [
  [w / 2, back], [-w / 2, back], [-w / 2, front], [w / 2, front],
];
const hex = (r: number) => Array(6).fill(r);

// ---------- Head (48 tris): rounded box, face texture planar across the front ----------

// Hairline per ring point (back, back, his right ×2, front ×2, his left ×2): the face front runs to the top, the back stops low.
const HAIRLINE = [0.08, 0.08, 0.12, HEAD.h, HEAD.h, HEAD.h, HEAD.h, 0.12];
const headAll = loft(
  [
    { y: 0, pts: chamfer(0.15, 0.13, 0.03), z: 0.005 }, // chin bevel
    { y: 0.03, pts: chamfer(HEAD.w, HEAD.d, HEAD.c) },
    { y: HAIRLINE, pts: chamfer(HEAD.w, HEAD.d, HEAD.c) }, // ends where the hair cap starts: no overlap for vertex snap to poke through
  ],
  { capTop: 0.02, capBottom: true },
);
const headTris = Array.from({ length: headAll.length / 3 }, (_, i) => headAll.slice(i * 3, i * 3 + 3));
const facesFront = (t: V[]) => triNormal(t[0].p, t[1].p, t[2].p)[2] > 0.3 && Math.max(...t.map((v) => v.p[1])) <= HEAD.h + 1e-6;
// x ∈ ±w/2 → u 0..1, y 0..h → v 0..1: same aspect as the texture, so no stretch.
const face = headTris.filter(facesFront).flat().map((v) => ({ ...v, uv: [v.p[0] / HEAD.w + 0.5, v.p[1] / HEAD.h] as [number, number] }));
const headSkin = tone(headTris.filter((t) => !facesFront(t)).flat(), "skin");

// ---------- Hair: near-black cap + 5 chunky clumps swept to his right, inside the head width ----------

// The cap's front edge sits at the head top, where the face texture's painted fringe begins.
const cap = loft(
  [
    { y: HAIRLINE, pts: chamfer(HEAD.w + 0.006, HEAD.d + 0.012, 0.04) },
    { y: 0.245, pts: chamfer(0.18, 0.15, 0.045) },
  ],
  { capTop: 0.015 },
);
// Deformed box: corners indexed x*4 + y*2 + z over {-,+}.
const BOX_FACES = [[0, 1, 3, 2], [4, 5, 7, 6], [0, 1, 5, 4], [2, 3, 7, 6], [0, 2, 6, 4], [1, 3, 7, 5]];
const clump = (c: P[]) => solid(c, BOX_FACES, () => [0, 0]);
const hair = tone(
  [
    ...cap,
    // front-top, swept toward his right and lifted there
    ...clump([[-0.1, 0.22, -0.01], [-0.1, 0.2, 0.09], [-0.1, 0.29, -0.01], [-0.095, 0.3, 0.085],
      [0.02, 0.24, -0.01], [0.02, 0.23, 0.09], [0.0, 0.28, -0.01], [0.0, 0.285, 0.08]]),
    // crown, middle
    ...clump([[-0.04, 0.24, -0.06], [-0.04, 0.24, 0.05], [-0.03, 0.29, -0.06], [-0.03, 0.295, 0.04],
      [0.08, 0.235, -0.06], [0.08, 0.235, 0.05], [0.07, 0.275, -0.06], [0.07, 0.275, 0.04]]),
    // his left top, smaller
    ...clump([[0.03, 0.22, -0.04], [0.03, 0.22, 0.08], [0.03, 0.265, -0.04], [0.03, 0.27, 0.07],
      [0.1, 0.2, -0.04], [0.1, 0.2, 0.08], [0.095, 0.25, -0.04], [0.095, 0.255, 0.07]]),
    // back-top
    ...clump([[-0.085, 0.2, -0.095], [-0.085, 0.22, -0.03], [-0.075, 0.27, -0.09], [-0.075, 0.275, -0.03],
      [0.085, 0.2, -0.095], [0.085, 0.22, -0.03], [0.075, 0.265, -0.09], [0.075, 0.27, -0.03]]),
    // his right side, where the sweep lands over the temple
    ...clump([[-0.11, 0.15, -0.05], [-0.11, 0.16, 0.07], [-0.11, 0.26, -0.05], [-0.11, 0.27, 0.07],
      [-0.07, 0.17, -0.05], [-0.07, 0.18, 0.07], [-0.07, 0.25, -0.05], [-0.07, 0.25, 0.07]]),
  ],
  "hair",
  (p) => p[2] < -0.02 || p[1] < 0.15,
);

const neck = tone(loft([{ y: -0.03, r: hex(0.052) }, { y: 0.05, r: hex(0.05) }]), "skin");

// ---------- Torso: tee box under an open rust jacket ----------

const tee = tone(
  loft(
    [
      { y: 0, pts: chamfer(0.26, 0.16, 0.04) },
      { y: 0.4, pts: chamfer(0.42, 0.18, 0.05) },
      { y: 0.455, pts: chamfer(0.16, 0.12, 0.03) },
    ],
    { capTop: 0.005 },
  ),
  "shirt",
  (p) => p[2] < 0.05 || p[1] < 0.12,
);
// Front edges stop ~4.5 cm either side of centre: the open front is the skipped column 4.
const jacketShell = loft(
  [
    { y: -0.07, pts: chamfer(0.3, 0.2, 0.04, 0.045) },
    { y: 0.41, pts: chamfer(0.46, 0.21, 0.055, 0.045) },
    { y: 0.47, pts: chamfer(0.18, 0.14, 0.035, 0.045) },
  ],
  { skip: [4] },
);
// Two flat collar flaps folded down either side of the neck.
const collarFlap = (s: Side) =>
  twoSided(
    facets(
      [
        [[s * 0.07, 0.48, -0.02], [s * 0.05, 0.465, 0.085], [s * 0.08, 0.35, 0.115]],
        [[s * 0.07, 0.48, -0.02], [s * 0.08, 0.35, 0.115], [s * 0.15, 0.43, 0.07]],
      ],
      [0, 0.3, 0],
      () => [0, 0],
    ),
  );
const jacket = tone([...jacketShell, ...collarFlap(1), ...collarFlap(-1)], "jacket");

// ---------- Arms: 6-sided prisms, mitten hands ----------

const upperArm = tone(loft([{ y: -UPPER_ARM, r: hex(0.05) }, { y: 0.03, r: hex(0.058) }], { capTop: true }), "jacket");
const forearm = tone(loft([{ y: -FOREARM, r: hex(0.05) }, { y: 0.01, r: hex(0.05) }]), "jacket");
// Mitten: one tapered block, thumb wedge forward. Palm faces ±x, so it suits both sides.
const hand = tone(
  [
    ...transform(box([0.042, 0.11, 0.085], () => [0, 0], 1, 0.75), new Matrix4().setPosition(0, -0.055, 0.003)),
    ...solid([[-0.012, -0.02, 0.04], [0.012, -0.02, 0.04], [0, -0.035, 0.03], [0, -0.07, 0.065]], [[0, 1, 3], [1, 2, 3], [2, 0, 3], [0, 2, 1]], () => [0, 0]),
  ],
  "skin",
  (p) => p[2] < -0.01,
);

// ---------- Legs: prisms, block boots ----------

const pelvis = tone(
  loft([{ y: -0.08, pts: chamfer(0.25, 0.16, 0.04) }, { y: 0.08, pts: chamfer(0.28, 0.17, 0.04) }], { capBottom: 0.01 }),
  "legs",
  (p) => p[2] < 0 || p[1] < -0.07,
);
const thigh = tone(loft([{ y: -THIGH, r: hex(0.062) }, { y: 0.03, r: hex(0.082) }]), "legs");
const shin = tone(loft([{ y: -SHIN + 0.05, r: hex(0.064) }, { y: 0.02, r: hex(0.062) }]), "legs");
const boot = tone(
  loft(
    [
      { y: -0.07, pts: rect(0.11, -0.065, 0.17) },
      { y: -0.045, pts: rect(0.114, -0.068, 0.174) }, // sole lip
      { y: 0.09, pts: rect(0.1, -0.055, 0.05) }, // block shaft
    ],
    { capBottom: true },
  ),
  "boots",
  (p) => p[1] < -0.04 || p[2] < -0.05, // sole and heel
);

const PARTS = { face, headSkin, hair, neck, tee, jacket, pelvis, upperArm, forearm, hand, thigh, shin, boot };
const PAIRED = ["upperArm", "forearm", "hand", "thigh", "shin", "boot"];

/** Whole-figure triangle count (limbs counted per side). */
export const TRI_COUNT = Object.entries(PARTS).reduce((n, [k, vs]) => n + triCount(vs) * (PAIRED.includes(k) ? 2 : 1), 0);

export const GEO = Object.fromEntries(Object.entries(PARTS).map(([k, vs]) => [k, toGeometry(vs)])) as Record<
  keyof typeof PARTS,
  ReturnType<typeof toGeometry>
>;
