import { CircleGeometry, ConeGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, Object3D, SphereGeometry, Vector3 } from "three";
import { StreetOpts, spine } from "../../../kit/toon/build/street";
import { Kit, M, MAT } from "../../../kit/toon/build/kit";
import { NOINK } from "../../../kit/toon/ink";
import { toonMaterial } from "../../../kit/toon/shade";

// World layout for _pipeline-test-2: a straight modern-suburb street by day. In the right-hand front yard (x 5.4-10.5)
// stand two garden sheds with a low fence between them: yours (s 14) and the neighbour's (s 18.4). Shed roofs slope
// down toward the road so a camera on the road side sees them.
export const SP = spine(0);
/** Point at arc length s (m down the street = -z), x m right of the centre line (= +x), height y. */
export const at = SP.at;

export const SHED = { w: 2.2, d: 1.8, back: 2.15, front: 1.75, x: 7.4 }; // w along s, d along x; wall heights
export const YOURS = { s: 14 }, HIS = { s: 18.4 };
export const FENCE_S = 16.6; // clear of the front path of the house at s 11.3
/** Roof plane: height at local depth u (0 = front/road edge, 1 = back). */
export const roofY = (u: number) => SHED.front + 0.08 + (SHED.back - SHED.front) * u;
const ROOF_TILT = Math.atan2(SHED.back - SHED.front, SHED.d);

const named = (o: Object3D, name: string, p: Vector3) => {
  o.position.copy(p);
  o.userData.collider = name;
  return o;
};

/** A garden shed; roof colour is the story (white = yours, black = his). Local +x = toward the houses. */
const shed = (wall: string, roof: string) => {
  const k = new Kit(), { w, d, back, front } = SHED;
  const walls = MAT.color(wall);
  k.box(walls, 0.08, front, w, -d / 2, front / 2, 0); // road-side wall (low)
  k.box(walls, 0.08, back, w, d / 2, back / 2, 0);
  for (const z of [-w / 2, w / 2]) k.box(walls, d, front, 0.08, 0, front / 2, z); // sides up to the low height
  k.box(MAT.darkWood(), 0.06, 1.3, 0.75, -d / 2 - 0.03, 0.65, 0.2); // door on the road side
  const r = new Kit();
  r.box(MAT.color(roof), d + 0.3, 0.07, w + 0.3, 0, 0, 0);
  const roofG = r.build();
  roofG.rotation.z = ROOF_TILT; // high edge toward +x (back)
  roofG.position.y = (front + back) / 2 + 0.08;
  const g = new Group();
  g.add(k.build(), roofG);
  return g;
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

/** Paint roller on a long pole: roller head at the origin, pole running down toward local -x/-y. */
export const roller = () => {
  const k = new Kit();
  k.add(M("paint", () => toonMaterial({ color: "#fbf8f0" })), new CylinderGeometry(0.06, 0.06, 0.32, 12), 0, 0, 0, { rx: Math.PI / 2 });
  k.add(MAT.darkWood(), new CylinderGeometry(0.018, 0.018, 2.0, 6), -0.62, -0.78, 0, { rz: Math.PI / 2 - Math.atan2(1.56, 1.24) });
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

/** The heatwave sun: a big HDR disc far up the sky (blooms), drawn without ink or fog. */
export const sunDisc = () => {
  const m = new Mesh(new CircleGeometry(22, 48), new MeshBasicMaterial({ color: "#ffe7a0", fog: false, toneMapped: false }));
  // 0.97, not HDR: a 22 m disc this close fills ~7 % of the frame and clipped to pure white at x2.2 (video_qa CLIP).
  m.material.color.multiplyScalar(0.97);
  m.layers.set(NOINK);
  return m;
};

/** A ray of sunlight: an emissive rod from a to b (HDR, blooms), no ink. */
export const ray = (color: string) => {
  const m = new Mesh(new CylinderGeometry(0.035, 0.035, 1, 8), new MeshBasicMaterial({ color, fog: false, toneMapped: false, transparent: true }));
  m.material.color.multiplyScalar(2.5);
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
    named(shed("#c8d8c0", "#4a4a52"), "your shed", at(YOURS.s, SHED.x)),
    named(shed("#e8d8a0", "#26242a"), "his shed", at(HIS.s, SHED.x)),
    named(fence(), "fence", at(FENCE_S, SHED.x - 0.3)),
  ],
};
