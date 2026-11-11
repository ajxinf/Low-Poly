import { CanvasTexture, RepeatWrapping, SRGBColorSpace, Texture } from "three";

/**
 * Canvas2D painted textures: base fills, visible brush strokes, grain, seams painted in as dark tints.
 * Every texture is seeded, so all render tabs paint the same pixels. Each tiles seamlessly; `m` = metres per tile.
 */

export const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
type R = () => number;
type Ctx = CanvasRenderingContext2D;

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
/** Shift a colour's value by k (-1..1), keeping hue. */
export const shade = (h: string, k: number) => {
  const [r, g, b] = hex(h).map((v) => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k));
  return `rgb(${r},${g},${b})`;
};
const pick = <T,>(r: R, a: T[]) => a[Math.floor(r() * a.length)];

/** Draw at the 4 wrap offsets so marks crossing an edge continue on the other side. */
const wrap = (ctx: Ctx, W: number, H: number, f: (dx: number, dy: number) => void) => {
  for (const dx of [0, -W]) for (const dy of [0, -H]) f(dx, dy);
  for (const dx of [W]) for (const dy of [0, H, -H]) f(dx, dy);
  f(0, H);
};

/** Short curved brush strokes in colours `cols`, alpha `a`, length `len` px. */
export const strokes = (ctx: Ctx, r: R, W: number, H: number, n: number, cols: string[], len: number, width: number, a: number, angle?: number) => {
  ctx.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * H;
    const th = angle ?? r() * Math.PI;
    const ang = th + (r() - 0.5) * 0.5;
    const l = len * (0.5 + r());
    const bend = (r() - 0.5) * l * 0.4;
    ctx.strokeStyle = pick(r, cols);
    ctx.globalAlpha = a * (0.5 + r() * 0.5);
    ctx.lineWidth = width * (0.6 + r() * 0.8);
    wrap(ctx, W, H, (dx, dy) => {
      const x0 = x + dx, y0 = y + dy;
      const x1 = x0 + Math.cos(ang) * l, y1 = y0 + Math.sin(ang) * l;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo((x0 + x1) / 2 - Math.sin(ang) * bend, (y0 + y1) / 2 + Math.cos(ang) * bend, x1, y1);
      ctx.stroke();
    });
  }
  ctx.globalAlpha = 1;
};

/** Canvas grain: per-pixel value noise of +-amt. */
export const grain = (ctx: Ctx, r: R, W: number, H: number, amt: number) => {
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const g = (r() - 0.5) * 2 * amt;
    d[i] += g;
    d[i + 1] += g;
    d[i + 2] += g;
  }
  ctx.putImageData(img, 0, 0);
};

const cache = new Map<string, Texture>();
/** Paint once per key; returns a repeat-wrapped sRGB texture. */
export const painted = (key: string, W: number, H: number, draw: (ctx: Ctx, r: R) => void): Texture => {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  let seed = 7;
  for (const ch of key) seed = Math.imul(seed ^ ch.charCodeAt(0), 2654435761);
  draw(ctx, rng(seed));
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.anisotropy = 8;
  cache.set(key, t);
  return t;
};

const roundRect = (ctx: Ctx, x: number, y: number, w: number, h: number, rad: number | number[]) => {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, rad);
};

