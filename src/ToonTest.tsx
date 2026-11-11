import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useLayoutEffect, useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { BufferAttribute, BufferGeometry, Group, Mesh, Object3D, PerspectiveCamera, Vector3 } from "three";
import { Composer } from "../kit/toon/Composer";
import { Dust } from "../kit/toon/dust";
import { LIGHTS, sunDirection } from "../kit/toon/lights";
import { cobbles, rng, slabs } from "../kit/toon/paint";
import { BuildingSpec, LAMP_HEAD, barrel, bench, bollard, building, clockTower, crate, fence, lampPost } from "../kit/toon/props";
import { setLamps, toonMaterial } from "../kit/toon/shade";
import { ToonWorld } from "../kit/toon/world";

// A narrow cobbled street that bends right and ends in a small square with a clock tower (~55 m from the lens).
const ROAD = 3.4, FRONT = 5.4; // half-widths: cobbles, building fronts
const spine = (s: number) => new Vector3(0.0032 * s * s, 0, -s);
const tangent = (s: number) => new Vector3(0.0064 * s, 0, -1).normalize();
const right = (s: number) => {
  const t = tangent(s);
  return new Vector3(-t.z, 0, t.x);
};
/** Point at arc position s, sideways offset x (m, + = right), height y. */
const at = (s: number, x: number, y = 0) => spine(s).addScaledVector(right(s), x).setY(y);
/** Y rotation that turns local +z toward `dir`. */
const yaw = (dir: Vector3) => Math.atan2(dir.x, dir.z);

