import { drawPerson } from "./figure";
import type { CharState, Look, Torso } from "./figure";
import type { Head } from "./face";
import { BUILD, INK, Pen, SH_HAIR, clamp, mul } from "./toon";
import type { P2 } from "./toon";

export { EXPRESSIONS } from "./face";
export type { Effects, Expr } from "./face";
export type { PropName } from "./figure";

/**
 * The protagonist ("you", LOOK_SPEC section 2): the same character in every video. Rust-orange jacket #c8582c (the
 * channel's signature accent) open over a striped charcoal tee, jeans, brown shoes; a tall forward quiff with one
 * cowlick that reads in pure silhouette. Darks stay at L* >= 19 (hair and tee are coloured darks, not black).
 */
export const YOU = {
  hair: "#43302a",
  hairLight: "#6e4c3c",
  jacket: "#c8582c",
  jacketLight: "#dc7448",
  stitch: "#7a2e14",
  tee: "#3c3e46",
  teeStripe: "#585c66",
  jeans: "#33456b",
  shoes: "#5a3a26",
};

const rect = (x: number, y: number, w: number, h: number): P2[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

/** Open jacket over a striped tee, jeans below the hem. Clipped to the torso bean by the caller. */
const outfit = (p: Pen, t: Torso) => {
  const { cx, top, bot, chin, u, a } = t, h = bot - top, hem = top + h * 0.84, line = 1.8 * u;
  const band: P2[] = [[cx - 17 * u, top], [cx + 17 * u, top], [cx + 9 * u, hem], [cx - 9 * u, hem]];
  p.poly(band, YOU.tee);
  p.clip(band, () => {
    for (let y = chin + 3 * u; y < hem; y += 7 * u) p.poly(rect(cx - 20 * u, y, 40 * u, 3 * u), YOU.teeStripe);
  });
  p.poly(rect(cx - 2 * a, hem, 4 * a, bot - hem + 10 * u), YOU.jeans);
  p.stroke([[cx - 2 * a, hem], [cx + 2 * a, hem]], line);
  for (const s of [-1, 1]) {
    p.stroke([[cx + s * 17 * u, top], [cx + s * 9 * u, hem]], line);
    // Stitching inset along the front edge.
    p.stroke([[cx + s * 22 * u, chin + 14 * u], [cx + s * 14 * u, hem - 3 * u]], 0.8 * u, YOU.stitch, [2.2 * u, 2 * u]);
    // Patch pocket with a flap.
    const px = cx + s * 0.55 * a, py = hem - 0.3 * h;
    p.poly(rect(px - 9 * u, py, 18 * u, 15 * u), YOU.jacket, 1.4 * u);
    p.stroke([[px - 6.5 * u, py + 3 * u], [px - 6.5 * u, py + 12.5 * u], [px + 6.5 * u, py + 12.5 * u], [px + 6.5 * u, py + 3 * u]], 0.8 * u, YOU.stitch, [2 * u, 1.8 * u]);
    p.poly(rect(px - 10 * u, py - 2 * u, 20 * u, 6 * u), mul(YOU.jacket, [0.8, 0.8, 0.8]), 1.4 * u);
    // Collar flaps standing over the shoulders.
    p.poly([[cx + s * 12 * u, chin - 4 * u], [cx + s * 36 * u, chin + 2 * u], [cx + s * 21 * u, chin + 17 * u]], YOU.jacketLight, line);
  }
  // Zip on the left edge: teeth and a pull.
  for (let y = chin + 22 * u; y < hem - 4 * u; y += 3.4 * u) {
    const x = cx - 17 * u + ((y - top) / (hem - top)) * 8 * u;
    p.stroke([[x - 1.2 * u, y], [x + 1.2 * u, y]], 0.7 * u, "#e8d8b8");
  }
  p.poly(rect(cx - 12.5 * u, chin + 16 * u, 4 * u, 7 * u), "#e8d8b8", 0.9 * u);
};

/**
 * Hair: a cap down to just above the brows with short sideburns, lifted into a tall quiff that sweeps forward
 * (toward the facing side; slightly right when facing the lens), plus one cowlick curling up and forward.
 */
const hair = (p: Pen, h: Head) => {
  const { cx, cy, a, b, u, pts } = h;
  const d = clamp(h.facing * 3 + 0.8, -1, 1);
  const lim = (x: number) => cy - 0.62 * b + 0.42 * b * Math.abs((x - cx) / a) ** 3;
  const n = pts.length, cap: P2[] = [];
  for (let i = n / 2; i <= n; i++) {
    const [x, y] = pts[i % n];
    if (y >= lim(x)) continue;
    // Lift profile: steep in front, long slope behind, so the crown sweeps up into a forward peak.
    const dx = (x - cx) / a - 0.42 * d, w = dx * d > 0 ? 0.26 : 0.95;
    const k = Math.exp(-((dx / w) ** 2)) * clamp((cy - 0.3 * b - y) / (0.45 * b), 0, 1);
    cap.push([cx + (x - cx) * 1.04 + 0.42 * a * d * k, cy + (y - cy) * 1.04 - 0.6 * b * k]);
  }
  const xr = cap[cap.length - 1][0], xl = cap[0][0];
  for (let i = 1; i < 8; i++) {
    const x = xr + ((xl - xr) * i) / 8;
    cap.push([x, lim(x) + (i % 2 ? 2.4 * u : 0)]);
  }
  // Cowlick from the peak, curling up and forward; drawn first so the cap's outline crosses its root.
  const peak = cap.reduce((m, q) => (q[1] < m[1] ? q : m));
  const root: P2 = [peak[0] - 0.06 * a * d, peak[1] + 0.12 * b];
  const mid: P2 = [peak[0] + 0.1 * a * d, peak[1] - 0.26 * b], tip: P2 = [peak[0] + 0.38 * a * d, peak[1] - 0.3 * b];
  p.stroke([root, mid, tip], 7.5 * u, INK);
  p.stroke([root, mid, tip], 3.6 * u, YOU.hair);
  p.shadedFill(cap, YOU.hair, SH_HAIR, a);
  p.clip(cap, () => {
    for (const s of [-0.75, -0.4, -0.05])
      p.stroke([[cx + s * a, cy - 0.62 * b], [cx + (s + 0.45 * d) * a, cy - 1.1 * b], [peak[0] - 0.12 * a * d, peak[1] + 0.12 * b]], 1.6 * u, YOU.hairLight);
  });
  p.inkRing(cap, 0.85 * 5 * u);
};

export const youLook: Look = {
  build: BUILD.adult,
  seed: 1,
  jacket: YOU.jacket,
  pants: YOU.jeans,
  shoes: YOU.shoes,
  outfit,
  hair,
  rim: true,
};

/** Full protagonist card drawing. */
export const drawYou = (p: Pen, s: CharState) => drawPerson(p, youLook, s);
