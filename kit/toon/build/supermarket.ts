import {
  AddEquation, BoxGeometry, BufferGeometry, Color, CustomBlending, CylinderGeometry, Group, InstancedMesh, LatheGeometry, Material,
  Matrix4, Mesh, Object3D, OneFactor, PlaneGeometry, Quaternion, ShaderMaterial, SrcAlphaFactor, Vector2, Vector3, Vector4,
} from "three";
import { SKY } from "../ink";
import { LightPreset, linear } from "../lights";
import { rng } from "../paint";
import { PracticalKind, practicalLights, toonMaterial } from "../shade";
import { groundMaterial, scraps } from "./ground";
import { Kit, M, MAT } from "./kit";
import { EraPreset } from "./presets";
import { aisleSign, checkout, crate } from "./props";
import { grimeWall, labelTex, signTex, storeGlass } from "./textures";

/**
 * Supermarket interior. Hall 24 x 48 m, 5.5 m high; `at(s, x, y)` = (x, y, -s) (s from the front wall inwards).
 * - lit (`interior.power`): fluorescent strips (slightly green-white) with real lights, reflected in the floor tiles;
 * - abandoned (`!power`): moonlight through the front windows, one flickering strip, barricaded doors, emptier
 *   shelves, more fallen stock and litter.
 * Always: warm off-white grimy walls and tiles, darker corners, glowing green exit sign, packed shelves with blocky
 * painted products (boxes, cans, bottles), price tags, hanging aisle signs, a few half-empty bays and fallen items.
 */
const HW = 12, LEN = 44, H = 5.5, FRONT_S = -4;
const at = (s: number, x: number, y = 0) => new Vector3(x, y, -s);
const STRIPS = (() => {
  const out: { s: number; x: number }[] = [];
  for (let s = 2; s < LEN - 2; s += 7) for (const x of [-7, 0, 7]) out.push({ s, x });
  return out;
})();
const STRIP = { w: 3.2, d: 0.6 };
const FLICKER = STRIPS.findIndex((p) => p.s === 2 && p.x === 0); // the strip nearest the entrance

/** Deterministic fluorescent flicker (0..1) for frame f: mostly on, stutters and drop-outs. */
export const flicker = (f: number) => {
  const a = Math.sin(f * 1.7) + Math.sin(f * 0.37 + 1) * 1.2 + Math.sin(f * 4.1) * 0.5;
  if (a > 1.3) return 0.08;
  if (a > 0.9) return 0.45;
  return 1;
};

// ---- floor overlay: analytic reflections of the strips (glossy tiles) + darker corners, one pass
const floorFrag = /* glsl */ `
uniform vec4 uStrips[${STRIPS.length}];
uniform float uStripI[${STRIPS.length}];
uniform vec3 uColor;
uniform float uH, uHW, uS0, uS1;
varying vec3 vW;
void main() {
  vec3 v = normalize(vW - cameraPosition);
  // Mirror ray up to the ceiling plane; glossy blur grows with the ray length.
  float t = uH / max(-v.y, 0.02);
  vec2 hit = vW.xz + vec2(v.x, v.z) * t;
  float blur = 0.05 + 0.05 * t;
  float sum = 0.0;
  for (int i = 0; i < ${STRIPS.length}; i++) {
    vec2 d = max(abs(hit - uStrips[i].xy) - uStrips[i].zw, 0.0);
    sum += uStripI[i] * (1.0 - smoothstep(0.0, blur, length(d)));
  }
  float fres = 0.18 + 0.5 * pow(1.0 - abs(v.y), 3.0);
  // Corners and wall bases are darker (multiplier in alpha).
  float s = -vW.z;
  float dw = min(min(uHW - abs(vW.x), s - uS0), uS1 - s);
  float dark = 1.0 - 0.45 * (1.0 - smoothstep(0.0, 5.0, dw));
  gl_FragColor = vec4(uColor * sum * fres, dark);
}`;

