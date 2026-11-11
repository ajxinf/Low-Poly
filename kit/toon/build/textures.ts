import { grain, painted, shade, strokes } from "../paint";

/** Facade textures for the building library. Same painting rules as paint.ts: base, strokes, grain, tinted seams. */

/** Horizontal clapboard siding, 2 m tile (boards ~0.2 m, light shadow line under each). */
export const siding = (base: string) =>
  painted(`siding${base}`, 512, 512, (ctx, r) => {
    const W = 512, n = 10, bh = W / n;
    for (let j = 0; j < n; j++) {
      ctx.fillStyle = shade(base, (r() - 0.5) * 0.12);
      ctx.fillRect(0, j * bh, W, bh);
      ctx.fillStyle = shade(base, -0.32);
      ctx.fillRect(0, j * bh + bh - 7, W, 7);
      ctx.fillStyle = shade(base, 0.15);
      ctx.fillRect(0, j * bh, W, 3);
    }
    strokes(ctx, r, W, W, 300, [shade(base, -0.15), shade(base, 0.12)], 60, 3, 0.25, 0);
    grain(ctx, r, W, W, 8);
  });

/** Ashlar stone blocks (gaols, banks, churches), 2 m tile, light mortar. */
export const ashlar = (base: string) =>
  painted(`ashlar${base}`, 512, 512, (ctx, r) => {
    const W = 512, rows = 8, rh = W / rows;
    ctx.fillStyle = shade(base, -0.3);
    ctx.fillRect(0, 0, W, W);
    for (let j = 0; j < rows; j++) {
      let x = -r() * 120;
      while (x < W) {
        const w = 90 + r() * 90;
        ctx.fillStyle = shade(base, (r() - 0.5) * 0.18);
        ctx.fillRect(x + 3, j * rh + 3, w - 6, rh - 6);
        ctx.fillStyle = shade(base, 0.18);
        ctx.fillRect(x + 3, j * rh + 3, w - 6, 4);
        x += w;
      }
    }
    strokes(ctx, r, W, W, 400, [shade(base, -0.15), shade(base, 0.12)], 22, 4, 0.22);
    grain(ctx, r, W, W, 10);
  });

/** Painted shop sign: lettering on a board with a thin border. */
export const signTex = (text: string, bg: string, fg = "#f2e2b8") =>
  painted(`sign${text}${bg}${fg}`, 512, 96, (ctx, r) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 96);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 492, 76);
    ctx.fillStyle = fg;
    ctx.font = "bold 58px Georgia, 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 52, 470);
    strokes(ctx, r, 512, 96, 60, [shade(bg, -0.2), shade(bg, 0.15)], 30, 2, 0.25, 0);
    grain(ctx, r, 512, 96, 8);
  });

/** Paper poster: a title band, a picture block and text lines, slightly sun-faded. */
export const posterTex = (seed: number, title = "WANTED") =>
  painted(`poster${seed}${title}`, 128, 176, (ctx, r) => {
    const paper = ["#efe2c2", "#e8d0a8", "#d9e0d0", "#f0d8c8"][seed % 4];
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, 128, 176);
    ctx.fillStyle = ["#8a2a2a", "#2a3a6a", "#3a2a1a", "#2a5a3a"][(seed >> 2) % 4];
    ctx.font = "bold 22px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText(title, 64, 30, 116);
    ctx.globalAlpha = 0.75;
    ctx.fillRect(24, 44, 80, 64);
    ctx.globalAlpha = 0.6;
    for (let y = 122; y < 166; y += 10) ctx.fillRect(16, y, 96 - r() * 30, 4);
    ctx.globalAlpha = 1;
    grain(ctx, r, 128, 176, 10);
  });

/** Awning canvas: vertical stripes in two colours with a scalloped dark edge at the bottom. */
export const awningTex = (a: string, b: string) =>
  painted(`awning${a}${b}`, 256, 128, (ctx, r) => {
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? b : a;
      ctx.fillRect(i * 32, 0, 32, 128);
    }
    ctx.fillStyle = "rgba(20,10,10,0.35)";
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.arc(i * 32 + 16, 128, 16, Math.PI, 0);
      ctx.fill();
    }
    strokes(ctx, r, 256, 128, 60, [shade(a, -0.2), shade(b, 0.1)], 30, 2, 0.2, Math.PI / 2);
    grain(ctx, r, 256, 128, 8);
  });

export type WindowLook = "lit" | "litFigure" | "dark" | "broken" | "boarded";

