import {
  BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, ConeGeometry, DoubleSide, CylinderGeometry, Group, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry,
  SRGBColorSpace, SphereGeometry, TorusGeometry, Vector3,
} from "three";
import { Kit, M, MAT } from "../../../kit/toon/build/kit";
import { StreetOpts, spine } from "../../../kit/toon/build/street";
import { signTex } from "../../../kit/toon/build/textures";
import { glowSprite } from "../../../kit/toon/glow";
import { rng } from "../../../kit/toon/paint";

/**
 * World for zombie-supermarket-30-days. Two sets:
 * EXT  a small-town main street (`modern_main_street`, straight, `at(s, x, y)` = (x, y, -s)). Left (x < 0): the
 *      FRESHMART supermarket front (s 19-43) with its loading dock and ramp at s 32, pointing straight across the
 *      road at CHAD'S HARDWARE (right, s 27-37): a hollow storefront behind a steel roll-up shutter, Chad on the flat
 *      roof (y 6) with his generator, fuel cans and two floodlights.
 * INT  the supermarket inside (`supermarket_dark_day` / `supermarket_abandoned`, `IN(s, x, y)` = (x, y, -s), front
 *      windows at s -4): the toy mountain by the front window, the hedgehog cart, Dave's pallet, the tally chart.
 */
export const SP = spine(0);
export const at = SP.at;
export const IN = (s: number, x: number, y = 0) => new Vector3(x, y, -s);

export const FRONT = 6.1; // building fronts (modern_main_street: road 3.4 + walk 2.7)
export const DOCK = { s: 32, w: 3.2, h: 3.0, floor: 1.2, landing: 0.9, run: 3.1 };
export const CHAD = { s0: 27, s1: 37, s: 32, depth: 10, h: 6, shutterW: 5, shutterH: 3.4, recess: 3 };
/** Chad's spot on his roof (facing the street) and the generator beside him. */
export const ROOF_Y = CHAD.h;
export const CHAD_ROOF = at(CHAD.s + 0.4, FRONT + 0.6, ROOF_Y); // near the edge: a low angle from the street still sees his legs
export const GENERATOR = at(CHAD.s - 2.4, FRONT + 1.6, ROOF_Y);
export const FLOODS = [at(CHAD.s0 + 0.6, FRONT + 0.4, ROOF_Y + 1.6), at(CHAD.s1 - 0.6, FRONT + 0.4, ROOF_Y + 1.6)];
/** Inside Chad's doorway (pyjama reveal). */
export const CHAD_DOOR = at(CHAD.s + 0.3, FRONT + 1.3, 0.04); // on the shop floor slab (0.04)
/** Top of the ramp (cart on the landing) and where the ramp meets the road. */
export const RAMP_TOP = at(DOCK.s, -FRONT + DOCK.landing / 2, DOCK.floor);
export const RAMP_FOOT = at(DOCK.s, -FRONT + DOCK.landing + DOCK.run, 0.02);
export const SHUTTER_AT = at(CHAD.s, FRONT - 0.06, 0);
/** Chad's grill on the roof (just behind and beside where he stands). */
export const GRILL = at(CHAD.s - 0.8, FRONT + 1.4, 0);

const named = (o: Object3D, name: string, p: Vector3, door?: number) => {
  o.position.copy(p);
  o.userData.collider = name;
  if (door) o.userData.door = door;
  return o;
};
/** Unlit sign face (readability rule: lit signs go grey from the side). */
const signFace = (text: string, bg: string, fg: string, w: number, h: number) =>
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
const scrawl = (lines: string[], bg: string, ink: string, w: number, h: number) =>
  new Mesh(new PlaneGeometry(w, h), M(`scrawl${lines.join("|")}`, () => new MeshBasicMaterial({ map: scrawlTex(lines, bg, ink) })));

// ---------------------------------------------------------------- EXT: the supermarket front with the dock

/** FRESHMART front: local origin on the facade line at the building's middle (s 31), local +x = toward the street. */
const supermarketFront = () => {
  const k = new Kit(), D = 14, L = 24, H = 6.5;
  const wall = MAT.color("#dcd0b8"), trim = MAT.color("#2f8f86"), dark = MAT.color("#221e2a");
  const zDock = -(DOCK.s - 31); // dock centre in local z
  // Body behind the facade, split around the dock bay (open front, dark inside).
  const bay = { z0: zDock - DOCK.w / 2, z1: zDock + DOCK.w / 2 };
  k.box(wall, D, H, L / 2 - bay.z1, -D / 2, H / 2, (L / 2 + bay.z1) / 2);
  k.box(wall, D, H, bay.z0 + L / 2, -D / 2, H / 2, (bay.z0 - L / 2) / 2);
  k.box(wall, D - 2.5, H, DOCK.w, -2.5 - (D - 2.5) / 2, H / 2, zDock); // behind the bay
  k.box(wall, 2.5, H - DOCK.floor - DOCK.h, DOCK.w, -1.25, DOCK.floor + DOCK.h + (H - DOCK.floor - DOCK.h) / 2, zDock); // lintel
  k.box(MAT.darkStone(), 2.5, DOCK.floor, DOCK.w, -1.25, DOCK.floor / 2, zDock); // bay floor block
  k.box(dark, 0.1, DOCK.h, DOCK.w, -2.45, DOCK.floor + DOCK.h / 2, zDock); // the dark store beyond
  k.box(MAT.metal(), 0.5, 0.35, DOCK.w + 0.2, -0.3, DOCK.floor + DOCK.h - 0.18, zDock); // rolled-up dock door
  // Landing and ramp out to the road (pointing at Chad's door).
  k.box(MAT.darkStone(), DOCK.landing, DOCK.floor, DOCK.w, DOCK.landing / 2, DOCK.floor / 2, zDock);
  const len = Math.hypot(DOCK.run, DOCK.floor - 0.02), ang = Math.atan2(DOCK.floor - 0.02, DOCK.run);
  k.add(MAT.metal(), new BoxGeometry(len, 0.1, DOCK.w - 0.4), DOCK.landing + DOCK.run / 2, (DOCK.floor + 0.02) / 2 - 0.04, zDock, { rz: -ang });
  for (const dz of [-(DOCK.w / 2 - 0.15), DOCK.w / 2 - 0.15]) {
    k.add(MAT.color("#e2b23a"), new BoxGeometry(len, 0.06, 0.08), DOCK.landing + DOCK.run / 2, (DOCK.floor + 0.02) / 2 + 0.75, zDock + dz, { rz: -ang }); // yellow rails
    for (const t of [0.15, 0.55, 0.92]) {
      const x = DOCK.landing + DOCK.run * t, y = DOCK.floor - (DOCK.floor - 0.02) * t;
      k.box(MAT.color("#e2b23a"), 0.06, 0.8, 0.06, x, y + 0.4, zDock + dz);
    }
  }
  // Shop windows (dim store behind the glass), sign band, entrance doors (boarded), posters.
  const glass = M("fmGlass", () => new MeshBasicMaterial({ color: "#39404e" }));
  for (const [z0, z1] of [[8.2, 11.4], [4.6, 7.4], [-7.6, -4.4], [-11.4, -8.4]]) {
    k.box(trim, 0.22, 2.9, z1 - z0 + 0.3, 0.05, 0.55 + 1.45, (z0 + z1) / 2);
    k.add(glass, new BoxGeometry(0.06, 2.5, z1 - z0), 0.17, 0.75 + 1.25, (z0 + z1) / 2);
    for (let z = z0 + 0.4; z < z1 - 0.2; z += 0.55) k.box(MAT.wood(), 0.06, 0.18, 0.5, 0.21, 0.9 + ((z * 7) % 1.6), z); // boards nailed across
  }
  k.box(trim, 0.3, 1.2, L, 0.1, 5.5, 0);
  k.box(MAT.darkWood(), 0.12, 2.6, 2.0, 0.08, 1.3, 1.9); // entrance (barricaded)
  for (const y of [0.6, 1.2, 1.9]) k.box(MAT.wood(), 0.1, 0.2, 2.4, 0.16, y, 1.9);
  const g = k.build();
  const sign = signFace("FRESHMART", "#2f8f86", "#fff6e8", 7, 1.0);
  sign.position.set(0.27, 5.5, 4.5);
  sign.rotation.y = Math.PI / 2;
  const load = signFace("LOADING", "#e2b23a", "#2a2226", 2.2, 0.45);
  load.position.set(0.02, DOCK.floor + DOCK.h + 0.35, zDock);
  load.rotation.y = Math.PI / 2;
  g.add(sign, load);
  return g;
};

