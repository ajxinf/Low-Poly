import { useMemo } from "react";
import { BoxGeometry, BufferAttribute, BufferGeometry, ConeGeometry, CylinderGeometry, Group, Mesh, Object3D, SphereGeometry, Vector3 } from "three";
import { LightPreset } from "../lights";
import { rng } from "../paint";
import { PracticalKind, practicalLights, toonMaterial } from "../shade";
import { BuildingSpec, building, specFacts } from "./building";
import { debris, groundMaterial, puddle, scraps } from "./ground";
import { Kit, M, MAT } from "./kit";
import { EraPreset, PropKind } from "./presets";
import {
  FIRE_HEAD, LAMP_HEAD, aisleSign, barrel, bench, bird, bollard, campfire, car, cart, checkout, clockTower, crate, fence, flag,
  hayBale, hedge, lampPost, mailbox, pine, shelf, signpost, trashBin, washingLine, waterTrough,
} from "./props";
import { Smoke } from "./smoke";
import { signTex } from "./textures";
import { pickVaried } from "./variety";

/** A street spine bending gently right: `at(s, x, y)` = point at arc length s, x m to the right, height y. */
export const spine = (curve = 0.0032) => {
  const centre = (s: number) => new Vector3(curve * s * s, 0, -s);
  const tangent = (s: number) => new Vector3(2 * curve * s, 0, -1).normalize();
  const right = (s: number) => {
    const t = tangent(s);
    return new Vector3(-t.z, 0, t.x);
  };
  const at = (s: number, x: number, y = 0) => centre(s).addScaledVector(right(s), x).setY(y);
  return { at, tangent, right };
};
/** Y rotation that turns local +z toward `dir`. */
export const yaw = (dir: Vector3) => Math.atan2(dir.x, dir.z);

export type StreetOpts = {
  seed?: number;
  length?: number;
  curve?: number;
  /** Half-widths: carriageway and building fronts (detached layouts add the yard). */
  road?: number;
  front?: number;
  /** Lamp spots: [s, side]. Default every 7 m, alternating sides. */
  lamps?: [number, number][];
  /** Close the street end with a clock tower in a small square (default: a closing row of buildings). */
  landmark?: boolean;
  /** Practical lights nearest this point win when there are more than `maxLights`. */
  lightCenter?: Vector3;
  maxLights?: number;
  /** Extra objects for this video's shots (foreground framing props etc.), placed by the caller. */
  extra?: (sp: ReturnType<typeof spine>) => Object3D[];
  /** Practical lights for those extra objects. */
  extraLights?: { pos: Vector3; kind: PracticalKind }[];
};

type Light = { pos: Vector3; kind: PracticalKind };
const PRIORITY: Record<PracticalKind, number> = { lamp: 0, fire: 0, shop: 1, window: 2 };

