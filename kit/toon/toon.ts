import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace } from "three";

/**
 * Character construction (LOOK_SPEC section 1, ported from vendor/cartoon-3d-short/reports/characters.md section 3).
 * Characters are drawn on a 600x1000 Canvas2D design canvas (soles at y = 975, 500 px = 1 m) and uploaded as a
 * texture on a camera-facing card (cast.ts / cardshade.ts). Shading (soft crescents, torso gradient) is painted into
 * the card; the card shader only adds the scene light tint and the street shadow.
 *
 * Units: W = head path width, u = 1 % of W, HH = head height. Angles are canvas angles (0 = right, 90 deg = down).
 */
export const DESIGN = { W: 600, H: 1000, SOLE: 975, PX_PER_M: 500, RES: 2 };

/** Character ink: warm brown-black, one family with the world ink #1c1210 (identity, LOOK_SPEC section 2). */
export const INK = "#2a1a14";
/** Cast heads: pale cream (identity). */
export const CREAM = "#f4ece0";
export const WHITE = "#fdfaf4";
export const MOUTH = "#5a1e28";
export const TONGUE = "#e86e78";

export type P2 = [number, number];
export type C3 = [number, number, number];
/** Shadow/lit multipliers (measured): pale heads go lavender, cloth ~0.65. */
export const SH_PALE: C3 = [0.92, 0.9, 0.96];
export const SH_CLOTH: C3 = [0.64, 0.66, 0.74];
export const SH_HAIR: C3 = [0.7, 0.68, 0.78];

export const rad = (d: number) => (d * Math.PI) / 180;
const hex = (c: string) => parseInt(c.slice(1), 16);
const h2 = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
export const mul = (c: string, m: C3) => {
  const n = hex(c);
  return `#${h2(((n >> 16) & 255) * m[0])}${h2(((n >> 8) & 255) * m[1])}${h2((n & 255) * m[2])}`;
};
export const mix = (a: string, b: string, t: number) => {
  const A = hex(a), B = hex(b);
  const ch = (s: number) => h2(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t);
  return `#${ch(16)}${ch(8)}${ch(0)}`;
};
/** Deterministic per-character random in [0, 1). */
export const rnd = (seed: number, k: number) => {
  const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

// ---------------------------------------------------------------- contours

export type Blob = { a: number; b: number; nTop: number; nBot: number; egg: number; asym: number; rot: number; noise: number; seed: number };

/**
 * Superellipse bean: separate crown / jaw exponents, egg taper (neg = narrower chin), one-side bulge, soft noise.
 * Points run right -> down -> left -> up (clockwise on screen), n per contour.
 */
export const blobPts = (cx: number, cy: number, B: Blob, n = 96): P2[] => {
  const ph = [rnd(B.seed, 11), rnd(B.seed, 12), rnd(B.seed, 13)].map((v) => v * Math.PI * 2);
  const pts: P2[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t), e = 2 / (s < 0 ? B.nTop : B.nBot);
    let X = Math.sign(c) * Math.abs(c) ** e;
    const Y = Math.sign(s) * Math.abs(s) ** e;
    X *= (1 + B.egg * Y) * (1 + B.asym * Math.sign(X));
    const r = 1 + B.noise * (Math.cos(2 * t + ph[0]) + 0.7 * Math.cos(3 * t + ph[1]) + 0.5 * Math.cos(4 * t + ph[2]));
    const x = B.a * X * r, y = B.b * Y * r;
    pts.push([cx + x * Math.cos(B.rot) - y * Math.sin(B.rot), cy + x * Math.sin(B.rot) + y * Math.cos(B.rot)]);
  }
  return pts;
};

/**
 * Measured head: H/W 0.94, slightly pointed crown (1.75), fuller jaw (2.3), chin taper -0.12, 6-10 % bulge toward
 * the facing side. `facing` is continuous (-1..1, the pose's head turn) so the bulge slides instead of popping.
 */
