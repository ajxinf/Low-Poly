import { random } from "remotion";
import { blotches, paintTexture, Rect } from "../ps1/paintTexture";

// Fixed across every outfit: the hair and the rust accent are the character's silhouette.
export const HAIR = "#16110f";
export const RUST = "#a3492b";

export type FaceColors = { skin: string; brow: string; eye: string; mouth: string };
export const DEFAULT_FACE: FaceColors = { skin: "#d9a98c", brow: "#231713", eye: "#3a2a20", mouth: "#985a4b" };

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const css = (c: number[]) => `rgb(${c.map((v) => Math.max(0, Math.min(255, Math.round(v)))).join(",")})`;
/** Scale a colour in sRGB; k < 1 darkens. Optional per-channel tint. */
export const shade = (hex: string, k: number, tint: number[] = [1, 1, 1]) => css(rgb(hex).map((v, i) => v * k * tint[i]));
export const mixHex = (a: string, b: string, t: number) => css(rgb(a).map((v, i) => v + (rgb(b)[i] - v) * t));
/** Quantise shading to PS1-ish bands. */
const band = (k: number) => Math.round(k / 0.04) * 0.04;

/** Per-pixel painter: f(x, y) returns a colour or null to leave the pixel. */
export const perPixel = (rect: Rect, size: number, f: (x: number, y: number) => string | null) => {
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const c = f(x, y);
    if (c) rect(c, x, y, 1, 1);
  }
};

const inEllipse = (x: number, y: number, cx: number, cy: number, rx: number, ry: number) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;

/**
 * 128×128 face, mapped by rig.faceU: x = 64 + 51·sin(θ) across the front, the outer 13px wrap the back.
 * Rows: hairline ~28, brows 51–56, eyes 61–64, nose tip 82, mouth 99, chin 120.
 * Light is baked from upper front-left (viewer's left = canvas left).
 * `both` paints a rect and its mirror; `sx` gives the mirrored x for asymmetric details.
 */
