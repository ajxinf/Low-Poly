import { CARD_INK, HEAD, Pen } from "./toon";

/**
 * Faces, drawn in the head frame (head centre at 0,0, head HEAD.W = 350 wide). Eyes sit high and close
 * (centres .24 head widths apart, 45 % down the head); thick wedge brows do most of the acting; mouths are big.
 */
export const EXPRESSIONS = [
  "neutral", "tired", "worried", "scared", "shocked", "smug", "determined",
  "sad", "angry", "sneaky", "relieved", "confused", "deadpan", "laughing",
] as const;
export type Expr = (typeof EXPRESSIONS)[number];

type Eye = {
  kind?: "open" | "happy" | "content";
  size?: number;
  pupil?: number;
  /** Upper / lower lid cover 0..1; tilt in degrees (+ = inner corner lower: angry, - = sad). */
  top?: number;
  bot?: number;
  tilt?: number;
  /** Pupil offset in px (sideways glance). */
  px?: number;
};
/** [inner, outer, arch] in px: + = lower; arch + bows the brow up. */
type Brow = [number, number, number];
type Mouth = "flat" | "smile" | "frown" | "smirk" | "wobble" | "o" | "shout" | "grit" | "grin" | "tight";
type Face = { eyes: Eye | [Eye, Eye]; brows: Brow | [Brow, Brow]; mouth: Mouth; browW?: number };

const FACES: Record<Expr, Face> = {
  neutral: { eyes: {}, brows: [6, 0, 3], mouth: "flat" },
  tired: { eyes: { top: 0.55, tilt: -10 }, brows: [-6, 12, 2], mouth: "wobble" },
  worried: { eyes: { size: 1.05 }, brows: [-30, 6, -4], mouth: "wobble" },
  scared: { eyes: { size: 1.2, pupil: 0.6 }, brows: [-32, -8, 2], mouth: "shout" },
  shocked: { eyes: { size: 1.32, pupil: 0.45 }, brows: [-36, -30, 10], mouth: "o" },
  smug: { eyes: [{ top: 0.5, tilt: 6 }, { top: 0.42, tilt: 4 }], brows: [[10, 4, 2], [-8, -26, 12]], mouth: "smirk" },
  determined: { eyes: { top: 0.32, tilt: 16 }, brows: [24, -8, -2], mouth: "tight", browW: 1.15 },
  sad: { eyes: { top: 0.22, tilt: -16 }, brows: [-26, 12, -6], mouth: "frown" },
  angry: { eyes: { top: 0.38, bot: 0.12, tilt: 24, pupil: 0.8 }, brows: [34, -12, -6], mouth: "grit", browW: 1.25 },
  sneaky: { eyes: { top: 0.5, tilt: 8, px: 11 }, brows: [14, 4, 0], mouth: "smirk" },
  relieved: { eyes: { kind: "content" }, brows: [-14, 6, 6], mouth: "smile" },
  confused: { eyes: [{ size: 0.82, top: 0.2 }, { size: 1.16 }], brows: [[18, 8, 0], [-22, -18, 10]], mouth: "wobble" },
  deadpan: { eyes: { top: 0.56, bot: 0.08 }, brows: [2, 2, 0], mouth: "flat" },
  laughing: { eyes: { kind: "happy" }, brows: [-18, -2, 8], mouth: "grin" },
};

export type Effects = {
  /** Sweat drop, 0..1 slide progress. */
  sweat?: number;
  /** Steam puffs, time in s. */
  steam?: number;
  /** Colour rising up the face, t 0..1 (reach 1 over ~8 frames). */
  fill?: { color: string; t: number };
  /** Ring (pinpoint) eyes regardless of expression. */
  ringEyes?: boolean;
  /** "!" pop, frames since it appeared. */
  bang?: number;
};

const EYE = { y: -0.05 * HEAD.W, dx: 0.12 * HEAD.W, rx: 34, ry: 39 };
const WHITE = "#fbf6ee", MOUTH = "#3a141c", TONGUE = "#c85a64";

const ellipse = (x: number, y: number, rx: number, ry: number) => (c: CanvasRenderingContext2D) => c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);