export const headBlob = (seed: number, a: number, facing = 0): Blob => {
  const side = rnd(seed, 6) < 0.5 ? -1 : 1, f = clamp(facing * 2, -1, 1);
  return {
    a,
    b: a * (0.94 + 0.08 * (rnd(seed, 1) - 0.5)),
    nTop: 1.75 + 0.3 * (rnd(seed, 2) - 0.5),
    nBot: 2.3 + 0.3 * (rnd(seed, 3) - 0.5),
    egg: -0.12 + 0.06 * (rnd(seed, 4) - 0.5),
    asym: (0.06 + 0.04 * rnd(seed, 5)) * (side * (1 - Math.abs(f)) + f),
    rot: rad(8 * (rnd(seed, 7) - 0.5)),
    noise: 0.008,
    seed,
  };
};

/** Thickest outline direction: away from the light, pulled toward the ground (64 deg measured for upper-left light). */
export const thickAngle = (light: number) => Math.atan2(-Math.sin(light) + 0.8, -Math.cos(light));
/**
 * Outline thickness profile: w0 (1 + K cos(theta - thick)), thick/thin = (1 + K) / (1 - K) = 3.4 (ref2 / ref11
 * measured 3-4: ~2 % W on the lit side, ~7.5 % W away from the light).
 */
export const INK_K = 0.55;
/** Hand-drawn pressure wobble of the outline width (+-, seeded per character, so no two outlines are the same). */
export const INK_WOBBLE = 0.12;

/** Contour points above `y` (the crown), left to right, pushed out from (cx, cy) by `push`. */
export const crownPts = (pts: P2[], y: number, cx: number, cy: number, push = 1.03): P2[] => {
  const n = pts.length, out: P2[] = [];
  for (let i = n / 2; i <= n; i++) {
    const [x, yy] = pts[i % n];
    if (yy < y) out.push([cx + (x - cx) * push, cy + (yy - cy) * push]);
  }
  return out;
};

// ---------------------------------------------------------------- pen

/**
 * Canvas2D pen in design units. `light` = canvas angle the key light comes FROM (e.g. -125 deg = upper left);
 * outlines are thickest on the opposite side and toward the ground.
 */
export class Pen {
  g: CanvasRenderingContext2D;
  light: number;
  /** Per-character line weight (x every ink ring) and wobble seed; drawPerson sets both from the Look. */
  weight = 1;
  seed = 0;
  private rings = 0;
  constructor(g: CanvasRenderingContext2D, light = rad(-125)) {
    this.g = g;
    this.light = light;
    g.lineJoin = "round";
    g.lineCap = "round";
  }
  get thick() {
    return thickAngle(this.light);
  }

  path(pts: P2[], close = true) {
    const g = this.g;
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    if (close) g.closePath();
  }

  /** Filled polygon with a uniform outline (props, hats, details). */
  poly(pts: P2[], fill: string | null, w = 0, col = INK) {
    const g = this.g;
    this.path(pts);
    if (fill) {
      g.fillStyle = fill;
      g.fill();
    }
    if (w > 0) {
      g.strokeStyle = col;
      g.lineWidth = w;
      g.stroke();
    }
  }

  /** Open stroke: 2 points = line, 3 = one smooth curve through the middle point, more = polyline. */
  stroke(pts: P2[], w: number, col = INK, dash?: number[]) {
    const g = this.g;
    g.save();
    g.strokeStyle = col;
    g.lineWidth = w;
    if (dash) g.setLineDash(dash);
    g.beginPath();
    g.moveTo(...pts[0]);
    if (pts.length === 3) {
      const [a, m, b] = pts;
      g.quadraticCurveTo(2 * m[0] - (a[0] + b[0]) / 2, 2 * m[1] - (a[1] + b[1]) / 2, b[0], b[1]);
    } else pts.slice(1).forEach((p) => g.lineTo(...p));
    g.stroke();
    g.restore();
  }

  dot(x: number, y: number, r: number, col = INK) {
    const g = this.g;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fillStyle = col;
    g.fill();
  }