// ---------------------------------------------------------------- EXT: Chad's hardware store

/** CHAD'S HARDWARE: local origin on the facade line at s 32, local +x = into the store (away from the street). */
const chadStore = () => {
  const k = new Kit(), { depth: D, h: H, shutterW: SW, shutterH: SH, recess: R } = CHAD, L = CHAD.s1 - CHAD.s0;
  const brick = MAT.color("#8e5446"), trim = MAT.color("#3a3a46"), concrete = MAT.color("#a8a090");
  k.box(brick, D - R, H, L, R + (D - R) / 2, H / 2, 0); // back block
  for (const sz of [-1, 1]) k.box(brick, R, H, L / 2 - SW / 2, R / 2, H / 2, sz * (SW / 2 + (L / 2 - SW / 2) / 2)); // side piers
  k.box(brick, R, H - SH, SW, R / 2, SH + (H - SH) / 2, 0); // over the opening
  k.box(concrete, R, 0.04, SW, R / 2, 0.02, 0); // shop floor
  // Inside the recess: pegboard back wall full of tools, a counter, a stack of paint tins.
  k.box(MAT.color("#c8a878"), 0.06, SH, SW, R - 0.04, SH / 2, 0);
  const tool = [MAT.color("#c8302e"), MAT.color("#3a6aa8"), MAT.color("#e2b23a"), MAT.metal()];
  const r = rng(77);
  for (let i = 0; i < 26; i++) k.box(tool[i % 4], 0.05, 0.2 + r() * 0.3, 0.08 + r() * 0.2, R - 0.1, 1.0 + r() * 2.1, -SW / 2 + 0.4 + r() * (SW - 0.8));
  k.box(MAT.wood(), 0.7, 1.0, 1.8, R - 0.6, 0.5, 1.3);
  // Roof: coping along the front, roof hatch, the generator, fuel cans are props (story counts them down).
  k.box(trim, 0.25, 0.18, L, 0.12, H + 0.09, 0);
  // Fortress dressing (pilot critique: "never shown as a fortress"): barbed wire along the roof edge, sandbags by the
  // door. Chad stands 0.45 m behind the wire.
  for (let z = -L / 2 + 0.3; z <= L / 2 - 0.3; z += 1.2) k.add(MAT.metal(), new CylinderGeometry(0.02, 0.02, 0.5, 5), 0.15, H + 0.25, z);
  for (let z = -L / 2 + 0.3; z <= L / 2 - 0.3; z += 0.14) k.add(MAT.color("#8a8e98"), new TorusGeometry(0.13, 0.012, 4, 10), 0.15, H + 0.33, z, { ry: Math.PI / 2 + 0.3 });
  const bag = MAT.color("#c8b48a");
  for (const sz of [-1, 1])
    for (let row = 0; row < 3; row++)
      for (let i = 0; i < 4 - row; i++) {
        const sg = new SphereGeometry(1, 10, 6);
        sg.scale(0.36, 0.13, 0.24);
        k.add(bag, sg, -0.55 + (i % 2) * 0.05, 0.12 + row * 0.22, sz * (SW / 2 + 0.55 + i * 0.5 + row * 0.25));
      }
  k.box(MAT.darkStone(), 1.0, 0.3, 1.0, 4.5, H + 0.15, 2.5);
  // Floodlight poles on the front corners (heads are separate: they switch off).
  for (const z of [L / 2 - 0.6, -(L / 2 - 0.6)]) {
    k.add(MAT.metal(), new CylinderGeometry(0.05, 0.06, 1.5, 6), 0.4, H + 0.75, z);
    k.box(MAT.metal(), 0.35, 0.28, 0.45, 0.32, H + 1.6, z);
  }
  const gl = GENERATOR.clone().sub(at(CHAD.s, FRONT, 0));
  roofLife(k, gl.x, H, gl.z);
  // Chad's kettle grill with a fat steak (he eats steak, you eat cold beans).
  const gr = GRILL.clone().sub(at(CHAD.s, FRONT, 0));
  for (const [dx, dz] of [[-0.2, -0.2], [0.2, -0.2], [0, 0.25]]) k.add(MAT.metal(), new CylinderGeometry(0.02, 0.02, 0.7, 5), gr.x + dx, H + 0.35, gr.z + dz);
  k.add(MAT.color("#24222a"), new SphereGeometry(0.32, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), gr.x, H + 0.82, gr.z);
  k.add(MAT.metal(), new CylinderGeometry(0.31, 0.31, 0.02, 16), gr.x, H + 0.83, gr.z);
  k.box(MAT.color("#8a3a2a"), 0.3, 0.05, 0.2, gr.x, H + 0.865, gr.z);
  for (const dz of [-0.06, 0, 0.06]) k.box(MAT.color("#3a1a14"), 0.3, 0.052, 0.015, gr.x, H + 0.866, gr.z + dz);
  const g = k.build();
  const gen = generator();
  gen.position.set(gl.x, H, gl.z);
  g.add(gen);
  const sign = signFace("CHAD'S HARDWARE", "#2a2a36", "#f2c84a", 8, 1.1);
  sign.position.set(-0.03, SH + 1.25, 0);
  sign.rotation.y = -Math.PI / 2;
  const members = scrawl(["CHAD'S.", "MEMBERS ONLY"], "#efe6d2", "#b0202a", 2.3, 1.45);
  members.position.set(-0.04, 2.35, -(SW / 2 + 1.35));
  members.rotation.y = -Math.PI / 2;
  g.add(sign, members);
  return g;
};

