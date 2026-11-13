import {
  BoxGeometry, CanvasTexture, ConeGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry,
  SRGBColorSpace, SphereGeometry, TorusGeometry, Vector3,
} from "three";
import { Kit, M, MAT } from "../../../kit/toon/build/kit";
import { StreetOpts, spine } from "../../../kit/toon/build/street";
import { signTex } from "../../../kit/toon/build/textures";
import { glowSprite } from "../../../kit/toon/glow";
import { scrawl, scrawlTex, signFace } from "../../../kit/toon/build/signs";
import { TOY_COLS, TOY_KINDS, battery, dinoToy, duckToy, shakeBox, toyParts, toyPile } from "../../../kit/toon/build/toys";
import { lantern, megaphone, toothbrush } from "../../../kit/toon/build/storyprops";
import { STORE_PANES, streetViewTex, windowViews as paneViews } from "../../../kit/toon/build/views";
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
    toyParts(tk, TOY_KINDS[Math.floor(r() * TOY_KINDS.length)], TOY_COLS[i % TOY_COLS.length], x, y - 0.1, z, 0.5 + r() * 0.3);
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
/** Battery lantern on the pallet (the night scene's warm practical). */
export const LANTERN = IN(7.2 - 0.3, 8.8 - 0.35, 0.13);
const placedAt = (o: Object3D, p: Vector3) => (o.position.copy(p), o);
const toyHeapHolder = () => {
  const g = new Group().add(toyHeap());
  g.userData.decor = true; // toys around the feet are the gag (guard: not a collider for cards)
  return g;
};

export const toyHeap = () => toyPile();
export { battery, dinoToy, duckToy, megaphone, scrawlTex, shakeBox, toothbrush };
/** The street across from FRESHMART through its front windows: CHAD'S HARDWARE with Chad, his generator and floods. */
const windowViews = (night: boolean) =>
  paneViews(STORE_PANES, streetViewTex({ night, landmark: { name: "CHAD'S HARDWARE", x0: 4.6, x1: 8.0, roofFigure: { body: "#f2efe6", cap: "#2e4ab0" }, floodlights: true, generator: true } }), { tint: night ? "#ffffff" : "#e8e4dc" });