/** One window (frame, 2x2 panes): lit with curtains (or a curtain silhouette), dark with a sky glint, broken, boarded. */
export const windowLook = (kind: WindowLook, frame = "#e8dcc4", curtain = "#c2603c") =>
  painted(`winv${kind}${frame}${curtain}`, 128, 192, (ctx, r) => {
    const W = 128, H = 192, f = 12;
    ctx.fillStyle = frame;
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    const lit = kind === "lit" || kind === "litFigure";
    if (lit) {
      g.addColorStop(0, "#ffd99a");
      g.addColorStop(1, "#ff9f4a");
    } else {
      g.addColorStop(0, "#3a3566");
      g.addColorStop(1, "#1d1c38");
    }
    ctx.fillStyle = g;
    ctx.fillRect(f, f, W - 2 * f, H - 2 * f);
    if (lit) {
      // Curtains, tied back; sometimes a figure or a plant in silhouette.
      ctx.fillStyle = curtain;
      ctx.beginPath();
      ctx.moveTo(f, f);
      ctx.lineTo(f + 34, f);
      ctx.quadraticCurveTo(f + 14, H * 0.55, f + 26, H - f);
      ctx.lineTo(f, H - f);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(W - f, f);
      ctx.lineTo(W - f - 34, f);
      ctx.quadraticCurveTo(W - f - 14, H * 0.55, W - f - 26, H - f);
      ctx.lineTo(W - f, H - f);
      ctx.fill();
      ctx.fillStyle = "rgba(60,30,30,0.55)";
      if (kind === "litFigure") {
        ctx.beginPath();
        ctx.arc(W / 2 + 6, H * 0.45, 17, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(W / 2 + 6, H * 0.78, 26, 34, 0, Math.PI, 0);
        ctx.fill();
      } else if (r() < 0.6) {
        ctx.fillRect(W / 2 - 9, H - f - 30, 18, 18);
        ctx.beginPath();
        ctx.arc(W / 2, H - f - 40, 16, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.strokeStyle = "#8a7ab0";
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(f + 10, H * 0.55);
      ctx.lineTo(W * 0.6, f + 6);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = frame;
    ctx.fillRect(W / 2 - 4, f, 8, H - 2 * f);
    ctx.fillRect(f, H / 2 - 4, W - 2 * f, 8);
    if (kind === "broken") {
      // One pane knocked out: jagged dark hole with light shards.
      ctx.fillStyle = "#0e0c18";
      ctx.beginPath();
      ctx.moveTo(W / 2 + 4, f + 4);
      ctx.lineTo(W - f, f + 4);
      ctx.lineTo(W - f, H / 2 - 4);
      ctx.lineTo(W * 0.78, H * 0.3);
      ctx.lineTo(W * 0.66, H * 0.42);
      ctx.lineTo(W * 0.58, H * 0.2);
      ctx.fill();
      ctx.strokeStyle = "#c8c0e0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(f + 6, H * 0.6);
      ctx.lineTo(W * 0.4, H * 0.75);
      ctx.stroke();
    }
    if (kind === "boarded") {
      for (const [y, a] of [[H * 0.3, -0.18], [H * 0.55, 0.12], [H * 0.78, -0.08]]) {
        ctx.save();
        ctx.translate(W / 2, y);
        ctx.rotate(a);
        ctx.fillStyle = shade("#8a6a4a", (r() - 0.5) * 0.3);
        ctx.fillRect(-W * 0.62, -13, W * 1.24, 26);
        ctx.fillStyle = "#2a1e16";
        ctx.fillRect(-W * 0.5, -3, 5, 5);
        ctx.fillRect(W * 0.45, -3, 5, 5);
        ctx.restore();
      }
    }
    ctx.strokeStyle = "#1c1210";
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 3;
    ctx.strokeRect(f, f, W - 2 * f, H - 2 * f);
    ctx.globalAlpha = 1;
    strokes(ctx, r, W, H, 60, [shade(frame, -0.2), shade(frame, 0.1)], 14, 2, 0.3);
    grain(ctx, r, W, H, 8);
  });

/**
 * Grimy interior wall, whole wall height in one texture (use repeat [0.5, 1 / height]): warm off-white over a
 * painted wainscot in `stripe` up to 1.2 m (a darker painted rail on top, never ink), a darker kick band at the
 * floor, trolley scuffs, drips under the ceiling.
 */
export const grimeWall = (base: string, stripe: string, heightM: number) =>
  painted(`grimeWall${base}${stripe}${heightM}`, 512, 1024, (ctx, r) => {
    const W = 512, H = 1024, py = H / heightM; // px per metre (vertical)
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);
    strokes(ctx, r, W, H, 60, [shade(base, -0.1), shade(base, 0.06)], 160, 60, 0.25);
    ctx.fillStyle = stripe;
    ctx.fillRect(0, H - 1.2 * py, W, 1.2 * py);
    ctx.save();
    ctx.translate(0, H - 1.2 * py);
    strokes(ctx, r, W, 1.2 * py, 40, [shade(stripe, -0.08), shade(stripe, 0.06)], 140, 40, 0.3);
    ctx.restore();
    ctx.fillStyle = shade(stripe, -0.25);
    ctx.fillRect(0, H - 1.24 * py, W, 0.05 * py);
    // Kick band: the wainscot's own darker tone toward the floor (coloured, never brown-grey).
    const g = ctx.createLinearGradient(0, H - 0.6 * py, 0, H), kick = shade(stripe, -0.45).slice(4, -1);
    g.addColorStop(0, `rgba(${kick},0)`);
    g.addColorStop(1, `rgba(${kick},0.5)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, H - 0.6 * py, W, 0.6 * py);
    ctx.lineCap = "round";
    for (let i = 0; i < 22; i++) {
      const y = H - (0.25 + r() * 0.8) * py, x = r() * W, len = 30 + r() * 90;
      ctx.strokeStyle = shade(base, -0.5);
      ctx.globalAlpha = 0.2 + r() * 0.3;
      ctx.lineWidth = 2 + r() * 4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len, y + (r() - 0.5) * 6);
      ctx.stroke();
    }
    for (let i = 0; i < 10; i++) {
      const x = r() * W, len = (0.2 + r() * 0.9) * py;
      const d = ctx.createLinearGradient(0, 0, 0, len);
      d.addColorStop(0, "rgba(90,75,55,0.35)");
      d.addColorStop(1, "rgba(90,75,55,0)");
      ctx.globalAlpha = 1;
      ctx.fillStyle = d;
      ctx.fillRect(x, 0, 6 + r() * 10, len);
    }
    ctx.globalAlpha = 1;
    grain(ctx, r, W, H, 9);
  });

/** Product label palettes: [background, band, block]. */
export const LABELS: [string, string, string][] = [
  ["#d84a3a", "#f2ece2", "#2a3a6a"], ["#f2c84a", "#3a2a1a", "#d84a3a"], ["#3a8ad8", "#f2ece2", "#f2c84a"],
  ["#4ab06a", "#f2ece2", "#3a2a1a"], ["#f28a3a", "#3a2a6a", "#f2ece2"], ["#e8e0d0", "#d84a3a", "#3a8ad8"],
  ["#a04ac8", "#f2c84a", "#f2ece2"], ["#2a3a4a", "#f28a3a", "#e8e0d0"], ["#c8423a", "#f2c84a", "#3a2a1a"],
  ["#5ac8c0", "#2a3a6a", "#f2ece2"],
];

/** Blocky painted product label (boxes, cans, bottles): coloured body, a band, a logo block and text bars. */
export const labelTex = (i: number) =>
  painted(`label${i}`, 128, 128, (ctx, r) => {
    const [bg, band, block] = LABELS[i % LABELS.length];
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = band;
    ctx.fillRect(0, 44, 128, 40);
    ctx.fillStyle = block;
    ctx.fillRect(18 + r() * 40, 50, 34, 28);
    ctx.fillRect(0, 0, 128, 10);
    ctx.fillStyle = shade(band.length === 7 ? band : "#888888", -0.5);
    for (let y = 94; y < 120; y += 9) ctx.fillRect(14, y, 60 + r() * 40, 4);
    grain(ctx, r, 128, 128, 6);
  });

/** Shop-front glass seen from inside: daylight haze, or a moonlit night sky with a faint street silhouette. */
export const storeGlass = (night: boolean) =>
  painted(`storeGlass${night}`, 256, 256, (ctx, r) => {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    if (night) {
      g.addColorStop(0, "#1e2a5a");
      g.addColorStop(0.65, "#4a5a9a");
      g.addColorStop(1, "#8090c8");
    } else {
      g.addColorStop(0, "#c8daf0");
      g.addColorStop(1, "#f2f0e6");
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    // Buildings across the street, a little darker than the sky.
    ctx.fillStyle = night ? "rgba(14,18,40,0.75)" : "rgba(120,130,150,0.35)";
    let x = 0;
    while (x < 256) {
      const w = 40 + r() * 60, h = 60 + r() * 80;
      ctx.fillRect(x, 256 - h, w - 4, h);
      x += w;
    }
    // Reflection streaks on the glass.
    ctx.strokeStyle = night ? "rgba(200,215,255,0.25)" : "rgba(255,255,255,0.45)";
    ctx.lineWidth = 10;
    for (let i = 0; i < 3; i++) {
      const x0 = r() * 256;
      ctx.beginPath();
      ctx.moveTo(x0, 256);
      ctx.lineTo(x0 + 120, 0);
      ctx.stroke();
    }
    grain(ctx, r, 256, 256, 6);
  });
