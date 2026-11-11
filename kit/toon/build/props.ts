import { BoxGeometry, ConeGeometry, CylinderGeometry, PlaneGeometry, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { bricks, clockTex, doorTex, plaster, roofTiles, rng } from "../paint";
import { toonMaterial } from "../shade";
import { Kit, M, MAT, tiled } from "./kit";
import { signTex } from "./textures";

/** Street props. Each returns a Group with its origin on the ground; some also return a light or perch point. */

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
    k.add(MAT.winDark(), new BoxGeometry(0.9, 2.4, 0.12), (Math.sin(a) * s) / 2, h - 3, (Math.cos(a) * s) / 2, { ry: a });
    k.add(MAT.winLit(), new BoxGeometry(0.8, 1.3, 0.12), (Math.sin(a) * s) / 2, 6, (Math.cos(a) * s) / 2, { ry: a });
  }
  const cone = new ConeGeometry((s + 0.5) * Math.SQRT1_2, 6, 4, 1);
  cone.rotateY(Math.PI / 4);
  k.add(tiled("roof#5a4a6a", () => roofTiles("#5a4a6a")), cone, 0, h + 4.7 + 3, 0, { tile: true });
  k.box(MAT.metal(), 0.12, 1.6, 0.12, 0, h + 4.7 + 6.6, 0, true);
  k.box(wall, 1.6, 2.4, 0.4, 0, 1.2, s / 2 + 0.2);
  k.add(M("door#3e2a3a", () => toonMaterial({ map: doorTex("#3e2a3a") })), new BoxGeometry(1.2, 2.2, 0.1), 0, 1.1, s / 2 + 0.42);
  return k.build();
};

/** Street lamp, 3.9 m. `LAMP_HEAD` = lantern position (local) for its practical light. */
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
export const fence = (L: number, color?: string) => {
  const k = new Kit();
  const m = color ? MAT.color(color) : MAT.wood();
  for (const y of [0.35, 0.8]) k.box(m, L, 0.09, 0.05, L / 2, y, 0);
  for (let x = 0.1; x < L; x += 0.22) k.box(m, 0.1, 1.05, 0.04, x, 0.52, 0.05);
  return k.build();
};

export const bollard = () => {
  const k = new Kit();
  k.add(MAT.metal(), new CylinderGeometry(0.1, 0.12, 0.9, 10), 0, 0.45, 0);
  k.add(MAT.metal(), new CylinderGeometry(0.14, 0.14, 0.08, 10), 0, 0.92, 0);
  return k.build();
};

/** Two-wheeled hand cart, tipped onto its legs, with a few sacks. Along +x. */
export const cart = () => {
  const k = new Kit();
  k.box(MAT.wood(), 1.8, 0.1, 1.0, 0, 0.75, 0);
  for (const z of [-0.5, 0.5]) k.box(MAT.wood(), 1.8, 0.35, 0.06, 0, 0.95, z);
  for (const z of [-0.62, 0.62]) k.add(MAT.darkWood(), new TorusGeometry(0.42, 0.05, 6, 16), 0.2, 0.45, z);
  for (const z of [-0.35, 0.35]) k.box(MAT.darkWood(), 1.2, 0.07, 0.07, 1.4, 0.55, z); // shafts
  k.box(MAT.darkWood(), 0.07, 0.75, 0.07, -0.8, 0.37, 0);
  for (let i = 0; i < 3; i++) k.add(MAT.color("#c8b07a"), new SphereGeometry(0.26, 7, 5), -0.5 + i * 0.45, 1.02, (i % 2) * 0.2 - 0.1);
  return k.build();
};

/** Signpost with two pointing boards. */
export const signpost = (a = "STATION", b = "MARKET") => {
  const k = new Kit();
  k.box(MAT.darkWood(), 0.12, 2.6, 0.12, 0, 1.3, 0);
  for (const [i, t] of [a, b].entries()) {
    const m = M(`sp${t}`, () => toonMaterial({ map: signTex(t, "#5a3a26") }));
    k.add(m, new BoxGeometry(1.1, 0.26, 0.05), (i ? -1 : 1) * 0.5, 2.2 - i * 0.4, 0, { ry: i ? 0.4 : -0.3 });
  }
  return k.build();
};