/** Cobblestones, 2 m tile: irregular rounded stones in staggered rows, dark seams. */
export const cobbles = (base = "#8a7c72") =>
  painted(`cobbles${base}`, 512, 512, (ctx, r) => {
    const W = 512, rows = 14, rh = W / rows;
    ctx.fillStyle = shade(base, -0.6);
    ctx.fillRect(0, 0, W, W);
    strokes(ctx, r, W, W, 300, [shade(base, -0.5), shade(base, -0.7)], 12, 6, 0.6);
    for (let j = 0; j < rows; j++) {
      let x = r() * rh;
      while (x < W) {
        const w = rh * (0.8 + r() * 0.9);
        const h = rh * (0.78 + r() * 0.2);
        const y = j * rh + (r() - 0.5) * 3, xo = x + (r() - 0.5) * 3;
        const col = shade(base, (r() - 0.5) * 0.42);
        const rad = Math.min(w, h) * (0.3 + r() * 0.2);
        wrap(ctx, W, W, (dx, dy) => {
          ctx.save();
          ctx.translate(xo + dx + w / 2, y + dy + rh / 2);
          ctx.rotate((r() - 0.5) * 0.12);
          roundRect(ctx, -w / 2 + 3, -h / 2 + 2, w - 6, h - 4, rad);
          ctx.fillStyle = col;
          ctx.fill();
          ctx.globalAlpha = 0.5;
          ctx.lineCap = "round";
          ctx.lineWidth = 3;
          ctx.strokeStyle = shade(base, 0.38);
          ctx.beginPath();
          ctx.moveTo(-w / 2 + 8, -h / 2 + 6);
          ctx.lineTo(w * 0.15, -h / 2 + 5);
          ctx.stroke();
          ctx.strokeStyle = shade(base, -0.45);
          ctx.beginPath();
          ctx.moveTo(-w * 0.2, h / 2 - 5);
          ctx.lineTo(w / 2 - 7, h / 2 - 6);
          ctx.stroke();
          ctx.restore();
          ctx.globalAlpha = 1;
        });
        x += w;
      }
    }
    strokes(ctx, r, W, W, 700, [shade(base, -0.3), shade(base, 0.25), "#a07466", "#6e6a90"], 14, 3, 0.25);
    grain(ctx, r, W, W, 14);
  });

/** Pavement slabs with cracks, 2 m tile (0.5 m slabs). */
export const slabs = (base = "#a9998a") =>
  painted(`slabs${base}`, 512, 512, (ctx, r) => {
    const W = 512, n = 4, s = W / n;
    ctx.fillStyle = shade(base, -0.55);
    ctx.fillRect(0, 0, W, W);
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const off = j % 2 ? s / 2 : 0;
        const col = shade(base, (r() - 0.5) * 0.22);
        wrap(ctx, W, W, (dx, dy) => {
          ctx.fillStyle = col;
          ctx.fillRect(i * s + off + dx + 3, j * s + dy + 3, s - 6, s - 6);
        });
      }
    strokes(ctx, r, W, W, 420, [shade(base, -0.2), shade(base, 0.2), "#b08a7a", "#8c8aa0"], 24, 4, 0.22);
    // Cracks: thin jagged dark tints.
    ctx.strokeStyle = shade(base, -0.6);
    ctx.lineWidth = 1.6;
    for (let k = 0; k < 7; k++) {
      let x = r() * W, y = r() * W;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let q = 0; q < 6; q++) {
        x += (r() - 0.5) * 30;
        y += (r() - 0.3) * 22;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    grain(ctx, r, W, W, 12);
  });

/** Brick wall, 2 m tile. */
export const bricks = (base = "#9a5a44") =>
  painted(`bricks${base}`, 512, 512, (ctx, r) => {
    const W = 512, rows = 28, rh = W / rows, bw = 56;
    ctx.fillStyle = shade(base, -0.55);
    ctx.fillRect(0, 0, W, W);
    for (let j = 0; j < rows; j++)
      for (let i = -1; i < W / bw + 1; i++) {
        const x = i * bw + (j % 2 ? bw / 2 : 0);
        ctx.fillStyle = shade(base, (r() - 0.5) * 0.3);
        ctx.fillRect(x + 2, j * rh + 2, bw - 4, rh - 3);
      }
    strokes(ctx, r, W, W, 600, [shade(base, -0.25), shade(base, 0.22), "#7c5a6a", "#b07a52"], 22, 4, 0.22);
    strokes(ctx, r, W, W, 40, [shade(base, 0.3)], 60, 10, 0.12, 0);
    grain(ctx, r, W, W, 12);
  });

