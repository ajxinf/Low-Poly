import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace } from "three";

/**
 * Pen API: characters are drawn on a 600x1000 Canvas2D design canvas (soles at y = 975, 500 px = 1 m) and uploaded
 * as a texture on a camera-facing card (see cast.ts / cardshade.ts). The canvas is RES x the design size.
 */
export const DESIGN = { W: 600, H: 1000, SOLE: 975, PX_PER_M: 500, RES: 2 };
/** Head height and width in design px (h/w .98); figure is ~3.5 head heights. */
export const HH = 250;
export const HW = HH / 0.98;
export const CARD_INK = "#1d1416";
/** Outline and stick-limb width: .04 of head width (references measure ~.035-.04). */
export const LINE = 0.04 * HW;

type Path = (c: CanvasRenderingContext2D) => void;

export class Pen {
  constructor(
    public c: CanvasRenderingContext2D,
    /** -1 = shadow on the left of the card, +1 = right: outlines get thicker there. */
    public shadowSide = 1,
    public w = LINE,
  ) {
    c.lineJoin = "round";
    c.lineCap = "round";
  }

  /** Filled shape with an ink outline that is ~35 % thicker on the shadow side. */
  shape(path: Path, fill: string | null, w = this.w) {
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
    this.c.beginPath();
    path(this.c);
    this.c.fillStyle = fill;
    this.c.fill(rule);
  }

  /** Smooth ink stroke through points. */
  line(pts: [number, number][], w = this.w, color = CARD_INK) {
    const c = this.c;
    c.strokeStyle = color;
    c.lineWidth = w;
    c.beginPath();
    c.moveTo(...pts[0]);
    if (pts.length === 3) c.quadraticCurveTo(...pts[1], ...pts[2]);
    else pts.slice(1).forEach((p) => c.lineTo(...p));
    c.stroke();
  }

