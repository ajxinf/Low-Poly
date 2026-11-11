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
 * Outline width in screen px (at 1920 tall) when a standard head (the protagonist's, so every character on a shot gets
 * the same ink) is `headPx` tall on screen: 8 px for a medium (head ~400 px), growing slowly to a 14 px cap in
 * close-ups, thinner in wides (min 3).
 */
export const inkPx = (headPx: number) => Math.min(14, Math.max(3, 8 * Math.sqrt(headPx / 400)));

type Path = (c: CanvasRenderingContext2D) => void;
/** color = the card; shade = soft form-shadow band (alpha); ink = where the outline/limb ink is (alpha). */
export type PenMode = "color" | "shade" | "ink";
/** Warm band just inside the outline of dark fills, so dark skin/clothes separate from dark backgrounds. */
const WARM_RIM = "#c9875a";
export const isDark = (hex: string) => {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return false;
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2] < 0.33;
};

export class Pen {
  /** Shade mode: filled shapes clear the band unless occlude is off (face features keep the shade under them). */
  occlude = true;
  /** -1 = shadow on the left of the card, +1 = right: outlines get ~35 % thicker there. */
  shadowSide: number;
  constructor(
    public c: CanvasRenderingContext2D,
    /** Unit vector toward the key light in canvas space (x right, y down). */
    public light: [number, number] = [-0.6, -0.8],
    public w = LINE,
    public mode: PenMode = "color",
  ) {
    c.lineJoin = "round";
    c.lineCap = "round";
    this.shadowSide = light[0] > 0 ? -1 : 1;
  }

  private paint(path: Path, how: "erase" | "ink", rule: CanvasFillRule = "nonzero") {
    if (how === "erase" && this.mode === "shade" && !this.occlude) return;
    const c = this.c;
    c.save();
    c.globalCompositeOperation = how === "erase" ? "destination-out" : "source-over";
    c.beginPath();
    path(c);
    c.fillStyle = "#fff";
    c.fill(rule);
    c.restore();
  }

  private stroke(path: Path, w: number, color: string) {
    const c = this.c;
    c.strokeStyle = color;
    c.lineWidth = w;
    c.save();
    c.translate(this.shadowSide * w * 0.35, w * 0.12);
    c.beginPath();
    path(c);
    c.stroke();
    c.restore();
    c.beginPath();
    path(c);
    c.stroke();
  }

  /** Filled shape with a near-black outline (~35 % thicker on the shadow side). */
  shape(path: Path, fill: string | null, w = this.w) {
    const c = this.c;
    if (this.mode === "shade") return fill ? this.paint(path, "erase") : undefined;
    if (this.mode === "ink") {
      if (fill) this.paint(path, fill === CARD_INK ? "ink" : "erase");
      return this.stroke(path, w, "#fff");
    }
    if (fill) {
      c.beginPath();
      path(c);
      c.fillStyle = fill;
      c.fill();
    }
    this.stroke(path, w, CARD_INK);
  }

  /** Thin warm band just inside the outline (dark skin / dark clothes), then the outline again on top. */
  warmRim(path: Path) {
    if (this.mode !== "color") return;
    const c = this.c;
    this.clip(path, () => {
      c.strokeStyle = WARM_RIM;
      c.lineWidth = this.w * 1.9;
      c.beginPath();
      path(c);
      c.stroke();
    });
    this.stroke(path, this.w, CARD_INK);
  }

  fill(path: Path, fill: string, rule: CanvasFillRule = "nonzero") {
    if (this.mode !== "color") return this.paint(path, this.mode === "ink" && fill === CARD_INK ? "ink" : "erase", rule);
    this.c.beginPath();
    path(this.c);
    this.c.fillStyle = fill;
    this.c.fill(rule);
  }

  /** Ink stroke: 3 points = one smooth curve, otherwise a polyline (joints stay visible, e.g. knees and elbows). */
  line(pts: [number, number][], w = this.w, color = CARD_INK, dash?: number[]) {
    if (this.mode === "shade") return;
    const c = this.c;
    const ink = this.mode === "ink";
    c.save();
    if (ink && color !== CARD_INK) c.globalCompositeOperation = "destination-out";
    c.strokeStyle = ink ? "#fff" : color;
    c.lineWidth = w;
    if (dash) c.setLineDash(dash);
    c.beginPath();
    c.moveTo(...pts[0]);
    if (pts.length === 3) c.quadraticCurveTo(...pts[1], ...pts[2]);
    else pts.slice(1).forEach((p) => c.lineTo(...p));
    c.stroke();
    c.restore();
  }

  poly(pts: [number, number][], w = this.w, color = CARD_INK) {
    this.line(pts.length === 3 ? [pts[0], pts[1], pts[1], pts[2]] : pts, w, color);
  }

  dot(x: number, y: number, r: number, color = CARD_INK) {
    const path: Path = (c) => c.arc(x, y, r, 0, Math.PI * 2);
    if (this.mode !== "color") return this.mode === "ink" ? this.paint(path, color === CARD_INK ? "ink" : "erase") : undefined;
    this.c.beginPath();
    path(this.c);
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

  /**
   * Form shadow inside a clipped shape (shade mode only): a soft band ~25 % of the shape's width on the side away
   * from the key (bbox minus the shape's ellipse shifted toward the light).
   */
  crescent(cx: number, cy: number, rx: number, ry: number) {
    if (this.mode !== "shade") return;
    const c = this.c, [lx, ly] = this.light;
    c.save();
    c.filter = `blur(${Math.max(3, rx * 0.06)}px)`;
    c.beginPath();
    c.rect(cx - rx * 3, cy - ry * 3, rx * 6, ry * 6);
    c.ellipse(cx + lx * rx * 0.5, cy + ly * ry * 0.5, rx, ry, 0, 0, Math.PI * 2);
    c.fillStyle = "#fff";
    c.fill("evenodd");
    c.restore();
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

/**
 * A card: colour canvas at RES x the design size (1200x2000), a soft shade band at 1x and an ink mask at RES x, each
 * a mipmapped, anisotropic texture. `draw(mode, fn)` paints in design units.
 */
export const makeCanvas = () => {
  const make = (res: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = DESIGN.W * res;
    canvas.height = DESIGN.H * res;
    const ctx = canvas.getContext("2d")!;
    const texture = new CanvasTexture(canvas);
    texture.minFilter = LinearMipmapLinearFilter;
    texture.magFilter = LinearFilter;
    texture.anisotropy = 8;
    return { canvas, ctx, texture, res };
  };
  const layers = { color: make(DESIGN.RES), shade: make(1), ink: make(DESIGN.RES) };
  layers.color.texture.colorSpace = SRGBColorSpace;
  const draw = (mode: PenMode, fn: (c: CanvasRenderingContext2D) => void) => {
    const { ctx, canvas, texture, res } = layers[mode];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(res, 0, 0, res, 0, 0);
    fn(ctx);
    texture.needsUpdate = true;
  };
  return { texture: layers.color.texture, shade: layers.shade.texture, ink: layers.ink.texture, draw };
};