/**
 * Chad's generator (origin on the roof under its middle; local -x faces the street): a green housing with a rounded
 * lid in a steel tube frame on wheels, louvred vents, a fuel cap, a control panel with two gauges and a red switch,
 * a muffler with a rain-capped pipe, a hand-stencilled CHAD'S and a warning sticker; heavy cables snake off to the
 * floodlights.
 */
const generator = () => {
  const k = new Kit(), body = MAT.color("#4e8a54"), dark = MAT.color("#2e4a34"), steel = MAT.metal(), black = MAT.color("#24222a");
  k.box(body, 0.78, 0.62, 1.16, 0, 0.5, 0);
  k.add(body, new CylinderGeometry(0.39, 0.39, 1.16, 16, 1, false, 0, Math.PI), 0, 0.81, 0, { rx: Math.PI / 2, rz: Math.PI / 2 });
  for (let i = 0; i < 6; i++) k.box(dark, 0.02, 0.04, 0.6, -0.4, 0.34 + i * 0.07, -0.2); // vents, street side
  for (const z of [-0.62, 0.62]) {
    for (const x of [-0.45, 0.45]) k.add(steel, new CylinderGeometry(0.025, 0.025, 1.0, 6), x, 0.6, z);
    k.add(steel, new CylinderGeometry(0.025, 0.025, 0.9, 6), 0, 1.1, z, { rz: Math.PI / 2 });
  }
  for (const x of [-0.45, 0.45]) k.add(steel, new CylinderGeometry(0.025, 0.025, 1.24, 6), x, 1.1, 0, { rx: Math.PI / 2 });
  for (const z of [-0.5, 0.5]) k.add(black, new CylinderGeometry(0.13, 0.13, 0.08, 14), 0.3, 0.13, z, { rx: Math.PI / 2 });
  for (const z of [-0.45, 0.45]) k.box(black, 0.12, 0.1, 0.12, -0.3, 0.05, z);
  k.add(MAT.color("#e2b23a"), new CylinderGeometry(0.07, 0.07, 0.06, 12), 0.05, 1.22, 0.25); // fuel cap
  k.box(MAT.color("#d8d2c4"), 0.03, 0.3, 0.44, -0.41, 0.52, 0.3); // control panel
  for (const z of [0.18, 0.42]) {
    k.add(MAT.color("#f4f0e6"), new CylinderGeometry(0.06, 0.06, 0.02, 14), -0.435, 0.58, z, { rz: Math.PI / 2 });
    k.box(MAT.color("#c8302e"), 0.01, 0.05, 0.008, -0.447, 0.6, z + 0.01);
  }
  k.box(MAT.color("#c8302e"), 0.05, 0.06, 0.04, -0.44, 0.44, 0.3); // switch
  k.add(steel, new CylinderGeometry(0.09, 0.09, 0.4, 12), 0.2, 1.06, -0.4, { rz: Math.PI / 2 }); // muffler
  k.add(steel, new CylinderGeometry(0.04, 0.04, 0.55, 8), 0.38, 1.33, -0.4);
  k.box(steel, 0.12, 0.02, 0.12, 0.38, 1.62, -0.4);
  for (const dz of [1, -1]) for (let i = 0; i < 5; i++) k.box(black, 0.05, 0.04, 0.42, -0.2 - i * 0.05 + (i % 2) * 0.06, 0.02, dz * (0.7 + i * 0.4)); // cables
  const g = k.build();
  const sten = new Mesh(new PlaneGeometry(0.62, 0.16), M("chadStencil", () => new MeshBasicMaterial({ map: scrawlTex(["CHAD'S"], "#4e8a54", "#f4f0e6", 512, 140) })));
  sten.position.set(-0.395, 0.74, -0.15);
  sten.rotation.y = -Math.PI / 2;
  const warn = new Mesh(new PlaneGeometry(0.14, 0.12), M("warnSticker", () => new MeshBasicMaterial({ map: signTex("!", "#f2c84a", "#1e1a24") })));
  warn.position.set(-0.395, 0.4, -0.45);
  warn.rotation.y = -Math.PI / 2;
  g.add(sten, warn);
  return g;
};

