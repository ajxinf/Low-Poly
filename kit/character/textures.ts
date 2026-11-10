import { random } from "remotion";
import { Color } from "three";
import { blotches, paintTexture, Rect } from "../ps1/paintTexture";

// Fixed across every outfit: the hair and the rust accent are the character's silhouette.
export const HAIR = "#1d1512";
export const RUST = "#a3492b";

export type FaceColors = { skin: string; brow: string; eye: string; mouth: string };
export const DEFAULT_FACE: FaceColors = { skin: "#dcae92", brow: "#2a1b15", eye: "#3b2a1f", mouth: "#9c5b4e" };

/** k < 1 darkens, k > 1 lightens. */
export const shade = (c: string, k: number) => `#${new Color(c).multiplyScalar(k).getHexString()}`;

/**
 * 64×64 front of the head. Rows 0–22 sit under the hair box; the jagged fringe at 22–25 meets it.
 * Layout is symmetric, so `both` paints a rect and its left-right mirror.
 */
export const paintFace = ({ skin, brow, eye, mouth }: FaceColors) =>
  paintTexture((rect) => {
    const d = (k: number) => shade(skin, k);
    const both: Rect = (c, x, y, w, h) => {
      rect(c, x, y, w, h);
      rect(c, 64 - x - w, y, w, h);
    };
    rect(skin, 0, 0, 64, 64);
    blotches(rect, "skin", [d(0.92), d(1.05), d(0.96)], 160, [0, 0, 64, 64]);
    both(d(0.8), 0, 0, 5, 64); // sides of the face turn away
    both(d(0.88), 7, 35, 6, 6); // cheekbones
    blotches(rect, "stubble", [d(0.82), d(0.87)], 70, [6, 46, 52, 18]);
    rect(d(0.85), 0, 58, 64, 6); // under the jaw

    rect(HAIR, 0, 0, 64, 22);
    for (let i = 0; i < 16; i++) rect(HAIR, i * 4, 22, 4, Math.floor(random(`fringe${i}`) * 4));

    // Heavy brows, inner ends dropped a pixel: a tired frown.
    both(brow, 12, 25, 14, 3);
    both(brow, 22, 27, 7, 2);
    // Squinting eyes: 2px tall, dark upper lid, baggy lower lid.
    both(d(0.84), 13, 28, 14, 6);
    both(shade(brow, 1.4), 14, 29, 12, 1);
    both("#d8cfc0", 15, 30, 10, 2);
    both(eye, 19, 30, 3, 2);
    both(shade(eye, 0.4), 20, 30, 1, 1);
    both(d(0.72), 15, 32, 10, 1);

    rect(d(1.06), 31, 30, 2, 11); // nose bridge highlight
    rect(d(0.8), 34, 31, 2, 11); // shadow side
    rect(d(0.7), 29, 42, 7, 1);
    both(d(0.5), 29, 43, 2, 1); // nostrils

    // Flat, tired mouth with corners a pixel down.
    rect(d(0.85), 25, 48, 14, 1);
    rect(mouth, 25, 49, 14, 1);
    both(mouth, 24, 50, 1, 1);
    rect(d(0.9), 27, 50, 10, 1);
    rect(d(0.88), 27, 55, 10, 2); // chin dimple
  }, 64);

export const paintSkin = (skin: string) =>
  paintTexture((rect) => {
    rect(skin, 0, 0, 32, 32);
    blotches(rect, "hand", [shade(skin, 0.9), shade(skin, 1.05)], 50, [0, 0, 32, 32]);
  });

export const paintHair = () =>
  paintTexture((rect) => {
    rect(HAIR, 0, 0, 32, 32);
    for (let i = 0; i < 60; i++) {
      const c = i % 3 ? "#2b201a" : "#0f0b09";
      rect(c, Math.floor(random(`hx${i}`) * 32), Math.floor(random(`hy${i}`) * 32), 1, 3); // strands
    }
  });
