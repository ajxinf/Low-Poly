import { AdditiveBlending, Color, CylinderGeometry, Group, Mesh, MeshBasicMaterial, Object3D, ShaderMaterial } from "three";
import { MAT } from "../../../kit/toon/build/kit";
import type { MovingProp } from "../../../kit/toon/guard";
import { NOINK } from "../../../kit/toon/ink";
import { HIS, SHED, YOURS, at, hotRoof, iceCream, lemonade, paintSlab, roller } from "./build";
import { CONE_AT, LEMON_AT, ROLLER_FOR, handAt, melt, paintCover, paintEdge, paintStart, rays, roofHeat, stretch } from "./story";

// Story props: one definition for both the render (Video.tsx mounts `make()` and calls `pose` every frame) and the
// QA guard (Shot.moving: the same `pose`, checked every frame against the world and the cast).
const ROOF_L = SHED.w + 0.3;

const paint = (whose: "yours" | "his"): MovingProp => ({
  name: `${whose} paint`,
  make: paintSlab,
  pose: (o, f) => {
    const s = whose === "yours" ? YOURS.s : HIS.s, c = paintCover(f, whose);
    o.position.copy(paintStart(s, c, whose));
    o.scale.set(1, 1, Math.max(c * ROOF_L, 1e-3));
    return (o.visible = c > 0);
  },
  touches: [whose === "yours" ? "your shed" : "his shed"],
});

// Two props, two rules: the roller head may sit on the roof; the pole touches only the holder's hand (never the
// roof edge, the shed or the holder's head).
const rollerHead = (whose: "yours" | "his"): MovingProp => ({
  name: `${whose} roller head`,
  make: roller,
  pose: (o, f) => void o.position.copy(paintEdge(ROLLER_FOR[whose].s, paintCover(f, whose), whose)),
  touches: [whose === "yours" ? "your shed" : "his shed"],
  heldBy: whose === "yours" ? "you" : "neighbour",
});
const rollerPole = (whose: "yours" | "his"): MovingProp => ({
  name: `${whose} roller pole`,
  make: () => new Mesh(new CylinderGeometry(0.018, 0.018, 1, 6), MAT.darkWood()),
  pose: (o, f) => {
    const r = ROLLER_FOR[whose], head = paintEdge(r.s, paintCover(f, whose), whose), hand = handAt(r.who);
    // stop 8 cm short of the roller so the pole's end cap doesn't count as entering the roof under it
    stretch(o as Mesh, hand, hand.clone().lerp(head, 1 - 0.08 / hand.distanceTo(head)));
  },
  heldBy: whose === "yours" ? "you" : "neighbour",
});
const rollerProp = (whose: "yours" | "his") => [rollerHead(whose), rollerPole(whose)];

// Soft sunlight streak: additive, bright along the axis and gone at the rim (view-angle falloff), ends fade out.
const glow = (strength: number) =>
  new ShaderMaterial({
    uniforms: { uColor: { value: new Color("#ffd98a").multiplyScalar(strength) } },
    vertexShader: `varying float vEdge; varying float vAlong;
void main() {
  vAlong = uv.y;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vEdge = abs(dot(normalize(normalMatrix * normal), normalize(-mv.xyz)));
  gl_Position = projectionMatrix * mv;
}`,
    fragmentShader: `uniform vec3 uColor; varying float vEdge; varying float vAlong;
void main() {
  float ends = smoothstep(0.0, 0.3, vAlong) * (1.0 - smoothstep(0.85, 1.0, vAlong));
  gl_FragColor = vec4(uColor * pow(vEdge, 2.5) * ends, 1.0);
}`,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
    fog: false,
  });

const rayProp: MovingProp = {
  name: "sun rays",
  make: () => {
    const g = new Group();
    const core = glow(1.1), halo = glow(0.22);
    for (let i = 0; i < 9; i++) {
      // A soft core inside a wide faint halo: a beam of light, not a lit tube.
      const ray = new Group().add(new Mesh(new CylinderGeometry(0.1, 0.1, 1, 16, 1, true), core), new Mesh(new CylinderGeometry(0.24, 0.24, 1, 16, 1, true), halo));
      ray.traverse((o) => o.layers.set(NOINK));
      g.add(ray);
    }
    return g;
  },
  pose: (o, f) => {
    const list = rays(f);
    o.children.forEach((m, i) => {
      m.visible = i < list.length;
      if (m.visible) stretch(m, list[i].a, list[i].b);
      else m.scale.setScalar(1e-4);
    });
    return list.length > 0;
  },
  touches: ["your shed", "his shed"],
};

const heat: MovingProp = {
  name: "hot roof",
  make: hotRoof,
  pose: (o, f) => {
    o.position.copy(at(HIS.s, SHED.x, (SHED.front + SHED.back) / 2 + 0.08 + 0.042));
    const op = roofHeat(f);
    o.traverse((m) => void (m instanceof Mesh && ((m.material as MeshBasicMaterial).opacity = op)));
    return (o.visible = op > 0.01);
  },
  touches: ["his shed"],
};

const cone: MovingProp = {
  name: "ice cream",
  make: iceCream,
  pose: (o, f) => {
    const m = melt(f);
    o.position.copy(CONE_AT);
    o.getObjectByName("scoop")!.scale.setScalar(Math.max(m.scoop, 0.05));
    const drip = o.getObjectByName("drip")!;
    drip.position.set(0.05, 0.2 - 0.22 * m.drip, 0);
    drip.visible = m.drip > 0 && m.drip < 1;
  },
  heldBy: "neighbour",
};

const lemon: MovingProp = { name: "lemonade", make: lemonade, pose: (o) => void o.position.copy(LEMON_AT), heldBy: "you" };

/** Which props each shot shows (by shot id suffix). */
export const PROPS: Record<string, MovingProp[]> = {
  S1: [paint("yours"), paint("his"), ...rollerProp("yours")],
  S2: [paint("yours"), paint("his")],
  S3: [paint("yours"), paint("his"), rayProp, heat],
  S4: [paint("yours"), heat, cone],
  S5: [paint("yours"), paint("his"), heat, ...rollerProp("his"), lemon],
};
export const propsFor = (id: string): MovingProp[] => PROPS[id.split("/")[1].split("-")[0]] ?? [];
export type { Object3D };
