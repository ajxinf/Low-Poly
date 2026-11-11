import {
  BoxGeometry,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Material,
  Mesh,
  Shape,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { bricks, clockTex, doorTex, planks, plaster, rng, roofTiles, rough, shopTex, windowTex } from "./paint";
import { toonMaterial } from "./shade";

/** World-metre box mapping: tiled paint keeps the same scale on every part (tiles are 2 m, so repeat .5). */
const boxUV = (g: BufferGeometry) => {
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const [ax, ay, az] = [Math.abs(n.getX(i)), Math.abs(n.getY(i)), Math.abs(n.getZ(i))];
    if (ay >= ax && ay >= az) uv.setXY(i, p.getX(i), p.getZ(i));
    else if (ax >= az) uv.setXY(i, p.getZ(i), p.getY(i));
    else uv.setXY(i, p.getX(i), p.getY(i));
  }
  return g;
};

/** Collects parts per material, then merges them into one shadowed mesh per material. */
class Kit {
  parts = new Map<Material, BufferGeometry[]>();
  add(mat: Material, g: BufferGeometry, x: number, y: number, z: number, o: { ry?: number; tile?: boolean } = {}) {
    let geo = g.index ? g.toNonIndexed() : g;
    if (o.ry) geo.rotateY(o.ry);
    geo.translate(x, y, z);
    if (o.tile) geo = boxUV(geo);
    const list = this.parts.get(mat) ?? [];
    list.push(geo);
    this.parts.set(mat, list);
  }
  box(mat: Material, w: number, h: number, d: number, x: number, y: number, z: number, tile = true) {
    this.add(mat, new BoxGeometry(w, h, d), x, y, z, { tile });
  }
  build() {
    const g = new Group();
    for (const [mat, list] of this.parts) {
      const m = new Mesh(mergeGeometries(list), mat);
      m.castShadow = m.receiveShadow = true;
      g.add(m);
    }
    return g;
  }
}

// Shared materials (one shader program, cached textures).
const memo = new Map<string, Material>();
const M = (key: string, make: () => Material) => memo.get(key) ?? (memo.set(key, make()), memo.get(key)!);
const tiled = (key: string, tex: () => ReturnType<typeof plaster>) => M(key, () => toonMaterial({ map: tex(), repeat: [0.5, 0.5] }));
export const MAT = {
  stone: () => M("stone", () => toonMaterial({ map: rough("#b3a492"), repeat: [1, 1] })),
  darkStone: () => M("darkStone", () => toonMaterial({ map: rough("#7d6f66"), repeat: [1, 1] })),
  metal: () => M("metal", () => toonMaterial({ map: rough("#3a3438"), repeat: [1, 1] })),
  wood: () => M("wood", () => toonMaterial({ map: planks("#80583a"), repeat: [1, 1] })),
  darkWood: () => M("darkWood", () => toonMaterial({ map: planks("#4e3426"), repeat: [1, 1] })),
  winLit: () => M("winLit", () => toonMaterial({ map: windowTex(true), emissive: ["#ffb76a", 2.6] })),
  winDark: () => M("winDark", () => toonMaterial({ map: windowTex(false) })),
  lampGlass: () => M("lampGlass", () => toonMaterial({ color: "#ffd18a", emissive: ["#ffb35a", 6] })),
};

export type BuildingSpec = {
  w: number;
  d: number;
  floors: number;
  wall: { kind: "brick" | "plaster"; color: string };
  roof?: string;
  shop?: string; // shop-front frame colour
  door?: string;
  seed: number;
  litRatio?: number;
};

const GROUND = 3.6, FLOOR = 3.0;
export const buildingHeight = (s: BuildingSpec) => GROUND + (s.floors - 1) * FLOOR + 0.4;

