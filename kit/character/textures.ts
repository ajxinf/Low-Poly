import { paintTexture } from "../ps1/paintTexture";
import faceNeutral from "../../assets/characters/protagonist/faces/face_neutral.png";
import faceShocked from "../../assets/characters/protagonist/faces/face_shocked.png";
import type { Outfit } from "./outfits";

/**
 * 32×32 faces for the head front (fringe on top rows, skin #deaa80). To add one,
 * drop face_worried.png in faces/, import it here and add `worried: faceWorried`.
 */
export const EXPRESSIONS = { neutral: faceNeutral, shocked: faceShocked };
export type Expression = keyof typeof EXPRESSIONS;
export const EXPRESSION_NAMES = Object.keys(EXPRESSIONS) as [Expression, ...Expression[]];

/** Base colour + its one painted shadow tone. */
export type Tone = [base: string, shadow: string];
export const SKIN: Tone = ["#deaa80", "#ba805c"];
export const HAIR: Tone = ["#241b17", "#16100d"];

// Palette slots: each part's vertices pick a base or shadow cell, so shading is painted, not lit.
export const SLOT = { skin: 0, hair: 1, jacket: 2, shirt: 3, legs: 4, boots: 5 } as const;
export type Slot = keyof typeof SLOT;
const CELLS = 16;
export const cellU = (slot: Slot, shadow: boolean) => (SLOT[slot] * 2 + (shadow ? 1 : 0) + 0.5) / CELLS;

/** 16×16 palette texture: column pairs of [base, shadow] per slot. */
export const paintPalette = (outfit: Outfit) =>
  paintTexture((rect) => {
    const tones: Tone[] = [SKIN, HAIR, outfit.jacket, outfit.shirt, outfit.legs, outfit.boots];
    tones.forEach(([base, shadow], i) => {
      rect(base, i * 2, 0, 1, CELLS);
      rect(shadow, i * 2 + 1, 0, 1, CELLS);
    });
  }, CELLS);
