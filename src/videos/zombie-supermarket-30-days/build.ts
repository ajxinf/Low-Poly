import {
  BoxGeometry, CanvasTexture, ConeGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry,
  SRGBColorSpace, SphereGeometry, TorusGeometry, Vector3,
} from "three";
import { Kit, M, MAT } from "../../../kit/toon/build/kit";
import { StreetOpts, spine } from "../../../kit/toon/build/street";
import { signTex } from "../../../kit/toon/build/textures";
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
  k.box(MAT.darkStone(), 1.0, 0.3, 1.0, 4.5, H + 0.15, 2.5);
  // Floodlight poles on the front corners (heads are separate: they switch off).
  for (const z of [L / 2 - 0.6, -(L / 2 - 0.6)]) {
    k.add(MAT.metal(), new CylinderGeometry(0.05, 0.06, 1.5, 6), 0.4, H + 0.75, z);
    k.box(MAT.metal(), 0.35, 0.28, 0.45, 0.32, H + 1.6, z);
  }
  // Generator: green housing, panel, exhaust; sits beside where Chad stands.
  const gl = GENERATOR.clone().sub(at(CHAD.s, FRONT, 0)), gx = gl.x, gz = gl.z;
  k.box(MAT.color("#4a7a4e"), 0.8, 0.75, 1.2, gx, H + 0.375, gz);
  k.box(MAT.color("#2a3a2e"), 0.02, 0.3, 0.5, gx - 0.41, H + 0.45, gz + 0.2);
  k.add(MAT.metal(), new CylinderGeometry(0.05, 0.05, 0.5, 8), gx + 0.2, H + 1.0, gz - 0.4);
  const g = k.build();
  const sign = signFace("CHAD'S HARDWARE", "#2a2a36", "#f2c84a", 8, 1.1);
  sign.position.set(-0.03, SH + 1.25, 0);
  sign.rotation.y = -Math.PI / 2;
  const members = scrawl(["CHAD'S.", "MEMBERS ONLY"], "#efe6d2", "#b0202a", 1.6, 1.0);
  members.position.set(-0.04, 1.9, -(SW / 2 + 1.0));
  members.rotation.y = -Math.PI / 2;
  g.add(sign, members);
  return g;
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
  const shades = new Mesh(new BoxGeometry(0.02, 0.07, 0.36), M("slotShades", () => new MeshBasicMaterial({ color: "#2a3a5a" })));
  shades.position.set(-0.012, 0.0, 0);
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
/** One small toy (duck, robot, dino, bear, ball, rocket), origin at its base, ~0.25 m. */
const toyParts = (k: Kit, kind: number, col: string, x: number, y: number, z: number, s = 1) => {
  const c = MAT.color(col);
  switch (kind % 6) {
    case 0: // duck
      k.add(c, new SphereGeometry(0.11 * s, 10, 8), x, y + 0.1 * s, z);
      k.add(c, new SphereGeometry(0.07 * s, 10, 8), x, y + 0.22 * s, z + 0.05 * s);
      k.add(MAT.color("#f28a3a"), new ConeGeometry(0.03 * s, 0.07 * s, 6), x, y + 0.21 * s, z + 0.13 * s, { rx: Math.PI / 2 });
      break;
    case 1: // robot
      k.box(c, 0.16 * s, 0.18 * s, 0.12 * s, x, y + 0.09 * s, z);
      k.box(MAT.metal(), 0.12 * s, 0.1 * s, 0.1 * s, x, y + 0.23 * s, z);
      k.add(MAT.color("#e8506a"), new SphereGeometry(0.025 * s, 6, 5), x, y + 0.31 * s, z);
      break;
    case 2: // dino
      k.box(MAT.color("#7ac860"), 0.12 * s, 0.14 * s, 0.26 * s, x, y + 0.1 * s, z);
      k.box(MAT.color("#7ac860"), 0.1 * s, 0.1 * s, 0.12 * s, x, y + 0.22 * s, z + 0.14 * s);
      k.add(MAT.color("#5aa848"), new ConeGeometry(0.05 * s, 0.22 * s, 6), x, y + 0.12 * s, z - 0.2 * s, { rx: -Math.PI / 2.4 });
      break;
    case 3: // bear
      k.add(MAT.color("#a8784a"), new SphereGeometry(0.1 * s, 10, 8), x, y + 0.1 * s, z);
      k.add(MAT.color("#a8784a"), new SphereGeometry(0.075 * s, 10, 8), x, y + 0.24 * s, z);
      for (const e of [-1, 1]) k.add(MAT.color("#8a5a34"), new SphereGeometry(0.03 * s, 6, 5), x + e * 0.06 * s, y + 0.3 * s, z);
      break;
    case 4: // ball
      k.add(c, new SphereGeometry(0.1 * s, 12, 9), x, y + 0.1 * s, z);
      break;
    default: // rocket
      k.add(c, new CylinderGeometry(0.05 * s, 0.05 * s, 0.22 * s, 8), x, y + 0.11 * s, z);
      k.add(MAT.color("#e8506a"), new ConeGeometry(0.05 * s, 0.1 * s, 8), x, y + 0.27 * s, z);
  }
};