/** Terraced town house: front at +z, ground at y = 0, origin at the front-face centre line. */
export const building = (s: BuildingSpec) => {
  const k = new Kit();
  const r = rng(s.seed);
  const H = buildingHeight(s);
  const wall = tiled(`wall${s.wall.kind}${s.wall.color}`, () => (s.wall.kind === "brick" ? bricks(s.wall.color) : plaster(s.wall.color)));
  const fz = s.d / 2;
  k.box(wall, s.w, H, s.d, 0, H / 2, 0);
  k.box(MAT.darkStone(), s.w + 0.04, 0.7, s.d + 0.12, 0, 0.35, 0);
  k.box(MAT.stone(), s.w + 0.3, 0.32, s.d + 0.5, 0, H + 0.16, 0);
  k.box(MAT.stone(), s.w + 0.04, 0.18, s.d + 0.16, 0, GROUND, 0); // string course over the ground floor

  // Gable roof along the width.
  const pitch = 0.6, half = s.d / 2 + 0.3, rh = half * pitch;
  const sh = new Shape();
  sh.moveTo(-half, 0);
  sh.lineTo(half, 0);
  sh.lineTo(0, rh);
  sh.closePath();
  const roof = new ExtrudeGeometry(sh, { depth: s.w + 0.25, bevelEnabled: false });
  roof.rotateY(Math.PI / 2);
  roof.translate(-(s.w + 0.25) / 2, H + 0.32, 0);
  k.add(tiled(`roof${s.roof}`, () => roofTiles(s.roof)), roof, 0, 0, 0, { tile: true });

  const nb = Math.max(2, Math.floor(s.w / 2.1));
  const bay = s.w / nb;
  const lit = s.litRatio ?? 0.35;
  for (let f = 1; f < s.floors; f++) {
    const y0 = GROUND + (f - 1) * FLOOR + 0.75;
    for (let i = 0; i < nb; i++) {
      const x = -s.w / 2 + (i + 0.5) * bay;
      k.box(r() < lit ? MAT.winLit() : MAT.winDark(), 1.0, 1.55, 0.12, x, y0 + 0.775, fz, false);
      k.box(MAT.stone(), 1.32, 0.1, 0.26, x, y0 - 0.05, fz + 0.06);
      k.box(MAT.stone(), 1.24, 0.16, 0.12, x, y0 + 1.66, fz + 0.03);
    }
  }
  // Ground floor: shop front + door, or door + windows.
  const doorMat = M(`door${s.door}`, () => toonMaterial({ map: doorTex(s.door) }));
  if (s.shop) {
    const sw = s.w - 2.2;
    k.box(M(`shop${s.shop}`, () => toonMaterial({ map: shopTex(s.shop), emissive: ["#ffb76a", 2.2] })), sw, 2.1, 0.14, -s.w / 2 + 0.4 + sw / 2, 0.75 + 1.05, fz, false);
    k.box(M(`fascia${s.shop}`, () => toonMaterial({ map: rough(s.shop!), repeat: [1, 1] })), s.w - 0.2, 0.55, 0.22, 0, 3.15, fz + 0.06);
    k.box(doorMat, 1.1, 2.3, 0.12, s.w / 2 - 0.9, 1.15 + 0.1, fz, false);
  } else {
    const dx = (r() - 0.5) * (s.w - 2.4);
    k.box(doorMat, 1.1, 2.3, 0.12, dx, 1.25, fz, false);
    k.box(MAT.stone(), 1.5, 0.15, 0.5, dx, 0.075, fz + 0.2); // step
    for (let i = 0; i < nb; i++) {
      const x = -s.w / 2 + (i + 0.5) * bay;
      if (Math.abs(x - dx) < 1.4) continue;
      k.box(r() < lit ? MAT.winLit() : MAT.winDark(), 1.0, 1.55, 0.12, x, 1.0 + 0.775, fz, false);
      k.box(MAT.stone(), 1.32, 0.1, 0.26, x, 0.95, fz + 0.06);
    }
  }
  return k.build();
};

/** Clock tower landmark: square shaft, clock stage, pyramid roof. Origin at the base centre. */
export const clockTower = () => {
  const k = new Kit();
  const wall = tiled("towerBrick", () => bricks("#8e5644"));
  const s = 4.4, h = 17;
  k.box(MAT.darkStone(), s + 0.3, 1.2, s + 0.3, 0, 0.6, 0);
  k.box(wall, s, h, s, 0, h / 2, 0);
  k.box(MAT.stone(), s + 0.4, 0.4, s + 0.4, 0, h + 0.2, 0);
  k.box(tiled("towerPlaster", () => plaster("#d8c4a0")), s - 0.4, 4, s - 0.4, 0, h + 2.4, 0);
  k.box(MAT.stone(), s + 0.1, 0.35, s + 0.1, 0, h + 4.55, 0);
  const face = M("clockFace", () => toonMaterial({ map: clockTex(), emissive: ["#ffd9a0", 0.9] }));
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    k.add(face, new BoxGeometry(2.5, 2.5, 0.16), Math.sin(a) * (s / 2 - 0.12), h + 2.4, Math.cos(a) * (s / 2 - 0.12), { ry: a });
    // Arched belfry slots below the clock.
    k.add(MAT.winDark(), new BoxGeometry(0.9, 2.4, 0.12), Math.sin(a) * s / 2, h - 3, Math.cos(a) * s / 2, { ry: a });
    k.add(MAT.winLit(), new BoxGeometry(0.8, 1.3, 0.12), Math.sin(a) * s / 2, 6, Math.cos(a) * s / 2, { ry: a });
  }
  const cone = new ConeGeometry((s + 0.5) * Math.SQRT1_2, 6, 4, 1);
  cone.rotateY(Math.PI / 4);
  k.add(tiled("roof#5a4a6a", () => roofTiles("#5a4a6a")), cone, 0, h + 4.7 + 3, 0, { tile: true });
  k.box(MAT.metal(), 0.12, 1.6, 0.12, 0, h + 4.7 + 6.6, 0, true);
  k.box(wall, 1.6, 2.4, 0.4, 0, 1.2, s / 2 + 0.2); // door surround
  k.add(M("door#3e2a3a", () => toonMaterial({ map: doorTex("#3e2a3a") })), new BoxGeometry(1.2, 2.2, 0.1), 0, 1.1, s / 2 + 0.42);
  return k.build();
};