/** Plaster wall: broad blotchy strokes, a few hairline cracks; 2 m tile. */
export const plaster = (base: string) =>
  painted(`plaster${base}`, 512, 512, (ctx, r) => {
    const W = 512;
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, W);
    strokes(ctx, r, W, W, 90, [shade(base, -0.12), shade(base, 0.12)], 120, 34, 0.25);
    strokes(ctx, r, W, W, 700, [shade(base, -0.18), shade(base, 0.18), shade(base, -0.08)], 26, 5, 0.3);
    ctx.strokeStyle = shade(base, -0.45);
    ctx.lineWidth = 1.4;
    for (let k = 0; k < 3; k++) {
      let x = r() * W, y = r() * W;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let q = 0; q < 5; q++) ctx.lineTo((x += (r() - 0.5) * 26), (y += r() * 24));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    grain(ctx, r, W, W, 10);
  });

/** Clay roof tiles, 2 m tile (0.25 m courses with a dark seam under each). */
export const roofTiles = (base = "#a4503a") =>
  painted(`roof${base}`, 512, 512, (ctx, r) => {
    const W = 512, rows = 8, rh = W / rows, tw = 32;
    ctx.fillStyle = shade(base, -0.6);
    ctx.fillRect(0, 0, W, W);
    for (let j = 0; j < rows; j++)
      for (let i = -1; i <= W / tw; i++) {
        const x = i * tw + (j % 2 ? tw / 2 : 0), y = j * rh;
        ctx.fillStyle = shade(base, (r() - 0.5) * 0.3);
        roundRect(ctx, x + 2, y, tw - 4, rh - 6, [0, 0, 12, 12]);
        ctx.fill();
        ctx.fillStyle = shade(base, -0.35);
        ctx.fillRect(x + 2, y + rh - 14, tw - 4, 8);
      }
    strokes(ctx, r, W, W, 400, [shade(base, -0.25), shade(base, 0.25), "#7a4a5c"], 18, 3, 0.25);
    grain(ctx, r, W, W, 12);
  });

/** Vertical wood planks with near-black seams, 1 m tile. */
export const planks = (base = "#7a5236") =>
  painted(`planks${base}`, 256, 256, (ctx, r) => {
    const W = 256, n = 6, pw = W / n;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = shade(base, (r() - 0.5) * 0.3);
      ctx.fillRect(i * pw, 0, pw, W);
      ctx.fillStyle = "#1e1410";
      ctx.globalAlpha = 0.85;
      ctx.fillRect(i * pw, 0, 3, W);
      ctx.globalAlpha = 1;
    }
    strokes(ctx, r, W, W, 260, [shade(base, -0.3), shade(base, 0.2)], 40, 2, 0.35, Math.PI / 2);
    grain(ctx, r, W, W, 12);
  });

/** Plain painted surface (metal, stone trim): base + strokes + grain, 1 m tile. */
export const rough = (base: string) =>
  painted(`rough${base}`, 256, 256, (ctx, r) => {
    const W = 256;
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, W);
    strokes(ctx, r, W, W, 260, [shade(base, -0.2), shade(base, 0.18)], 22, 4, 0.3);
    grain(ctx, r, W, W, 10);
  });