/** Washing line between two local points (x along), with a few clothes hanging. */
export const washingLine = (L: number, h = 4.2) => {
  const k = new Kit();
  const sag = 0.35;
  for (let i = 0; i < 12; i++) {
    const x0 = (i / 12) * L, x1 = ((i + 1) / 12) * L;
    const y0 = h - sag * Math.sin((Math.PI * i) / 12), y1 = h - sag * Math.sin((Math.PI * (i + 1)) / 12);
    const seg = new CylinderGeometry(0.012, 0.012, Math.hypot(x1 - x0, y1 - y0), 4);
    seg.rotateZ(Math.PI / 2 + Math.atan2(y1 - y0, x1 - x0));
    k.add(MAT.metal(), seg, (x0 + x1) / 2, (y0 + y1) / 2, 0);
  }
  const cols = ["#e8e0d0", "#c8423a", "#3e6aa8", "#f2c84a", "#7a92c4"];
  for (let i = 1; i < 6; i++) {
    const x = (i / 6) * L, y = h - sag * Math.sin((Math.PI * i) / 6);
    const big = i % 2 === 0;
    k.box(MAT.color(cols[i % cols.length]), big ? 0.6 : 0.4, big ? 0.7 : 0.5, 0.03, x, y - (big ? 0.38 : 0.28), 0);
  }
  return k.build();
};

/** A small perched bird (dark, faces +x). */
export const bird = (seed = 1) => {
  const r = rng(seed);
  const k = new Kit();
  const m = MAT.color(r() < 0.5 ? "#2a2630" : "#4a3a3a");
  k.add(m, new SphereGeometry(0.09, 7, 5), 0, 0.09, 0);
  k.add(m, new SphereGeometry(0.055, 6, 4), 0.08, 0.17, 0);
  k.add(MAT.color("#d8a03a"), new ConeGeometry(0.02, 0.06, 4), 0.14, 0.17, 0, { rz: -Math.PI / 2 });
  k.box(m, 0.12, 0.02, 0.06, -0.12, 0.1, 0);
  return k.build();
};

/** Flag on a pole: two horizontal bands with a gentle wave baked in. */
export const flag = (a = "#c8423a", b = "#f2ece2", h = 3.2) => {
  const k = new Kit();
  k.add(MAT.metal(), new CylinderGeometry(0.035, 0.035, h, 6), 0, h / 2, 0);
  for (const [i, c] of [a, b].entries()) {
    const g = new PlaneGeometry(1.0, 0.3, 8, 1);
    const p = g.attributes.position;
    for (let v = 0; v < p.count; v++) p.setZ(v, Math.sin(p.getX(v) * 5) * 0.06 * (p.getX(v) + 0.5));
    g.computeVertexNormals();
    k.add(MAT.color(c), g, 0.52, h - 0.2 - i * 0.3, 0);
    k.add(MAT.color(c), g.clone().rotateY(Math.PI), 0.52, h - 0.2 - i * 0.3, -0.005);
  }
  return k.build();
};

/** Campfire / brazier: stones, logs and an emissive flame cone. Light it with a practical "fire". */
export const FIRE_HEAD = new Vector3(0, 0.6, 0);
export const campfire = () => {
  const k = new Kit();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.add(MAT.darkStone(), new SphereGeometry(0.13, 6, 4), Math.cos(a) * 0.45, 0.08, Math.sin(a) * 0.45);
  }
  for (const a of [0, 1.2, 2.4]) k.add(MAT.darkWood(), new BoxGeometry(0.8, 0.1, 0.1), 0, 0.14, 0, { ry: a });
  k.add(MAT.glow("#ffb04a", 5), new ConeGeometry(0.25, 0.7, 6), 0, 0.45, 0);
  k.add(MAT.glow("#ffe08a", 7), new ConeGeometry(0.12, 0.4, 5), 0.05, 0.4, 0.05);
  return k.build();
};

export const hayBale = () => {
  const k = new Kit();
  k.box(MAT.color("#d8b05a"), 1.0, 0.5, 0.55, 0, 0.25, 0);
  for (const x of [-0.25, 0.25]) k.box(MAT.color("#8a6a3a"), 0.03, 0.52, 0.57, x, 0.25, 0);
  return k.build();
};

export const waterTrough = () => {
  const k = new Kit();
  k.box(MAT.wood(), 2.0, 0.5, 0.6, 0, 0.45, 0);
  k.box(MAT.color("#4a6a8a"), 1.85, 0.05, 0.48, 0, 0.68, 0);
  for (const x of [-0.85, 0.85]) k.box(MAT.darkWood(), 0.1, 0.25, 0.6, x, 0.12, 0);
  return k.build();
};

