import { random } from "remotion";
import { blotches, Rect } from "../ps1/paintTexture";
import { perPixel, RUST, shade } from "./textures";

export type Painter = (rect: Rect) => void;

/**
 * A costume: one painter per region. Hair and skin are not here, so every outfit keeps them.
 * Rule: every outfit shows the rust-orange accent (use RUST) somewhere visible.
 * Sizes: jacket 128×128 (shell, sleeves, collar, lapels), shirt/legs/boots 64×64.
 * Lofted parts wrap u round the body with the front at u=0.5 (x=64 on the jacket); v=0 is the bottom (canvas bottom).
 * Jacket front edges sit at x≈53 and 75; the chest pocket at x 78–90, rows 30–46; hem/cuffs in rows 118–128.
 */
export type Outfit = { jacket: Painter; shirt: Painter; legs: Painter; boots: Painter };

// Low-frequency value noise so wear reads as patches, not static.
const patchy = (seed: string, x: number, y: number, cell: number) => {
  const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
  const fx = x / cell - cx, fy = y / cell - cy;
  const r = (i: number, j: number) => random(`${seed}${cx + i},${cy + j}`);
  const top = r(0, 0) + (r(1, 0) - r(0, 0)) * fx;
  const bot = r(0, 1) + (r(1, 1) - r(0, 1)) * fx;
  return top + (bot - top) * fy;
};

const stitches = (rect: Rect, c: string, x: number, y: number, len: number, vertical: boolean) => {
  for (let i = 0; i < len; i += 3) rect(c, vertical ? x : x + i, vertical ? y + i : y, vertical ? 1 : 2, vertical ? 2 : 1);
};

export const paintRustJacket: Painter = (rect) => {
  perPixel(rect, 128, (x, y) => {
    const wear = patchy("jw", x, y, 12) * 0.7 + patchy("jw2", x, y, 5) * 0.3;
    let k = 0.82 + wear * 0.32;
    // Folds: soft dark diagonal bands near the waist and sleeves' elbows.
    const fold = Math.sin((x * 0.6 + y * 1.1) * 0.35) + Math.sin(y * 0.5 + x * 0.05);
    if (fold > 1.75 && y > 80) k *= 0.88;
    if (random(`jn${x},${y}`) < 0.12) k *= 0.92;
    return shade(RUST, Math.round(k / 0.05) * 0.05);
  });
  const seam = shade(RUST, 0.62);
  const stitch = shade(RUST, 1.25);
  // Side seams (u .25/.75) and the back seam.
  for (const sx of [32, 96]) {
    rect(seam, sx, 0, 1, 128);
    stitches(rect, stitch, sx + 2, 1, 120, true);
  }
  // Front edges / placket either side of the opening.
  for (const sx of [52, 75]) {
    rect(seam, sx, 0, 1, 128);
    stitches(rect, stitch, sx === 52 ? sx - 2 : sx + 2, 0, 128, true);
  }
  // Shoulder yoke.
  rect(seam, 0, 12, 128, 1);
  stitches(rect, stitch, 0, 14, 128, false); // shoulder seam
  // Chest pocket on his left.
  rect(seam, 78, 30, 13, 1);
  rect(seam, 78, 30, 1, 17);
  rect(seam, 90, 30, 1, 17);
  rect(seam, 78, 46, 13, 1);
  stitches(rect, stitch, 80, 32, 9, false);
  // Hem and cuffs: darker band with a stitch line.
  rect(shade(RUST, 0.72), 0, 120, 128, 8);
  stitches(rect, stitch, 0, 118, 128, false);
  blotches(rect, "jscuff", [shade(RUST, 0.78), shade(RUST, 1.1)], 25, [0, 20, 128, 100], 2);
};

export const paintCharcoalTee: Painter = (rect) => {
  perPixel(rect, 64, (x, y) => {
    let k = 0.94 + random(`tee${x},${y}`) * 0.08;
    if (Math.sin(y * 0.45 + Math.sin(x * 0.2) * 2) > 0.85) k *= 0.85; // soft horizontal folds
    return shade("#2f3134", k);
  });
  rect("#232527", 0, 0, 64, 3); // crew-neck rib
  rect("#3a3c3f", 0, 3, 64, 1);
};

export const paintJeans: Painter = (rect) => {
  perPixel(rect, 64, (x, y) => {
    let k = 0.92 + random(`jean${x},${y}`) * 0.12;
    if ((x + y * 2) % 7 === 0) k *= 0.93; // twill
    // Faded knees: thigh bottom and shin top meet at the knee; front is x≈32.
    const knee = Math.min(y, 63 - y);
    if (knee < 12 && Math.abs(x - 32) < 12) k *= 1.12 + (12 - knee) * 0.01;
    if (Math.sin(y * 0.7 + x * 0.1) > 0.9 && y > 40) k *= 0.85; // ankle bunching
    return shade("#2e3d5a", k);
  });
  for (const sx of [16, 48]) {
    rect("#24304a", sx, 0, 1, 64);
    for (let y = 0; y < 64; y += 3) rect("#9a7a4c", sx + 1, y, 1, 1); // tan seam stitch
  }
  rect("#24304a", 0, 61, 64, 3); // hem
};

export const paintBoots: Painter = (rect) => {
  perPixel(rect, 64, (x, y) => shade("#5a3a24", 0.9 + patchy("boot", x, y, 6) * 0.2));
  blotches(rect, "scuff", ["#7c5a3e", "#866448", "#4a2f1d"], 40, [0, 10, 64, 40], 2); // scuffs
  for (let y = 14; y < 40; y += 4) rect("#2f1f15", 28, y, 8, 1); // laces down the front
  rect("#3a2618", 20, 40, 24, 6); // toe cap seam
  rect("#211611", 0, 54, 64, 10); // sole
  rect("#3b2a1e", 0, 53, 64, 1);
};

export const DEFAULT_OUTFIT: Outfit = { jacket: paintRustJacket, shirt: paintCharcoalTee, legs: paintJeans, boots: paintBoots };

/** Named outfits for Studio dropdowns. Videos can also pass any Outfit object straight to <Protagonist outfit>. */
export const OUTFITS = { default: DEFAULT_OUTFIT } satisfies Record<string, Outfit>;
export type OutfitName = keyof typeof OUTFITS;