const ribbon = (s0: number, s1: number, x0: number, x1: number) => {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const n = Math.ceil(s1 - s0);
  for (let i = 0; i <= n; i++) {
    const s = s0 + ((s1 - s0) * i) / n;
    for (const x of [x0, x1]) {
      pos.push(...at(s, x, 0).toArray());
      uv.push(x, s);
    }
    if (i < n) idx.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2); // counter-clockwise from above
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("uv", new BufferAttribute(new Float32Array(uv), 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
};

const PLASTER = ["#c98f6a", "#d8b07a", "#9fae8e", "#8a9fbc", "#dcc4a0", "#b97a84", "#c2a26a"];
const ROOFS = ["#a4503a", "#7a4a5c", "#5a4a6a", "#8a5a3a", "#9a4a40"];
const SHOPS = ["#2f5a52", "#6a2e3a", "#2e3f6a"];
const DOORS = ["#5a2e2a", "#2e4a5a", "#3e5a3a", "#6a4a2a"];

type Placed = { obj: Object3D; pos: Vector3; ry: number };

const place = (obj: Object3D, pos: Vector3, ry: number): Placed => ({ obj, pos, ry });

const LAYOUT = (() => {
  const out: Placed[] = [];
  const lamps: Vector3[] = [];
  const r = rng(11);
  let k = 0;
  const spec = (w: number, extra: Partial<BuildingSpec> = {}): BuildingSpec => {
    k++;
    const brick = r() < 0.3;
    return {
      w,
      d: 8,
      floors: 2 + Math.floor(r() * 3),
      wall: brick ? { kind: "brick", color: r() < 0.5 ? "#9a5a44" : "#8a4e4a" } : { kind: "plaster", color: PLASTER[k % PLASTER.length] },
      roof: ROOFS[k % ROOFS.length],
      door: DOORS[k % DOORS.length],
      shop: r() < 0.35 ? SHOPS[k % SHOPS.length] : undefined,
      seed: 100 + k,
      ...extra,
    };
  };
  // Terraces on both sides up to the square.
  for (const side of [-1, 1]) {
    let s = -8;
    while (s < 44) {
      const w = 5 + r() * 3;
      const sp = spec(w, side < 0 ? { floors: 2 + Math.floor(r() * 1.6) } : {}); // lower on the sun side
      const sc = s + w / 2;
      const facing = right(sc).multiplyScalar(-side);
      out.push(place(building(sp), at(sc, side * (FRONT + sp.d / 2)), yaw(facing)));
      if (sp.shop) lamps.push(at(sc, side * (FRONT - 0.8), 1.9));
      s += w + (side < 0 && r() < 0.45 ? 2.2 + r() * 1.5 : r() < 0.15 ? 1.2 : 0.02); // sun-side alleys let light stripes cross the street
    }
  }
  // The square: two corner houses set back, a closing row, the tower in front of it.
  out.push(place(building(spec(7, { floors: 3 })), at(50, -11.5), yaw(right(50))));
  out.push(place(building(spec(7, { floors: 4, shop: "#6a2e3a" })), at(50, 12), yaw(right(50).negate())));
  for (const x of [-8, 0, 8]) out.push(place(building(spec(8, { floors: 3 + (x === 0 ? 1 : 0) })), at(64, x), yaw(tangent(64).negate())));
  out.push(place(clockTower(), at(56, 1.5), yaw(tangent(56).negate())));

  // Lamps: the foreground one (cut by the frame edge) plus both sides down the street.
  const lamp = (s: number, side: number) => {
    const ry = yaw(right(s).multiplyScalar(-side)) - Math.PI / 2; // arm (local +x) reaches over the street
    const pos = at(s, side * (FRONT - 0.5));
    out.push(place(lampPost(), pos, ry));
    lamps.push(LAMP_HEAD.clone().applyAxisAngle(new Vector3(0, 1, 0), ry).add(pos));
  };
  // Foreground, placed from the opening lens: f m ahead, x m to the side (frame half-width ~ .32 f).
  const c0 = at(0, -3.9, 0), fwd = at(52, 1.5).sub(c0).normalize(), side = new Vector3(-fwd.z, 0, fwd.x);
  const fg = (f: number, x: number, y = 0) => c0.clone().addScaledVector(fwd, f).addScaledVector(side, x).setY(y);
  out.push(place(lampPost(), fg(4.4, -1.1), yaw(side) - Math.PI / 2));
  lamps.push(LAMP_HEAD.clone().applyAxisAngle(new Vector3(0, 1, 0), yaw(side) - Math.PI / 2).add(fg(4.4, -1.1)));
  out.push(place(crate(0.8), fg(4.3, 1.2), 0.35), place(crate(0.6), fg(4.4, 1.25, 0.8), 0.7), place(barrel(), fg(5.6, 1.85), 0));
  out.push(place(fence(6), fg(3.6, -1.45), yaw(fwd) - Math.PI / 2)); // runs away from the lens along the left edge
  for (const [s, side] of [[9, 1], [16, -1], [22, 1], [31, -1], [38, 1], [46, -1]]) lamp(s, side);

  // Street furniture along both sides.
  out.push(place(fence(6), at(6, -FRONT + 0.4), yaw(tangent(6)) - Math.PI / 2));
  out.push(place(bench(), at(10, FRONT - 0.6), yaw(right(10).negate())));
  out.push(place(bench(), at(27, -FRONT + 0.6), yaw(right(27))));
  out.push(place(barrel(), at(18, -FRONT + 0.7), 0), place(barrel(), at(18.9, -FRONT + 0.6), 0), place(crate(0.7), at(19.7, -FRONT + 0.6), 0.3));
  out.push(place(crate(0.8), at(33, FRONT - 0.7), 0.1), place(crate(0.6), at(33.1, FRONT - 0.7, 0.8), 0.6));
  for (let s = 8; s < 44; s += 3.5) out.push(place(bollard(), at(s, ROAD + 0.2), 0));
  return { out, lamps: lamps.slice(0, 12) };
})();

const Street: React.FC = () => {
  const world = useMemo(() => {
    const g = new Group();
    for (const p of LAYOUT.out) {
      p.obj.position.copy(p.pos);
      p.obj.rotation.y = p.ry;
      g.add(p.obj);
    }
    const road = new Mesh(ribbon(-10, 66, -ROAD, ROAD), toonMaterial({ map: cobbles("#c09078"), repeat: [0.5, 0.5] }));
    const walkL = new Mesh(ribbon(-10, 66, -FRONT - 0.2, -ROAD), toonMaterial({ map: slabs("#c4a283"), repeat: [0.5, 0.5] }));
    const walkR = new Mesh(ribbon(-10, 66, ROAD, FRONT + 0.2), toonMaterial({ map: slabs("#c4a283"), repeat: [0.5, 0.5] }));
    const square = new Mesh(ribbon(44, 70, -16, 16), toonMaterial({ map: slabs("#bc9c80"), repeat: [0.5, 0.5] }));
    square.position.y = -0.01;
    for (const m of [road, walkL, walkR, square]) m.receiveShadow = true;
    g.add(road, walkL, walkR, square);
    setLamps(LAYOUT.lamps, 6.5);
    return g;
  }, []);
  return <primitive object={world} />;
};

// Shot: low (1.2 m) lens on the left pavement, gliding forward, looking down the bend at the tower.
const CAM_S = [0, 0.9];
const camAt = (s: number) => at(s, -3.9, 1.2);
const LOOK = at(52, 1.5, 9);
const SUN = sunDirection(LIGHTS.dusk, camAt(0), LOOK);
const SHADOW = { center: at(26, 0), size: 42 };
const DUST = { center: at(9, -0.5, 2.4), size: new Vector3(9, 4.5, 18) };

const Camera: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  useLayoutEffect(() => {
    const t = interpolate(frame, [0, durationInFrames - 1], [0, 1]);
    const e = t * t * t * (t * (t * 6 - 15) + 10); // smootherstep glide
    camera.position.copy(camAt(CAM_S[0] + (CAM_S[1] - CAM_S[0]) * e));
    camera.fov = 60;
    camera.near = 0.1;
    camera.far = 1200;
    camera.updateProjectionMatrix();
    camera.lookAt(LOOK);
  }, [frame, camera, durationInFrames]);
  return null;
};

export const ToonTest: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill>
      <ThreeCanvas width={width} height={height}>
        <Camera />
        <ToonWorld preset={LIGHTS.dusk} sunDir={SUN} shadow={SHADOW} />
        <Street />
        <Dust center={DUST.center} size={DUST.size} />
        <Composer />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
