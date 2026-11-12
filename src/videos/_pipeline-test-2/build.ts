import { BoxGeometry, CircleGeometry, ConeGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, Object3D, SphereGeometry, Vector3 } from "three";
import { StreetOpts, spine } from "../../../kit/toon/build/street";
import { Kit, M, MAT } from "../../../kit/toon/build/kit";
import { NOINK } from "../../../kit/toon/ink";
import { toonMaterial } from "../../../kit/toon/shade";

// World layout for _pipeline-test-2: a straight modern-suburb street by day. In the right-hand front yard stand two
// garden sheds with a low fence between them: yours (s 14) and the neighbour's (s 18.4), each with a step ladder in
// front; trees, a flower bed, a gnome and a hose reel dress the yard. Roofs slope down toward the road.
export const SP = spine(0);
/** Point at arc length s (m down the street = -z), x m right of the centre line (= +x), height y. */
export const at = SP.at;

// Real garden-shed size: 2.0 m door, walls 2.3 / 2.75 m (guard "Scale": the 1.69 m neighbour + visor fits). w along s,
// d along x. x 7.2 keeps the back overhang (8.35) short of the porches (8.4).
export const SHED = { w: 2.6, d: 2.0, back: 2.75, front: 2.3, x: 7.2, door: 2.0 };
/** Step ladders the painters stand on (top platform height): a hand at ~2.4 m clears the 2.38 m eave. */
export const LADDER_H = 1.4;
export const LADDER_X = 5.55;
export const YOURS = { s: 14 }, HIS = { s: 18.4 };
export const FENCE_S = 16.6; // clear of the front path of the house at s 11.3
/** Roof plane: height at local depth u (0 = front/road edge, 1 = back). */
export const roofY = (u: number) => SHED.front + 0.08 + (SHED.back - SHED.front) * u;
const ROOF_TILT = Math.atan2(SHED.back - SHED.front, SHED.d);

const named = (o: Object3D, name: string, p: Vector3, door?: number) => {
  o.position.copy(p);
  o.userData.collider = name;
  if (door) o.userData.door = door; // guard "Scale": nobody near it is taller than the door
  return o;
};

/** A garden shed; roof colour is the story (white = yours, black = his). Local +x = toward the houses. */
const shed = (wall: string, roof: string) => {
  const k = new Kit(), { w, d, back, front } = SHED;
  const walls = MAT.color(wall);
  k.box(walls, 0.08, front, w, -d / 2, front / 2, 0); // road-side wall (low)
  k.box(walls, 0.08, back, w, d / 2, back / 2, 0);
  for (const z of [-w / 2, w / 2]) k.box(walls, d, front, 0.08, 0, front / 2, z); // sides up to the low height
  k.box(MAT.darkWood(), 0.06, SHED.door, 0.85, -d / 2 - 0.03, SHED.door / 2, 0.3); // door on the road side
  k.add(MAT.color("#d8b45a"), new SphereGeometry(0.04, 8, 6), -d / 2 - 0.08, 1.0, 0.0); // knob
  k.box(MAT.winDark(), 0.05, 0.5, 0.6, -d / 2 - 0.02, 1.55, -0.65); // small window
  const r = new Kit();
  r.box(MAT.color(roof), d + 0.3, 0.07, w + 0.3, 0, 0, 0);
  const roofG = r.build();
  roofG.rotation.z = ROOF_TILT; // high edge toward +x (back)
  roofG.position.y = (front + back) / 2 + 0.08;
  const g = new Group();
  g.add(k.build(), roofG);
  return g;
};

/** A-frame step ladder, top platform at LADDER_H. Local +x = toward the shed. */
const stepLadder = () => {
  const k = new Kit(), h = LADDER_H, alu = MAT.color("#b8bcc4");
  k.box(alu, 0.42, 0.05, 0.5, 0, h - 0.025, 0);
  for (const [x0, x1] of [[-0.42, -0.17], [0.42, 0.17]])
    for (const z of [-0.22, 0.22]) {
      const len = Math.hypot(h - 0.05, x1 - x0);
      k.add(alu, new BoxGeometry(0.05, len, 0.05), (x0 + x1) / 2, (h - 0.05) / 2, z, { rz: Math.atan2(x1 - x0, h - 0.05) });
    }
  for (const y of [0.35, 0.7, 1.05]) k.box(MAT.color("#9aa0aa"), 0.16, 0.04, 0.44, -0.42 + (0.25 * y) / h, y, 0);
  return k.build();
};

