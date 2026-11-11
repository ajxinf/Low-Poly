import { BoxGeometry, BufferGeometry, Float32BufferAttribute, Group, Material, Mesh } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { planks, rough, windowTex } from "../paint";
import { toonMaterial } from "../shade";

/** World-metre box mapping: tiled paint keeps the same scale on every part (tiles are 2 m, so repeat .5). */
export const boxUV = (g: BufferGeometry) => {
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
export class Kit {
  parts = new Map<Material, BufferGeometry[]>();
  add(mat: Material, g: BufferGeometry, x: number, y: number, z: number, o: { ry?: number; rx?: number; rz?: number; tile?: boolean } = {}) {
    let geo = g.index ? g.toNonIndexed() : g;
    if (!geo.attributes.normal) geo.computeVertexNormals();
    if (!geo.attributes.uv) withUV(geo);
    if (o.rx) geo.rotateX(o.rx);
    if (o.rz) geo.rotateZ(o.rz);
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
      const m = new Mesh(mergeGeometries(list.map((x) => (x.attributes.uv ? x : withUV(x)))), mat);
      m.castShadow = m.receiveShadow = true;
      g.add(m);
    }
    return g;
  }
}

/** Geometry without uvs (custom roofs) gets zero uvs so it merges with the rest. */
const withUV = (g: BufferGeometry) => {
  g.setAttribute("uv", new Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  return g;
};

// Shared materials (one shader program, cached textures).
const memo = new Map<string, Material>();
export const M = (key: string, make: () => Material) => memo.get(key) ?? (memo.set(key, make()), memo.get(key)!);
/** A 2 m tiled painted material, cached by key. */
export const tiled = (key: string, tex: () => ReturnType<typeof rough>) => M(key, () => toonMaterial({ map: tex(), repeat: [0.5, 0.5] }));
export const MAT = {
  stone: () => M("stone", () => toonMaterial({ map: rough("#b3a492"), repeat: [1, 1] })),
  darkStone: () => M("darkStone", () => toonMaterial({ map: rough("#7d6f66"), repeat: [1, 1] })),
  metal: () => M("metal", () => toonMaterial({ map: rough("#3a3438"), repeat: [1, 1] })),
  wood: () => M("wood", () => toonMaterial({ map: planks("#80583a"), repeat: [1, 1] })),
  darkWood: () => M("darkWood", () => toonMaterial({ map: planks("#4e3426"), repeat: [1, 1] })),
  winLit: () => M("winLit", () => toonMaterial({ map: windowTex(true), emissive: ["#ffb76a", 2.6] })),
  winDark: () => M("winDark", () => toonMaterial({ map: windowTex(false) })),
  lampGlass: () => M("lampGlass", () => toonMaterial({ color: "#ffd18a", emissive: ["#ffb35a", 6] })),
  color: (c: string) => M(`col${c}`, () => toonMaterial({ map: rough(c), repeat: [1, 1] })),
  glow: (c: string, k: number) => M(`glow${c}${k}`, () => toonMaterial({ color: c, emissive: [c, k] })),
};
