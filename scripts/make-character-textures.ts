// Crops the protagonist's textures out of our reference art.
// Run: node scripts/make-character-textures.ts   (writes assets/characters/protagonist/, plus out/texture-crops.png to check the boxes)
import { mkdirSync } from "node:fs";
import sharp from "sharp";

const SRC = "assets/reference/protagonist.jpg";
const OUT = "assets/characters/protagonist";

type Box = { left: number; top: number; width: number; height: number };
// Pixel boxes in the 768×1376 reference.
const FACE: Box = { left: 280, top: 538, width: 190, height: 270 }; // brows → chin, cheek → cheek
const HAIR: Box = { left: 300, top: 385, width: 100, height: 100 };
const JACKET: Box = { left: 60, top: 1000, width: 128, height: 128 };
const TSHIRT: Box = { left: 340, top: 930, width: 64, height: 64 };

const crop = (b: Box) => sharp(SRC).extract(b);
const nearest = { kernel: sharp.kernel.nearest };

mkdirSync(OUT, { recursive: true });
mkdirSync("out", { recursive: true });

// Faces live in face-<expression>.png; add worried/shocked crops the same way.
await crop(FACE).resize(128, 128, { fit: "fill" }).png({ palette: true, colours: 32, dither: 0 }).toFile(`${OUT}/face-neutral.png`);
await crop(HAIR).resize(64, 64).png({ palette: true, colours: 24, dither: 0 }).toFile(`${OUT}/hair.png`);
await crop(TSHIRT).resize(32, 32).png().toFile(`${OUT}/tshirt.png`);

// Tileable jacket: shrink to 32×32, then mirror into a 2×2 so every edge meets its twin.
const tile = await crop(JACKET).resize(32, 32).png().toBuffer();
const flop = await sharp(tile).flop().toBuffer();
const flip = await sharp(tile).flip().toBuffer();
const both = await sharp(tile).flip().flop().toBuffer();
await sharp({ create: { width: 64, height: 64, channels: 3, background: "#000" } })
  .composite([
    { input: tile, left: 0, top: 0 },
    { input: flop, left: 32, top: 0 },
    { input: flip, left: 0, top: 32 },
    { input: both, left: 32, top: 32 },
  ])
  .png({ palette: true, colours: 32, dither: 0 })
  .toFile(`${OUT}/jacket.png`);

// Flat skin swatch: mean of the face crop's lit skin (skips dark features and the teal shadow side).
const px = await crop(FACE).raw().toBuffer();
const sum = [0, 0, 0];
let n = 0;
for (let i = 0; i < px.length; i += 3) {
  const [pr, pg, pb] = [px[i], px[i + 1], px[i + 2]];
  if (pr + pg + pb < 420 || pg >= pr) continue; // brightest skin: what the face plate reads as under light
  sum[0] += pr;
  sum[1] += pg;
  sum[2] += pb;
  n++;
}
const [r, g, b] = sum.map((s) => Math.round(s / n));
await sharp({ create: { width: 8, height: 8, channels: 3, background: { r, g, b } } }).png().toFile(`${OUT}/skin.png`);

// Debug sheet: the boxes drawn on the reference.
const rect = (b: Box, c: string) => `<rect x="${b.left}" y="${b.top}" width="${b.width}" height="${b.height}" fill="none" stroke="${c}" stroke-width="2"/>`;
const svg = `<svg width="768" height="1376">${rect(FACE, "#0f0")}${rect(HAIR, "#f0f")}${rect(JACKET, "#ff0")}${rect(TSHIRT, "#0ff")}</svg>`;
await sharp(SRC).composite([{ input: Buffer.from(svg) }]).toFile("out/texture-crops.png");
await sharp(`${OUT}/face-neutral.png`).resize(512, 512, nearest).toFile("out/face-neutral-x4.png");

console.log(`skin swatch rgb(${r}, ${g}, ${b}); wrote ${OUT}/`);