/** Deciduous garden tree: trunk + three overlapping crowns (two greens). */
const tree = (h: number, seed: number) => {
  const k = new Kit(), leaf = MAT.color(seed % 2 ? "#4f8f3e" : "#5f9a44"), dark = MAT.color("#3e7232");
  k.add(MAT.color("#6a4a34"), new CylinderGeometry(0.12, 0.18, h * 0.55, 8), 0, h * 0.275, 0);
  const r = h * 0.26;
  k.add(leaf, new SphereGeometry(r, 12, 9), 0, h * 0.7, 0);
  k.add(dark, new SphereGeometry(r * 0.8, 12, 9), r * 0.6, h * 0.6, r * 0.3);
  k.add(leaf, new SphereGeometry(r * 0.75, 12, 9), -r * 0.55, h * 0.62, -r * 0.35);
  return k.build();
};

/** A strip of flowers on a soil bed, length along local z. */
const flowerBed = (len: number) => {
  const k = new Kit();
  k.box(MAT.color("#6a4a38"), 0.5, 0.06, len, 0, 0.03, 0);
  const cols = ["#e8506a", "#f2d04a", "#f4f0e6", "#b06ad0"];
  for (let i = 0; i < len / 0.22; i++) {
    const z = -len / 2 + 0.11 + i * 0.22, x = ((i * 37) % 7) / 20 - 0.15;
    k.add(MAT.color("#3e7a32"), new CylinderGeometry(0.015, 0.015, 0.25, 4), x, 0.18, z);
    k.add(MAT.color(cols[i % cols.length]), new SphereGeometry(0.07, 8, 6), x, 0.32, z);
  }
  return k.build();
};

/** Garden gnome (red hat): the kind of detail a close-up rewards. */
const gnome = () => {
  const k = new Kit();
  k.add(MAT.color("#3e6aa8"), new CylinderGeometry(0.1, 0.13, 0.22, 10), 0, 0.11, 0);
  k.add(MAT.color("#f4ece0"), new SphereGeometry(0.09, 10, 8), 0, 0.3, 0);
  k.add(MAT.color("#f4f0e6"), new ConeGeometry(0.08, 0.12, 8), 0, 0.24, 0.05, { rx: Math.PI });
  k.add(MAT.color("#c8302e"), new ConeGeometry(0.1, 0.24, 10), 0, 0.46, 0);
  return k.build();
};

/** Hose reel on a little stand (heatwave set dressing). */
const hoseReel = () => {
  const k = new Kit();
  k.add(MAT.color("#3e8a4a"), new CylinderGeometry(0.22, 0.22, 0.14, 16), 0, 0.3, 0, { rx: Math.PI / 2 });
  k.add(MAT.color("#2e6a38"), new CylinderGeometry(0.16, 0.16, 0.16, 16), 0, 0.3, 0, { rx: Math.PI / 2 });
  k.box(MAT.metal(), 0.06, 0.3, 0.3, 0, 0.15, 0);
  return k.build();
};

/** Low picket fence along x between the yards. */
const fence = () => {
  const k = new Kit(), m = MAT.color("#efe6d6");
  for (let x = -1.6; x <= 1.6; x += 0.32) k.box(m, 0.07, 0.9, 0.05, x, 0.45, 0);
  for (const y of [0.3, 0.7]) k.box(m, 3.4, 0.06, 0.04, 0, y, 0);
  return k.build();
};

/** Fresh white paint over a roof: a thin slab whose coverage (0..1 along s) grows from one end. */
export const paintSlab = () => {
  const k = new Kit();
  k.box(M("paint", () => toonMaterial({ color: "#fbf8f0" })), SHED.d + 0.3, 0.02, 1, 0, 0, 0.5, false);
  const g = k.build();
  g.rotation.z = ROOF_TILT;
  const holder = new Group();
  holder.add(g);
  return holder;
};

