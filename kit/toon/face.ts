import { INK, MOUTH, Pen, TONGUE, WHITE } from "./toon";
import type { P2 } from "./toon";

/**
 * Face library v2 (LOOK_SPEC section 1 "Face", characters.md 2.5): eyes 26u apart on the head's centre line,
 * features slid 7-8u toward the facing side, lidded half-disc deadpan as the default eye, shock = white circles
 * almost touching, tapered brows 17u long at -20u, small mouths at +20u. No blush, no catchlights.
 */
export const EXPRESSIONS = [
  "neutral", "tired", "worried", "scared", "shocked", "smug", "determined",
  "sad", "angry", "sneaky", "relieved", "confused", "deadpan", "laughing",
] as const;
export type Expr = (typeof EXPRESSIONS)[number];

/** Head frame passed to faces, hair and hats (unrotated: the caller rotates the canvas with the head). */
export type Head = { cx: number; cy: number; a: number; b: number; W: number; u: number; pts: P2[]; facing: number; look: number };

type EyeK = "dot" | "small" | "lid" | "heavy" | "happy" | "dash" | "squeeze" | "shock";
type Brow = [number, number];
type MouthK = "dash" | "flat" | "frown" | "smirk" | "smileWide" | "grin" | "laugh" | "O" | "wave" | "teeth";
/** eyes [back, front]; brows [inner, outer] offsets in u (+ = down), per side or shared, or raised arcs. */
type Face = { eye: [EyeK, EyeK]; brow: Brow | [Brow, Brow] | "arc"; mouth: MouthK; glance?: number };

const FACE: Record<Expr, Face> = {
  neutral: { eye: ["lid", "lid"], brow: [0, -1], mouth: "dash" },
  tired: { eye: ["heavy", "heavy"], brow: [-1, 3], mouth: "flat" },
  worried: { eye: ["small", "small"], brow: [-3, 2], mouth: "wave" },
  scared: { eye: ["shock", "shock"], brow: [-6, 1], mouth: "teeth" },
  shocked: { eye: ["shock", "shock"], brow: "arc", mouth: "O" },
  smug: { eye: ["lid", "lid"], brow: [[1, -1], [-4, -6]], mouth: "smirk" },
  determined: { eye: ["lid", "lid"], brow: [3, -2], mouth: "flat" },
  sad: { eye: ["small", "small"], brow: [-4, 3], mouth: "frown" },
  angry: { eye: ["lid", "lid"], brow: [5, -3], mouth: "teeth" },
  sneaky: { eye: ["lid", "lid"], brow: [2, -1], mouth: "smirk", glance: 1 },
  relieved: { eye: ["happy", "happy"], brow: [-2, 1], mouth: "smileWide" },
  confused: { eye: ["dot", "small"], brow: [[-4, -6], [3, 1]], mouth: "wave" },
  deadpan: { eye: ["lid", "lid"], brow: [0, 0], mouth: "flat" },
  laughing: { eye: ["squeeze", "squeeze"], brow: [-4, -4], mouth: "laugh" },
};

export type Effects = {
  /** Sweat drop, 0..1 slide progress. */
  sweat?: number;
  /** Steam puffs, time in s. */
  steam?: number;
  /** Colour rising up the face, t 0..1 (reach 1 over ~8 frames). */
  fill?: { color: string; t: number };
  /** Shock eyes regardless of expression. */
  ringEyes?: boolean;
  /** "!" pop, frames since it appeared. */
  bang?: number;
};

/** Colour-fill gag (drawn between the head fill and its ink ring, so the outline stays whole). */
export const drawFill = (p: Pen, h: Head, fx: Effects) => {
  if (!fx.fill || fx.fill.t <= 0) return;
  const { cx, cy, a, b } = h, top = cy + b - fx.fill.t * 2.1 * b;
  p.clip(h.pts, () => p.poly([[cx - 2 * a, top], [cx + 2 * a, top], [cx + 2 * a, cy + 2 * b], [cx - 2 * a, cy + 2 * b]], fx.fill!.color));
};