const ribbon = (at: (s: number, x: number) => Vector3, s0: number, s1: number, x0: number, x1: number) => {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const n = Math.ceil(s1 - s0);
  for (let i = 0; i <= n; i++) {
    const s = s0 + ((s1 - s0) * i) / n;
    for (const x of [x0, x1]) {
      pos.push(...at(s, x).toArray());
      uv.push(x, s);
    }
    if (i < n) idx.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("uv", new BufferAttribute(new Float32Array(uv), 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
};

const pickN = <T,>(r: () => number, a: T[]) => a[Math.floor(r() * a.length)];

/** A building spec drawn from a preset (attempt number reseeds, for the variety rule). */
export const presetSpec = (p: EraPreset, w: number, seed: number, attempt: number): BuildingSpec => {
  const r = rng(seed * 131 + attempt * 7919);
  const wall = pickN(r, p.walls);
  const shop = r() < p.shops.chance && p.shops.signs.length;
  return {
    w,
    d: 8,
    floors: p.floors[0] + Math.floor(r() * (p.floors[1] - p.floors[0] + 1)),
    wall: { kind: wall.kind, color: pickN(r, wall.colors) },
    trim: pickN(r, p.trims),
    roof: { type: pickN(r, p.roofs.types), color: pickN(r, p.roofs.colors), snow: p.roofs.snow },
    lean: (r() - 0.5) * 3,
    roofline: r(),
    windows: { styles: pickN(r, p.windowStyles), lit: p.lit, shutter: pickN(r, p.shutters.length ? p.shutters : ["#3a3a40"]), curtain: pickN(r, p.curtains.length ? p.curtains : ["#c2603c"]) },
    shop: shop ? { frame: pickN(r, p.shops.frames), sign: pickN(r, p.shops.signs), awning: p.shops.awnings.length && r() < 0.6 ? pickN(r, p.shops.awnings) : undefined } : undefined,
    door: pickN(r, p.doors),
    chimneys: p.chimneys[0] + Math.floor(r() * (p.chimneys[1] - p.chimneys[0] + 1)),
    drainpipe: r() < 0.5,
    posters: Math.floor(r() * (p.posters + 1)),
    porch: r() < p.porch,
    seed: seed * 17 + attempt,
  };
};

/** Prop builders; `r` is the street's seeded random (never Math.random: every render tab must agree). */
const PROP: Record<PropKind, (r: () => number) => Object3D> = {
  bench, barrel, cart, bollard, hayBale, waterTrough, mailbox, trashBin, campfire,
  crate: (r) => crate(0.6 + r() * 0.3),
  signpost: () => signpost(),
  pine: (r) => pine(4 + r() * 2.5),
  hedge: () => hedge(4),
  car: (r) => car(pickN(r, ["#c8423a", "#3a6aa8", "#e8e0d0", "#4a7a5a"])),
  fence: () => fence(5),
};

/** Builds the whole street for a preset. Returns the scene group, smoke sources and the spine helpers. */
export const buildStreet = (p: EraPreset, light: LightPreset, o: StreetOpts = {}) => {
  if (p.layout === "interior") return buildInterior(p, light, o);
  const seed = o.seed ?? 11, L = o.length ?? 50, r = rng(seed);
  const sp = spine(o.curve ?? 0.0032);
  const { at, tangent, right } = sp;
  const ROAD = o.road ?? 3.4;
  const WALK = ROAD + 2;
  const FRONT = o.front ?? (p.layout === "detached" ? WALK + 3 : WALK);
  const g = new Group();
  const lights: Light[] = [], smoke: Vector3[] = [], perches: Vector3[] = [];
  const place = (obj: Object3D, pos: Vector3, ry: number) => {
    obj.position.copy(pos);
    obj.rotation.y = ry;
    g.add(obj);
    obj.updateMatrixWorld(true);
    return obj;
  };

  // Ground: carriageway with a worn middle, walks, yards.
  const ground = (mat: ReturnType<typeof groundMaterial>, x0: number, x1: number, y = 0) => {
    const m = new Mesh(ribbon(at, -12, L + 16, x0, x1), mat);
    m.position.y = y;
    m.receiveShadow = true;
    g.add(m);
  };
  ground(groundMaterial(p.road, { center: 0, width: 2.4 }), -ROAD, ROAD);
  const walk = groundMaterial(p.walk);
  ground(walk, -WALK, -ROAD, 0.02);
  ground(walk, ROAD, WALK, 0.02);
  if (p.layout === "detached" && p.yard) {
    const yard = groundMaterial(p.yard);
    ground(yard, -FRONT - 12, -WALK, 0.015);
    ground(yard, WALK, FRONT + 12, 0.015);
  }
  // Curbs.
  for (const side of [-1, 1]) {
    const c = new Mesh(ribbon(at, -12, L + 16, side * ROAD - 0.08, side * ROAD + 0.08), MAT.stone());
    c.position.y = 0.06;
    c.receiveShadow = true;
    g.add(c);
  }

  // Buildings: varied (>= 3 differing parameters between any two), terraced or detached.
  const facts: ReturnType<typeof specFacts>[] = [];
  let bi = 0;
  for (const side of [-1, 1]) {
    let s = -8;
    while (s < L) {
      const w = p.width[0] + r() * (p.width[1] - p.width[0]);
      const spec = pickVaried((a) => presetSpec(p, w, seed * 100 + bi, a), specFacts, facts);
      facts.push(specFacts(spec));
      bi++;
      const sc = s + w / 2;
      const b = building(spec);
      place(b.group, at(sc, side * (FRONT + spec.d / 2)), yaw(right(sc).multiplyScalar(-side)));
      for (const c of b.chimneys) smoke.push(b.group.localToWorld(c.clone()));
      for (const l of b.lights) lights.push({ pos: b.group.localToWorld(l.pos.clone()), kind: l.kind });
      for (const q of b.perches) perches.push(b.group.localToWorld(q.clone()));
      s += w + p.gap[0] + r() * (p.gap[1] - p.gap[0]);
    }
  }

  // Close the view: a small square with a clock tower, or just a closing row (references always end the street).
  {
    const sq = new Mesh(ribbon(at, L - 6, L + 20, -16, 16), groundMaterial(p.walk));
    sq.position.y = 0.025;
    sq.receiveShadow = true;
    g.add(sq);
    if (o.landmark) place(clockTower(), at(L + 6, 1.5), yaw(tangent(L + 6).negate()));
    for (const x of [-8, 0, 8]) {
      const spec = pickVaried((a) => presetSpec(p, 8, seed * 100 + bi, a), specFacts, facts);
      facts.push(specFacts(spec));
      bi++;
      place(building({ ...spec, floors: o.landmark ? Math.max(spec.floors, 3) : p.floors[1] }).group, at(L + 14, x), yaw(tangent(L + 14).negate()));
    }
  }

  // Lamps.
  const lampSpots = o.lamps ?? Array.from({ length: Math.ceil(L / 7) }, (_, i) => [3 + i * 7, i % 2 ? -1 : 1] as [number, number]);
  for (const [s, side] of lampSpots) {
    const x = p.layout === "detached" ? side * (ROAD + 0.6) : side * (WALK - 0.5);
    const ry = yaw(right(s).multiplyScalar(-side)) - Math.PI / 2; // arm reaches over the street
    const lp = place(lampPost(), at(s, x), ry);
    lights.push({ pos: lp.localToWorld(LAMP_HEAD.clone()), kind: "lamp" });
  }

  // Props along the walks (or yards), keeping clear of lamps.
  const nProps = Math.round(L / 4.5);
  for (let i = 0; i < nProps; i++) {
    const kind = pickN(r, p.props), side = i % 2 ? 1 : -1, s = 2 + r() * (L - 4);
    if (lampSpots.some(([ls]) => Math.abs(ls - s) < 1.6)) continue;
    let x = side * (WALK - 0.6), ry = yaw(right(s).multiplyScalar(-side)) + (r() - 0.5) * 0.5;
    if (kind === "car") [x, ry] = [side * (ROAD - 1.1), yaw(tangent(s)) - Math.PI / 2];
    if (kind === "hedge" || kind === "fence") [x, ry] = [side * (WALK + 0.3), yaw(tangent(s)) + Math.PI / 2];
    if (kind === "mailbox") x = side * (WALK + 0.2);
    if (kind === "pine" || kind === "campfire") x = side * (WALK + 1.5 + r() * 2.5);
    const obj = place(PROP[kind](r), at(s, x), ry);
    if (kind === "campfire") lights.push({ pos: obj.localToWorld(FIRE_HEAD.clone()), kind: "fire" });
  }

  // Washing lines across the street, birds on roofs, flags off facades.
  if (p.washing)
    for (const s of [L * 0.3, L * 0.62]) place(washingLine(2 * FRONT, 6.2), at(s, -FRONT), yaw(right(s)) - Math.PI / 2);
  for (let i = 0; i < p.birds && perches.length; i++) {
    const q = perches[Math.floor(r() * perches.length)];
    const b = place(bird(i + seed), q.clone().add(new Vector3((r() - 0.5) * 1.5, 0, (r() - 0.5) * 0.3)), r() * 6);
    b.scale.setScalar(1.6);
  }
  p.flags.forEach((c, i) => {
    const s = L * (0.2 + 0.35 * i), side = i % 2 ? 1 : -1;
    const f = flag(c[0], c[1], 2.4);
    f.position.copy(at(s, side * (FRONT - 0.05), 5.2));
    f.rotation.set(0.9, yaw(right(s).multiplyScalar(-side)), 0, "YXZ");
    g.add(f);
  });

  // Puddles reflecting the sky, loose stones and scraps along the curbs and wall bases.
  for (let i = 0; i < p.puddles; i++) {
    const pd = puddle(0.4 + r() * 0.7, 0.3 + r() * 0.45, seed + i, light, p.puddleRim ?? "#4a3a44");
    pd.position.add(at(4 + r() * (L - 8), (r() - 0.5) * 2 * (ROAD - 0.9)));
    pd.rotation.y = r() * 3;
    g.add(pd);
  }
  const edge = (t: number, rr: () => number) => {
    const side = rr() < 0.5 ? -1 : 1;
    const x = rr() < 0.6 ? side * (ROAD - 0.1 - rr() * 0.4) : side * (FRONT - 0.15 - rr() * 0.3);
    return at(-6 + t * (L + 10), x);
  };
  if (p.debris.length) g.add(...debris(140, edge, p.debris, seed + 5));
  if (p.scraps.length) g.add(...scraps(40, edge, p.scraps, seed + 6));

  if (p.backdrop) g.add(backdrop(p.backdrop, at(L + 14, 0), tangent(L + 14), seed));
  o.extra?.(sp).forEach((obj) => g.add(obj));
  lights.push(...(o.extraLights ?? []));
  g.add(pickLights(lights, light, o.lightCenter ?? at(L * 0.4, 0, 2), o.maxLights ?? 24));
  return { group: g, smoke, sp, ROAD, WALK, FRONT };
};

/** Distant hills / mesas / snowy mountains in a 120 deg fan 90-150 m past the street end (aerial perspective hazes them). */
const backdrop = (b: NonNullable<EraPreset["backdrop"]>, end: Vector3, dir: Vector3, seed: number) => {
  const r = rng(seed + 77), k = new Kit();
  const m = MAT.color(b.color), snow = MAT.color("#f4f6fc"), tree = b.trees ? MAT.color(b.trees) : null;
  const base = Math.atan2(dir.x, -dir.z);
  for (let i = 0; i < 14; i++) {
    const a = base + (i / 13 - 0.5) * 2.2, d = 90 + r() * 60;
    const x = end.x + Math.sin(a) * d, z = end.z - Math.cos(a) * d;
    if (b.shape === "mesas") {
      const w = 30 + r() * 40, h = 22 + r() * 18;
      k.add(m, new CylinderGeometry(w * 0.42, w * 0.5, h, 7), x, h / 2, z);
    } else if (b.shape === "mountains") {
      const h = 45 + r() * 40;
      k.add(m, new ConeGeometry(h * 0.9, h, 6), x, h / 2 - 2, z);
      k.add(snow, new ConeGeometry(h * 0.3, h * 0.33, 6), x, h - h * 0.165 - 2, z);
    } else {
      const w = 40 + r() * 50, h = 20 + r() * 16;
      const hill = new SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
      hill.scale(w, h, w * 0.6);
      k.add(m, hill, x, -1, z);
    }
    if (tree)
      for (let j = 0; j < 6; j++) {
        const tx = x + (r() - 0.5) * 30, tz = z + (r() - 0.5) * 20 - 25, th = 6 + r() * 5;
        k.add(tree, new ConeGeometry(th * 0.3, th, 6), tx, th / 2 + 2, tz);
      }
  }
  const grp = k.build();
  grp.traverse((o) => ((o as Mesh).castShadow = false));
  return grp;
};

const pickLights = (lights: Light[], light: LightPreset, center: Vector3, max: number) =>
  practicalLights(
    [...lights].sort((a, b) => PRIORITY[a.kind] - PRIORITY[b.kind] || a.pos.distanceTo(center) - b.pos.distanceTo(center)).slice(0, max),
    light,
  );

/** Supermarket interior: tiled floor, aisles of stocked shelves, checkouts, hanging signs, ceiling light panels. */
const buildInterior = (p: EraPreset, light: LightPreset, o: StreetOpts) => {
  const seed = o.seed ?? 11, r = rng(seed);
  const sp = spine(0);
  const { at } = sp;
  const g = new Group();
  const HW = 12, LEN = 44, H = 5.5;
  const floor = new Mesh(ribbon(at, -4, LEN, -HW, HW), groundMaterial(p.road, { center: 0, width: 3 }));
  floor.receiveShadow = true;
  g.add(floor);
  // Shell: walls and ceiling never cast shadows (the key stands in for the ceiling lights).
  const shell = new Kit();
  const wall = MAT.color(p.walls[0].colors[0]);
  shell.box(wall, 0.3, H, LEN + 4, -HW, H / 2, -(LEN - 4) / 2);
  shell.box(wall, 0.3, H, LEN + 4, HW, H / 2, -(LEN - 4) / 2);
  shell.box(wall, HW * 2, H, 0.3, 0, H / 2, -LEN);
  shell.box(MAT.color("#f2f2f4"), HW * 2, 0.3, LEN + 4, 0, H, -(LEN - 4) / 2);
  shell.box(MAT.color(p.trims[0]), HW * 2, 0.5, 0.32, 0, 3.6, -LEN + 0.05);
  const shellG = shell.build();
  shellG.traverse((m) => ((m as Mesh).castShadow = false));
  g.add(shellG);
  // Department signs on the back wall.
  p.shops.signs.slice(0, 4).forEach((t, i) => {
    const s = new Mesh(new BoxGeometry(4, 0.8, 0.06), M(`dept${t}`, () => toonMaterial({ map: signTex(t, "#2a5a9a", "#ffffff") })));
    s.position.copy(at(LEN - 0.2, -HW + 3.2 + i * 5.8, 4.4));
    g.add(s);
  });
  // Aisles.
  const lights: Light[] = [];
  const aisleX = [-9, -5, -1, 3, 7];
  aisleX.forEach((x, i) => {
    const sh = shelf(12, seed + i);
    sh.position.copy(at(26, x));
    sh.rotation.y = Math.PI / 2;
    g.add(sh);
    const sign = aisleSign(`AISLE ${i + 1}`);
    sign.position.copy(at(19, x + 2, 4.2));
    g.add(sign);
  });
  // Checkouts near the entrance, produce crates on the left.
  for (const x of [-6, -1, 4]) {
    const c = checkout();
    c.position.copy(at(6, x));
    c.rotation.y = Math.PI / 2;
    g.add(c);
  }
  for (let i = 0; i < 6; i++) {
    const c = crate(0.7);
    c.position.copy(at(10 + (i % 3) * 1.1, -10.5 + Math.floor(i / 3) * 1.1));
    g.add(c);
    for (let j = 0; j < 5; j++) {
      const f = new Mesh(new SphereGeometry(0.12, 7, 5), MAT.color(["#d84a3a", "#f2c84a", "#4ab06a", "#f28a3a"][(i + j) % 4]));
      f.position.copy(c.position).add(new Vector3((r() - 0.5) * 0.4, 0.75, (r() - 0.5) * 0.4));
      g.add(f);
    }
  }
  // Ceiling light panels: emissive strips with real lights under them.
  for (let s = 2; s < LEN - 2; s += 7)
    for (const x of [-7, 0, 7]) {
      const panel = new Mesh(new BoxGeometry(3.2, 0.06, 0.6), MAT.glow("#fff4dc", 3));
      panel.position.copy(at(s, x, H - 0.2));
      g.add(panel);
      lights.push({ pos: at(s, x, H - 0.6), kind: "lamp" });
    }
  g.add(pickLights(lights, light, o.lightCenter ?? at(12, 0, 2), o.maxLights ?? 24));
  return { group: g, smoke: [] as Vector3[], sp, ROAD: HW, WALK: HW, FRONT: HW };
};

/** R3F wrapper: the built street plus chimney smoke. Build once per mount (dissolves mount two canvases). */
export const Street: React.FC<{ preset: EraPreset; light: LightPreset; opts?: StreetOpts }> = ({ preset, light, opts }) => {
  const built = useMemo(() => buildStreet(preset, light, opts), [preset, light, opts]);
  return (
    <>
      <primitive object={built.group} />
      {built.smoke.length > 0 && <Smoke from={built.smoke} color={preset.smoke} />}
    </>
  );
};
