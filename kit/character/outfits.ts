import { Rect } from "../ps1/paintTexture";
import { paintBoots, paintJeans, TEX } from "./textures";

/** A texture: an imported image URL, or a 64×64 canvas painter. */
export type TextureSource = string | ((rect: Rect) => void);

/**
 * A costume: one texture per region. Hair, face and skin are not here, so every outfit keeps them.
 * Rule: every outfit shows the rust-orange accent somewhere visible.
 * jacket tiles (RepeatWrapping) over the shell and sleeves; shirt maps once across the tee front.
 */
export type Outfit = { jacket: TextureSource; shirt: TextureSource; legs: TextureSource; boots: TextureSource };

export const DEFAULT_OUTFIT: Outfit = { jacket: TEX.jacket, shirt: TEX.tshirt, legs: paintJeans, boots: paintBoots };

/** Named outfits for Studio dropdowns. Videos can also pass any Outfit object straight to <Protagonist outfit>. */
export const OUTFITS = { default: DEFAULT_OUTFIT } satisfies Record<string, Outfit>;
export type OutfitName = keyof typeof OUTFITS;
