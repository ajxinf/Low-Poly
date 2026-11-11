import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace } from "three";

/**
 * Pen API: characters are drawn on a 600x1000 Canvas2D design canvas (soles at y = 975, 500 px = 1 m) and uploaded
 * as a texture on a camera-facing card (see cast.ts / cardshade.ts). The canvas is RES x the design size.
 * Each card also gets a shade mask (alpha = form-shadow side), drawn by the same code with a mask-mode Pen.
 */
export const DESIGN = { W: 600, H: 1000, SOLE: 975, PX_PER_M: 500, RES: 2 };
export const CARD_INK = "#1d1416";
/** Head frame: every head, face, hair and hat is drawn around (0, 0) for a head this wide, then scaled to the build. */
export const HEAD = { W: 350 };
/** Fallback outline width in design px; cards set it per frame from inkPx(). */
export const LINE = 9;

/**
 * Outline width in screen px (at 1920 tall) for a head `headPx` tall on screen (at 1920): 8 px for a medium
 * (head ~400 px, like the references), growing slowly to a 14 px cap in close-ups, thinner in wides (min 3).
 */
export const inkPx = (headPx: number) => Math.min(14, Math.max(3, 8 * Math.sqrt(headPx / 400)));

type Path = (c: CanvasRenderingContext2D) => void;

export class Pen {
  /** Mask mode: filled shapes clear the shade mask (unless occlude is off), crescents paint it, ink is skipped. */
  occlude = true;
  constructor(
    public c: CanvasRenderingContext2D,
    /** -1 = shadow on the left of the card, +1 = right: outlines get thicker there. */
    public shadowSide = 1,
    public w = LINE,
    public mask = false,
  ) {
    c.lineJoin = "round";
    c.lineCap = "round";
  }

  private erase(path: Path, rule: CanvasFillRule = "nonzero") {
    if (!this.occlude) return;
    const c = this.c;
    c.save();
    c.globalCompositeOperation = "destination-out";
    c.beginPath();
    path(c);
    c.fillStyle = "#000";
    c.fill(rule);
    c.restore();
  }

  /** Filled shape with an ink outline that is ~35 % thicker on the shadow side. */
  shape(path: Path, fill: string | null, w = this.w) {
    if (this.mask) return fill ? this.erase(path) : undefined;
    const c = this.c;
    c.strokeStyle = CARD_INK;
    c.lineWidth = w;
    c.save();
    c.translate(this.shadowSide * w * 0.35, w * 0.12);
    c.beginPath();
    path(c);
    c.stroke();
    c.restore();
    c.beginPath();
    path(c);
    if (fill) {
      c.fillStyle = fill;
      c.fill();
    }
    c.stroke();
  }

  fill(path: Path, fill: string, rule: CanvasFillRule = "nonzero") {
    if (this.mask) return this.erase(path, rule);
    this.c.beginPath();
    path(this.c);
    this.c.fillStyle = fill;
    this.c.fill(rule);
  }

  /** Ink stroke: 3 points = one smooth curve, otherwise a polyline (joints stay visible, e.g. knees and elbows). */
  line(pts: [number, number][], w = this.w, color = CARD_INK, dash?: number[]) {
    if (this.mask) return;
    const c = this.c;
    c.strokeStyle = color;
    c.lineWidth = w;
    if (dash) c.setLineDash(dash);
    c.beginPath();
    c.moveTo(...pts[0]);
    if (pts.length === 3) c.quadraticCurveTo(...pts[1], ...pts[2]);
    else pts.slice(1).forEach((p) => c.lineTo(...p));
    c.stroke();
    if (dash) c.setLineDash([]);
  }

  poly(pts: [number, number][], w = this.w, color = CARD_INK) {
    this.line(pts.length === 3 ? [pts[0], pts[1], pts[1], pts[2]] : pts, w, color);
  }

  dot(x: number, y: number, r: number, color = CARD_INK) {
    if (this.mask) return;
    this.c.beginPath();
    this.c.arc(x, y, r, 0, Math.PI * 2);
    this.c.fillStyle = color;
    this.c.fill();
  }

  /** Run `fn` clipped to `path`. */
  clip(path: Path, fn: () => void) {
    this.c.save();
    this.c.beginPath();
    path(this.c);
    this.c.clip();
    fn();
    this.c.restore();
  }

