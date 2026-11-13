import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from "three";
import { rng } from "../paint";
import { M } from "./kit";
import { signTex } from "./textures";

/**
 * Text that lives in the world (skill "Words live in the world"): unlit sign faces (lit signs go grey from the side)
 * and hand-painted / crayon lettering on cardboard or plywood. From the zombie pilot (2026-11-13).
 */
/** Unlit sign face (readability rule: lit signs go grey from the side). */
export const signFace = (text: string, bg: string, fg: string, w: number, h: number) =>
  new Mesh(new PlaneGeometry(w, h), M(`sign${text}${bg}`, () => new MeshBasicMaterial({ map: signTex(text, bg, fg) })));

/** A hand-painted / crayon sign drawn on a canvas (wobbly letters on cardboard or plywood). */
export const scrawlTex = (lines: string[], bg: string, ink: string, w = 512, h = 256) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  const r = rng(lines.join("").length * 13);
  g.fillStyle = ink;
  g.textAlign = "center";
  g.textBaseline = "middle";
  const fs = Math.min(h / (lines.length + 0.6), (w / Math.max(...lines.map((l) => l.length))) * 1.45);
  g.font = `900 ${fs}px "Comic Sans MS", "Chalkboard SE", sans-serif`;
  lines.forEach((l, i) => {
    const y = h / 2 + (i - (lines.length - 1) / 2) * fs * 1.05;
    [...l].forEach((ch, j) => {
      const x = w / 2 + (j - (l.length - 1) / 2) * fs * 0.68;
      g.save();
      g.translate(x, y + (r() - 0.5) * fs * 0.12);
      g.rotate((r() - 0.5) * 0.22);
      g.fillText(ch, 0, 0);
      g.restore();
    });
  });
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
};
export const scrawl = (lines: string[], bg: string, ink: string, w: number, h: number) =>
  new Mesh(new PlaneGeometry(w, h), M(`scrawl${lines.join("|")}`, () => new MeshBasicMaterial({ map: scrawlTex(lines, bg, ink) })));