const drawEye = (pen: Pen, x: number, y: number, s: number, e: Eye, blink: boolean, skin: string, look: number) => {
  const w = pen.w;
  if (blink && e.kind !== "happy") return pen.line([[x - 26, y + 4], [x, y + 10], [x + 26, y + 4]], w * 0.85);
  if (e.kind === "happy") return pen.line([[x - 26, y + 10], [x, y - 22], [x + 26, y + 10]], w * 0.95);
  if (e.kind === "content") return pen.line([[x - 26, y - 4], [x, y + 18], [x + 26, y - 4]], w * 0.95);
  const k = e.size ?? 1, rx = EYE.rx * k, ry = EYE.ry * k;
  const white = ellipse(x, y, rx, ry);
  pen.shape(white, WHITE, w * 0.85);
  pen.dot(x + (e.px ?? 0) + look * 8, y + 3, 15 * (e.pupil ?? 1));
  const t = Math.tan(((e.tilt ?? 0) * Math.PI) / 180) * rx; // inner corner is toward the face centre (x = -s side)
  const lid = (cover: number, dir: 1 | -1) => {
    if (!cover) return;
    const ly = y + dir * (-ry + 2 * ry * cover);
    const yi = ly + (dir === 1 ? t : -t * 0.4), yo = ly - (dir === 1 ? t : -t * 0.4);
    const xi = x - s * rx * 1.2, xo = x + s * rx * 1.2;
    pen.clip(white, () => {
      pen.fill((c) => {
        c.moveTo(xi, yi);
        c.lineTo(xo, yo);
        c.lineTo(xo, y - dir * ry * 1.5);
        c.lineTo(xi, y - dir * ry * 1.5);
      }, skin);
      pen.line([[xi, yi], [xo, yo]], w * 0.75);
    });
  };
  lid(e.top ?? 0, 1);
  lid(e.bot ?? 0, -1);
  pen.shape(white, null, w * 0.85);
};

/** Wedge brow: thick and blunt at the inner end, tapering to a point outside. */
const drawBrow = (pen: Pen, x: number, s: number, [inner, outer, arch]: Brow, k: number) => {
  const base = EYE.y - 60;
  const ix = x + s * 12, iy = base + inner, ox = x + s * 82, oy = base + outer;
  const mx = (ix + ox) / 2, my = (iy + oy) / 2 - arch;
  const ti = 11 * k, to = 3.5 * k;
  pen.shape((c) => {
    c.moveTo(ix, iy - ti);
    c.quadraticCurveTo(mx, my - (ti + to) / 2 - 3, ox, oy - to);
    c.quadraticCurveTo(ox + s * 6, oy, ox, oy + to);
    c.quadraticCurveTo(mx, my + (ti + to) / 2 - 3, ix, iy + ti);
    c.closePath();
  }, CARD_INK, pen.w * 0.4);
};

const drawMouth = (pen: Pen, x: number, y: number, m: Mouth) => {
  const w = pen.w * 0.85;
  switch (m) {
    case "flat":
      return pen.line([[x - 32, y], [x + 32, y]], w);
    case "tight":
      return pen.line([[x - 30, y + 8], [x - 20, y], [x + 20, y], [x + 30, y + 8]], w);
    case "smile":
      return pen.line([[x - 42, y - 10], [x, y + 26], [x + 42, y - 10]], w);
    case "frown":
      return pen.line([[x - 36, y + 14], [x, y - 16], [x + 36, y + 14]], w);
    case "smirk":
      pen.line([[x - 34, y + 6], [x + 6, y + 14], [x + 40, y - 16]], w);
      return pen.line([[x + 34, y - 24], [x + 46, y - 10]], w * 0.7);
    case "wobble": {
      const pts: [number, number][] = [];
      for (let i = 0; i <= 12; i++) pts.push([x - 40 + i * (80 / 12), y + Math.sin(i * 1.05) * 6]);
      return pen.line(pts, w);
    }
    case "o":
      pen.shape(ellipse(x, y + 12, 27, 36), MOUTH, w);
      return pen.clip(ellipse(x, y + 12, 27, 36), () => pen.fill(ellipse(x, y + 46, 20, 14), TONGUE));
    case "shout": {
      const p = (c: CanvasRenderingContext2D) => {
        c.moveTo(x - 46, y - 4);
        c.quadraticCurveTo(x, y - 18, x + 46, y - 4);
        c.quadraticCurveTo(x + 40, y + 46, x, y + 48);
        c.quadraticCurveTo(x - 40, y + 46, x - 46, y - 4);
      };
      pen.shape(p, MOUTH, w);
      pen.clip(p, () => {
        pen.fill((c) => c.rect(x - 50, y - 20, 100, 22), WHITE);
        pen.fill(ellipse(x, y + 50, 26, 16), TONGUE);
      });
      return pen.shape(p, null, w);
    }
    case "grit": {
      const p = (c: CanvasRenderingContext2D) => c.roundRect(x - 54, y - 18, 108, 42, 14);
      pen.shape(p, WHITE, w);
      pen.clip(p, () => {
        pen.line([[x - 56, y + 3], [x + 56, y + 3]], w * 0.6);
        for (const dx of [-30, -10, 10, 30]) pen.line([[x + dx, y - 20], [x + dx, y + 26]], w * 0.55);
      });
      return pen.shape(p, null, w);
    }
    case "grin": {
      const p = (c: CanvasRenderingContext2D) => {
        c.moveTo(x - 54, y - 12);
        c.quadraticCurveTo(x, y - 20, x + 54, y - 12);
        c.quadraticCurveTo(x + 50, y + 54, x, y + 56);
        c.quadraticCurveTo(x - 50, y + 54, x - 54, y - 12);
      };
      pen.shape(p, MOUTH, w);
      pen.clip(p, () => {
        pen.fill((c) => c.rect(x - 60, y - 24, 120, 26), WHITE);
        pen.fill(ellipse(x + 6, y + 56, 30, 20), TONGUE);
      });
      return pen.shape(p, null, w);
    }
  }
};