/** Chad's roof life by the generator: a striped lawn chair, a cooler, an AC unit, vent pipes, crushed cans. */
const roofLife = (k: Kit, gx: number, H: number, gz: number) => {
  const alu = MAT.metal(), blue = MAT.color("#2e4ab0"), white = MAT.color("#f4f0e6");
  const cx = gx + 0.9, cz = gz - 1.0; // beside the generator, inside the roof (z within +-5)
  for (let i = 0; i < 6; i++) k.box(i % 2 ? blue : white, 0.5, 0.03, 0.09, cx, H + 0.42, cz - 0.25 + i * 0.09);
  for (let i = 0; i < 5; i++) k.box(i % 2 ? blue : white, 0.03, 0.09, 0.54, cx + 0.27, H + 0.5 + i * 0.09, cz, false);
  for (const [dx, dz] of [[-0.24, -0.27], [0.24, -0.27], [-0.24, 0.27], [0.24, 0.27]]) k.box(alu, 0.03, 0.42, 0.03, cx + dx, H + 0.21, cz + dz);
  k.box(MAT.color("#3a8ac8"), 0.5, 0.36, 0.34, gx + 1.0, H + 0.18, gz - 0.1); // cooler
  k.box(white, 0.52, 0.06, 0.36, gx + 1.0, H + 0.39, gz - 0.1);
  k.box(MAT.color("#b8bcc4"), 1.1, 0.8, 0.9, gx + 3.4, H + 0.4, gz - 1.0); // AC unit
  k.add(MAT.color("#6a6e78"), new CylinderGeometry(0.32, 0.32, 0.04, 18), gx + 3.4, H + 0.82, gz - 1.0);
  for (const [dx, dz] of [[2.2, 1.6], [2.6, 2.1]]) k.add(MAT.metal(), new CylinderGeometry(0.08, 0.08, 0.7, 10), gx + dx, H + 0.35, gz + dz);
  for (let i = 0; i < 4; i++) k.add(MAT.color(i % 2 ? "#c8302e" : "#d8d2c4"), new CylinderGeometry(0.035, 0.035, 0.05, 8), gx + 0.6 + i * 0.17, H + 0.025, gz - 1.6 + (i % 2) * 0.2);
};

/** The roll-up shutter (local origin bottom centre on the facade, +y up, faces -x): `open` 0..1 is set by props.ts. */
export const shutter = () => {
  const { shutterW: SW, shutterH: SH } = CHAD;
  const steel = M("steel", () => new MeshBasicMaterial({ color: "#8a8e98" }));
  const k = new Kit();
  for (let y = 0.1; y < SH; y += 0.2) k.box(MAT.color(y % 0.4 < 0.2 ? "#9aa0aa" : "#868c96"), 0.06, 0.19, SW, 0, y, 0, false);
  k.box(MAT.metal(), 0.1, 0.12, SW + 0.1, -0.02, 0.06, 0); // bottom bar
  const curtain = k.build();
  curtain.name = "curtain";
  const housing = new Mesh(new BoxGeometry(0.4, 0.45, SW + 0.3), MAT.metal());
  housing.position.set(-0.15, SH + 0.2, 0);
  // Peep slot at eye height: dark when open, with two sunglasses inside (S05).
  const slot = new Group();
  slot.name = "slot";
  const hole = new Mesh(new BoxGeometry(0.02, 0.16, 0.5), M("slotDark", () => new MeshBasicMaterial({ color: "#14101a" })));
  // Two sunglass lenses and a bridge (one blue bar read as stripes in the slot close-up).
  const shades = new Group();
  for (const z of [-0.075, 0.075]) {
    const lens = new Mesh(new CylinderGeometry(0.05, 0.05, 0.012, 16), M("slotLens", () => new MeshBasicMaterial({ color: "#1e2a44" })));
    lens.rotation.z = Math.PI / 2;
    lens.scale.set(1, 1, 0.7);
    lens.position.set(-0.014, 0, z);
    const glint = new Mesh(new CylinderGeometry(0.012, 0.012, 0.013, 8), M("slotGlint", () => new MeshBasicMaterial({ color: "#c8e0ff" })));
    glint.rotation.z = Math.PI / 2;
    glint.position.set(-0.02, 0.018, z - 0.02);
    shades.add(lens, glint);
  }
  const bridge = new Mesh(new BoxGeometry(0.01, 0.012, 0.06), M("slotLens", () => new MeshBasicMaterial({ color: "#1e2a44" })));
  bridge.position.set(-0.014, 0.01, 0);
  shades.add(bridge);
  const lid = new Mesh(new BoxGeometry(0.04, 0.18, 0.52), steel);
  lid.name = "lid";
  slot.add(hole, shades, lid);
  slot.position.set(-0.05, 1.62, 0);
  const g = new Group().add(curtain, housing, slot);
  void steel;
  return g;
};

/** Floodlight head glass (on / off): a separate mesh per head so the story can switch it. */
export const floodGlass = (on: boolean) => new Mesh(new BoxGeometry(0.06, 0.22, 0.36), on ? MAT.glow("#fff2d0", 6) : MAT.color("#6a6a70"));
/** A red jerry can (fuel), origin at its base. */
export const fuelCan = () => {
  const k = new Kit();
  k.box(MAT.color("#c23a34"), 0.18, 0.36, 0.3, 0, 0.18, 0);
  k.box(MAT.color("#c23a34"), 0.06, 0.06, 0.16, 0, 0.39, 0.05);
  k.add(MAT.metal(), new CylinderGeometry(0.025, 0.025, 0.08, 6), 0, 0.4, -0.1);
  return k.build();
};
export const FUEL_AT = (i: number) => GENERATOR.clone().add(new Vector3(0.25 + (i % 3) * 0.24, 0, 1.0 + Math.floor(i / 3) * 0.36));

// ---------------------------------------------------------------- toys and the hedgehog cart (both sets)

const TOY_COLS = ["#f2c84a", "#4ab0d8", "#e8506a", "#7ac860", "#b06ad0", "#f28a3a", "#f4f0e6"];
const ell = (k: Kit, m: ReturnType<typeof MAT.color>, rx: number, ry: number, rz: number, x: number, y: number, z: number) => {
  const g = new SphereGeometry(1, 10, 7); // hundreds of toys: keep them light
  g.scale(rx, ry, rz);
  k.add(m, g, x, y, z);
};
/** Two dot eyes with white catch-lights, looking along +z (toys are drawn cute, unlike the cast). */
const eyes = (k: Kit, x: number, y: number, z: number, gap: number, r: number) => {
  for (const e of [-1, 1]) {
    k.add(MAT.color("#1e1a24"), new SphereGeometry(r, 6, 4), x + e * gap, y, z);
    k.add(MAT.color("#ffffff"), new SphereGeometry(r * 0.35, 4, 3), x + e * gap + r * 0.3, y + r * 0.35, z + r * 0.75);
  }
};
/**
 * One toy (origin at its base, ~0.25 m at s = 1), facing +z: rubber duck, robot, dinosaur, teddy bear, beach ball,
 * rocket, toy car. Every one has a face or a readable detail, so a heap reads as toys, not blocks.
 */
