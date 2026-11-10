import { random } from "remotion";
import { blotches, Rect } from "../ps1/paintTexture";
import faceNeutral from "../../assets/characters/protagonist/face-neutral.png";
import hair from "../../assets/characters/protagonist/hair.png";
import jacket from "../../assets/characters/protagonist/jacket.png";
import skin from "../../assets/characters/protagonist/skin.png";
import tshirt from "../../assets/characters/protagonist/tshirt.png";

// Cropped from assets/reference/protagonist.jpg by scripts/make-character-textures.ts.
export const TEX = { hair, jacket, skin, tshirt };

/**
 * Face textures (128×128, brows → chin). To add one: crop face-worried.png in the script,
 * import it here and add `worried: faceWorried`.
 */
export const EXPRESSIONS = { neutral: faceNeutral };
export type Expression = keyof typeof EXPRESSIONS;
export const EXPRESSION_NAMES = Object.keys(EXPRESSIONS) as [Expression, ...Expression[]];

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
/** Scale a colour in sRGB; k < 1 darkens. */
export const shade = (hex: string, k: number) =>
  `rgb(${rgb(hex).map((v) => Math.max(0, Math.min(255, Math.round(v * k)))).join(",")})`;

/** Per-pixel painter: f(x, y) returns a colour. */
export const perPixel = (rect: Rect, size: number, f: (x: number, y: number) => string) => {
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) rect(f(x, y), x, y, 1, 1);
};

// The reference stops at the waist, so jeans and boots are painted (64×64).
export const paintJeans = (rect: Rect) => {
  perPixel(rect, 64, (x, y) => {
    let k = 0.92 + random(`jean${x},${y}`) * 0.12;
    if ((x + y * 2) % 7 === 0) k *= 0.93; // twill
    const knee = Math.min(y, 63 - y); // thigh bottom and shin top meet at the knee; front is x≈32
    if (knee < 12 && Math.abs(x - 32) < 12) k *= 1.12;
    return shade("#2e3d5a", k);
  });
  for (const sx of [16, 48]) {
    rect("#24304a", sx, 0, 1, 64);
    for (let y = 0; y < 64; y += 3) rect("#9a7a4c", sx + 1, y, 1, 1); // tan seam stitch
  }
  rect("#24304a", 0, 61, 64, 3); // hem
};

export const paintBoots = (rect: Rect) => {
  perPixel(rect, 64, (x, y) => shade("#5a3a24", 0.9 + random(`boot${x >> 2},${y >> 2}`) * 0.2));
  blotches(rect, "scuff", ["#7c5a3e", "#4a2f1d"], 30, [0, 10, 64, 40], 2);
  rect("#211611", 0, 52, 64, 12); // sole
};