export type FaceOpts = { look: number; blink: boolean; fx: Effects; skin: string; eyeScale?: number; ry: number };

/** Face on the head frame: expression, blink, look direction and effects. */
export const drawFace = (pen: Pen, expr: Expr, o: FaceOpts) => {
  const f = FACES[expr];
  const fx = o.fx, ox = o.look * 22;
  if (fx.fill && fx.fill.t > 0) {
    const head = ellipse(0, 0, HEAD.W / 2, o.ry);
    pen.clip(head, () => pen.fill((c) => c.rect(-HEAD.W, o.ry - fx.fill!.t * o.ry * 1.95, HEAD.W * 2, o.ry * 2), fx.fill!.color));
    pen.shape(head, null);
  }
  for (const [i, s] of [[0, -1], [1, 1]] as const) {
    const eye = Array.isArray(f.eyes) ? f.eyes[i] : f.eyes;
    const e: Eye = fx.ringEyes ? { size: 1.3, pupil: 0.42 } : { ...eye, size: (eye.size ?? 1) * (o.eyeScale ?? 1) };
    const x = ox + s * EYE.dx;
    drawEye(pen, x, EYE.y, s, e, o.blink, o.skin, o.look);
    const brow = (Array.isArray(f.brows[0]) ? (f.brows as [Brow, Brow])[i] : f.brows) as Brow;
    drawBrow(pen, x - s * 30, s, brow, f.browW ?? 1);
  }
  drawMouth(pen, ox * 1.1, 0.25 * HEAD.W, f.mouth);
  drawEffects(pen, fx, o.ry);
};

const drawEffects = (pen: Pen, fx: Effects, ry: number) => {
  const R = HEAD.W / 2;
  if (fx.sweat !== undefined) {
    const sx = R * 0.86, sy = -ry * 0.3 + fx.sweat * 50;
    pen.shape((c) => {
      c.moveTo(sx, sy - 34);
      c.quadraticCurveTo(sx + 20, sy - 4, sx + 18, sy + 8);
      c.arc(sx, sy + 8, 18, 0, Math.PI);
      c.quadraticCurveTo(sx - 20, sy - 4, sx, sy - 34);
    }, "#9fd8ff", pen.w * 0.6);
    pen.dot(sx - 6, sy + 6, 4.5, "rgba(255,255,255,0.85)");
  }
  if (fx.steam !== undefined) {
    for (const side of [-1, 1])
      for (let i = 0; i < 3; i++) {
        const p = (fx.steam * 0.9 + i / 3) % 1;
        const r = 18 + p * 24;
        pen.c.globalAlpha = 1 - p;
        pen.shape(ellipse(side * (R * 0.85 + p * 44), -ry * 0.85 - p * 130, r, r), "#f3eef6", pen.w * 0.5);
        pen.c.globalAlpha = 1;
      }
  }
  if (fx.bang !== undefined) {
    // "!" pop: overshoot to 1.25, settle at 1 over ~6 frames.
    const t = Math.min(fx.bang / 6, 1);
    const k = Math.max(1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2, 0.1); // easeOutBack
    pen.c.save();
    pen.c.translate(R * 1.1, -ry * 1.25);
    pen.c.scale(k, k);
    pen.c.rotate(0.18);
    pen.shape((c) => c.roundRect(-16, -66, 32, 80, 14), "#ffd23a", pen.w * 0.7);
    pen.shape(ellipse(0, 42, 14, 14), "#ffd23a", pen.w * 0.7);
    pen.c.restore();
  }
};