  /** Form shadow inside a clipped shape: a crescent on the shadow side (bbox minus a shifted ellipse). Mask only. */
  crescent(cx: number, cy: number, rx: number, ry: number, shift: number) {
    if (!this.mask) return;
    const c = this.c;
    c.beginPath();
    c.rect(cx - rx * 2, cy - ry * 2, rx * 4, ry * 4);
    c.ellipse(cx - this.shadowSide * shift, cy - shift * 0.25, rx, ry, 0, 0, Math.PI * 2);
    c.fillStyle = "#fff";
    c.fill("evenodd");
  }
}

/** Body proportions. Fractions are of the total height `h` (sole to top of head, design px). */
export type Build = {
  h: number;
  head: number;
  /** Head height / width. */
  aspect: number;
  torso: number;
  /** Torso half-width at the shoulders and at the hips, as fractions of head width (pear: hip > shoulder). */
  shoulder: number;
  hip: number;
  /** 0..1: head pushed down and forward, knees bent (old age). */
  stoop?: number;
};

export const BUILD_YOU: Build = { h: 840, head: 0.4, aspect: 0.98, torso: 0.3, shoulder: 0.2, hip: 0.31 };

/** Body landmarks (design px, before pose) for a build. */
export const rig = (b: Build) => {
  const HH = b.h * b.head, HW = HH / b.aspect, top = DESIGN.SOLE - b.h;
  const tTop = top + HH * 0.93, tBot = tTop + b.h * b.torso, th = tBot - tTop;
  const sy = tTop + th * 0.2;
  return {
    HH,
    HW,
    head: { x: DESIGN.W / 2, y: top + HH / 2, k: HW / HEAD.W, ry: (HEAD.W / 2) * b.aspect },
    torso: { top: tTop, bottom: tBot, rt: b.shoulder * HW, rb: b.hip * HW },
    shoulder: { y: sy, dx: b.shoulder * HW * 0.9 },
    hip: { y: tBot - th * 0.1, dx: Math.max(14, b.hip * HW * 0.36) },
    ankle: { y: DESIGN.SOLE - 18, dx: Math.max(18, b.hip * HW * 0.42) },
    /** Upper arm = forearm length. */
    arm: ((tBot - sy) * 1.25) / 2,
    hand: Math.max(18, HW * 0.085),
  };
};
export type Rig = ReturnType<typeof rig>;

/** Pear torso: narrow rounded shoulders, widest just above the hem. */
export const pearPath = (cx: number, t: number, b: number, rt: number, rb: number): Path => (c) => {
  const h = b - t;
  c.moveTo(cx, t);
  c.bezierCurveTo(cx + rt * 0.75, t, cx + rt, t + 0.06 * h, cx + rt * 1.04, t + 0.24 * h);
  c.bezierCurveTo(cx + rt * 1.1, t + 0.42 * h, cx + rb, t + 0.5 * h, cx + rb, t + 0.76 * h);
  c.bezierCurveTo(cx + rb, b - 0.02 * h, cx + rb * 0.55, b, cx, b);
  c.bezierCurveTo(cx - rb * 0.55, b, cx - rb, b - 0.02 * h, cx - rb, t + 0.76 * h);
  c.bezierCurveTo(cx - rb, t + 0.5 * h, cx - rt * 1.1, t + 0.42 * h, cx - rt * 1.04, t + 0.24 * h);
  c.bezierCurveTo(cx - rt, t + 0.06 * h, cx - rt * 0.75, t, cx, t);
};

/** A card canvas + texture at RES x the design size, plus a design-size shade mask. `draw` paints in design units. */
export const makeCanvas = () => {
  const make = (res: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = DESIGN.W * res;
    canvas.height = DESIGN.H * res;
    const ctx = canvas.getContext("2d")!;
    const texture = new CanvasTexture(canvas);
    texture.minFilter = LinearMipmapLinearFilter;
    texture.magFilter = LinearFilter;
    const draw = (fn: (c: CanvasRenderingContext2D) => void) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(res, 0, 0, res, 0, 0);
      fn(ctx);
      texture.needsUpdate = true;
    };
    return { canvas, texture, draw };
  };
  const color = make(DESIGN.RES);
  color.texture.colorSpace = SRGBColorSpace;
  color.texture.anisotropy = 8;
  const mask = make(1);
  return { canvas: color.canvas, texture: color.texture, draw: color.draw, mask: mask.texture, drawMask: mask.draw };
};
