import type { Head } from "./face";
import type { Torso } from "./figure";
import { INK, Pen, SH_HAIR, WHITE, mix, mul } from "./toon";
import type { P2 } from "./toon";

/**
 * Wardrobe (R1-R12 study, REFERENCE_NOTES "Characters"): every speaking role gets ONE pattern and ONE OR TWO
 * signature accessories that read at phone size: a dotted bowtie, a plaid vest, a visor, a cap, patched overalls,
 * a quilted vest. Flat single-colour beans are forgettable. All pieces draw with the card's Pen and warm ink, inside
 * the Look hooks (`outfit` clipped to the torso, `hair` / `face` in the head frame), so they shade and ink like the
 * rest of the card. Compose with `layers(...)`.
 */
type Layer = (p: Pen, t: Torso) => void;
type HeadLayer = (p: Pen, h: Head) => void;
export const layers = (...ls: Layer[]): Layer => (p, t) => ls.forEach((l) => l(p, t));
export const headLayers = (...ls: HeadLayer[]): HeadLayer => (p, h) => ls.forEach((l) => l(p, h));

const rect = (x: number, y: number, w: number, h: number): P2[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const ink = (u: number) => 1.8 * u;
const hInk = (h: Head) => 0.85 * 5 * h.u;

// ------------------------------------------------------------- torso patterns (fill the whole bean)

/** Base colour + a pattern over the whole torso: plaid, dots, flowers (tropical shirt), quilt, pinstripe. */
export const pattern = (kind: "plaid" | "dots" | "flowers" | "quilt" | "pinstripe", base: string, a: string, b = a): Layer => (p, t) => {
  const { cx, top, bot, u } = t, x0 = cx - 2.2 * t.a, x1 = cx + 2.2 * t.a, y0 = top - 10 * u, y1 = bot + 10 * u;
  p.poly(rect(x0, y0, x1 - x0, y1 - y0), base);
  if (kind === "plaid") {
    for (let x = x0; x < x1; x += 22 * u) p.poly(rect(x, y0, 8 * u, y1 - y0), mix(base, a, 0.55));
    for (let y = y0; y < y1; y += 22 * u) p.poly(rect(x0, y, x1 - x0, 8 * u), mix(base, a, 0.45));
    for (let x = x0 + 15 * u; x < x1; x += 22 * u) p.stroke([[x, y0], [x, y1]], 1.2 * u, b);
    for (let y = y0 + 15 * u; y < y1; y += 22 * u) p.stroke([[x0, y], [x1, y]], 1.2 * u, b);
  } else if (kind === "dots") {
    let row = 0;
    for (let y = y0; y < y1; y += 13 * u, row++) for (let x = x0 + (row % 2) * 6.5 * u; x < x1; x += 13 * u) p.dot(x, y, 2.6 * u, a);
  } else if (kind === "flowers") {
    let row = 0;
    for (let y = y0 + 8 * u; y < y1; y += 30 * u, row++)
      for (let x = x0 + (row % 2) * 17 * u; x < x1; x += 34 * u) {
        for (let k = 0; k < 5; k++) {
          const ang = (k / 5) * Math.PI * 2 + row;
          p.ell(x + Math.cos(ang) * 5.5 * u, y + Math.sin(ang) * 5.5 * u, 4.6 * u, 3.4 * u, a, 0, 0, 360, (ang * 180) / Math.PI);
        }
        p.dot(x, y, 2.4 * u, b);
        p.ell(x + 12 * u, y + 11 * u, 6 * u, 2.6 * u, mix(base, "#1e5a3a", 0.6), 0, 0, 360, 35); // leaf
      }
  } else if (kind === "quilt") {
    for (let k = -12; k < 12; k++) {
      p.stroke([[x0 + k * 16 * u, y0], [x0 + k * 16 * u + (y1 - y0), y1]], 1.1 * u, a);
      p.stroke([[x1 - k * 16 * u, y0], [x1 - k * 16 * u - (y1 - y0), y1]], 1.1 * u, a);
    }
  } else for (let x = x0; x < x1; x += 9 * u) p.stroke([[x, y0], [x, y1]], 1 * u, a);
};

// ------------------------------------------------------------- torso pieces

/** Shorts / trousers from `at` (fraction of the torso height) down, with a hem line. */
export const bottoms = (col: string, at = 0.84): Layer => (p, t) => {
  const { cx, top, bot, u, a } = t, hem = top + (bot - top) * at;
  p.poly(rect(cx - 2 * a, hem, 4 * a, bot - hem + 10 * u), col);
  p.stroke([[cx - 2 * a, hem], [cx + 2 * a, hem]], ink(u));
};

/** Open camp collar (holiday shirt) or a polo collar, plus a button placket. */
export const campCollar = (col: string, buttons = WHITE): Layer => (p, t) => {
  const { cx, chin, u, top, bot } = t;
  for (const s of [-1, 1]) p.poly([[cx + s * 2 * u, chin - 2 * u], [cx + s * 30 * u, chin + 3 * u], [cx + s * 9 * u, chin + 24 * u]], col, ink(u));
  for (let y = chin + 30 * u; y < bot - 20 * u; y += 0.13 * (bot - top)) p.ell(cx + 2 * u * t.facing, y, 2.2 * u, 2.2 * u, buttons, 0.8 * u);
};

/** Bowtie, optionally dotted (the "can't forget him" accessory). */
export const bowtie = (col: string, dots?: string): Layer => (p, t) => {
  const { cx, chin, u } = t, y = chin + 4 * u, x = cx + 3 * u * t.facing;
  for (const s of [-1, 1]) {
    const wing: P2[] = [[x, y], [x + s * 17 * u, y - 9 * u], [x + s * 19 * u, y + 9 * u]];
    p.poly(wing, col, ink(u));
    if (dots) p.clip(wing, () => [[0.45, -1], [0.75, 2], [0.62, 5]].forEach(([k, dy]) => p.dot(x + s * 17 * k * u, y + dy * u, 2.2 * u, dots)));
  }
  p.ell(x, y, 4.5 * u, 5 * u, mul(col, [0.8, 0.8, 0.8]), ink(u));
};

export const suspenders = (col: string, clip = "#d8c8a0"): Layer => (p, t) => {
  const { cx, top, bot, u, a } = t;
  for (const s of [-1, 1]) {
    p.stroke([[cx + s * 0.55 * a, top], [cx + s * 0.38 * a, bot]], 6 * u, col);
    p.poly(rect(cx + s * 0.4 * a - 3 * u, top + 0.62 * (bot - top), 6 * u, 5 * u), clip, 0.8 * u);
  }
};

export const belt = (col: string, buckle = "#e2c25a", at = 0.82): Layer => (p, t) => {
  const { cx, top, bot, u, a } = t, y = top + (bot - top) * at;
  p.poly(rect(cx - 2 * a, y - 4 * u, 4 * a, 8 * u), col, ink(u) * 0.6);
  p.poly(rect(cx - 6 * u, y - 5.5 * u, 12 * u, 11 * u), null, 2.2 * u, buckle);
};

/** Overalls: bib + straps + one contrasting patch (with stitching). */
export const overalls = (col: string, patch: string): Layer => (p, t) => {
  const { cx, top, bot, u, a, chin } = t, h = bot - top, bibTop = chin + 0.3 * h;
  p.poly([[cx - 0.6 * a, bibTop], [cx + 0.6 * a, bibTop], [cx + 2 * a, top + 0.62 * h], [cx + 2 * a, bot + 10 * u], [cx - 2 * a, bot + 10 * u], [cx - 2 * a, top + 0.62 * h]], col, ink(u));
  for (const s of [-1, 1]) {
    p.stroke([[cx + s * 0.75 * a, top], [cx + s * 0.5 * a, bibTop + 4 * u]], 7 * u, col);
    p.ell(cx + s * 0.5 * a, bibTop + 6 * u, 3.4 * u, 3.4 * u, "#e2c25a", 0.9 * u);
  }
  const px = cx - 0.25 * a, py = bibTop + 0.18 * h;
  p.poly(rect(px, py, 18 * u, 16 * u), patch, 1.2 * u);
  p.stroke([[px + 2 * u, py + 2 * u], [px + 16 * u, py + 2 * u], [px + 16 * u, py + 14 * u], [px + 2 * u, py + 14 * u], [px + 2 * u, py + 2 * u]], 0.7 * u, INK, [1.8 * u, 1.6 * u]);
};

/** Shop / staff name tag (text is drawn, so it reads in close-ups). */
/** `dx`: tag centre as a fraction of the torso half-width (0.45 runs off a thin torso: Dave's DAVE read "VE"). */
export const nameTag = (text: string, col = WHITE, dx = 0.45): Layer => (p, t) => {
  const { cx, chin, u, a } = t, x = cx + dx * a, y = chin + 34 * u;
  p.poly(rect(x - 14 * u, y, 28 * u, 11 * u), col, 1.2 * u);
  p.g.save();
  p.g.fillStyle = INK;
  p.g.font = `900 ${8 * u}px sans-serif`;
  p.g.textAlign = "center";
  p.g.fillText(text, x, y + 8.6 * u);
  p.g.restore();
};

// ------------------------------------------------------------- head pieces (hair/hat hook, head frame)

/** Sun visor: a band round the head and a long peak toward the facing side. */
export const visor = (col: string, band = mul(col, [0.75, 0.8, 0.8])): HeadLayer => (p, h) => {
  const { cx, cy, a, b, u } = h, d = h.facing < 0 ? -1 : 1, y = cy - 0.5 * b;
  p.poly(rect(cx - 1.02 * a, y - 7 * u, 2.04 * a, 13 * u), band, hInk(h) * 0.8);
  p.poly([[cx - 0.3 * a * d, y + 4 * u], [cx + 1.25 * a * d, y + 2 * u], [cx + 1.05 * a * d, y + 14 * u], [cx - 0.1 * a * d, y + 12 * u]], col, hInk(h) * 0.8);
};

/** Straw boater perched high: flat crown, wide flat brim, coloured band. */
export const boater = (straw = "#e8cf86", band = "#7a2e3a"): HeadLayer => (p, h) => {
  const { cx, cy, a, b, u } = h, y = cy - 0.92 * b;
  p.poly(rect(cx - 0.5 * a, y - 0.32 * b, a, 0.32 * b), straw, hInk(h));
  p.poly(rect(cx - 0.5 * a, y - 0.12 * b, a, 0.1 * b), band);
  p.ell(cx, y, 0.85 * a, 0.08 * b, straw, hInk(h) * 0.8);
  for (let x = cx - 0.45 * a; x < cx + 0.45 * a; x += 5 * u) p.stroke([[x, y - 0.3 * b], [x + 2 * u, y - 0.14 * b]], 0.7 * u, mul(straw, [0.8, 0.75, 0.65]));
};

/** Baseball cap, forward or backward. */
export const cap = (col: string, backward = false): HeadLayer => (p, h) => {
  const { cx, cy, a, b, u } = h, d = (h.facing < 0 ? -1 : 1) * (backward ? -1 : 1), y = cy - 0.45 * b;
  const crown: P2[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = Math.PI + (i / 20) * Math.PI;
    crown.push([cx + 1.02 * a * Math.cos(t), y + 0.62 * b * Math.sin(t)]);
  }
  p.shadedFill(crown, col, SH_HAIR, a);
  p.inkRing(crown, hInk(h));
  p.ell(cx, y - 0.6 * b, 4 * u, 3 * u, mul(col, [0.75, 0.75, 0.75]));
  p.poly([[cx + 0.2 * a * d, y], [cx + 1.45 * a * d, y + 3 * u], [cx + 1.2 * a * d, y + 10 * u], [cx + 0.1 * a * d, y + 7 * u]], mul(col, [0.85, 0.85, 0.85]), hInk(h) * 0.8);
};

export const headband = (col: string): HeadLayer => (p, h) => {
  const { cx, cy, a, b, u } = h;
  p.poly(rect(cx - 1.03 * a, cy - 0.62 * b, 2.06 * a, 12 * u), col, hInk(h) * 0.7);
};

/** Sunglasses pushed up on the forehead (cool-dad / influencer). */
export const shadesUp = (frame = "#2a2a34", lens = "#3a5a7a"): HeadLayer => (p, h) => {
  const { cx, cy, b, u, facing } = h, x = cx + 7 * u * facing, y = cy - 0.55 * b;
  for (const s of [-1, 1]) p.ell(x + s * 14 * u, y, 11 * u, 7 * u, lens, 2.4 * u, 0, 360, 0, frame);
  p.stroke([[x - 3 * u, y - 2 * u], [x + 3 * u, y - 2 * u]], 2.4 * u, frame);
};

// ------------------------------------------------------------- face pieces (face hook)

/** Moustaches: walrus (big, droopy), handlebar (curled), pencil (thin). */
export const tache = (style: "walrus" | "handlebar" | "pencil", col = "#5a3a28"): HeadLayer => (p, h) => {
  const { cx, cy, u, facing } = h, mx = cx + 8 * u * facing, my = cy + 13 * u;
  if (style === "pencil") return void p.stroke([[mx - 10 * u, my + 2 * u], [mx + 10 * u, my + 2 * u]], 2.6 * u, col);
  for (const s of [-1, 1]) {
    if (style === "walrus") {
      const blob: P2[] = [[mx, my - 3 * u], [mx + s * 12 * u, my - 4 * u], [mx + s * 22 * u, my + 8 * u], [mx + s * 16 * u, my + 12 * u], [mx + s * 6 * u, my + 6 * u], [mx, my + 4 * u]];
      p.poly(blob, col, 2.4 * u);
    } else {
      p.taper([mx, my], [mx + s * 16 * u, my + 2 * u], 8 * u, 3 * u, col);
      p.arc(mx + s * 19 * u, my - 2 * u, 4 * u, 4 * u, s > 0 ? 270 : 90, s > 0 ? 450 : 270, 2.4 * u, col);
    }
  }
};
