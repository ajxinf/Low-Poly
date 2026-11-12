import type { Head } from "./face";
import type { Look, Torso } from "./figure";
import { BUILD, INK, Pen, SH_CLOTH, SH_HAIR, WHITE, clamp, mul } from "./toon";
import type { Build, P2 } from "./toon";

/**
 * Cast generator: extras from a build, an outfit and ONE strong accessory, so crowds don't look cloned. All heads
 * cream (identity); darks are coloured (aubergine, plum, navy, oxblood), never black. Builds stay 3.4-3.6 HH
 * (kids 2.85).
 */
export const BUILDS = {
  tallThin: { a: 124, torso: 1.1, legs: 1.48, tw: 0.7 },
  shortRound: { a: 128, torso: 1.15, legs: 1.32, tw: 1.0, egg: 0.06 },
  old: { a: 126, torso: 1.1, legs: 1.42, tw: 0.82, stoop: 1 },
  child: BUILD.kid,
  pear: { a: 126, torso: 1.12, legs: 1.38, tw: 0.84, egg: 0.3 },
  stocky: BUILD.stout,
} satisfies Record<string, Build>;

const rect = (x: number, y: number, w: number, h: number): P2[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const outline = (h: Head) => 0.85 * 5 * h.u;

// ------------------------------------------------------------- outfits

type Top = {
  /** Trousers / skirt colour and where they start (fraction of torso height). */
  bottom?: [string, number];
  stripes?: { color: string; gap: number; vertical?: boolean };
  /** Shirt V at the neck with an optional tie. */
  shirt?: { color: string; tie?: string };
  buttons?: string;
  /** Ribbed hem band (knits). */
  rib?: string;
  collar?: string;
};

const outfit = (o: Top) => (p: Pen, t: Torso) => {
  const { cx, top, bot, chin, u, a } = t, h = bot - top, line = 1.8 * u;
  if (o.stripes) {
    const s = o.stripes;
    if (s.vertical) for (let x = cx - a + (s.gap * u) / 2; x < cx + a; x += s.gap * u) p.poly(rect(x, top, s.gap * u * 0.4, h + 10 * u), s.color);
    else for (let y = chin + (s.gap * u) / 2; y < bot; y += s.gap * u) p.poly(rect(cx - 2 * a, y, 4 * a, s.gap * u * 0.45), s.color);
  }
  const hem = o.bottom ? top + h * o.bottom[1] : bot + 10 * u;
  if (o.bottom) {
    p.poly(rect(cx - 2 * a, hem, 4 * a, bot - hem + 10 * u), o.bottom[0]);
    p.stroke([[cx - 2 * a, hem], [cx + 2 * a, hem]], line);
  }
  if (o.rib) {
    p.poly(rect(cx - 2 * a, hem - 7 * u, 4 * a, 7 * u), o.rib, line);
    for (let x = cx - a; x < cx + a; x += 3.5 * u) p.stroke([[x, hem - 5.5 * u], [x, hem - 1.5 * u]], 0.7 * u, mul(o.rib, SH_CLOTH));
  }
  if (o.shirt) {
    const vY = chin + 26 * u;
    p.poly([[cx - 14 * u, top], [cx, vY], [cx + 14 * u, top]], o.shirt.color, line);
    if (o.shirt.tie) p.poly([[cx - 3 * u, chin + 2 * u], [cx + 3 * u, chin + 2 * u], [cx + 4.5 * u, vY - 2 * u], [cx, vY + 4 * u], [cx - 4.5 * u, vY - 2 * u]], o.shirt.tie, 1.4 * u);
  }
  if (o.collar) for (const s of [-1, 1]) p.poly([[cx + s * 3 * u, chin - 2 * u], [cx + s * 30 * u, chin + 1 * u], [cx + s * 16 * u, chin + 15 * u]], o.collar, line);
  if (o.buttons) for (let y = chin + (o.shirt ? 32 : 10) * u; y < (o.bottom ? hem - 6 * u : bot - 10 * u); y += 0.15 * h) p.ell(cx + 2 * u * t.facing, y, 2.2 * u, 2.2 * u, o.buttons, 0.8 * u);
};

// ------------------------------------------------------------- hair and hats (head frame)

/**
 * Hair cap above y = cy - k b (lower toward the temples by `sides` b), pushed out 4 %, scalloped lower edge;
 * `spikes` adds messy tips on top.
 */
const capPts = (h: Head, k: number, sides = 0.35, spikes = 0): P2[] => {
  const { cx, cy, a, b, u, pts } = h;
  const lim = (x: number) => cy - k * b + sides * b * Math.abs((x - cx) / a) ** 3;
  const n = pts.length, cap: P2[] = [];
  for (let i = n / 2; i <= n; i++) {
    const [x, y] = pts[i % n];
    if (y >= lim(x)) continue;
    const xn = (x - cx) / a, top = clamp((cy - 0.5 * b - y) / (0.5 * b), 0, 1);
    cap.push([cx + (x - cx) * 1.04, cy + (y - cy) * 1.04 - (spikes ? 0.12 * b * top * (0.5 + 0.5 * Math.cos(xn * Math.PI * spikes)) : 0)]);
  }
  const xr = cap[cap.length - 1][0], xl = cap[0][0];
  for (let i = 1; i < 8; i++) {
    const x = xr + ((xl - xr) * i) / 8;
    cap.push([x, lim(x) + (i % 2 ? 2.4 * u : 0)]);
  }
  return cap;
};

const fillInk = (p: Pen, h: Head, pts: P2[], col: string) => {
  p.shadedFill(pts, col, SH_HAIR, h.a);
  p.inkRing(pts, outline(h));
};

export const capHair = (col: string, k: number, sides = 0.35, spikes = 0) => (p: Pen, h: Head) => fillInk(p, h, capPts(h, k, sides, spikes), col);

/** Half-ellipse dome (crown of a hat) standing on y0. */
const dome = (cx: number, y0: number, rx: number, ry: number, flat = 2.4): P2[] => {
  const out: P2[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = Math.PI + (i / 24) * Math.PI, c = Math.cos(t), s = Math.sin(t);
    out.push([cx + rx * Math.sign(c) * Math.abs(c) ** (2 / flat), y0 + ry * Math.sign(s) * Math.abs(s) ** (2 / flat)]);
  }
  return out;
};

const bowler = (p: Pen, h: Head) => {
  const { cx, cy, a, b, u } = h, yb = cy - 0.5 * b, col = "#3e3048";
  const crown = dome(cx, yb, 0.74 * a, 0.95 * b);
  p.shadedFill(crown, col, SH_HAIR, a);
  p.clip(crown, () => p.poly(rect(cx - a, yb - 0.24 * b, 2 * a, 0.16 * b), "#5a4658"));
  p.inkRing(crown, outline(h));
  p.ell(cx + 3 * u * h.facing, yb, 1.1 * a, 0.11 * b, col, outline(h) * 0.8);
};

const flatCap = (p: Pen, h: Head) => {
  const { cx, cy, a, b, u } = h, col = "#8a7458", d = h.facing < 0 ? -1 : 1;
  const crown = capPts(h, 0.32, 0.1).map(([x, y]) => [cx + (x - cx) * 1.04, cy + (y - cy) * 1.04 - 0.04 * b] as P2);
  p.shadedFill(crown, col, SH_HAIR, a);
  p.clip(crown, () => {
    for (let x = cx - a; x < cx + a; x += 6 * u) p.stroke([[x, cy - 1.2 * b], [x + 3 * u, cy - 0.2 * b]], 0.9 * u, mul(col, [0.82, 0.8, 0.8]));
  });
  p.inkRing(crown, outline(h));
  p.ell(cx + 10 * u * d, cy - 0.3 * b, 0.62 * a, 0.12 * b, mul(col, [0.8, 0.78, 0.78]), outline(h) * 0.8, 0, 180);
};

const nightcap = (p: Pen, h: Head) => {
  const { cx, cy, a, b, u } = h, d = h.facing < 0 ? -1 : 1, y0 = cy - 0.45 * b;
  const loc: P2[] = [[-1.03, 0], [-0.75, -0.95], [0.05, -1.32], [0.85, -1.05], [1.35, -0.45], [0.9, -0.7], [0.92, -0.25], [1.03, 0]];
  const cone = loc.map(([x, y]) => [cx + x * a * d, y0 + y * b] as P2);
  p.poly(cone, "#f2e6d8");
  p.clip(cone, () => {
    for (let i = -4; i < 6; i++) p.poly([[cx + i * 24 * u, y0 + 4 * u], [cx + i * 24 * u + 40 * u, y0 - 1.6 * b], [cx + i * 24 * u + 50 * u, y0 - 1.6 * b], [cx + i * 24 * u + 10 * u, y0 + 4 * u]], "#c23a4a");
  });
  p.shade(cone, SH_CLOTH, a, 0.4, 0.15);
  p.inkRing(cone, outline(h));
  const cuff = rect(cx - 1.06 * a, y0 - 4 * u, 2.12 * a, 9 * u);
  p.poly(cuff, "#f2e6d8", outline(h) * 0.7);
  p.ell(cx + 1.38 * a * d, y0 - 0.42 * b, 7 * u, 7 * u, WHITE, outline(h) * 0.7);
};

const bun = (p: Pen, h: Head) => {
  const { cx, cy, a, b } = h;
  const pts: P2[] = [];
  for (let i = 0; i < 32; i++) pts.push([cx - 0.08 * a + 0.42 * a * Math.cos((i / 32) * Math.PI * 2), cy - 1.05 * b + 0.38 * b * Math.sin((i / 32) * Math.PI * 2)]);
  fillInk(p, h, pts, "#5a3424");
};

const glasses = (p: Pen, h: Head) => {
  const { cx, cy, u, facing } = h, fx = cx + 7 * u * facing, w = 2.4 * u;
  for (const s of [-1, 1]) {
    p.ell(fx + s * 13 * u, cy, 10.5 * u, 10 * u, "rgba(190,225,255,0.22)", w);
    p.stroke([[fx + s * 23.5 * u, cy - 3 * u], [cx + s * h.a * 0.98, cy - 6 * u]], w * 0.8);
  }
  p.arc(fx, cy + 1 * u, 3 * u, 3 * u, 200, 340, w);
};

const moustache = (p: Pen, h: Head) => {
  const { cx, cy, u, facing } = h, mx = cx + 8 * u * facing, my = cy + 13 * u;
  for (const s of [-1, 1]) {
    p.taper([mx + s * u, my], [mx + s * 15 * u, my + 4 * u], 9.5 * u, 3.5 * u, INK);
    p.taper([mx + s * u, my], [mx + s * 15 * u, my + 4 * u], 7 * u, 1.6 * u, "#ece6dc");
  }
};

/** Bald with grey side hair: a crescent hugging each side of the skull above the ear line. */
const tufts = (p: Pen, h: Head) => {
  const { cx, cy, b, pts } = h;
  for (const s of [-1, 1]) {
    const side = pts.filter(([x, y]) => (x - cx) * s > 0 && y > cy - 0.62 * b && y < cy - 0.02 * b);
    if (side.length < 3) continue;
    const at = (q: P2, k: number): P2 => [cx + (q[0] - cx) * k, cy + (q[1] - cy) * k];
    fillInk(p, h, [...side.map((q) => at(q, 1.07)), ...side.reverse().map((q) => at(q, 0.95))], "#d8d2cc");
  }
};

// ------------------------------------------------------------- the six extras

export const EXTRAS: { name: string; look: Look }[] = [
  {
    name: "tall thin + bowler",
    look: {
      build: BUILDS.tallThin, seed: 11, jacket: "#3e6a50", pants: "#3a3446", shoes: "#4d2725", brim: true,
      outfit: outfit({ bottom: ["#3a3446", 0.88], shirt: { color: "#f2ece2", tie: "#9a2a3a" }, buttons: "#d8b45a" }),
      hair: (p, h) => {
        capHair("#4a3428", 0.3, 0.5)(p, h);
        bowler(p, h);
      },
    },
  },
  {
    name: "short round + flat cap",
    look: {
      build: BUILDS.shortRound, seed: 23, jacket: "#d4a838", pants: "#5a4636", shoes: "#4a3020", brim: true,
      outfit: outfit({ bottom: ["#5a4636", 0.84], stripes: { color: "#b88a2a", gap: 9 }, rib: "#b88a2a" }),
      hair: (p, h) => {
        capHair("#6a4a32", 0.3, 0.5)(p, h);
        flatCap(p, h);
      },
    },
  },
  {
    name: "old + moustache",
    look: {
      build: BUILDS.old, seed: 37, jacket: "#8a5a44", pants: "#4a4a5e", shoes: "#4a3428",
      outfit: outfit({ bottom: ["#4a4a5e", 0.86], collar: "#f2ece2", buttons: "#4a3428" }),
      hair: tufts,
      face: moustache,
    },
  },
  {
    name: "child + glasses",
    look: {
      build: BUILDS.child, seed: 41, jacket: "#f2e6d8", pants: "#3e6aa8", shoes: "#c8423a",
      outfit: outfit({ bottom: ["#3e6aa8", 0.8], stripes: { color: "#d8504a", gap: 10 } }),
      hair: capHair("#3a2a24", 0.5, 0.35, 5),
      face: glasses,
    },
  },
  {
    name: "pear + bun",
    look: {
      build: BUILDS.pear, seed: 53, jacket: "#7a3a5a", pants: "#3d2530", shoes: "#3d2530", rim: true,
      outfit: outfit({ collar: "#f2ece2", buttons: "#f2ece2" }),
      hairBack: bun,
      hair: capHair("#5a3424", 0.5, 0.4),
    },
  },
  {
    name: "stocky + nightcap",
    look: {
      build: BUILDS.stocky, seed: 67, jacket: "#7a92c4", pants: "#7a92c4", shoes: "#8a3a3a",
      outfit: outfit({ bottom: ["#7a92c4", 0.78], stripes: { color: "#4e6496", gap: 9, vertical: true }, collar: "#4e6496", buttons: "#f2ece2" }),
      hair: (p, h) => {
        capHair("#8a5a32", 0.3, 0.5)(p, h);
        nightcap(p, h);
      },
    },
  },
];
