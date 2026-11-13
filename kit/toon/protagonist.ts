import { drawPerson } from "./figure";
import type { CharState, Look, Torso } from "./figure";
import type { Head } from "./face";
import { BUILD, Pen, SH_HAIR, clamp, mul } from "./toon";
import type { P2 } from "./toon";

export { EXPRESSIONS } from "./face";
export type { Effects, Expr } from "./face";
export type { PropName } from "./figure";

/**
 * The protagonist ("you", LOOK_SPEC section 2): the same character in every video. Redesign 2026-11-13: an
 * oversized rust hoodie #c8582c (the channel's signature accent) with the hood bunched behind the neck, cream
 * drawstrings, a kangaroo pocket and a ribbed hem; dark joggers; chunky white sneakers; soft messy curtain-fringe
 * hair in fluffy clumps. Reads in silhouette by the hood behind the jaw and the clumpy fringe. Darks stay at
 * L* >= 19 (hair and joggers are coloured darks, not black).
 */
export const YOU = {
  hair: "#4a3226",
  hairLight: "#7a5440",
  hoodie: "#c8582c",
  hoodieDark: "#a8441f",
  hoodieLight: "#e07a4c",
  rib: "#8e3818",
  cord: "#f1e6d2",
  joggers: "#30364a",
  sneakers: "#f4f1ea",
};