/** Paint roller head (the pole is its own prop in props.ts). */
export const roller = () => {
  const k = new Kit();
  k.add(M("paint", () => toonMaterial({ color: "#fbf8f0" })), new CylinderGeometry(0.06, 0.06, 0.32, 12), 0, 0, 0, { rx: Math.PI / 2 });
  return k.build();
};

/** Ice cream cone; the scoop melts (scale 1 -> 0) and drips. Origin at the cone tip. */
export const iceCream = () => {
  const cone = new Mesh(new ConeGeometry(0.06, 0.18, 14), M("cone", () => toonMaterial({ color: "#d39a52" })));
  cone.rotation.z = Math.PI;
  cone.position.y = 0.09;
  const scoop = new Mesh(new SphereGeometry(0.075, 16, 12), M("scoop", () => toonMaterial({ color: "#f3a8c2" })));
  scoop.position.y = 0.2;
  scoop.name = "scoop";
  const drip = new Mesh(new SphereGeometry(0.03, 10, 8), M("scoop", () => toonMaterial({ color: "#f3a8c2" })));
  drip.name = "drip";
  const g = new Group();
  g.add(cone, scoop, drip);
  return g;
};

/** Lemonade glass. Origin at its base. */
export const lemonade = () => {
  const k = new Kit();
  k.add(M("lemon", () => toonMaterial({ color: "#f2d65a" })), new CylinderGeometry(0.05, 0.045, 0.16, 14), 0, 0.08, 0);
  return k.build();
};

/** The heatwave sun: a big disc far up the sky, drawn without ink or fog. */
export const sunDisc = () => {
  const m = new Mesh(new CircleGeometry(22, 48), new MeshBasicMaterial({ color: "#ffe7a0", fog: false, toneMapped: false }));
  // 0.97, not HDR: a 22 m disc this close fills ~7 % of the frame and clipped to pure white at x2.2 (video_qa CLIP).
  m.material.color.multiplyScalar(0.97);
  m.layers.set(NOINK);
  return m;
};

/** His black roof heating up: a red-hot overlay whose opacity follows the story. */
export const hotRoof = () => {
  const k = new Kit();
  k.box(M("hot", () => new MeshBasicMaterial({ color: "#ff4a1a", transparent: true, opacity: 0, fog: false, toneMapped: false })), SHED.d + 0.32, 0.02, SHED.w + 0.32, 0, 0, 0, false);
  const g = k.build();
  g.rotation.z = ROOF_TILT;
  g.traverse((o) => o.layers.set(NOINK));
  const holder = new Group();
  holder.add(g);
  return holder;
};

/** Centre of a shed's roof surface at local depth u (0 front .. 1 back) and s offset ds. */
export const roofPoint = (s: number, u: number, ds = 0) => at(s + ds, SHED.x - SHED.d / 2 + SHED.d * u, roofY(u) + 0.045);

export const OPTS: StreetOpts = {
  seed: 31,
  length: 34,
  curve: 0,
  lamps: [[4, -1], [26, -1]],
  landmark: false,
  lightCenter: at(16, 4, 2),
  extra: () => [
    named(shed("#c8d8c0", "#4a4a52"), "your shed", at(YOURS.s, SHED.x), SHED.door),
    named(shed("#e8d8a0", "#26242a"), "his shed", at(HIS.s, SHED.x), SHED.door),
    named(fence(), "fence", at(FENCE_S, SHED.x - 0.3)),
    named(stepLadder(), "your ladder", at(YOURS.s + 0.4, LADDER_X)),
    named(stepLadder(), "his ladder", at(HIS.s + 0.2, LADDER_X)),
    named(tree(5.2, 1), "tree left", at(10.0, 6.4)),
    named(tree(4.6, 2), "tree right", at(21.9, 7.2)),
    named(flowerBed(1.0), "flower bed", at(15.95, 6.0)),
    named(gnome(), "gnome", at(15.95, 5.3)),
    named(hoseReel(), "hose reel", at(19.95, 5.7)),
  ],
};
