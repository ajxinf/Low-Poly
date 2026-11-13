import { BoxGeometry, BufferGeometry, CylinderGeometry, ExtrudeGeometry, Float32BufferAttribute, Group, Shape, SphereGeometry, Vector3 } from "three";
import { bricks, doorTex, plaster, planks, rng, roofTiles, rough, shopTex } from "../paint";
import { PracticalKind, toonMaterial } from "../shade";
import { Kit, M, MAT, tiled } from "./kit";
import { ashlar, awningTex, posterTex, siding, signTex, windowLook, WindowLook } from "./textures";
import { Facts } from "./variety";

/**
 * Building generator. A spec fixes floors, width, walls, roof type and colour, lean (+-1.5 deg), roofline
 * irregularity, window styles, shop front (painted sign, awning), chimneys (with smoke), drainpipe, posters, porch.
 * Origin: centre of the footprint at ground level, front face at +z (z = d/2).
 */
export type WallKind = "brick" | "plaster" | "clapboard" | "stone" | "planks";
export type RoofType = "gable" | "gableFront" | "hip" | "flat" | "falseFront" | "steep";
export type WindowStyle = "sash" | "shutters" | "flowerBox" | "boarded" | "broken";

export type BuildingSpec = {
  w: number;
  d: number;
  floors: number;
  wall: { kind: WallKind; color: string };
  trim: string;
  roof: { type: RoofType; color: string; snow?: boolean };
  /** Sideways lean, degrees (+-1.5). */
  lean: number;
  /** 0..1: cornice height jitter, roof pitch, dormers, stepped parapets. */
  roofline: number;
  windows: { styles: WindowStyle[]; lit: number; shutter: string; curtain: string };
  shop?: { frame: string; sign: string; awning?: [string, string] };
  door: string;
  chimneys: number;
  drainpipe: boolean;
  posters: number;
  porch?: boolean;
  seed: number;
};

/** The facts compared by the street variety rule (>= 3 must differ between any two buildings). */
export const specFacts = (s: BuildingSpec): Facts => ({
  floors: s.floors,
  width: Math.round(s.w),
  wall: s.wall.kind,
  color: s.wall.color,
  roof: s.roof.type,
  roofColor: s.roof.color,
  windows: s.windows.styles.join(","),
  shop: !!s.shop,
  awning: !!s.shop?.awning,
  chimneys: s.chimneys,
  lean: Math.sign(Math.round(s.lean)),
  roofline: Math.round(s.roofline * 2),
  porch: !!s.porch,
});

const GROUND = 3.6, FLOOR = 3.0;
export const buildingHeight = (s: BuildingSpec) => GROUND + (s.floors - 1) * FLOOR + 0.4 + (s.roofline - 0.5) * 0.6;

const wallMat = (w: BuildingSpec["wall"]) =>
  tiled(`wall${w.kind}${w.color}`, () =>
    w.kind === "brick" ? bricks(w.color) : w.kind === "plaster" ? plaster(w.color) : w.kind === "clapboard" ? siding(w.color) : w.kind === "stone" ? ashlar(w.color) : planks(w.color),
  );
const roofMat = (r: BuildingSpec["roof"]) => (r.snow ? tiled("roofSnow", () => rough("#eef2fa")) : tiled(`roof${r.color}`, () => roofTiles(r.color)));

/** Prism along x: triangle (half-depth `half`, height `h`) extruded over length L, centred on x = 0. */
const prismX = (L: number, half: number, h: number) => {
  const sh = new Shape();
  sh.moveTo(-half, 0);
  sh.lineTo(half, 0);
  sh.lineTo(0, h);
  sh.closePath();
  const g = new ExtrudeGeometry(sh, { depth: L, bevelEnabled: false });
  g.rotateY(Math.PI / 2);
  g.translate(-L / 2, 0, 0);
  return g;
};