const toyParts = (k: Kit, kind: number, col: string, x: number, y: number, z: number, s = 1) => {
  const c = MAT.color(col), S = (v: number) => v * s;
  switch (kind % 7) {
    case 0: { // rubber duck
      const yel = MAT.color("#f2c84a"), wing = MAT.color("#e8b830");
      ell(k, yel, S(0.12), S(0.09), S(0.14), x, y + S(0.09), z);
      ell(k, yel, S(0.075), S(0.075), S(0.075), x, y + S(0.21), z + S(0.06));
      ell(k, MAT.color("#f28a3a"), S(0.045), S(0.018), S(0.04), x, y + S(0.195), z + S(0.135)); // beak
      for (const e of [-1, 1]) ell(k, wing, S(0.03), S(0.05), S(0.08), x + e * S(0.11), y + S(0.1), z - S(0.01));
      eyes(k, x, y + S(0.235), z + S(0.115), S(0.035), S(0.014));
      break;
    }
    case 1: { // robot
      k.box(c, S(0.16), S(0.17), S(0.12), x, y + S(0.13), z);
      k.box(MAT.color("#b8bcc4"), S(0.14), S(0.11), S(0.11), x, y + S(0.27), z);
      k.box(MAT.color("#24222a"), S(0.11), S(0.04), S(0.01), x, y + S(0.28), z + S(0.056)); // visor
      for (const e of [-1, 1]) k.add(MAT.glow("#7fe8ff", 2.2), new SphereGeometry(S(0.011), 6, 4), x + e * S(0.028), y + S(0.28), z + S(0.062));
      k.add(MAT.metal(), new CylinderGeometry(S(0.006), S(0.006), S(0.07), 5), x, y + S(0.36), z);
      k.add(MAT.color("#e8506a"), new SphereGeometry(S(0.02), 8, 6), x, y + S(0.4), z);
      k.box(MAT.color("#f2c84a"), S(0.07), S(0.05), S(0.01), x, y + S(0.14), z + S(0.062)); // chest panel
      for (const e of [-1, 1]) {
        k.add(MAT.color("#b8bcc4"), new CylinderGeometry(S(0.02), S(0.02), S(0.12), 6), x + e * S(0.1), y + S(0.13), z, { rz: e * 0.3 });
        k.box(MAT.color("#24222a"), S(0.05), S(0.05), S(0.07), x + e * S(0.04), y + S(0.025), z);
      }
      break;
    }
    case 2: { // dinosaur
      const g = MAT.color("#6ac060"), belly = MAT.color("#d8e890");
      ell(k, g, S(0.08), S(0.08), S(0.13), x, y + S(0.13), z);
      ell(k, belly, S(0.06), S(0.055), S(0.1), x, y + S(0.11), z + S(0.02));
      ell(k, g, S(0.06), S(0.055), S(0.075), x, y + S(0.25), z + S(0.13));
      k.add(g, new ConeGeometry(S(0.05), S(0.2), 8), x, y + S(0.11), z - S(0.2), { rx: -Math.PI / 2.3 });
      for (let i = 0; i < 4; i++) k.add(MAT.color("#f28a3a"), new ConeGeometry(S(0.018), S(0.05), 5), x, y + S(0.21) - i * S(0.012), z + S(0.05) - i * S(0.06));
      for (const [dx, dz] of [[-0.05, 0.06], [0.05, 0.06], [-0.05, -0.06], [0.05, -0.06]]) k.add(g, new CylinderGeometry(S(0.025), S(0.028), S(0.08), 7), x + S(dx), y + S(0.04), z + S(dz));
      eyes(k, x, y + S(0.28), z + S(0.18), S(0.03), S(0.012));
      break;
    }
    case 3: { // teddy bear
      const fur = MAT.color(col === "#f4f0e6" ? "#e8dcc4" : "#b07a4a"), pale = MAT.color("#ecd2a8");
      ell(k, fur, S(0.1), S(0.11), S(0.09), x, y + S(0.11), z);
      ell(k, pale, S(0.065), S(0.07), S(0.03), x, y + S(0.11), z + S(0.07)); // belly patch
      ell(k, fur, S(0.08), S(0.075), S(0.075), x, y + S(0.27), z);
      for (const e of [-1, 1]) {
        ell(k, fur, S(0.03), S(0.03), S(0.02), x + e * S(0.06), y + S(0.34), z); // ears
        ell(k, pale, S(0.017), S(0.017), S(0.012), x + e * S(0.06), y + S(0.34), z + S(0.012));
        ell(k, fur, S(0.035), S(0.06), S(0.035), x + e * S(0.1), y + S(0.14), z + S(0.02)); // arms
        ell(k, fur, S(0.04), S(0.035), S(0.05), x + e * S(0.055), y + S(0.03), z + S(0.03)); // feet
      }
      ell(k, pale, S(0.035), S(0.028), S(0.03), x, y + S(0.25), z + S(0.065)); // snout
      k.add(MAT.color("#1e1a24"), new SphereGeometry(S(0.012), 6, 4), x, y + S(0.26), z + S(0.094));
      eyes(k, x, y + S(0.295), z + S(0.06), S(0.03), S(0.011));
      break;
    }
    case 4: { // beach ball: two colours and a white band
      k.add(c, new SphereGeometry(S(0.1), 14, 10), x, y + S(0.1), z);
      k.add(MAT.color("#f4f0e6"), new TorusGeometry(S(0.1), S(0.012), 6, 20), x, y + S(0.1), z);
      k.add(MAT.color(col === "#4ab0d8" ? "#f2c84a" : "#4ab0d8"), new TorusGeometry(S(0.07), S(0.03), 6, 20), x, y + S(0.1), z, { ry: Math.PI / 2 });
      break;
    }
    case 5: { // rocket
      k.add(MAT.color("#f4f0e6"), new CylinderGeometry(S(0.05), S(0.055), S(0.22), 12), x, y + S(0.13), z);
      k.add(MAT.color("#e8506a"), new ConeGeometry(S(0.05), S(0.1), 12), x, y + S(0.29), z);
      k.add(MAT.color("#4ab0d8"), new CylinderGeometry(S(0.022), S(0.022), S(0.01), 10), x, y + S(0.17), z + S(0.05), { rx: Math.PI / 2 });
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        k.box(c, S(0.01), S(0.08), S(0.06), x + Math.sin(a) * S(0.06), y + S(0.05), z + Math.cos(a) * S(0.06));
      }
      break;
    }
    default: { // toy car
      k.box(c, S(0.14), S(0.06), S(0.24), x, y + S(0.07), z);
      k.box(c, S(0.12), S(0.06), S(0.12), x, y + S(0.13), z - S(0.02));
      k.box(MAT.color("#9ad0ec"), S(0.122), S(0.04), S(0.1), x, y + S(0.135), z - S(0.02));
      for (const [dx, dz] of [[-0.075, 0.07], [0.075, 0.07], [-0.075, -0.07], [0.075, -0.07]])
        k.add(MAT.color("#24222a"), new CylinderGeometry(S(0.035), S(0.035), S(0.03), 12), x + S(dx), y + S(0.035), z + S(dz), { rz: Math.PI / 2 });
    }
  }
};

