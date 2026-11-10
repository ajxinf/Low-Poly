import { useLoader } from "@react-three/fiber";
import { NearestFilter, SRGBColorSpace, Texture, TextureLoader } from "three";

const ps1ify = (t: Texture) => {
  t.magFilter = NearestFilter;
  t.minFilter = NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = SRGBColorSpace;
  return t;
};

/**
 * Loads textures the PS1 way: nearest filtering, no mipmaps, sRGB.
 * Suspends until loaded; ThreeCanvas holds the render for Suspense, so the first frame already has them.
 */
export const usePS1Texture = (url: string) => ps1ify(useLoader(TextureLoader, url));
export const usePS1Textures = (urls: string[]) => useLoader(TextureLoader, urls).map(ps1ify);