const HEAP_KINDS = [0, 0, 0, 3, 3, 3, 4, 4, 1, 2, 5];
/** A rubber duck to hold (cold open), origin at its middle. */
export const duckToy = () => {
  const k = new Kit();
  toyParts(k, 0, "#f2c84a", 0, -0.12, 0, 1.1);
  return k.build();
};
/** The toy mountain around "you" by the front window: a ring of toys up to ~0.7 m with a gap where you stand. */
export const toyHeap = () => {
  const k = new Kit(), r = rng(212);
  for (let i = 0; i < 240; i++) {
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
  const k = new Kit(), r = rng(1212), N = Math.round(110 * taped);
  cartBody(k);
  for (let i = 0; i < N; i++) {
    const face = Math.floor(r() * 5), u = r() - 0.5, v = r();
    let x = 0, y = 0.55 + v * 0.55, z = 0;
    if (face === 0) [x, z] = [-0.33, u * 0.9];
    else if (face === 1) [x, z] = [0.33, u * 0.9];
    else if (face === 2) [x, z] = [u * 0.6, 0.48];
    else if (face === 3) [x, z] = [u * 0.6, -0.4];
    else [x, y, z] = [u * 0.55, 0.95 + r() * 0.25, (r() - 0.5) * 0.85];
    toyParts(k, HEAP_KINDS[Math.floor(r() * HEAP_KINDS.length)], TOY_COLS[i % TOY_COLS.length], x, y - 0.1, z, 0.5 + r() * 0.3);
  }
  // The dinosaur tail flag (always on top).
  k.add(MAT.color("#7ac860"), new ConeGeometry(0.045, 0.42, 7), 0.05, 1.4, 0.1);
  // Tape strips.
  for (let i = 0; i < 10 * taped; i++) k.box(MAT.color("#d8c8a0"), 0.62, 0.035, 0.05, 0, 0.6 + i * 0.05, -0.42 + ((i * 0.37) % 0.9));
  const g = k.build();
  if (sign) {
    const s = scrawl(["DO NOT", "PUSH"], "#d8b07a", "#c8302e", 0.5, 0.36);
    s.name = "sign";
    s.position.set(0, 0.78, 0.5);
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
  k.add(MAT.color("#efe8dc"), new CylinderGeometry(0.17, 0.05, 0.42, 14, 1, true), 0, 0.08, 0.2, { rx: Math.PI / 2 });
  k.add(MAT.color("#c8302e"), new TorusGeometry(0.17, 0.02, 6, 18), 0, 0.08, 0.41);
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
export const INT_EXTRAS = () => [
  placedAt(toyHeapHolder(), HEAP),
  named(pallet(), "pallet", PALLET),
  placedAt(chart(), CHART_AT), // hangs on the wall (not a floor-standing collider)
];
const placedAt = (o: Object3D, p: Vector3) => (o.position.copy(p), o);
const toyHeapHolder = () => {
  const g = new Group().add(toyHeap());
  g.userData.decor = true; // toys around the feet are the gag (guard: not a collider for cards)
  return g;
};