const HEAP_KINDS = [0, 0, 3, 3, 1, 2, 4, 5, 6];
/** A rubber duck to hold (cold open), origin at its middle. */
export const duckToy = () => {
  const k = new Kit();
  toyParts(k, 0, "#f2c84a", 0, -0.12, 0, 1.1);
  return k.build();
};
/** The toy mountain around "you" by the front window: a ring of toys up to ~0.7 m with a gap where you stand. */
export const toyHeap = () => {
  const k = new Kit(), r = rng(212);
  for (let i = 0; i < 160; i++) {
    const a = r() * Math.PI * 2, d = 0.35 + Math.sqrt(r()) * 1.5;
    const front = Math.cos(a) > 0.55 && d < 0.9; // keep the camera side of your feet clear-ish
    if (front) continue;
    const y = Math.max(0, (1.6 - d) * 0.4) * r();
    const kind = HEAP_KINDS[Math.floor(r() * HEAP_KINDS.length)]; // mostly round, soft toys (ducks, bears, balls)
    toyParts(k, kind, TOY_COLS[Math.floor(r() * TOY_COLS.length)], Math.sin(a) * d, y, Math.cos(a) * d - 0.2, 0.55 + r() * 0.35);
  }
  return k.build();
};

/** A shopping cart (local +z = its front, handle at -z), origin at the floor. */
const cartBody = (k: Kit) => {
  const wire = MAT.metal();
  k.box(wire, 0.58, 0.04, 0.9, 0, 0.5, 0);
  for (const x of [-0.29, 0.29]) k.box(wire, 0.03, 0.45, 0.9, x, 0.72, 0);
  for (const z of [-0.45, 0.45]) k.box(wire, 0.58, 0.45, 0.03, 0, 0.72, z);
  k.box(MAT.color("#c8423a"), 0.6, 0.05, 0.05, 0, 1.0, -0.5); // handle
  for (const [x, z] of [[-0.24, -0.38], [0.24, -0.38], [-0.24, 0.38], [0.24, 0.38]]) {
    k.box(wire, 0.03, 0.42, 0.03, x, 0.27, z);
    k.add(MAT.color("#2a2a30"), new CylinderGeometry(0.06, 0.06, 0.04, 10), x, 0.06, z, { rz: Math.PI / 2 });
  }
};

/**
 * The hedgehog: a cart with toys taped on every face, arms and tails out in all directions, a dinosaur tail straight
 * up like a flag and the crayon DO NOT PUSH sign on the front. `taped` 0..1 = how many toys are on so far.
 */
export const hedgehogCart = (taped = 1, sign = true) => {
  const k = new Kit(), tk = new Kit(), r = rng(1212), N = Math.round(85 * taped);
  cartBody(k);
  for (let i = 0; i < N; i++) {
    const face = Math.floor(r() * 5), u = r() - 0.5, v = r();
    let x = 0, y = 0.55 + v * 0.55, z = 0;
    if (face === 0) [x, z] = [-0.33, u * 0.9];
    else if (face === 1) [x, z] = [0.33, u * 0.9];
    else if (face === 2) [x, z] = [u * 0.6, 0.48];
    else if (face === 3) [x, z] = [u * 0.6, -0.4];
    else [x, y, z] = [u * 0.55, 0.95 + r() * 0.25, (r() - 0.5) * 0.85];
    toyParts(tk, HEAP_KINDS[Math.floor(r() * HEAP_KINDS.length)], TOY_COLS[i % TOY_COLS.length], x, y - 0.1, z, 0.5 + r() * 0.3);
  }
  // The dinosaur tail flag (always on top).
  k.add(MAT.color("#7ac860"), new ConeGeometry(0.045, 0.42, 7), 0.05, 1.4, 0.1);
  // Tape strips.
  for (let i = 0; i < 10 * taped; i++) k.box(MAT.color("#d8c8a0"), 0.62, 0.035, 0.05, 0, 0.6 + i * 0.05, -0.42 + ((i * 0.37) % 0.9));
  const g = k.build();
  // The toys collide as one hull per material, not one box per eye and ear (the guard tests every part every frame).
  const toys = tk.build();
  toys.traverse((m) => void delete m.userData.parts);
  g.add(toys);
  if (sign) {
    const s = scrawl(["DO NOT", "PUSH"], "#d8b07a", "#c8302e", 0.5, 0.36);
    s.name = "sign";
    s.position.set(0, 1.32, -0.58); // on a stick above the handle, facing whoever would push it (clear of the toys)
    const stick = new Mesh(new CylinderGeometry(0.012, 0.012, 0.45, 5), MAT.darkWood());
    stick.position.set(0, 1.0, -0.56);
    g.add(stick);
    s.rotation.y = Math.PI;
    g.add(s);
  }
  return g;
};