  /** Ellipse (or a chord-closed part a0..a1 deg) with optional fill and outline; rot in degrees. */
  ell(x: number, y: number, rx: number, ry: number, fill: string | null, w = 0, a0 = 0, a1 = 360, rot = 0, col = INK) {
    const g = this.g;
    g.beginPath();
    g.ellipse(x, y, rx, ry, rad(rot), rad(a0), rad(a1));
    if (a1 - a0 < 360) g.closePath();
    if (fill) {
      g.fillStyle = fill;
      g.fill();
    }
    if (w > 0) {
      g.strokeStyle = col;
      g.lineWidth = w;
      g.stroke();
    }
  }

  /** Open elliptic arc stroke (degrees). */
  arc(x: number, y: number, rx: number, ry: number, a0: number, a1: number, w: number, col = INK) {
    const g = this.g;
    g.beginPath();
    g.ellipse(x, y, rx, ry, 0, rad(a0), rad(a1));
    g.strokeStyle = col;
    g.lineWidth = w;
    g.stroke();
  }

  /** Draw with a closed shape as clip. */
  clip(pts: P2[], fn: () => void) {
    const g = this.g;
    g.save();
    this.path(pts);
    g.clip();
    fn();
    g.restore();
  }

  /**
   * Soft crescent shading over whatever is already drawn inside the shape: everything except a copy shifted toward
   * the light by shift x R is multiplied by `m`, through a blur of soft x R (measured: flat to ~0.6R, falling to
   * x0.88 at the far edge on heads; torsos broader, shift .55 / soft .18).
   */
  shade(pts: P2[], m: C3, R: number, shift = 0.3, soft = 0.09) {
    const g = this.g, t = g.getTransform(), k = Math.hypot(t.a, t.b);
    const dx = Math.cos(this.light) * shift * R, dy = Math.sin(this.light) * shift * R;
    this.clip(pts, () => {
      g.globalCompositeOperation = "multiply";
      g.filter = `blur(${(soft * R * k).toFixed(1)}px)`;
      g.beginPath();
      g.rect(-2000, -2000, 5000, 5000);
      pts.forEach(([x, y], i) => (i ? g.lineTo(x + dx, y + dy) : g.moveTo(x + dx, y + dy)));
      g.closePath();
      g.fillStyle = `rgb(${m.map((v) => Math.round(v * 255)).join(",")})`;
      g.fill("evenodd");
      g.filter = "none";
      g.globalCompositeOperation = "source-over";
    });
  }

  /** Flat fill + soft crescent on the side away from the light. */
  shadedFill(pts: P2[], base: string, m: C3, R: number, shift = 0.3, soft = 0.09) {
    this.poly(pts, base);
    this.shade(pts, m, R, shift, soft);
  }

  /**
   * Thick-thin ink ring: w(theta) = w0 weight (1 + K cos(theta - thick)) (1 + wobble), theta from the contour
   * centroid. The wobble is two slow seeded waves per ring (pressure of one brush pass), stable from frame to frame.
   */
  inkRing(pts: P2[], w0: number, thick = this.thick, k = INK_K, col = INK) {
    const n = pts.length, ring = this.rings++;
    const ph1 = rnd(this.seed, 40 + ring) * 6.283, ph2 = rnd(this.seed, 60 + ring) * 6.283;
    w0 *= this.weight;
    let cx = 0, cy = 0;
    for (const [x, y] of pts) {
      cx += x / n;
      cy += y / n;
    }
    const out: P2[] = [], inn: P2[] = [];
    pts.forEach((q, i) => {
      const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
      let nx = b[1] - a[1], ny = a[0] - b[0];
      const l = Math.hypot(nx, ny) || 1;
      nx /= l;
      ny /= l;
      const th = Math.atan2(q[1] - cy, q[0] - cx);
      const h = 0.5 * w0 * (1 + k * Math.cos(th - thick)) * (1 + INK_WOBBLE * (0.6 * Math.sin(3 * th + ph1) + 0.4 * Math.sin(5 * th + ph2)));
      out.push([q[0] + nx * h, q[1] + ny * h]);
      inn.push([q[0] - nx * h, q[1] - ny * h]);
    });
    const g = this.g;
    g.beginPath();
    for (const r of [out, inn.reverse()]) {
      r.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.closePath();
    }
    g.fillStyle = col;
    g.fill("evenodd");
  }