/** Sash window (whole texture = one window): painted frame, 2x2 panes, lit warm or dark glass with a sky glint. */
export const windowTex = (lit: boolean, frame = "#e8dcc4") =>
  painted(`win${lit}${frame}`, 128, 192, (ctx, r) => {
    const W = 128, H = 192, f = 12;
    ctx.fillStyle = frame;
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    if (lit) {
      g.addColorStop(0, "#ffd99a");
      g.addColorStop(1, "#ff9f4a");
    } else {
      g.addColorStop(0, "#3a3566");
      g.addColorStop(1, "#1d1c38");
    }
    ctx.fillStyle = g;
    ctx.fillRect(f, f, W - 2 * f, H - 2 * f);
    if (!lit) {
      ctx.strokeStyle = "#8a7ab0";
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(f + 10, H * 0.55);
      ctx.lineTo(W * 0.6, f + 6);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      // Curtain edges.
      ctx.fillStyle = "#c2603c";
      ctx.globalAlpha = 0.8;
      ctx.fillRect(f, f, 16, H - 2 * f);
      ctx.fillRect(W - f - 16, f, 16, H - 2 * f);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = frame;
    ctx.fillRect(W / 2 - 4, f, 8, H - 2 * f);
    ctx.fillRect(f, H / 2 - 4, W - 2 * f, 8);
    ctx.strokeStyle = "#1c1210";
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 3;
    ctx.strokeRect(f, f, W - 2 * f, H - 2 * f);
    ctx.globalAlpha = 1;
    strokes(ctx, r, W, H, 60, [shade(frame, -0.2), shade(frame, 0.1)], 14, 2, 0.3);
    grain(ctx, r, W, H, 8);
  });

/** Shop window (one texture = one front): wide lit glass with goods silhouettes. */
export const shopTex = (frame = "#2f5a52") =>
  painted(`shop${frame}`, 256, 192, (ctx, r) => {
    const W = 256, H = 192, f = 12;
    ctx.fillStyle = frame;
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#ffe2a8");
    g.addColorStop(1, "#ff9a46");
    ctx.fillStyle = g;
    ctx.fillRect(f, f, W - 2 * f, H - 2 * f);
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = pick(r, ["#7a3a2a", "#4a3a5a", "#8a5a2a", "#5a2a3a"]);
      const w = 14 + r() * 16, h = 20 + r() * 40;
      ctx.fillRect(f + 8 + i * 25, H - f - h, w, h);
    }
    ctx.fillStyle = frame;
    for (const x of [W / 3, (2 * W) / 3]) ctx.fillRect(x - 4, f, 8, H - 2 * f);
    strokes(ctx, r, W, H, 80, [shade(frame, -0.25), shade(frame, 0.15)], 16, 2, 0.3);
    grain(ctx, r, W, H, 8);
  });

/** Panelled door. */
export const doorTex = (base = "#5a2e2a") =>
  painted(`door${base}`, 128, 256, (ctx, r) => {
    const W = 128, H = 256;
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#1c1210";
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 4;
    for (const [y, h] of [[18, 100], [134, 104]]) {
      ctx.strokeRect(16, y, 40, h);
      ctx.strokeRect(72, y, 40, h);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#d9b45a";
    ctx.fillRect(98, 128, 8, 8);
    strokes(ctx, r, W, H, 120, [shade(base, -0.25), shade(base, 0.2)], 30, 2, 0.35, Math.PI / 2);
    grain(ctx, r, W, H, 10);
  });

/** Clock face (whole texture = one face). */
export const clockTex = () =>
  painted("clock", 256, 256, (ctx, r) => {
    const c = 128;
    ctx.fillStyle = "#3a2e2a";
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = "#f3e2bc";
    ctx.beginPath();
    ctx.arc(c, c, 112, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1c1210";
    ctx.lineWidth = 7;
    ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.lineWidth = i % 3 ? 4 : 8;
      ctx.beginPath();
      ctx.moveTo(c + Math.sin(a) * 86, c - Math.cos(a) * 86);
      ctx.lineTo(c + Math.sin(a) * 102, c - Math.cos(a) * 102);
      ctx.stroke();
    }
    ctx.lineCap = "round";
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.lineTo(c + 40, c - 30); // ~ ten to eight
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.lineTo(c - 60, c - 52);
    ctx.stroke();
    strokes(ctx, r, 256, 256, 80, ["#e0c89a", "#fff0d0"], 18, 3, 0.3);
    grain(ctx, r, 256, 256, 8);
  });