  dot(x: number, y: number, r: number, color = CARD_INK) {
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

  /** Form shading inside a clipped shape: a crescent on the shadow side (bbox minus a shifted ellipse). */
  crescent(cx: number, cy: number, rx: number, ry: number, shift: number, color: string) {
    this.fill((c) => {
      c.rect(cx - rx * 2, cy - ry * 2, rx * 4, ry * 4);
      c.ellipse(cx - this.shadowSide * shift, cy - shift * 0.3, rx, ry, 0, 0, Math.PI * 2);
    }, color, "evenodd");
  }
}

/** Body pose in design px (front view). Upper body = torso, head and arms. */
export type Pose = {
  bob: number; // upper body up (+) / down (-)
  sway: number; // upper-body tilt, degrees (+ = toward the card's right)
  lift: [number, number]; // foot lift, left / right
  hands: [[number, number], [number, number]]; // hand offsets from rest, left / right
  look: number; // head turn -1 (card left) .. 1 (card right)
};
export const REST: Pose = { bob: 0, sway: 0, lift: [0, 0], hands: [[0, 0], [0, 0]], look: 0 };

/** Fixed body landmarks (before pose). */
export const BODY = {
  cx: 300,
  head: { x: 300, y: DESIGN.SOLE - 3.5 * HH + HH / 2 },
  torso: { top: 330, bottom: 652, rw: 116 },
  hip: { y: 622, dx: 38 },
  ankle: { y: DESIGN.SOLE - 24, dx: 40 },
  shoulder: { y: 420, dx: 94 },
  hand: { y: 596, dx: 142 },
};

export const eggPath = (cx: number, t: number, b: number, rw: number): Path => (c) => {
  const h = b - t;
  c.moveTo(cx, t);
  c.bezierCurveTo(cx + 0.78 * rw, t, cx + rw, t + 0.32 * h, cx + rw, t + 0.62 * h);
  c.bezierCurveTo(cx + rw, b - 0.04 * h, cx + 0.62 * rw, b, cx, b);
  c.bezierCurveTo(cx - 0.62 * rw, b, cx - rw, b - 0.04 * h, cx - rw, t + 0.62 * h);
  c.bezierCurveTo(cx - rw, t + 0.32 * h, cx - 0.78 * rw, t, cx, t);
};
export const headPath = (x: number, y: number): Path => (c) => c.ellipse(x, y, HW / 2, HH / 2, 0, 0, Math.PI * 2);

/** What a character looks like: colours plus hooks for the parts that vary per character. */
export type Look = {
  skin: string;
  skinShade: string;
  boots: string;
  /** Torso contents, called clipped to the torso egg (cx, top, bottom, rw). */
  outfit: (pen: Pen, cx: number, t: number, b: number, rw: number) => void;
  /** Hair / hat over the head; head centre and head-turn offset. */
  hair: (pen: Pen, x: number, y: number, look: number) => void;
};

/** Draws the figure (legs, boots, torso, arms, mittens, head, hair) and returns the head centre for the face. */
export const drawFigure = (pen: Pen, look: Look, pose: Pose, prop?: (pen: Pen, hand: [number, number], side: number) => void) => {
  const c = pen.c;
  const B = BODY;
  const hipY = B.hip.y - pose.bob;
  // Legs: sticks from the hips to planted (or lifted) ankles, then boots.
  [-1, 1].forEach((s, i) => {
    const ax = B.cx + s * (B.ankle.dx - pose.lift[i] * 0.25), ay = B.ankle.y - pose.lift[i];
    pen.line([[B.cx + s * B.hip.dx, hipY], [ax + s * 4, (hipY + ay) / 2], [ax, ay]]);
    pen.shape((q) => q.roundRect(ax - (s < 0 ? 34 : 18), ay - 4, 52, 28, [14, 14, 8, 8]), look.boots);
  });

  // Upper body pivots around the hips.
  c.save();
  c.translate(B.cx, hipY);
  c.rotate((pose.sway * Math.PI) / 180);
  c.translate(-B.cx, -B.hip.y);
  const { top, bottom, rw } = B.torso;
  const torso = eggPath(B.cx, top, bottom, rw);
  pen.shape(torso, null);
  pen.clip(torso, () => {
    look.outfit(pen, B.cx, top, bottom, rw);
    pen.crescent(B.cx, (top + bottom) / 2, rw, (bottom - top) / 2, 20, "rgba(40,16,60,0.22)");
  });
  pen.shape(torso, null); // re-ink over the outfit

  // Arms: sticks with a slight outward elbow, mitten hands.
  [-1, 1].forEach((s, i) => {
    const sx = B.cx + s * B.shoulder.dx, sy = B.shoulder.y;
    const hx = B.cx + s * B.hand.dx + pose.hands[i][0], hy = B.hand.y + pose.hands[i][1];
    pen.line([[sx, sy], [(sx + hx) / 2 + s * 16, (sy + hy) / 2], [hx, hy]]);
    if (prop) prop(pen, [hx, hy], s);
    pen.shape((q) => q.ellipse(hx - s * 15, hy - 9, 7, 9, 0, 0, Math.PI * 2), look.skin, pen.w * 0.7); // thumb under the mitten
    pen.shape((q) => q.ellipse(hx, hy, 19, 17, s * 0.4, 0, Math.PI * 2), look.skin);
  });

  // Head with form shading, then hair.
  const hx = B.head.x, hy = B.head.y;
  const head = headPath(hx, hy);
  pen.shape(head, look.skin);
  pen.clip(head, () => pen.crescent(hx, hy, HW / 2, HH / 2, 16, look.skinShade));
  pen.shape(head, null);
  look.hair(pen, hx, hy, pose.look);
  c.restore();
  return { hx, hy, sway: pose.sway, hipY };
};

/** A card canvas + texture at RES x the design size. `draw` paints in design units. */
export const makeCanvas = () => {
  const canvas = document.createElement("canvas");
  canvas.width = DESIGN.W * DESIGN.RES;
  canvas.height = DESIGN.H * DESIGN.RES;
  const ctx = canvas.getContext("2d")!;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 8;
  const draw = (fn: (c: CanvasRenderingContext2D) => void) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(DESIGN.RES, 0, 0, DESIGN.RES, 0, 0);
    fn(ctx);
    texture.needsUpdate = true;
  };
  return { canvas, texture, draw };
};
