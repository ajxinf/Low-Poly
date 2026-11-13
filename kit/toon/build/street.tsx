import { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import { Box3, BufferAttribute, BufferGeometry, CatmullRomCurve3, ConeGeometry, CylinderGeometry, Group, Mesh, Object3D, SphereGeometry, TubeGeometry, Vector3 } from "three";
import { LightPreset } from "../lights";
import { rng } from "../paint";
import { PracticalKind, practicalLights } from "../shade";
import { practicalGlows } from "../glow";
import { BuildingSpec, building, specFacts } from "./building";
import { debris, groundMaterial, puddle, scraps } from "./ground";
import { Kit, MAT } from "./kit";
import { EraPreset, PropKind } from "./presets";
import {
  FIRE_HEAD, LAMP_HEAD, barrel, bench, bird, bollard, campfire, car, cart, clockTower, crate, fence, flag,
  hayBale, hedge, lampPost, mailbox, pine, signpost, trashBin, washingLine, waterTrough,
} from "./props";
import { Smoke } from "./smoke";
import { buildSupermarket } from "./supermarket";
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
  /** Override the preset's utility poles and wires (off when a shot needs open sky, e.g. a light gag). */
  wires?: boolean;
  /** Lots kept free of row buildings (side -1 left / 1 right, s0..s1): the video's own buildings go there (`extra`). */
  reserve?: { side: number; s0: number; s1: number }[];
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
  if (p.layout === "interior") return { ...buildSupermarket(p, light, o), sp: spine(0), ROAD: 12, WALK: 12, FRONT: 12 };
  const seed = o.seed ?? 11, L = o.length ?? 50, r = rng(seed);
  const sp = spine(o.curve ?? 0.0032);
  const { at, tangent, right } = sp;
  const ROAD = o.road ?? 3.4;
  // How far facades reach out (QA guard): porch roof 2.1 m, shop awning 1.3 m, door step 0.45 m. Terraces get a
  // pavement wide enough for lamps and props past that; detached houses sit that much further back.
  const REACH = p.porch > 0 ? 2.1 : p.shops.chance > 0 && p.shops.awnings.length ? 1.3 : 0.45;
  const WALK = ROAD + (p.layout === "detached" ? 2 : Math.max(2, REACH + 1.4));
  const FRONT = o.front ?? (p.layout === "detached" ? WALK + 3 + REACH : WALK);
  const g = new Group();
  const lights: Light[] = [], smoke: Vector3[] = [], perches: Vector3[] = [];
  /** Add an object; `collider` names it for the camera guard (omit for things lenses may pass under). */
  const place = (obj: Object3D, pos: Vector3, ry: number, collider?: string) => {
    obj.position.copy(pos);
    obj.rotation.y = ry;
    if (collider) obj.userData.collider = collider;
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
  const terraced = p.gap[1] === 0;
  for (const side of [-1, 1]) {
    let s = -8;
    while (s < L) {
      const w = p.width[0] + r() * (p.width[1] - p.width[0]);
      const spec = pickVaried((a) => presetSpec(p, w, seed * 100 + bi, a), specFacts, facts);
      facts.push(specFacts(spec));
      bi++;
      const b = building(spec);
      // Detached rows: room for the roof overhang (0.3 m) plus the lean's sideways shift at the ridge on each side.
      const m = terraced ? 0 : 0.3 + Math.tan((Math.abs(spec.lean) * Math.PI) / 180) * (b.height + 3);
      if (s + 2 * m + w > L + 9.5 - REACH) break; // the closing row's fronts (and porches) start at L + 10
      const lot = o.reserve?.find((q) => q.side === side && s < q.s1 && s + 2 * m + w > q.s0);
      if (lot) {
        s = lot.s1;
        continue;
      }
      s += m;
      const sc = s + w / 2;
      place(b.group, at(sc, side * (FRONT + spec.d / 2)), yaw(right(sc).multiplyScalar(-side)), `building at s ${sc.toFixed(1)} ${side < 0 ? "left" : "right"}${spec.shop ? ` (${spec.shop.sign})` : ""}`);
      if (terraced) b.group.userData.joins = `terrace ${side < 0 ? "left" : "right"}`; // flush neighbours meet on purpose (QA guard)
      for (const c of b.chimneys) smoke.push(b.group.localToWorld(c.clone()));
      for (const l of b.lights) lights.push({ pos: b.group.localToWorld(l.pos.clone()), kind: l.kind });
      for (const q of b.perches) perches.push(b.group.localToWorld(q.clone()));
      s += w + m + p.gap[0] + r() * (p.gap[1] - p.gap[0]);
    }
  }

  // Close the view: a small square with a clock tower, or just a closing row (references always end the street).
  {
    const sq = new Mesh(ribbon(at, L - 6, L + 20, -16, 16), groundMaterial(p.walk));
    sq.position.y = 0.025;
    sq.receiveShadow = true;
    g.add(sq);
    if (o.landmark) place(clockTower(), at(L + 6, 1.5), yaw(tangent(L + 6).negate()), "clock tower");
    for (const x of [-8, 0, 8]) {
      const spec = pickVaried((a) => presetSpec(p, 8, seed * 100 + bi, a), specFacts, facts);
      facts.push(specFacts(spec));
      bi++;
      const cb = place(building({ ...spec, floors: o.landmark ? Math.max(spec.floors, 3) : p.floors[1] }).group, at(L + 14, x), yaw(tangent(L + 14).negate()), `closing building x ${x}`);
      cb.userData.joins = "closing row";
    }
  }

  // Lamps.
  const lampSpots = o.lamps ?? Array.from({ length: Math.ceil(L / 7) }, (_, i) => [3 + i * 7, i % 2 ? -1 : 1] as [number, number]);
  for (const [s, side] of lampSpots) {
    // Past the facades' reach, plus the base's own 0.19 m half-width.
    const x = p.layout === "detached" ? side * (ROAD + 0.6) : side * (FRONT - REACH - 0.35);
    const ry = yaw(right(s).multiplyScalar(-side)) - Math.PI / 2; // arm reaches over the street
    const lp = place(lampPost(!!light.lamp), at(s, x), ry, `lamp post at s ${s}`); // unlit by day
    lights.push({ pos: lp.localToWorld(LAMP_HEAD.clone()), kind: "lamp" });
  }

  // Props along the walks (or yards), keeping clear of lamps.
  // 0.6 m past the facades' reach: a 1.8 m bench turned by up to 0.25 rad still clears it. Props keep 2.2 m apart
  // along each side so they never stand in each other.
  const nProps = Math.round(L / 3); // was L / 4.5: refs are packed with set dressing
  const taken: Record<number, number[]> = { [-1]: [], [1]: [] };
  // The caller's own props (foreground framing) are placed first, so random props keep 1 m away from them.
  const extras = o.extra?.(sp) ?? [];
  const extraBoxes = extras.map((obj) => (obj.updateMatrixWorld(true), new Box3().setFromObject(obj)));
  for (let i = 0; i < nProps; i++) {
    const kind = pickN(r, p.props), side = i % 2 ? 1 : -1, s = 2 + r() * (L - 4);
    if (lampSpots.some(([ls]) => Math.abs(ls - s) < 1.6) || taken[side].some((t) => Math.abs(t - s) < 2.2)) continue;
    // Utility poles stand every 13 m from s 1 on the right (2 m later when a lamp is there): keep clear of them.
    if (side === 1 && (o.wires ?? p.wires) && [1, 3].some((s0) => Math.abs(((s - s0 + 130) % 13) - 6.5) > 5.3)) continue;
    taken[side].push(s);
    let x = side * (p.layout === "detached" ? WALK - 0.85 : FRONT - REACH - 0.6), ry = yaw(right(s).multiplyScalar(-side)) + (r() - 0.5) * 0.5;
    if (kind === "car") [x, ry] = [side * (ROAD - 1.1), yaw(tangent(s)) - Math.PI / 2];
    if (kind === "cart") x = side * (Math.abs(x) - 0.5); // 1.3 m deep with its shafts
    if (extraBoxes.some((b) => b.distanceToPoint(at(s, x)) < 1)) continue;
    if (kind === "hedge" || kind === "fence") [x, ry] = [side * (WALK + 0.3), yaw(tangent(s)) + Math.PI / 2];
    if ((kind === "mailbox" || kind === "trashBin") && p.layout === "detached") x = side * (WALK + 0.2); // on the verge, never in the road (terraces: on the walk)
    if (kind === "pine" || kind === "campfire") x = side * (WALK + 1.5 + r() * 2.5);
    const obj = place(PROP[kind](r), at(s, x), ry, `${kind} at s ${s.toFixed(1)}`);
    if (kind === "pine" || kind === "campfire") {
      // Keep the whole crown in the yard, short of the houses' porches.
      const b = new Box3().setFromObject(obj), half = Math.max(b.max.x - b.min.x, b.max.z - b.min.z) / 2;
      obj.position.copy(at(s, side * Math.min(Math.abs(x), FRONT - REACH - half - 0.2)));
      obj.updateMatrixWorld(true);
    }
    if (kind === "campfire") lights.push({ pos: obj.localToWorld(FIRE_HEAD.clone()), kind: "fire" });
  }

  // Snow streets: low banks along both kerbs (ploughed snow), lumpy, so the edge of the road reads.
  if (p.road.kind === "snow") {
    const bank = MAT.color("#eef2fa");
    const kb = new Kit();
    for (const side of [-1, 1])
      for (let s = -4; s < L + 4; s += 1.1 + r() * 0.8) {
        const w = 0.7 + r() * 0.9, hgt = 0.18 + r() * 0.22;
        const geo = new SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
        geo.scale(w, hgt, 0.45 + r() * 0.2);
        const q = at(s, side * (ROAD + 0.15));
        kb.add(bank, geo, q.x, -0.02, q.z, { ry: yaw(tangent(s)) });
      }
    const banks = kb.build();
    banks.traverse((o) => ((o as Mesh).castShadow = false));
    g.add(banks);
  }

  // Utility poles and sagging wires along one side (refs: power lines in most exterior shots).
  if (o.wires ?? p.wires) {
    const side = 1, xs = p.layout === "detached" ? side * (ROAD + 0.9) : side * (FRONT - REACH - 0.35);
    const tops: Vector3[][] = [];
    for (let s = 1; s < L + 6; s += 13) {
      if (lampSpots.some(([ls, lside]) => lside === side && Math.abs(ls - s) < 1.5)) s += 2;
      const kp = new Kit();
      kp.add(MAT.darkWood(), new CylinderGeometry(0.11, 0.14, 7.6, 8), 0, 3.8, 0);
      kp.box(MAT.darkWood(), 1.7, 0.1, 0.1, 0, 7.1, 0);
      for (const dx of [-0.7, 0, 0.7]) kp.add(MAT.color("#d8d0c0"), new CylinderGeometry(0.04, 0.05, 0.14, 6), dx, 7.22, 0);
      const pole = place(kp.build(), at(s, xs), yaw(tangent(s)), `utility pole at s ${s.toFixed(1)}`);
      pole.updateMatrixWorld(true);
      tops.push([-0.7, 0, 0.7].map((dx) => pole.localToWorld(new Vector3(dx, 7.29, 0))));
    }
    const wire = MAT.color("#2a2226");
    for (let i = 0; i + 1 < tops.length; i++)
      for (let w = 0; w < 3; w++) {
        const a = tops[i][w], b = tops[i + 1][w], pts: Vector3[] = [];
        for (let j = 0; j <= 12; j++) {
          const t = j / 12;
          pts.push(a.clone().lerp(b, t).setY(a.y + (b.y - a.y) * t - 0.55 * 4 * t * (1 - t)));
        }
        const tube = new Mesh(new TubeGeometry(new CatmullRomCurve3(pts), 24, 0.018, 4), wire);
        tube.castShadow = false;
        g.add(tube);
      }
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

  if (p.backdrop) {
    g.add(backdrop(p.backdrop, at(L + 14, 0), tangent(L + 14), seed));
    // Both sides too: cross-street shots see the horizon through every gap between houses.
    for (const side of [-1, 1]) g.add(backdrop(p.backdrop, at(L / 2, side * (FRONT + 20)), right(L / 2).multiplyScalar(side), seed + 3 + side, 0.6));
  }
  extras.forEach((obj) => {
    obj.userData.collider ??= "foreground prop";
    g.add(obj);
  });
  lights.push(...(o.extraLights ?? []));
  g.add(pickLights(lights, light, o.lightCenter ?? at(L * 0.4, 0, 2), o.maxLights ?? 24));
  g.add(practicalGlows(lights, light)); // every lamp and lit window glows, not only those with a real light
  return { group: g, smoke, sp, ROAD, WALK, FRONT, animate: undefined as ((f: number) => void) | undefined };
};

/** Jitter a cone's side vertices radially (ridges and gullies); the apex and base ring stay put. */
const ridged = (geo: ConeGeometry, r: () => number, amp: number) => {
  const pos = geo.attributes.position, h = (geo.parameters as { height: number }).height;
  const ph = [r(), r(), r()].map((v) => v * 6.28);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), rad = Math.hypot(x, z);
    if (rad < 1e-3) continue;
    const a = Math.atan2(z, x), t = (y + h / 2) / h;
    const k = 1 + amp * (0.6 * Math.sin(5 * a + ph[0]) + 0.4 * Math.sin(9 * a + ph[1] + t * 2)) * Math.sin(Math.PI * Math.min(t + 0.15, 1));
    pos.setXYZ(i, x * k, y, z * k);
  }
  geo.computeVertexNormals();
  return geo;
};

