import { random } from "remotion";
import { paintTexture as paint, Rect } from "../../kit/ps1/paintTexture";

// Procedural 32×32 textures for the PS1Test aisle. Browser-only (uses <canvas>).

const PALETTE = [
  "#b5403a", "#c9782e", "#e0b55a", "#eae2b7", "#003049", "#2a9d8f", "#264653",
  "#8ab17d", "#9b2226", "#e8e4d8", "#5e548e", "#e76f51", "#1d3557", "#111111",
];

const pickColors = (seed: string, n: number) => {
  const pool = [...PALETTE];
  return Array.from({ length: n }, (_, i) => pool.splice(Math.floor(random(`${seed}c${i}`) * pool.length), 1)[0]);
};

// Blocky 3×4 "letters", each with a 1px hole punched in so they read as glyphs.
const letters = (rect: Rect, seed: string, ink: string, paper: string, x: number, y: number, n: number) => {
  for (let i = 0; i < n; i++) {
    const lx = x + i * 4;
    rect(ink, lx, y, 3, 4);
    rect(paper, lx + Math.floor(random(`${seed}hx${i}`) * 3), y + 1 + Math.floor(random(`${seed}hy${i}`) * 2), 1, 1);
  }
};

const cereal = (seed: string) =>
  paint((rect) => {
    const [bg, band, logoBg, ink, bowl, flakes] = pickColors(seed, 6);
    rect(bg, 0, 0, 32, 32);
    rect(band, 0, 0, 32, 4);
    rect(band, 0, 28, 32, 4);
    rect(logoBg, 3, 6, 26, 9);
    letters(rect, seed, ink, logoBg, 6, 8, 5);
    rect(flakes, 9, 18, 14, 3);
    rect(bowl, 8, 21, 16, 5);
    rect(bowl, 10, 26, 12, 1);
  });

const can = (seed: string) =>
  paint((rect) => {
    const [bg, band, logoBg, ink] = pickColors(seed, 4);
    rect(bg, 0, 0, 32, 32);
    rect("#b8b8b8", 0, 0, 32, 2);
    rect("#b8b8b8", 0, 30, 32, 2);
    rect(band, 0, 6, 32, 3);
    rect(band, 0, 23, 32, 3);
    rect(logoBg, 4, 11, 24, 10);
    letters(rect, seed, ink, logoBg, 6, 14, 5);
  });

const bottle = (seed: string) =>
  paint((rect) => {
    const [plastic, label, stripe, ink] = pickColors(seed, 4);
    rect(plastic, 0, 0, 32, 32);
    rect(label, 0, 9, 32, 15);
    rect(stripe, 0, 10, 32, 2);
    rect(stripe, 0, 21, 32, 2);
    letters(rect, seed, ink, label, 4, 14, 6);
  });

export const LABEL_KINDS = ["cereal", "can", "bottle"] as const;
export type LabelKind = (typeof LABEL_KINDS)[number];
export const LABEL_VARIANTS = 4;

/** Texture index for kind k, variant v: k * LABEL_VARIANTS + v. */
export const makeLabelTextures = () =>
  LABEL_KINDS.flatMap((kind) =>
    Array.from({ length: LABEL_VARIANTS }, (_, v) =>
      ({ cereal, can, bottle })[kind](`${kind}${v}`),
    ),
  );

const speckle = (rect: Rect, seed: string, n: number, colors: string[], yMin = 0) => {
  for (let i = 0; i < n; i++) {
    const x = Math.floor(random(`${seed}x${i}`) * 32);
    const y = yMin + Math.floor(random(`${seed}y${i}`) * (32 - yMin));
    rect(colors[i % colors.length], x, y, 1, 1);
  }
};

export const makeFloorTile = () =>
  paint((rect) => {
    rect("#c9c6b6", 0, 0, 32, 32);
    rect("#6f6c60", 0, 0, 32, 1);
    rect("#6f6c60", 0, 0, 1, 32);
    rect("#dedbcc", 1, 1, 31, 1);
    speckle(rect, "floor", 40, ["#a9a596", "#b8b4a4", "#8f8b7e"]);
    rect("#a39f8f", 26, 26, 5, 5); // scuff
  });

export const makeGrimyPanel = () =>
  paint((rect) => {
    rect("#7d847a", 0, 0, 32, 32);
    rect("#4f554d", 0, 31, 32, 1);
    rect("#4f554d", 31, 0, 1, 32);
    rect("#9aa096", 0, 0, 32, 1);
    rect("#9aa096", 0, 0, 1, 32);
    for (const [x, y] of [[3, 3], [28, 3], [3, 28], [28, 28]]) rect("#3e433c", x, y, 1, 1);
    speckle(rect, "panel", 60, ["#5d635a", "#6a6f63", "#4a5047"], 18); // grime collects low
    speckle(rect, "panelTop", 15, ["#6a6f63"]);
  });

// Muted promo box (the spinning hero prop): cardboard tones, faded print.
export const makeProductBox = () =>
  paint((rect) => {
    rect("#8a7a5e", 0, 0, 32, 32);
    rect("#6e604a", 0, 0, 32, 3);
    rect("#6e604a", 0, 29, 32, 3);
    rect("#a89a7c", 4, 7, 24, 10);
    letters(rect, "promo", "#5b5a4c", "#a89a7c", 6, 10, 5);
    rect("#6f7a68", 8, 20, 16, 5);
    rect("#7f6a5a", 11, 22, 10, 1);
    speckle(rect, "promoGrime", 25, ["#7a6b52", "#776a55"]);
  });