/** Street lamp, 3.9 m. Returns the group and the lantern position (local) for its light pool. */
export const LAMP_HEAD = new Vector3(0.55, 3.55, 0);
export const lampPost = () => {
  const k = new Kit();
  k.add(MAT.metal(), new CylinderGeometry(0.16, 0.2, 0.5, 10), 0, 0.25, 0);
  k.add(MAT.metal(), new CylinderGeometry(0.06, 0.08, 3.8, 10), 0, 2.15, 0);
  k.box(MAT.metal(), 0.75, 0.06, 0.06, 0.32, 3.95, 0);
  k.add(MAT.metal(), new ConeGeometry(0.32, 0.25, 4), 0.55, 3.88, 0, { ry: Math.PI / 4 });
  k.add(MAT.lampGlass(), new CylinderGeometry(0.2, 0.14, 0.42, 4), 0.55, 3.55, 0, { ry: Math.PI / 4 });
  k.add(MAT.metal(), new CylinderGeometry(0.1, 0.1, 0.06, 6), 0.55, 3.31, 0);
  return k.build();
};

export const crate = (sz = 0.8) => {
  const k = new Kit();
  k.box(MAT.wood(), sz, sz, sz, 0, sz / 2, 0);
  for (const y of [0.05, sz - 0.05]) for (const z of [-1, 1]) k.box(MAT.darkWood(), sz + 0.04, 0.09, 0.05, 0, y, (z * (sz + 0.02)) / 2);
  for (const y of [0.05, sz - 0.05]) for (const x of [-1, 1]) k.box(MAT.darkWood(), 0.05, 0.09, sz + 0.04, (x * (sz + 0.02)) / 2, y, 0);
  return k.build();
};

export const barrel = () => {
  const k = new Kit();
  k.add(MAT.wood(), new CylinderGeometry(0.36, 0.36, 1.0, 14), 0, 0.5, 0);
  for (const y of [0.15, 0.85]) k.add(MAT.metal(), new CylinderGeometry(0.375, 0.375, 0.07, 14), 0, y, 0);
  return k.build();
};

export const bench = () => {
  const k = new Kit();
  k.box(MAT.wood(), 1.8, 0.07, 0.45, 0, 0.48, 0);
  k.box(MAT.wood(), 1.8, 0.4, 0.06, 0, 0.82, -0.22);
  for (const x of [-0.75, 0.75]) {
    k.box(MAT.metal(), 0.07, 0.48, 0.45, x, 0.24, 0);
    k.box(MAT.metal(), 0.07, 0.45, 0.07, x, 0.75, -0.22);
  }
  return k.build();
};

/** Picket fence along +x, length L. */
export const fence = (L: number) => {
  const k = new Kit();
  for (const y of [0.35, 0.8]) k.box(MAT.wood(), L, 0.09, 0.05, L / 2, y, 0);
  for (let x = 0.1; x < L; x += 0.22) k.box(MAT.wood(), 0.1, 1.05, 0.04, x, 0.52, 0.05);
  return k.build();
};

export const bollard = () => {
  const k = new Kit();
  k.add(MAT.metal(), new CylinderGeometry(0.1, 0.12, 0.9, 10), 0, 0.45, 0);
  k.add(MAT.metal(), new CylinderGeometry(0.14, 0.14, 0.08, 10), 0, 0.92, 0);
  return k.build();
};
