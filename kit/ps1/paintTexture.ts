import { random } from "remotion";

export type Rect = (color: string, x: number, y: number, w: number, h: number) => void;

/** Paints a size×size canvas and returns a data URL for usePS1Texture. Browser-only. */
export const paintTexture = (draw: (rect: Rect) => void, size = 32) => {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  draw((color, x, y, w, h) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  });
  return canvas.toDataURL();
};

/** n seeded s×s blocks scattered inside [x, y, w, h]: blotchy pixel noise. */
export const blotches = (
  rect: Rect,
  seed: string,
  colors: string[],
  n: number,
  [x, y, w, h]: [number, number, number, number],
  s = 1,
) => {
  for (let i = 0; i < n; i++) {
    rect(colors[i % colors.length], x + Math.floor(random(`${seed}x${i}`) * w), y + Math.floor(random(`${seed}y${i}`) * h), s, s);
  }
};