/** Hip roof over a w x d footprint (w >= d): ridge along x. Flat-shaded, non-indexed. */
const hipRoof = (w: number, d: number, h: number) => {
  const x = w / 2, z = d / 2, rx = Math.max(x - z, 0.01);
  const A = [-x, 0, z], B = [x, 0, z], C = [x, 0, -z], D = [-x, 0, -z], P = [-rx, h, 0], Q = [rx, h, 0];
  const tris = [A, B, Q, A, Q, P, C, D, P, C, P, Q, B, C, Q, D, A, P];
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(tris.flat(), 3));
  g.computeVertexNormals();
  return g;
};

export type Built = { group: Group; height: number; chimneys: Vector3[]; lights: { pos: Vector3; kind: PracticalKind }[]; perches: Vector3[] };

export const building = (s: BuildingSpec): Built => {
  const k = new Kit();
  const r = rng(s.seed);
  const H = buildingHeight(s);
  const wall = wallMat(s.wall);
  const trim = MAT.color(s.trim);
  const fz = s.d / 2;
  const chimneys: Vector3[] = [], lights: Built["lights"] = [], perches: Vector3[] = [];

  k.box(wall, s.w, H, s.d, 0, H / 2, 0);
  k.box(MAT.darkStone(), s.w + 0.04, 0.6, s.d + 0.1, 0, 0.3, 0); // plinth
  if (s.wall.kind !== "planks" && s.wall.kind !== "clapboard") k.box(trim, s.w + 0.04, 0.16, s.d + 0.14, 0, GROUND, 0); // string course
  else for (const x of [-1, 1]) k.box(trim, 0.16, H, 0.16, (x * (s.w - 0.1)) / 2, H / 2, fz); // corner boards

  // ---- roof
  const rt = s.roof.type, roof = roofMat(s.roof);
  const pitch = rt === "steep" ? 1.15 : 0.45 + 0.35 * s.roofline;
  if (rt === "gable" || rt === "steep") {
    const half = s.d / 2 + 0.35, rh = half * pitch;
    k.box(trim, s.w + 0.3, 0.3, s.d + 0.5, 0, H + 0.15, 0); // cornice
    k.add(roof, prismX(s.w + 0.3, half, rh), 0, H + 0.3, 0, { tile: true });
    perches.push(new Vector3(0, H + 0.3 + rh, 0));
    if (s.roofline > 0.6 && rt === "gable") {
      // Dormer on the front slope.
      const dx = (r() - 0.5) * (s.w - 2.5);
      k.box(wall, 1.3, 1.2, 1.2, dx, H + 0.3 + rh * 0.35 + 0.6, fz - 0.9);
      k.box(MAT.winDark(), 0.7, 0.8, 0.05, dx, H + 0.3 + rh * 0.35 + 0.6, fz - 0.28, false);
      k.add(roof, prismX(1.5, 0.75, 0.6), dx, H + 0.3 + rh * 0.35 + 1.2, fz - 0.9, { ry: Math.PI / 2, tile: true });
    }
  } else if (rt === "gableFront") {
    const half = s.w / 2 + 0.3, rh = half * pitch;
    k.add(roof, prismX(s.d + 0.4, half, rh), 0, H, 0, { ry: Math.PI / 2, tile: true });
    k.add(wall, prismX(0.1, s.w / 2, (s.w / 2) * pitch), 0, H, fz - 0.05, { ry: Math.PI / 2, tile: true }); // gable end
    k.box(MAT.winDark(), 0.8, 1.0, 0.06, 0, H + (s.w / 2) * pitch * 0.38, fz + 0.01, false);
    perches.push(new Vector3(0, H + rh, fz));
  } else if (rt === "hip") {
    const rh = (s.d / 2 + 0.3) * pitch;
    k.box(trim, s.w + 0.3, 0.25, s.d + 0.4, 0, H + 0.12, 0);
    k.add(roof, hipRoof(s.w + 0.6, s.d + 0.6, rh), 0, H + 0.25, 0, { tile: true });
    perches.push(new Vector3(0, H + 0.25 + rh, 0));
  } else {
    // Flat roof with a parapet; falseFront adds a tall front board with a stepped top (wild west).
    const steps = rt === "falseFront" ? 1.6 + s.roofline * 1.4 : 0.5 + s.roofline * 0.6;
    k.box(trim, s.w + 0.2, 0.25, s.d + 0.3, 0, H + 0.12, 0);
    k.box(rt === "falseFront" ? wall : trim, s.w, steps, 0.25, 0, H + steps / 2, fz - 0.1);
    if (s.roofline > 0.4) k.box(rt === "falseFront" ? wall : trim, s.w * 0.45, 0.6, 0.25, 0, H + steps + 0.3, fz - 0.1);
    k.box(trim, s.w + 0.2, 0.18, 0.4, 0, H + steps + (s.roofline > 0.4 ? 0.6 : 0) + 0.09, fz - 0.1);
    perches.push(new Vector3(0, H + steps + (s.roofline > 0.4 ? 0.7 : 0.1), fz - 0.1));
  }

  // ---- chimneys (smoke rises from their tops)
  for (let i = 0; i < s.chimneys; i++) {
    const cx = (i === 0 ? -1 : 1) * (s.w / 2 - 0.8 - r() * 0.6), ch = 1.4 + r() * 0.8, cz = -s.d * 0.15;
    const base = rt === "flat" || rt === "falseFront" ? H : H + 0.3 + (s.d / 2 + 0.35) * pitch * 0.55;
    k.box(s.wall.kind === "brick" ? wall : MAT.color("#7a5a4a"), 0.6, ch + 1, 0.6, cx, base + (ch - 1) / 2 + 0.5, cz);
    k.box(trim, 0.75, 0.14, 0.75, cx, base + ch + 0.07, cz);
    chimneys.push(new Vector3(cx, base + ch + 0.2, cz));
  }

  // ---- windows
  const nb = Math.max(2, Math.floor(s.w / 2.1)), bay = s.w / nb;
  const winMat = (look: WindowLook) =>
    M(`w${look}${s.trim}${s.windows.curtain}`, () => toonMaterial({ map: windowLook(look, s.trim, s.windows.curtain), emissive: look.startsWith("lit") ? ["#ffb76a", 1.4] : undefined }));
  const windowAt = (x: number, y0: number) => {
    const style = s.windows.styles[Math.floor(r() * s.windows.styles.length)];
    const lit = style !== "boarded" && style !== "broken" && r() < s.windows.lit;
    const look: WindowLook = style === "boarded" ? "boarded" : style === "broken" ? "broken" : lit ? (r() < 0.3 ? "litFigure" : "lit") : "dark";
    k.box(winMat(look), 1.0, 1.55, 0.12, x, y0 + 0.775, fz, false);
    k.box(trim, 1.32, 0.1, 0.26, x, y0 - 0.05, fz + 0.06); // sill
    k.box(trim, 1.24, 0.16, 0.12, x, y0 + 1.66, fz + 0.03); // lintel
    if (style === "shutters")
      for (const sx of [-1, 1]) k.box(MAT.color(s.windows.shutter), 0.5, 1.6, 0.06, x + sx * 0.8, y0 + 0.78, fz + 0.05);
    if (style === "flowerBox") {
      k.box(MAT.color(s.windows.shutter), 1.2, 0.26, 0.3, x, y0 - 0.2, fz + 0.18);
      for (let i = 0; i < 6; i++)
        k.add(MAT.color(["#d8484a", "#f2c84a", "#e87ab0", "#f2ece2"][i % 4]), new SphereGeometry(0.09, 6, 4), x - 0.5 + i * 0.2, y0 + 0.0, fz + 0.2 + (r() - 0.5) * 0.1);
      for (let i = 0; i < 5; i++) k.add(MAT.color("#4a7a3a"), new SphereGeometry(0.1, 5, 4), x - 0.45 + i * 0.22, y0 - 0.06, fz + 0.26);
    }
    if (lit) lights.push({ pos: new Vector3(x, y0 + 0.8, fz + 0.7), kind: "window" });
  };
  for (let f = 1; f < s.floors; f++) for (let i = 0; i < nb; i++) windowAt(-s.w / 2 + (i + 0.5) * bay, GROUND + (f - 1) * FLOOR + 0.75);

  // ---- ground floor: shop front (window, painted sign, awning) or door + windows
  const doorMat = M(`door${s.door}`, () => toonMaterial({ map: doorTex(s.door) }));
  if (s.shop) {
    const sw = s.w - 2.2;
    k.box(M(`shop${s.shop.frame}`, () => toonMaterial({ map: shopTex(s.shop!.frame), emissive: ["#ffb76a", 2.2] })), sw, 2.1, 0.14, -s.w / 2 + 0.4 + sw / 2, 1.8, fz, false);
    k.box(M(`sign${s.shop.sign}${s.shop.frame}`, () => toonMaterial({ map: signTex(s.shop!.sign, s.shop!.frame) })), s.w - 0.2, 0.6, 0.22, 0, 3.15, fz + 0.06, false);
    k.box(doorMat, 1.1, 2.3, 0.12, s.w / 2 - 0.9, 1.25, fz, false);
    if (s.shop.awning) {
      const aw = M(`awn${s.shop.awning.join()}`, () => toonMaterial({ map: awningTex(...s.shop!.awning!) }));
      k.add(aw, new BoxGeometry(sw + 0.3, 0.05, 1.3), -s.w / 2 + 0.4 + sw / 2, 2.55, fz + 0.6, { rx: 0.38 });
    }
    lights.push({ pos: new Vector3(-s.w / 2 + 0.4 + sw / 2, 1.9, fz + 0.9), kind: "shop" });
  } else {
    const dx = (r() - 0.5) * (s.w - 2.4);
    k.box(doorMat, 1.1, 2.3, 0.12, dx, 1.25, fz, false);
    k.box(MAT.stone(), 1.5, 0.15, 0.5, dx, 0.075, fz + 0.2); // step
    for (let i = 0; i < nb; i++) {
      const x = -s.w / 2 + (i + 0.5) * bay;
      if (Math.abs(x - dx) > 1.4) windowAt(x, 1.0);
    }
  }

  // ---- drainpipe, posters, porch
  if (s.drainpipe) {
    const px = (s.seed % 2 ? 1 : -1) * (s.w / 2 - 0.15);
    k.add(MAT.metal(), new CylinderGeometry(0.06, 0.06, H, 6), px, H / 2, fz + 0.1);
    k.box(MAT.metal(), 0.24, 0.24, 0.24, px, H - 0.1, fz + 0.12);
  }
  for (let i = 0; i < s.posters; i++) {
    const px = (r() - 0.5) * (s.w - 1.2);
    k.add(M(`poster${s.seed + i}`, () => toonMaterial({ map: posterTex(s.seed + i, ["WANTED", "SALE", "CIRCUS", "LOST CAT"][(s.seed + i) % 4]) })), new BoxGeometry(0.55, 0.75, 0.01), px, 1.7 + r() * 0.3, fz + 0.02, { rz: (r() - 0.5) * 0.08 });
  }
  if (s.porch) {
    const pd = 1.8;
    k.box(MAT.wood(), s.w, 0.3, pd, 0, 0.15, fz + pd / 2);
    for (const x of [-s.w / 2 + 0.2, 0, s.w / 2 - 0.2]) k.box(MAT.darkWood(), 0.14, 2.9, 0.14, x, 1.6, fz + pd - 0.15);
    k.box(roof, s.w + 0.2, 0.12, pd + 0.3, 0, 3.08, fz + pd / 2, true);
  }

  const group = k.build();
  const pivot = new Group().add(group);
  pivot.rotation.z = (s.lean * Math.PI) / 180;
  return { group: pivot, height: H, chimneys, lights, perches };
};
