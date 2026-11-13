import { BufferAttribute, BufferGeometry, CanvasTexture, DoubleSide, Mesh, MeshBasicMaterial, SRGBColorSpace } from "three";
import { rng } from "../paint";
import { M } from "./kit";

/**
 * Painted views through windows (zombie pilot critique, 2026-11-13: "windows read as solid white blocks"). Any
 * interior with windows shows the outside: `streetViewTex` paints a street across the way (a row of shops, sky,
 * optionally a landmark building with a sign, a figure on its roof, floodlights, and a crowd in the street), and
 * `windowViews` maps one canvas across all the panes, just inside the glass. Day and night versions.
 */

/** Front-window panes of the stock supermarket (kit supermarket.ts): x ranges, y 0.9-3.6, glass at z 4. */
export const STORE_PANES: [number, number][] = [[-11.4, -8.5], [-7.9, -4.9], [-4.3, -1.9], [1.9, 4.3], [4.9, 7.9], [8.5, 11.4]];

export type Landmark = {
  name: string;
  /** World x range of the landmark as seen through the windows (the canvas is flipped to match). */
  x0: number;
  x1: number;
  wall?: string;
  roofFigure?: { body: string; cap: string };
  floodlights?: boolean;
  generator?: boolean;
};

/** A painted street view, 24 m wide (world x -12..12 seen from inside looking out), 2.7 m tall. */
export const streetViewTex = ({ night = false, landmark, crowd = 160, seed = 8 }: { night?: boolean; landmark?: Landmark; crowd?: number; seed?: number }) => {
  const W = 2304, Hh = 260, c = document.createElement("canvas");
  c.width = W;
  c.height = Hh;
  const g = c.getContext("2d")!, r = rng(seed + (night ? 1 : 0));
  const sky = g.createLinearGradient(0, 0, 0, Hh);
  sky.addColorStop(0, night ? "#141c44" : "#6aa0e0");
  sky.addColorStop(1, night ? "#3a3a6a" : "#d8e6f2");
  g.fillStyle = sky;
  g.fillRect(0, 0, W, Hh);
  if (!night)
    for (let i = 0; i < 9; i++) {
      g.fillStyle = "rgba(255,255,255,0.85)";
      g.beginPath();
      g.ellipse(r() * W, 20 + r() * 40, 50 + r() * 60, 12 + r() * 8, 0, 0, Math.PI * 2);
      g.fill();
    }
  else
    for (let i = 0; i < 60; i++) {
      g.fillStyle = "#e8eaff";
      g.fillRect(r() * W, r() * 90, 2, 2);
    }
  // Canvas x for world x: the view is seen from inside looking out (+z), so world +x is screen LEFT.
  const X = (x: number) => ((12 - x) / 24) * W, base = Hh * 0.72;
  for (let x = -12; x < 12; ) {
    const w = 2.4 + r() * 2.2, h = 70 + r() * 70;
    const cols = night ? ["#3a3050", "#2e3a52", "#4a3444"] : ["#9a5a4a", "#c4b48a", "#8aa494", "#a8786a", "#d8ccb4"];
    g.fillStyle = cols[Math.floor(r() * cols.length)];
    const a = Math.min(X(x), X(x + w)), b = Math.max(X(x), X(x + w));
    g.fillRect(a, base - h, b - a - 2, h);
    for (let wy = base - h + 12; wy < base - 18; wy += 24)
      for (let wx = a + 8; wx < b - 20; wx += 26) {
        g.fillStyle = night ? (r() < 0.25 ? "#ffc070" : "#1a1a2a") : "#3a4458";
        g.fillRect(wx, wy, 12, 14);
      }
    x += w;
  }
  if (landmark) {
    const c0 = Math.min(X(landmark.x0), X(landmark.x1)), c1 = Math.max(X(landmark.x0), X(landmark.x1)), top = base - 120, mid = (c0 + c1) / 2;
    g.fillStyle = landmark.wall ?? (night ? "#5a2e2a" : "#8e5446");
    g.fillRect(c0, top, c1 - c0, base - top);
    g.fillStyle = "#2a2a36";
    g.fillRect(c0 + 6, top + 30, c1 - c0 - 12, 26);
    g.fillStyle = "#f2c84a";
    g.font = '900 22px "Nunito", "Arial Black", sans-serif';
    g.textAlign = "center";
    g.fillText(landmark.name, mid, top + 51);
    g.fillStyle = "#8a8e98";
    g.fillRect(c0 + 60, top + 66, c1 - c0 - 120, base - top - 66);
    if (landmark.generator) {
      g.fillStyle = "#4e8a54";
      g.fillRect(c0 + 20, top - 18, 34, 18);
    }
    if (landmark.roofFigure) {
      g.fillStyle = landmark.roofFigure.body;
      g.fillRect(mid - 6, top - 34, 12, 22);
      g.fillStyle = landmark.roofFigure.cap;
      g.fillRect(mid - 7, top - 40, 14, 6);
    }
    if (landmark.floodlights)
      for (const fx of [c0 + 8, c1 - 8]) {
        g.fillStyle = night ? "#fff6d8" : "#e8e4d0";
        g.beginPath();
        g.arc(fx, top - 22, night ? 9 : 5, 0, Math.PI * 2);
        g.fill();
        if (night) {
          const glow = g.createRadialGradient(fx, top - 22, 4, fx, top - 22, 70);
          glow.addColorStop(0, "rgba(255,240,200,0.7)");
          glow.addColorStop(1, "rgba(255,240,200,0)");
          g.fillStyle = glow;
          g.fillRect(fx - 70, top - 92, 140, 140);
        }
      }
  }
  g.fillStyle = night ? "#2a2840" : "#5a5464";
  g.fillRect(0, base, W, Hh - base);
  for (let i = 0; i < crowd; i++) {
    const x = r() * W, y = base + 6 + r() * (Hh - base - 10);
    g.fillStyle = night ? "#4a6a4a" : "#6a7a6a";
    g.fillRect(x - 3, y, 6, 9);
    g.fillStyle = night ? "#6a8a6a" : "#9cb88c";
    g.beginPath();
    g.arc(x, y - 3, 4, 0, Math.PI * 2);
    g.fill();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
};

/**
 * One unlit mesh covering every pane (just inside the glass at `z`, facing in), the view texture spread across all
 * panes as if one picture lay behind the whole front (world x -12..12, flipped: looking out, +x is screen left).
 */
export const windowViews = (panes: [number, number][], tex: CanvasTexture, { z = 3.83, y0 = 0.9, y1 = 3.6, tint = "#ffffff" } = {}) => {
  const pos: number[] = [], uv: number[] = [];
  for (const [x0, x1] of panes)
    for (const [x, y] of [[x0, y0], [x1, y0], [x1, y1], [x0, y0], [x1, y1], [x0, y1]]) {
      pos.push(x, y, z);
      uv.push((12 - x) / 24, (y - y0) / (y1 - y0));
    }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute("uv", new BufferAttribute(new Float32Array(uv), 2));
  return new Mesh(geo, M(`view${tex.uuid}`, () => new MeshBasicMaterial({ map: tex, side: DoubleSide, color: tint })));
};