/** Distant hills / mesas / snowy mountains in a 120 deg fan 90-150 m past the street end (aerial perspective hazes them). */
const backdrop = (b: NonNullable<EraPreset["backdrop"]>, end: Vector3, dir: Vector3, seed: number, k0 = 1) => {
  const r = rng(seed + 77), k = new Kit();
  const m = MAT.color(b.color), snow = MAT.color("#f4f6fc"), tree = b.trees ? MAT.color(b.trees) : null;
  const base = Math.atan2(dir.x, -dir.z);
  for (let i = 0; i < 14; i++) {
    const a = base + (i / 13 - 0.5) * 2.2, d = ((b.shape === "mountains" ? 130 : 90) + r() * 60) / Math.sqrt(k0);
    const x = end.x + Math.sin(a) * d, z = end.z - Math.cos(a) * d;
    if (b.shape === "mesas") {
      const w = 30 + r() * 40, h = 22 + r() * 18;
      k.add(m, new CylinderGeometry(w * 0.42, w * 0.5, h, 7), x, h / 2, z);
    } else if (b.shape === "mountains") {
      // A ridged peak with one or two shoulders (not a 6-sided pyramid), snowcap following the same ridges.
      const h = 30 + r() * 26;
      const peak = (hh: number, px: number, pz: number) => {
        const geo = ridged(new ConeGeometry(hh * 0.95, hh, 18, 4), r, 0.16);
        k.add(m, geo, px, hh / 2 - 2, pz);
        k.add(snow, ridged(new ConeGeometry(hh * 0.34, hh * 0.36, 18, 2), r, 0.12), px, hh - hh * 0.18 - 2, pz);
      };
      peak(h, x, z);
      if (r() < 0.8) peak(h * (0.55 + r() * 0.2), x + (r() - 0.5) * h * 1.2, z + 8);
    } else {
      const w = (40 + r() * 50) * k0, h = (20 + r() * 16) * k0 * k0;
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

/** R3F wrapper: the built street plus chimney smoke. Build once per mount (dissolves mount two canvases). */
export const Street: React.FC<{ preset: EraPreset; light: LightPreset; opts?: StreetOpts }> = ({ preset, light, opts }) => {
  const frame = useCurrentFrame();
  const built = useMemo(() => buildStreet(preset, light, opts), [preset, light, opts]);
  built.animate?.(frame); // frame-driven effects (flickering strip)
  return (
    <>
      <primitive object={built.group} />
      {built.smoke.length > 0 && <Smoke from={built.smoke} color={preset.smoke} />}
    </>
  );
};