const floorOverlay = (power: boolean) => {
  const g = new PlaneGeometry(HW * 2, LEN - FRONT_S, 1, 1);
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0.004, -(LEN + FRONT_S) / 2);
  const m = new ShaderMaterial({
    vertexShader: "varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: floorFrag,
    transparent: true,
    depthWrite: false,
    blending: CustomBlending,
    blendEquation: AddEquation,
    blendSrc: OneFactor,
    blendDst: SrcAlphaFactor,
    uniforms: {
      uStrips: { value: STRIPS.map((p) => new Vector4(p.x, -p.s, STRIP.w / 2, STRIP.d / 2)) },
      uStripI: { value: STRIPS.map(() => (power ? 1 : 0)) },
      uColor: { value: linear("#e6fff0").multiplyScalar(1.6) },
      uH: { value: H - 0.2 },
      uHW: { value: HW },
      uS0: { value: FRONT_S },
      uS1: { value: LEN },
    },
  });
  const mesh = new Mesh(g, m);
  mesh.layers.set(SKY); // colour pass only: no ink, no normals
  mesh.renderOrder = 1;
  return mesh;
};

// ---- products: instanced boxes, cans and bottles with painted labels
type Kind = "box" | "can" | "bottle";
const GEO: Record<Kind, () => BufferGeometry> = {
  box: () => new BoxGeometry(1, 1, 1),
  can: () => new CylinderGeometry(1, 1, 1, 14),
  bottle: () => {
    const pts = [[0, -0.5], [1, -0.5], [1, 0.12], [0.75, 0.25], [0.32, 0.36], [0.32, 0.5], [0, 0.5]].map(([x, y]) => new Vector2(x, y));
    return new LatheGeometry(pts, 14);
  },
};
const PALETTES = 10;

class Stock {
  buckets = new Map<string, Matrix4[]>();
  add(kind: Kind, label: number, m: Matrix4) {
    const k = `${kind}:${label % PALETTES}`;
    const list = this.buckets.get(k) ?? [];
    list.push(m);
    this.buckets.set(k, list);
  }
  build() {
    const g = new Group();
    const geos = { box: GEO.box(), can: GEO.can(), bottle: GEO.bottle() };
    for (const [k, list] of this.buckets) {
      const [kind, label] = k.split(":") as [Kind, string];
      const mat = M(`label${label}`, () => toonMaterial({ map: labelTex(Number(label)) })) as Material;
      const im = new InstancedMesh(geos[kind], mat, list.length);
      list.forEach((m, i) => im.setMatrixAt(i, m));
      im.castShadow = im.receiveShadow = true;
      g.add(im);
    }
    return g;
  }
}

/** Product size (w, h, d or radius, height) for a kind. */
const size = (kind: Kind, r: () => number): [number, number, number] =>
  kind === "box" ? [0.1 + r() * 0.14, 0.16 + r() * 0.16, 0.1 + r() * 0.1] : kind === "can" ? [0.04 + r() * 0.012, 0.11 + r() * 0.03, 0] : [0.04 + r() * 0.01, 0.24 + r() * 0.08, 0];

/** One shelf unit (length L along local x, both faces), stocked; `empty` = chance a bay is half-empty. */
const stockedShelf = (L: number, seed: number, stock: Stock, empty: number) => {
  const r = rng(seed);
  const k = new Kit();
  const metal = MAT.color("#c8c4c0"), edge = MAT.color("#d84a3a"), tag = MAT.color("#f2e85a");
  k.box(metal, L, 1.9, 0.08, 0, 0.95, 0); // back panel
  for (const x of [-L / 2, L / 2]) k.box(metal, 0.06, 2.0, 0.92, x, 1.0, 0); // end uprights
  k.box(edge, L, 0.18, 0.92, 0, 2.0, 0); // top header
  const items: { kind: Kind; label: number; m: Matrix4 }[] = [];
  const levels = [0.12, 0.54, 0.96, 1.38];
  for (const side of [-1, 1])
    levels.forEach((y, j) => {
      k.box(metal, L, 0.04, 0.42, 0, y, side * 0.25);
      k.box(edge, L, 0.07, 0.02, 0, y - 0.01, side * 0.47); // shelf-edge strip
      for (let x = -L / 2 + 0.2; x < L / 2 - 0.1; x += 0.36) k.box(tag, 0.07, 0.04, 0.012, x, y - 0.005, side * 0.485); // price tags
      // Fill bay by bay (1.2 m); each bay one product kind/label, some bays half-empty.
      for (let bx = -L / 2; bx < L / 2 - 0.01; bx += 1.2) {
        const kind: Kind = (["box", "can", "bottle"] as const)[Math.floor(r() * 3)];
        const label = Math.floor(r() * PALETTES);
        const gap = r() < empty;
        let x = bx + 0.05;
        while (x < bx + 1.15) {
          const [a, h, d] = size(kind, r);
          const w = kind === "box" ? a : a * 2;
          if (x + w > bx + 1.15) break;
          if (!(gap && r() < 0.7)) {
            items.push({ kind, label, m: new Matrix4().compose(
              new Vector3(x + w / 2, y + 0.02 + h / 2, side * (0.27 + (r() - 0.5) * 0.04)),
              new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), (r() - 0.5) * 0.15),
              kind === "box" ? new Vector3(a, h, d) : new Vector3(a, h, a),
            ) });
          }
          x += w + 0.015;
        }
      }
    });
  return { g: k.build(), items };
};