export const drawFace = (p: Pen, h: Head, expr: Expr, o: { blink: boolean; fx: Effects; brim?: boolean }) => {
  const { cx, cy, u, facing } = h;
  const F: Face = o.fx.ringEyes ? { ...FACE[expr], eye: ["shock", "shock"], brow: "arc" } : FACE[expr];
  const fx = cx + 7 * u * facing, lw = 3.8 * u, look = h.look + (F.glance ?? 0) * (facing >= 0 ? 1 : -1);
  const shock = F.eye[0] === "shock";
  const ex = (shock ? 12 : 13) * u, ey = cy;
  ([-1, 1] as const).forEach((side, i) => {
    const x = fx + side * ex, lx = x + look * 3 * u;
    const front = facing ? side === Math.sign(facing) : side > 0;
    let kind: EyeK = F.eye[front ? 1 : 0];
    if (o.blink && kind !== "happy" && kind !== "squeeze") kind = "dash";
    if (kind === "dot") p.ell(lx, ey, 3.8 * u, 5.5 * u, INK);
    else if (kind === "small") p.ell(lx, ey, 3 * u, 4.4 * u, INK);
    else if (kind === "lid" || kind === "heavy") {
      const d = kind === "heavy" ? 1.5 * u : -u;
      p.ell(lx, ey + d, 7 * u, kind === "heavy" ? 4 * u : 6 * u, INK, 0, 0, 180);
      p.stroke([[x - 9 * u, ey + d], [x + 9 * u, ey + d]], lw);
    } else if (kind === "happy") p.arc(x, ey + 3 * u, 8 * u, 6 * u, 200, 340, lw);
    else if (kind === "dash") p.stroke([[x - 8.5 * u, ey], [x + 8.5 * u, ey]], lw);
    else if (kind === "squeeze") {
      const tip: P2 = [x - 6 * u * side, ey]; // doubled middle point = sharp ">" (3 points would round it)
      p.stroke([[x + 6 * u * side, ey - 5 * u], tip, tip, [x + 6 * u * side, ey + 5 * u]], lw);
    }
    else {
      p.ell(x, ey, 11 * u, 11 * u, WHITE, 2.6 * u);
      p.dot(lx - side * 1.5 * u, ey + 1.5 * u, 3 * u);
    }
    const by = ey - (o.brim ? 17 : 20) * u;
    if (F.brow === "arc") p.arc(x, by - 6 * u, 9 * u, 3 * u, 200, 340, 4 * u);
    else {
      const [dI, dO] = (Array.isArray(F.brow[0]) ? (F.brow as [Brow, Brow])[i] : F.brow) as Brow;
      p.taper([x - side * 8.5 * u, by + dI * u], [x + side * 8.5 * u, by + dO * u], 5 * u, 2.5 * u);
    }
  });
  const mx = cx + 8 * u * facing, my = cy + 20 * u, mw = 4 * u;
  const dmouth = (rx: number, ry: number, y: number, tongue = false) => {
    p.ell(mx, y, rx, ry, MOUTH, 0, 0, 180);
    p.clip([[mx - rx, y], [mx + rx, y], [mx + rx, y + 3 * u], [mx - rx, y + 3 * u]], () => p.ell(mx, y, rx, ry, WHITE, 0, 0, 180));
    if (tongue) p.clip([[mx - rx, y], [mx + rx, y], [mx + rx, y + ry], [mx - rx, y + ry]], () => p.ell(mx + 2 * u, y + 0.75 * ry, 0.45 * rx, 0.32 * ry, TONGUE));
    p.ell(mx, y, rx, ry, null, 3 * u, 0, 180);
  };
  switch (F.mouth) {
    case "dash":
      p.stroke([[mx - 5.5 * u, my], [mx + 5.5 * u, my - 0.8 * u]], mw);
      break;
    case "flat":
      p.stroke([[mx - 6 * u, my], [mx + 6 * u, my]], mw);
      break;
    case "frown":
      p.arc(mx, my + 3 * u, 6.5 * u, 3.5 * u, 200, 340, mw);
      break;
    case "smirk":
      p.arc(mx + u, my - 3 * u, 7 * u, 4 * u, 10, 150, mw);
      break;
    case "smileWide":
      p.arc(mx, my - 4 * u, 11 * u, 6 * u, 15, 165, mw);
      break;
    case "grin":
      dmouth(12 * u, 8 * u, my - u);
      break;
    case "laugh":
      dmouth(16 * u, 11 * u, my, true);
      break;
    case "O":
      p.ell(mx, my + 2 * u, 9 * u, 11 * u, MOUTH, 3.2 * u);
      break;
    case "wave": {
      const s: P2[] = [];
      for (let i = 0; i <= 12; i++) s.push([mx - 9 * u + i * 1.5 * u, my + 1.5 * u * Math.sin(i * 1.3)]);
      p.stroke(s, 3 * u);
      break;
    }
    case "teeth":
      p.poly([[mx - 12 * u, my - 4 * u], [mx + 12 * u, my - 4 * u], [mx + 11 * u, my + 4 * u], [mx - 11 * u, my + 4 * u]], WHITE, 3 * u);
      for (const k of [-1, 0, 1]) p.stroke([[mx + k * 6 * u, my - 4 * u], [mx + k * 6 * u, my + 4 * u]], 1.5 * u);
      break;
  }
  drawEffects(p, h, o.fx);
};

const drawEffects = (p: Pen, h: Head, fx: Effects) => {
  const { cx, cy, a, b, u } = h, g = p.g, side = h.facing < 0 ? -1 : 1;
  if (fx.sweat !== undefined) {
    const sx = cx - side * (a + 4 * u), sy = cy - 0.35 * b + fx.sweat * 18 * u;
    g.beginPath();
    g.moveTo(sx, sy - 11 * u);
    g.quadraticCurveTo(sx + 7 * u, sy - u, sx + 6 * u, sy + 3 * u);
    g.arc(sx, sy + 3 * u, 6 * u, 0, Math.PI);
    g.quadraticCurveTo(sx - 7 * u, sy - u, sx, sy - 11 * u);
    g.fillStyle = "#9fd4ff";
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 2 * u;
    g.stroke();
  }
  if (fx.steam !== undefined)
    for (const s of [-1, 1])
      for (let i = 0; i < 3; i++) {
        const t = (fx.steam * 0.9 + i / 3) % 1, r = (6 + t * 8) * u;
        g.globalAlpha = 1 - t;
        p.ell(cx + s * (a * 0.85 + t * 14 * u), cy - b * 0.85 - t * 44 * u, r, r, "#f3eef6", 1.6 * u);
        g.globalAlpha = 1;
      }
  if (fx.bang !== undefined) {
    // "!" pop: overshoot to 1.25, settle at 1 over ~6 frames.
    const t = Math.min(fx.bang / 6, 1);
    const k = Math.max(1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2, 0.1);
    g.save();
    g.translate(cx + side * a * 1.05, cy - b * 1.3);
    g.scale(k, k);
    g.rotate(0.18 * side);
    g.beginPath();
    g.roundRect(-5 * u, -22 * u, 10 * u, 26 * u, 5 * u);
    g.fillStyle = "#ffd23a";
    g.fill();
    g.lineWidth = 2.6 * u;
    g.strokeStyle = INK;
    g.stroke();
    p.ell(0, 13 * u, 4.6 * u, 4.6 * u, "#ffd23a", 2.6 * u);
    g.restore();
  }
};
