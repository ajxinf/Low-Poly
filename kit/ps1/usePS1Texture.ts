import { useLoader } from "@react-three/fiber";
import { NearestFilter, SRGBColorSpace, TextureLoader } from "three";

/**
 * Loads a texture the PS1 way: nearest filtering, no mipmaps, sRGB.
 * Suspends until loaded; ThreeCanvas holds the render for Suspense, so the first frame already has it.
 */
export const usePS1Texture = (url: string) => {
  const t = useLoader(TextureLoader, url);
  t.magFilter = NearestFilter;
  t.minFilter = NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = SRGBColorSpace;
  return t;
};