export const buildSupermarket = (p: EraPreset, light: LightPreset, o: { seed?: number; lightCenter?: Vector3; maxLights?: number }) => {
  const seed = o.seed ?? 11, r = rng(seed);
  const power = p.interior?.power ?? true;
  const abandoned = p.interior?.abandoned ?? false;
  const g = new Group();
  const lights: { pos: Vector3; kind: PracticalKind; color?: [string, number] }[] = [];
  const add = (obj: Object3D, pos: Vector3, ry = 0, collider?: string) => {
    obj.position.copy(pos);
    obj.rotation.y = ry;
    if (collider) obj.userData.collider = collider;
    g.add(obj);
    obj.updateMatrixWorld(true);
    return obj;
  };

  // Floor: warm off-white tiles with grime; reflections and dark corners on top.
  const fgeo = new PlaneGeometry(HW * 2, LEN - FRONT_S).rotateX(-Math.PI / 2).translate(0, 0, -(LEN + FRONT_S) / 2);
  const fp = fgeo.attributes.position, fuv = fgeo.attributes.uv;
  for (let i = 0; i < fp.count; i++) fuv.setXY(i, fp.getX(i), -fp.getZ(i)); // world metres, like the street ribbons
  const floor = new Mesh(fgeo, groundMaterial(p.road));
  floor.receiveShadow = true;
  const overlay = floorOverlay(power);
  g.add(floor, overlay);

  // Walls (each its own collider), ceiling (never casts: the key stands in for the ceiling lights by day).
  const wallMat = M(`gw${p.walls[0].colors[0]}`, () => toonMaterial({ map: grimeWall(p.walls[0].colors[0], p.trims[1] ?? "#2a5a9a", H), repeat: [0.5, 1 / H] }));
  const wall = (w: number, d: number, pos: Vector3, name: string, cast = false) => {
    const k = new Kit();
    k.box(wallMat, w, H, d, 0, H / 2, 0);
    const wg = k.build();
    wg.traverse((m) => ((m as Mesh).castShadow = cast || !power));
    add(wg, pos, 0, name);
  };
  wall(0.3, LEN - FRONT_S, at((LEN + FRONT_S) / 2, -HW), "left wall");
  wall(0.3, LEN - FRONT_S, at((LEN + FRONT_S) / 2, HW), "right wall");
  wall(HW * 2, 0.3, at(LEN, 0), "back wall");
  {
    // Ceiling: suspended tile grid (world-metre mapping). Casts only when the power is out (the moon must come in
    // through the windows, not through the roof); by day the key stands in for the strips.
    const k = new Kit();
    k.box(M("ceilTiles", () => groundMaterial({ kind: "tiles", base: "#e6e2d8", accent: "#dcd6c8", contrast: 0.3 })), HW * 2, 0.3, LEN - FRONT_S, 0, 0, 0);
    const cg = k.build();
    cg.traverse((m) => ((m as Mesh).castShadow = !power));
    add(cg, at((LEN + FRONT_S) / 2, 0, H + 0.15));
  }

  // Front: shop windows either side of the entrance (moonlight comes through at night), entrance doors.
  {
    const k = new Kit();
    const fw = wallMat;
    const z = 0;
    k.box(fw, HW * 2, 0.9, 0.3, 0, 0.45, z);
    k.box(fw, HW * 2, H - 3.6, 0.3, 0, 3.6 + (H - 3.6) / 2, z);
    for (const x of [-HW + 0.3, -8.2, -4.6, -1.6, 1.6, 4.6, 8.2, HW - 0.3]) k.box(fw, 0.6, 2.7, 0.3, x, 0.9 + 1.35, z);
    k.box(fw, 3.2, 1.0, 0.3, 0, 3.1, z); // over the doors
    // Window panes glow with what is outside: daylight, or a pale moonlit sky when the power is out.
    const glass = M(`shopGlass${power}`, () => toonMaterial({ map: storeGlass(!power), emissive: power ? ["#dfe8f0", 1.0] : ["#8a9ad8", 0.9] }));
    for (const [x0, x1] of [[-HW + 0.6, -8.5], [-7.9, -4.9], [-4.3, -1.9], [1.9, 4.3], [4.9, 7.9], [8.5, HW - 0.6]] as const)
      k.box(glass, x1 - x0, 2.7, 0.04, (x0 + x1) / 2, 0.9 + 1.35, z, false);
    const fg = k.build();
    // Only the wall casts (panes let the moon through); by day nothing in the shell casts.
    fg.traverse((m) => ((m as Mesh).castShadow = !power && (m as Mesh).material !== glass));
    add(fg, at(FRONT_S, 0), 0, "front wall");
    // Entrance doors (dark glass); barricaded with planks and crates when abandoned.
    const doors = new Kit();
    for (const x of [-0.75, 0.75]) doors.box(glass, 1.45, 2.5, 0.06, x, 1.25, 0, false);
    if (abandoned)
      for (const [y, a] of [[0.8, 0.12], [1.5, -0.1], [2.1, 0.08], [1.1, -0.35]] as const)
        doors.add(MAT.wood(), new BoxGeometry(3.4, 0.22, 0.06), 0, y, -0.12, { rz: a });
    const dg = doors.build();
    dg.traverse((m) => ((m as Mesh).castShadow = false));
    add(dg, at(FRONT_S + 0.05, 0), 0, "entrance doors");
    if (abandoned) for (let i = 0; i < 5; i++) add(crate(0.7), at(FRONT_S + 0.8 + (i % 2) * 0.75, -1.4 + i * 0.7, i > 2 ? 0.7 : 0), r() * 0.6, "barricade crate");
  }

  // Exit sign over the entrance (battery-backed: glows green with the power off too).
  {
    const sign = new Mesh(new BoxGeometry(1.0, 0.36, 0.08), M("exitSign", () => toonMaterial({ map: signTex("EXIT", "#127a3a", "#eaffea"), emissive: ["#3aff8a", 2.4] })));
    add(sign, at(FRONT_S + 0.25, 0, 3.35));
    lights.push({ pos: at(FRONT_S + 0.9, 0, 3.1), kind: "window", color: ["#3aff8a", 0.3] });
  }

  // Aisles: stocked shelves, hanging signs (from the ceiling), fallen stock.
  const stock = new Stock();
  const aisles = [-9, -5, -1, 3, 7];
  aisles.forEach((x, i) => {
    const { g: sg, items } = stockedShelf(24, seed * 10 + i, stock, abandoned ? 0.55 : 0.12);
    add(sg, at(26, x), Math.PI / 2, `shelf ${i + 1}`);
    for (const it of items) stock.add(it.kind, it.label, sg.matrixWorld.clone().multiply(it.m));
    const sign = aisleSign(`AISLE ${i + 1}`);
    add(sign, at(12.5, x + 2, 3.9));
    const cable = new Kit();
    for (const dx of [-0.6, 0.6]) cable.box(MAT.metal(), 0.02, H - 4.2, 0.02, dx, (H - 4.2) / 2 + 0.2, 0);
    add(cable.build(), at(12.5, x + 2, 3.9));
  });
  // Fallen items on the floor along the aisles.
  const fallen = abandoned ? 60 : 9;
  for (let i = 0; i < fallen; i++) {
    const kind: Kind = (["box", "can", "bottle"] as const)[Math.floor(r() * 3)];
    const [a, h, d] = size(kind, r);
    const x = aisles[Math.floor(r() * aisles.length)] + (r() < 0.5 ? -1 : 1) * (0.7 + r() * 1.0);
    const lying = kind !== "box" || r() < 0.5;
    const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), r() * 6).multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), lying ? Math.PI / 2 : 0));
    const yy = lying ? (kind === "box" ? d / 2 : a) : h / 2;
    stock.add(kind, Math.floor(r() * PALETTES), new Matrix4().compose(at(15 + r() * 22, x, yy), q, kind === "box" ? new Vector3(a, h, d) : new Vector3(a, h, a)));
  }
  g.add(stock.build());
  if (abandoned) g.add(...scraps(90, (t, rr) => at(2 + t * 38, (rr() - 0.5) * 2 * (HW - 1)), ["#e8e0d0", "#d84a3a", "#c8b890"], seed + 3));

  // Checkouts by the entrance; produce crates on the left.
  for (const x of [-6, -1, 4]) add(checkout(power), at(4.5, x), Math.PI / 2, `checkout x ${x}`);
  for (let i = 0; i < 6; i++) {
    const c = add(crate(0.7), at(8 + (i % 3) * 1.1, -10.5 + Math.floor(i / 3) * 1.1), 0, "produce crate");
    for (let j = 0; j < (abandoned ? 2 : 5); j++) {
      const f = new Mesh(new CylinderGeometry(0.12, 0.12, 0.2, 7), MAT.color(["#d84a3a", "#f2c84a", "#4ab06a", "#f28a3a"][(i + j) % 4]));
      f.position.copy(c.position).add(new Vector3((r() - 0.5) * 0.4, 0.78, (r() - 0.5) * 0.4));
      g.add(f);
    }
  }

  // Department signs on the back wall.
  p.shops.signs.slice(0, 4).forEach((t, i) => {
    const s = new Mesh(new BoxGeometry(4, 0.8, 0.06), M(`dept${t}`, () => toonMaterial({ map: signTex(t, "#2a5a9a", "#ffffff") })));
    s.position.copy(at(LEN - 0.2, -HW + 3.2 + i * 5.8, 4.4));
    g.add(s);
  });

  // Fluorescent strips: green-white glow + real lights (power on); one flickering strip when the power is out.
  const on = MAT.glow("#e6fff0", 3.2), off = MAT.color("#9a9c98");
  const flickMat = toonMaterial({ color: "#e6fff0", emissive: ["#e6fff0", 3.2] });
  STRIPS.forEach((sp, i) => {
    const lit = power || i === FLICKER;
    const panel = new Mesh(new BoxGeometry(STRIP.w, 0.08, STRIP.d), i === FLICKER && !power ? flickMat : lit ? on : off);
    panel.position.copy(at(sp.s, sp.x, H - 0.2));
    g.add(panel);
    if (lit) lights.push({ pos: at(sp.s, sp.x, H - 1.2), kind: "lamp" });
  });
  const pl = practicalLights(lights, light);
  g.add(pl);
  const flickLight = power ? undefined : pl.children[lights.findIndex((l) => l.kind === "lamp")];
  const baseI = flickLight ? (flickLight as unknown as { intensity: number }).intensity : 0;
  const animate = power
    ? undefined
    : (f: number) => {
        const k = flicker(f);
        (flickMat.uniforms.uEmissive.value as Color).copy(linear("#e6fff0")).multiplyScalar(3.2 * k);
        if (flickLight) (flickLight as unknown as { intensity: number }).intensity = baseI * k;
        ((overlay.material as ShaderMaterial).uniforms.uStripI.value as number[])[FLICKER] = k;
      };
  return { group: g, smoke: [] as Vector3[], animate };
};