  /** Flat strap with a thin ink rim (belts, sashes, straps). */
  band(pts: P2[], fill: string, w: number, rim: number) {
    const g = this.g;
    g.save();
    g.lineCap = "butt";
    this.path(pts, false);
    g.strokeStyle = INK;
    g.lineWidth = w + 2 * rim;
    g.stroke();
    this.path(pts, false);
    g.strokeStyle = fill;
    g.lineWidth = w;
    g.stroke();
    g.restore();
  }

  /** Thin light rim just inside the shadow-side edge (seen on about half the reference torsos). */
  rimLight(pts: P2[], col: string, w: number, alpha = 0.55) {
    const g = this.g, dx = Math.cos(this.light) * w, dy = Math.sin(this.light) * w;
    this.clip(pts, () => {
      g.beginPath();
      g.rect(-2000, -2000, 5000, 5000);
      pts.forEach(([x, y], i) => (i ? g.lineTo(x + dx, y + dy) : g.moveTo(x + dx, y + dy)));
      g.closePath();
      g.globalAlpha = alpha;
      g.fillStyle = col;
      g.fill("evenodd");
      g.globalAlpha = 1;
    });
  }

  /** Tapered stroke, thick end at a (brows, moustache halves). */
  taper(a: P2, b: P2, wa: number, wb: number, col = INK) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    this.poly([[a[0] + (nx * wa) / 2, a[1] + (ny * wa) / 2], [b[0] + (nx * wb) / 2, b[1] + (ny * wb) / 2],
      [b[0] - (nx * wb) / 2, b[1] - (ny * wb) / 2], [a[0] - (nx * wa) / 2, a[1] - (ny * wa) / 2]], col);
    this.dot(a[0], a[1], wa / 2, col);
    this.dot(b[0], b[1], wb / 2, col);
  }
}

// ---------------------------------------------------------------- builds

/**
 * Body builds (characters.md 2.1): head half-width `a` (design px), chin -> torso bottom and legs in head heights,
 * torso width in head widths. Adults 3.5 HH, stout 3.47, kids 2.85. `egg` widens the torso bottom (pear),
 * `stoop` pushes the head forward and down (old age).
 */
export type Build = { a: number; torso: number; legs: number; tw: number; egg?: number; stoop?: number; ink?: number };
export const BUILD = {
  adult: { a: 128, torso: 1.1, legs: 1.4, tw: 0.8 },
  stout: { a: 128, torso: 1.15, legs: 1.32, tw: 0.92, ink: 1.12 },
  kid: { a: 116, torso: 0.85, legs: 1.0, tw: 0.72, ink: 0.86 },
} satisfies Record<string, Build>;
/** Outline weight of a character: its build's (heavier for stout, lighter for kids) x a seeded +-8 %. */
export const inkWeight = (b: Build, seed: number) => (b.ink ?? 1) * (0.92 + 0.16 * rnd(seed, 31));

/** One canvas per card at RES x the design size, mipmapped. `draw(fn)` paints in design units. */
export const makeCanvas = () => {
  const canvas = document.createElement("canvas");
  canvas.width = DESIGN.W * DESIGN.RES;
  canvas.height = DESIGN.H * DESIGN.RES;
  const ctx = canvas.getContext("2d")!;
  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 8;
  texture.colorSpace = SRGBColorSpace;
  const draw = (fn: (c: CanvasRenderingContext2D) => void) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(DESIGN.RES, 0, 0, DESIGN.RES, 0, 0);
    fn(ctx);
    texture.needsUpdate = true;
  };
  return { texture, draw };
};
