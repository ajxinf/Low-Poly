import { blotches, Rect } from "../ps1/paintTexture";
import { RUST } from "./textures";

export type Painter = (rect: Rect) => void;

/**
 * A costume: one 32×32 painter per body region. Hair and skin are not here, so every outfit keeps them.
 * Rule: every outfit shows the rust-orange accent (use RUST) somewhere visible.
 * Cylinder parts wrap u around the body with u=0.5 at the front; v=0 is the bottom (canvas bottom rows).
 */
export type Outfit = { torso: Painter; sleeves: Painter; legs: Painter; boots: Painter };

const rustCloth = (rect: Rect, seed: string) => {
  rect(RUST, 0, 0, 32, 32);
  blotches(rect, seed, ["#8c3b22", "#b5583a", "#7b331d", "#c0653f"], 70, [0, 0, 32, 32], 2);
};

export const DEFAULT_OUTFIT: Outfit = {
  // Open rust overshirt over a charcoal tee (the front strip).
  torso: (rect) => {
    rustCloth(rect, "torso");
    rect("#2e3033", 13, 0, 6, 32);
    blotches(rect, "tee", ["#26282a", "#36383b"], 12, [13, 0, 6, 32]);
    rect("#6e2c18", 12, 0, 1, 32);
    rect("#6e2c18", 19, 0, 1, 32);
  },
  sleeves: (rect) => rustCloth(rect, "sleeve"),
  legs: (rect) => {
    rect("#2c3b57", 0, 0, 32, 32);
    blotches(rect, "jeans", ["#243149", "#35476a", "#2a3852"], 60, [0, 0, 32, 32], 2);
  },
  boots: (rect) => {
    rect("#5b3b24", 0, 0, 32, 32);
    blotches(rect, "boots", ["#4a2f1c", "#6a4630"], 40, [0, 0, 32, 32], 2);
    rect("#2a1d14", 0, 27, 32, 5); // sole
  },
};

/** Named outfits for Studio dropdowns. Videos can also pass any Outfit object straight to <Protagonist outfit>. */
export const OUTFITS = { default: DEFAULT_OUTFIT } satisfies Record<string, Outfit>;
export type OutfitName = keyof typeof OUTFITS;