/** A dinosaur toy with an open battery hatch (S14 close-up, held). Origin at its middle. */
export const dinoToy = () => {
  const k = new Kit();
  toyParts(k, 2, "#7ac860", 0, -0.15, 0, 1.6);
  k.box(MAT.color("#2a2a30"), 0.02, 0.1, 0.14, 0.1, -0.02, 0);
  return k.build();
};
/** An AA battery, origin at its middle. */
export const battery = () => {
  const k = new Kit();
  k.add(MAT.color("#2a2a30"), new CylinderGeometry(0.022, 0.022, 0.09, 10), 0, 0, 0);
  k.add(MAT.color("#e2b23a"), new CylinderGeometry(0.0225, 0.0225, 0.03, 10), 0, 0.035, 0);
  return k.build();
};
/** A toy box printed SHAKE ME! (macro insert). Origin at its base. */
export const shakeBox = () => {
  const g = new Group();
  const k = new Kit();
  k.box(MAT.color("#4ab0d8"), 0.32, 0.4, 0.14, 0, 0.2, 0);
  g.add(k.build());
  const f = signFace("SHAKE ME!", "#f2c84a", "#c8302e", 0.28, 0.12);
  f.position.set(0, 0.3, 0.071);
  g.add(f);
  return g;
};
/** Megaphone (local +z = the bell's open end), origin at the grip. */
export const megaphone = () => {
  const k = new Kit();
  // Red body, white bell face and rim: reads as a megaphone at phone size (a pale cone didn't).
  k.add(MAT.color("#d8342c"), new CylinderGeometry(0.17, 0.05, 0.42, 14), 0, 0.08, 0.2, { rx: Math.PI / 2 });
  k.add(MAT.color("#f4f0e6"), new CylinderGeometry(0.155, 0.155, 0.01, 14), 0, 0.08, 0.415, { rx: Math.PI / 2 });
  k.add(MAT.color("#f4f0e6"), new TorusGeometry(0.17, 0.025, 6, 18), 0, 0.08, 0.41);
  k.add(MAT.color("#24222a"), new CylinderGeometry(0.05, 0.05, 0.06, 10), 0, 0.08, -0.01, { rx: Math.PI / 2 });
  k.box(MAT.color("#2a2a30"), 0.05, 0.14, 0.06, 0, -0.02, 0.03);
  return k.build();
};
/** Toothbrush, origin at the handle middle. */
export const toothbrush = () => {
  const k = new Kit();
  k.box(MAT.color("#4ab0d8"), 0.02, 0.16, 0.02, 0, 0, 0);
  k.box(MAT.color("#f4f0e6"), 0.03, 0.04, 0.025, 0, 0.09, 0.015);
  return k.build();
};

// ---------------------------------------------------------------- INT set pieces

/** Pallet with stacked bean cans (Dave's night-shift seat). */
const pallet = () => {
  const k = new Kit(), wood = MAT.wood();
  for (const z of [-0.5, 0, 0.5]) k.box(wood, 1.2, 0.1, 0.12, 0, 0.05, z);
  for (let x = -0.55; x <= 0.56; x += 0.18) k.box(wood, 0.14, 0.03, 1.2, x, 0.115, 0);
  for (let i = 0; i < 14; i++) k.add(MAT.color(i % 2 ? "#c8423a" : "#e8c860"), new CylinderGeometry(0.05, 0.05, 0.12, 10), -0.4 + (i % 7) * 0.11, 0.19 + Math.floor(i / 7) * 0.13, 0.3);
  return k.build();
};