/** Snowy fir: three stacked cones with snow caps. */
export const pine = (h = 5, snow = true) => {
  const k = new Kit();
  k.add(MAT.darkWood(), new CylinderGeometry(0.12, 0.15, h * 0.2, 6), 0, h * 0.1, 0);
  for (let i = 0; i < 3; i++) {
    const r = (h * 0.28) * (1 - i * 0.25), y = h * (0.3 + i * 0.22);
    k.add(MAT.color("#2a4a3e"), new ConeGeometry(r, h * 0.36, 8), 0, y, 0);
    if (snow) k.add(MAT.color("#eef2fa"), new ConeGeometry(r * 0.55, h * 0.16, 8), 0, y + h * 0.1, 0);
  }
  return k.build();
};

export const mailbox = () => {
  const k = new Kit();
  k.box(MAT.darkWood(), 0.1, 1.1, 0.1, 0, 0.55, 0);
  k.box(MAT.color("#3a5a8a"), 0.25, 0.25, 0.5, 0, 1.2, 0);
  k.box(MAT.color("#c8423a"), 0.03, 0.18, 0.05, 0.14, 1.32, 0.15);
  return k.build();
};

export const hedge = (L: number) => {
  const k = new Kit();
  k.box(MAT.color("#3e6a3a"), L, 1.0, 0.8, L / 2, 0.5, 0);
  for (let x = 0.4; x < L; x += 0.7) k.add(MAT.color("#4a7a42"), new SphereGeometry(0.42, 7, 5), x, 1.0, 0);
  return k.build();
};

/** Simple family car (boxy, toon colours), along +x. */
export const car = (color = "#c8423a") => {
  const k = new Kit();
  k.box(MAT.color(color), 4.0, 0.7, 1.75, 0, 0.65, 0);
  k.box(MAT.color(color), 2.2, 0.6, 1.6, -0.2, 1.3, 0);
  k.box(MAT.winDark(), 2.0, 0.45, 1.62, -0.2, 1.32, 0, false);
  for (const x of [-1.3, 1.3]) for (const z of [-0.85, 0.85]) k.add(MAT.color("#1e1c22"), new CylinderGeometry(0.34, 0.34, 0.22, 12), x, 0.34, z, { rx: Math.PI / 2 });
  k.box(MAT.glow("#ffe2a0", 1.5), 0.05, 0.16, 0.3, 2.02, 0.75, 0.6);
  k.box(MAT.glow("#ffe2a0", 1.5), 0.05, 0.16, 0.3, 2.02, 0.75, -0.6);
  return k.build();
};

export const trashBin = () => {
  const k = new Kit();
  k.add(MAT.color("#4a6a4a"), new CylinderGeometry(0.3, 0.26, 0.95, 10), 0, 0.48, 0);
  k.add(MAT.color("#3a5a3a"), new CylinderGeometry(0.33, 0.33, 0.08, 10), 0, 0.98, 0);
  return k.build();
};

// ---- supermarket interior

/** Checkout counter; its lane light only glows when the power is on. */
export const checkout = (lit = true) => {
  const k = new Kit();
  k.box(MAT.color("#e8e4e0"), 2.2, 0.9, 0.8, 0, 0.45, 0);
  k.box(MAT.color("#3a3438"), 1.6, 0.04, 0.5, -0.2, 0.92, 0);
  k.box(MAT.color("#3a3438"), 0.4, 0.35, 0.3, 0.8, 1.1, 0);
  k.box(lit ? MAT.glow("#ffd24a", 2) : MAT.color("#8a7a4a"), 0.2, 0.2, 0.2, 0.9, 1.9, 0);
  k.box(MAT.metal(), 0.04, 0.8, 0.04, 0.9, 1.5, 0);
  return k.build();
};

/** Hanging aisle sign. */
export const aisleSign = (text: string) => {
  const k = new Kit();
  k.add(M(`aisle${text}`, () => toonMaterial({ map: signTex(text, "#2a5a9a", "#ffffff") })), new BoxGeometry(1.6, 0.4, 0.05), 0, 0, 0);
  for (const x of [-0.6, 0.6]) k.box(MAT.metal(), 0.02, 0.8, 0.02, x, 0.6, 0);
  return k.build();
};
