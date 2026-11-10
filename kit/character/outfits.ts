import type { Tone } from "./textures";

/**
 * A costume: flat colours, each with one shadow tone. Hair, face and skin are not here, so every outfit keeps them.
 * Rule: every outfit shows the rust-orange accent somewhere visible.
 */
export type Outfit = { jacket: Tone; shirt: Tone; legs: Tone; boots: Tone };

export const DEFAULT_OUTFIT: Outfit = {
  jacket: ["#a8502c", "#7e3a20"],
  shirt: ["#2e2f30", "#1f2021"],
  legs: ["#33456b", "#24324f"],
  boots: ["#5a3a26", "#3e281a"],
};

/** Named outfits for Studio dropdowns. Videos can also pass any Outfit object straight to <Protagonist outfit>. */
export const OUTFITS = { default: DEFAULT_OUTFIT } satisfies Record<string, Outfit>;
export type OutfitName = keyof typeof OUTFITS;