/** The tally chart: 30 red cans in rows of 6, crossed out up to `crossed`, the last circled with a skull. */
export const chartTex = (crossed: number) => {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 720;
  const g = c.getContext("2d")!;
  g.fillStyle = "#efe6d2";
  g.fillRect(0, 0, 1024, 720);
  g.fillStyle = "#2a2230";
  g.font = '900 64px "Comic Sans MS", sans-serif';
  g.textAlign = "center";
  g.fillText("CHAD'S FUEL", 512, 80);
  const r = rng(29);
  for (let i = 0; i < 30; i++) {
    const cx = 120 + (i % 6) * 156, cy = 170 + Math.floor(i / 6) * 108;
    g.fillStyle = "#c23a34";
    g.fillRect(cx - 34, cy - 36, 68, 76);
    g.fillRect(cx - 10, cy - 52, 28, 18);
    g.lineWidth = 5;
    g.strokeStyle = "#2a2230";
    g.strokeRect(cx - 34, cy - 36, 68, 76);
    if (i < crossed) {
      g.lineWidth = 9;
      g.beginPath();
      g.moveTo(cx - 46 + r() * 6, cy - 46);
      g.lineTo(cx + 46, cy + 46 - r() * 6);
      g.moveTo(cx + 44, cy - 46);
      g.lineTo(cx - 46, cy + 44);
      g.stroke();
    } else {
      g.lineWidth = 7;
      g.strokeStyle = "#c8302e";
      g.beginPath();
      g.ellipse(cx, cy, 66, 58, -0.1, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = "#f4f0e6"; // skull on the can
      g.beginPath();
      g.arc(cx, cy - 4, 18, 0, Math.PI * 2);
      g.fill();
      g.fillRect(cx - 10, cy + 8, 20, 12);
      g.fillStyle = "#2a2230";
      for (const e of [-7, 7]) {
        g.beginPath();
        g.arc(cx + e, cy - 6, 5, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
};
export const CHART_AT = IN(6, 11.8, 1.75);
export const CHART = { w: 1.9, h: 1.34 };
const chart = () => {
  const g = new Group();
  const board = new Mesh(new BoxGeometry(0.04, CHART.h + 0.1, CHART.w + 0.1), MAT.color("#8a6a4a"));
  const face = new Mesh(new PlaneGeometry(CHART.w, CHART.h), M("chart", () => new MeshBasicMaterial({ map: chartTex(29) })));
  face.position.x = -0.03;
  face.rotation.y = -Math.PI / 2;
  g.add(board, face);
  return g;
};

// ---------------------------------------------------------------- set placement

/** Where things stand inside. */
export const HEAP = IN(-1.4, -9.4);
export const CART_IN = IN(1.6, -3.2);
export const PALLET = IN(7.2, 8.8);
export const WINDOW_SPOT = IN(-2.6, 6.2); // just inside the front glass (Dave's lookout)

/** EXT: the street with both stores in reserved lots; `cartAt` places the ramp cart for shots that keep it there. */
export const EXT_OPTS: StreetOpts = {
  seed: 3030,
  length: 62,
  curve: 0,
  lamps: [[10, 1], [20, -1], [44, 1], [52, -1]],
  lightCenter: at(32, 0, 2),
  wires: false, // the telephoto shots of Chad would see the wires cross his face
  reserve: [
    { side: -1, s0: 18.5, s1: 43.5 },
    { side: 1, s0: 26.5, s1: 37.5 },
  ],
  extra: () => [
    named(supermarketFront(), "FRESHMART", at(31, -FRONT)),
    named(chadStore(), "CHAD'S HARDWARE", at(CHAD.s, FRONT), CHAD.shutterH),
  ],
};
export const INT_EXTRAS = (night: boolean) => [
  placedAt(toyHeapHolder(), HEAP),
  named(pallet(), "pallet", PALLET),
  placedAt(chart(), CHART_AT), // hangs on the wall (not a floor-standing collider)
  windowViews(night),
  // glowSprite takes a world position, so it is not parented to the placed lantern
  ...(night ? [placedAt(lantern(), LANTERN), glowSprite(LANTERN.clone().add(new Vector3(0, 0.13, 0)), "#ffb35a", 1.4, 1.1)] : []),
];

/**
 * What you see through the front windows (pilot critique: blank white rectangles): a painted view across the street
 * to CHAD'S HARDWARE (right of the doors, where Dave keeps watch) with his floodlights, generator and Chad on the
 * roof, the horde in the street. Unlit planes just inside each pane; one canvas spans all six panes.
 */
const PANES: [number, number][] = [[-11.4, -8.5], [-7.9, -4.9], [-4.3, -1.9], [1.9, 4.3], [4.9, 7.9], [8.5, 11.4]];
const viewTex = (night: boolean) => {
  const W = 2304, Hh = 260, c = document.createElement("canvas");
  c.width = W;
  c.height = Hh;
  const g = c.getContext("2d")!, r = rng(night ? 9 : 8);
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
  const X = (x: number) => ((x + 12) / 24) * W, base = Hh * 0.72;
  // The row across the street.
  for (let x = -12; x < 12; ) {
    const w = 2.4 + r() * 2.2, h = 70 + r() * 70;
    const cols = night ? ["#3a3050", "#2e3a52", "#4a3444"] : ["#9a5a4a", "#c4b48a", "#8aa494", "#a8786a", "#d8ccb4"];
    g.fillStyle = cols[Math.floor(r() * cols.length)];
    g.fillRect(X(x), base - h, X(x + w) - X(x) - 2, h);
    for (let wy = base - h + 12; wy < base - 18; wy += 24)
      for (let wx = X(x) + 8; wx < X(x + w) - 20; wx += 26) {
        g.fillStyle = night ? (r() < 0.25 ? "#ffc070" : "#1a1a2a") : "#3a4458";
        g.fillRect(wx, wy, 12, 14);
      }
    x += w;
  }
  // CHAD'S HARDWARE, straight across from the right-hand windows.
  const c0 = X(-8.0), c1 = X(-4.6), top = base - 120; // canvas x for world x is X(-x) (see windowViews uv)
  g.fillStyle = night ? "#5a2e2a" : "#8e5446";
  g.fillRect(c0, top, c1 - c0, base - top);
  g.fillStyle = "#2a2a36";
  g.fillRect(c0 + 6, top + 30, c1 - c0 - 12, 26);
  g.fillStyle = "#f2c84a";
  g.font = "900 22px Arial Black, sans-serif";
  g.textAlign = "center";
  g.fillText("CHAD'S HARDWARE", (c0 + c1) / 2, top + 51);
  g.fillStyle = "#8a8e98";
  g.fillRect(c0 + 60, top + 66, c1 - c0 - 120, base - top - 66);
  g.fillStyle = "#4e8a54";
  g.fillRect(c0 + 20, top - 18, 34, 18); // generator
  g.fillStyle = "#f2efe6";
  g.fillRect((c0 + c1) / 2 - 6, top - 34, 12, 22); // Chad
  g.fillStyle = "#2e4ab0";
  g.fillRect((c0 + c1) / 2 - 7, top - 40, 14, 6);
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
  // The street and the horde.
  g.fillStyle = night ? "#2a2840" : "#5a5464";
  g.fillRect(0, base, W, Hh - base);
  for (let i = 0; i < 160; i++) {
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
const windowViews = (night: boolean) => {
  const pos: number[] = [], uv: number[] = [], z = 3.83, y0 = 0.9, y1 = 3.6;
  for (const [x0, x1] of PANES)
    for (const [x, y] of [[x0, y0], [x1, y0], [x1, y1], [x0, y0], [x1, y1], [x0, y1]]) {
      pos.push(x, y, z);
      uv.push((12 - x) / 24, (y - y0) / (y1 - y0)); // looking out (+z), world +x is screen LEFT: u runs the other way
    }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute("uv", new BufferAttribute(new Float32Array(uv), 2));
  return new Mesh(geo, M(`view${night}`, () => new MeshBasicMaterial({ map: viewTex(night), side: DoubleSide, color: night ? "#ffffff" : "#e8e4dc" })));
};
/** Battery lantern on the pallet (the night scene's warm practical). */
export const LANTERN = IN(7.2 - 0.3, 8.8 - 0.35, 0.13);
const lantern = () => {
  const k = new Kit();
  k.box(MAT.metal(), 0.16, 0.04, 0.16, 0, 0.02, 0);
  k.box(MAT.glow("#ffc070", 4), 0.13, 0.18, 0.13, 0, 0.13, 0);
  k.box(MAT.metal(), 0.16, 0.03, 0.16, 0, 0.235, 0);
  k.add(MAT.metal(), new TorusGeometry(0.06, 0.008, 4, 10), 0, 0.29, 0);
  return k.build();
};
const placedAt = (o: Object3D, p: Vector3) => (o.position.copy(p), o);
const toyHeapHolder = () => {
  const g = new Group().add(toyHeap());
  g.userData.decor = true; // toys around the feet are the gag (guard: not a collider for cards)
  return g;
};