export const paintFace = ({ skin, brow, eye, mouth }: FaceColors) =>
  paintTexture((rect) => {
    const both: Rect = (c, x, y, w, h) => {
      rect(c, x, y, w, h);
      rect(c, 128 - x - w, y, w, h);
    };
    perPixel(rect, 128, (x, y) => {
      const dx = (x - 64) / 51; // ≈ sin θ: -1 his right side … +1 his left
      const ax = Math.abs(x - 64);
      let k = 1.02 - 0.2 * Math.max(0, dx) + 0.05 * Math.max(0, -dx) - y * 0.0008;
      if (Math.abs(dx) > 0.8) k *= 0.86; // sides turn away
      if (x < 13 || x > 115) k *= 0.82;
      if (y > 50 && y < 60 && ax > 4 && ax < 33) k *= y > 56 ? 0.8 : 1; // under the brow ridge
      if (inEllipse(ax, y, 18, 63, 14, 6)) k *= 0.88; // eye sockets
      if (y >= 65 && y <= 69 && ax > 8 && ax < 28) k *= 0.86; // tired under-eyes
      if (y > 70 && y < 78 && ax > 22 && ax < 40) k *= x < 64 ? 1.06 : 1; // cheekbone highlight (lit side)
      if (y > 80 && y < 98 && ax > 25 && ax < 42) k *= 0.86; // hollow under the cheekbones
      if (y > 104 && ax > 26) k *= 0.82; // jaw shadow
      if (y > 120) k *= 0.78; // under the chin
      if (y > 28 && y < 48 && x > 38 && x < 62) k *= 1.05; // forehead catches the light
      if (y > 86 && y < 90 && ax < 9) k *= 0.72; // under the nose
      if (y > 101 && y < 105 && ax < 10) k *= 0.86; // under the lower lip
      if (x > 65 && x < 71 && y > 62 && y < 85) k *= 0.8; // nose shadow side
      if (x > 59 && x < 63 && y > 60 && y < 82) k *= 1.06; // lit side of the nose
      const n = random(`skin${x},${y}`);
      if (y > 92 && ax < 40 && n < 0.3) k *= 0.9; // faint stubble
      else k *= 0.97 + n * 0.05;
      return shade(skin, band(k));
    });

    // Hair above the hairline (under the cap; shows only if the cap shifts).
    rect(HAIR, 0, 0, 128, 26);
    for (let i = 0; i < 32; i++) rect(HAIR, i * 4, 26, 4, Math.floor(random(`fringe${i}`) * 4));

    // Nasolabial folds.
    for (let i = 0; i < 9; i++) both(shade(skin, 0.8), 54 - i * 0.6, 86 + i, 2, 1);

    // Heavy brows, angled down toward the nose: a tired frown. Ragged top edge.
    for (let i = 0; i < 22; i++) {
      const x = 36 + i; // outer end → inner end (his right brow, canvas left)
      const top = 52 + Math.floor(i / 8) + (random(`browT${i}`) < 0.3 ? 1 : 0);
      const h = 4 + (i > 10 ? 1 : 0);
      rect(brow, x, top, 1, h);
      rect(brow, 127 - x, top, 1, h);
    }
    both(shade(brow, 1.5), 34, 53, 2, 1); // feathered outer tips

    // Eyes (pupils ±16px from centre): heavy lid fold, narrow white, dark iris glancing to his left.
    both(shade(skin, 0.74), 40, 59, 16, 2); // lid fold
    both(shade(brow, 1.2), 41, 61, 15, 1); // lash line
    both("#cfc6b6", 42, 62, 13, 2);
    both("#b3a99a", 42, 63, 13, 1); // lower white in lid shadow
    rect(eye, 49, 61, 4, 3);
    rect(eye, 82, 61, 4, 3);
    rect(shade(eye, 0.4), 50, 62, 2, 1);
    rect(shade(eye, 0.4), 83, 62, 2, 1);
    both(shade(skin, 0.7), 42, 64, 13, 1); // lower lid
    both(shade(skin, 0.8, [0.95, 0.95, 1.08]), 42, 65, 12, 2); // bags

    both(shade(skin, 0.5), 57, 85, 3, 2); // nostrils
    both(shade(skin, 0.75), 60, 84, 1, 1);

    // Flat, tired mouth.
    rect(shade(skin, 0.86), 53, 97, 22, 1); // upper lip shadow
    rect(shade(mouth, 0.75), 52, 98, 24, 2);
    both(shade(mouth, 0.7), 50, 99, 2, 1);
    both(shade(mouth, 0.7), 49, 100, 1, 1); // corners turn down
    rect(mouth, 55, 100, 18, 1);
    rect(shade(skin, 0.88), 58, 110, 12, 2); // chin dimple

    // Ears live at the sides (x≈115 / 13), rows 58–84.
    both(shade(skin, 0.75), 9, 60, 8, 22);
    both(shade(skin, 0.6), 11, 64, 4, 14);
  }, 128);

export const paintSkin = (skin: string) =>
  paintTexture((rect) => {
    perPixel(rect, 64, (x, y) => shade(skin, band(0.94 + random(`hand${x},${y}`) * 0.08 - (y > 40 ? 0.06 : 0))));
    blotches(rect, "knuckle", [shade(skin, 0.82)], 12, [6, 44, 52, 4]);
  }, 64);

// Near-black with brown-grey strands, lighter toward the tips (canvas top = shard tips).
export const paintHair = () =>
  paintTexture((rect) => {
    rect(HAIR, 0, 0, 64, 64);
    for (let i = 0; i < 90; i++) {
      const y = Math.floor(random(`hy${i}`) * 64);
      const c = y < 30 ? (i % 3 ? "#2e2520" : "#463c36") : i % 2 ? "#251c18" : "#0b0807";
      rect(c, Math.floor(random(`hx${i}`) * 64), y, 1, 3 + Math.floor(random(`hl${i}`) * 5));
    }
  }, 64);