const rect = (x: number, y: number, w: number, h: number): P2[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

/** Hoodie front: hood collar under the chin, drawstrings, kangaroo pocket, ribbed hem, joggers below. */
const outfit = (p: Pen, t: Torso) => {
  const { cx, top, bot, chin, u } = t, h = bot - top, hem = top + h * 0.86, line = 1.6 * u, f = 4 * u * t.facing;
  // Joggers below the hem.
  p.poly(rect(cx - 80 * u, hem, 160 * u, bot - hem + 10 * u), YOU.joggers);
  // Ribbed hem band.
  const band = rect(cx - 80 * u, hem - 8 * u, 160 * u, 8 * u);
  p.poly(band, YOU.rib);
  p.clip(band, () => {
    for (let x = cx - 80 * u; x < cx + 80 * u; x += 4 * u) p.stroke([[x, hem - 8 * u], [x, hem]], 0.7 * u, mul(YOU.rib, [0.78, 0.78, 0.8]));
  });
  p.stroke([[cx - 80 * u, hem - 8 * u], [cx + 80 * u, hem - 8 * u]], line);
  p.stroke([[cx - 80 * u, hem], [cx + 80 * u, hem]], line);
  // Kangaroo pocket: a wide trapezoid with slanted openings at both sides.
  const py0 = top + 0.55 * h, py1 = hem - 10 * u;
  const pocket: P2[] = [[cx + f - 19 * u, py0], [cx + f + 19 * u, py0], [cx + f + 27 * u, py1], [cx + f - 27 * u, py1]];
  p.poly(pocket, YOU.hoodieDark, line);
  for (const s of [-1, 1]) p.stroke([[cx + f + s * 19 * u, py0 + 1 * u], [cx + f + s * 25 * u, py0 + 0.55 * (py1 - py0)]], 1.2 * u, mul(YOU.hoodieDark, [0.7, 0.7, 0.7]));
  // Hood collar: a soft U of folded fabric just under the chin.
  const collar: P2[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI * (i / 16);
    collar.push([cx + f * 0.5 + Math.cos(a) * 30 * u, chin - 2 * u + Math.sin(a) * 15 * u]);
  }
  for (let i = 16; i >= 0; i--) {
    const a = Math.PI * (i / 16);
    collar.push([cx + f * 0.5 + Math.cos(a) * 20 * u, chin - 2 * u + Math.sin(a) * 7 * u]);
  }
  p.poly(collar, YOU.hoodieLight, line);
  // Drawstrings with ink aglets, swinging a little toward the facing side.
  for (const s of [-1, 1]) {
    const x0 = cx + f * 0.5 + s * 8 * u, y0 = chin + 8 * u, x1 = x0 + s * 1.5 * u + f * 0.4, y1 = y0 + 30 * u;
    p.stroke([[x0, y0], [(x0 + x1) / 2 + s * 1.2 * u, (y0 + y1) / 2], [x1, y1]], 2.4 * u, YOU.cord);
    p.dot(x1, y1 + 1.5 * u, 2 * u);
  }
};

/** The hood, bunched behind the neck: shows past the jaw on both sides (the silhouette cue). */
const hood = (p: Pen, h: Head) => {
  const { cx, cy, a, b } = h;
  const pts: P2[] = [];
  for (let i = 0; i < 48; i++) {
    const t = (i / 48) * Math.PI * 2;
    pts.push([cx + Math.cos(t) * 1.16 * a, cy + 0.5 * b + Math.sin(t) * 0.56 * b]);
  }
  p.shadedFill(pts, YOU.hoodieDark, SH_HAIR, a);
  p.inkRing(pts, 0.8 * 5 * h.u);
};

/**
 * Hair: soft messy curtain fringe. The cap follows the skull a little outside it with fluffy clumps on the
 * outline; the fringe hangs in pointed locks to just above the brows, parted off-centre (toward the facing side),
 * and runs down to short sideburns.
 */
const hair = (p: Pen, h: Head) => {
  const { cx, cy, a, b, u, pts } = h;
  const d = clamp(h.facing * 3 + 0.5, -1, 1), part = 0.28 * d, side = cy - 0.08 * b;
  const n = pts.length, cap: P2[] = [];
  for (let i = n / 2; i <= n; i++) {
    const [x, y] = pts[i % n];
    if (y >= side) continue;
    const th = Math.atan2(y - cy, x - cx);
    const clump = 0.055 * Math.max(0, Math.sin(7 * th + 0.6)) ** 1.5 + 0.03 * Math.max(0, Math.sin(11 * th + 2.1)) ** 2;
    const k = 1.07 + clump;
    cap.push([cx + (x - cx) * k, cy + (y - cy) * k]);
  }
  const xr = cap[cap.length - 1][0], xl = cap[0][0];
  // Fringe edge, right to left: high at the part, lowest beside it, down to the sideburns; zigzag locks.
  const N = 22;
  for (let i = 1; i < N; i++) {
    const x = xr + ((xl - xr) * i) / N, xn = (x - cx) / a;
    const near = Math.min(Math.abs(xn - part) / 0.32, 1);
    let y = cy - b * (0.66 - 0.16 * near * near * (3 - 2 * near));
    const sideK = clamp((Math.abs(xn) - 0.72) / 0.28, 0, 1);
    y = y + (side - y) * sideK * sideK;
    cap.push([x, y + (i % 2 ? 0.075 * b * (1 - sideK) : 0)]);
  }
  p.shadedFill(cap, YOU.hair, SH_HAIR, a);
  // Strands: soft lighter strokes from the crown toward the fringe tips.
  p.clip(cap, () => {
    for (const s of [-0.7, -0.35, 0.05, 0.45, 0.75])
      p.stroke([[cx + (part + s * 0.25) * a, cy - 1.05 * b], [cx + (s * 0.85) * a, cy - 0.8 * b], [cx + s * 0.95 * a, cy - 0.56 * b]], 1.5 * u, YOU.hairLight);
  });
  p.inkRing(cap, 0.85 * 5 * u);
};

export const youLook: Look = {
  build: BUILD.adult,
  seed: 1,
  jacket: YOU.hoodie,
  pants: YOU.joggers,
  shoes: YOU.sneakers,
  sneakers: true,
  outfit,
  hairBack: hood,
  hair,
  rim: true,
};

/** Full protagonist card drawing. */
export const drawYou = (p: Pen, s: CharState) => drawPerson(p, youLook, s);
