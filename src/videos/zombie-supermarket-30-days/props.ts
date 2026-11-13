import {
  AdditiveBlending, BufferAttribute, BufferGeometry, CatmullRomCurve3, Group, Mesh, MeshBasicMaterial, Object3D, ShaderMaterial,
  TorusGeometry, TubeGeometry, Vector3,
} from "three";
import { glowSprite } from "../../../kit/toon/glow";
import type { MovingProp } from "../../../kit/toon/guard";
import { headHeight } from "../../../kit/toon/figure";
import { NOINK, SKY } from "../../../kit/toon/ink";
import {
  CART_IN, CHAD, CHAD_DOOR, CHAD_ROOF, DOCK, FLOODS, FUEL_AT, GENERATOR, HEAP, SHUTTER_AT,
  battery, dinoToy, duckToy, floodGlass, fuelCan, hedgehogCart, megaphone, shutter, toothbrush,
} from "./build";
import { BEAT, CART_RUN, cartAt, chadLook } from "./roles";
import type { S } from "./story";

// Story props: one definition for the render (Video.tsx mounts `make()` and calls `pose` every frame) and the QA
// guard (Shot.moving). Held props are placed in front of the card toward the shot's camera.
const clamp01 = (t: number) => Math.min(Math.max(t, 0), 1);
const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** A point on a camera-facing card at `who`: `right` m to screen right, `up` m above the soles, `fwd` m toward the lens. */
const onCard = (s: S, F: number, who: Vector3, right: number, up: number, fwd = 0.1) => {
  const cam = s.pose(F - s.from).pos;
  const toCam = cam.clone().sub(who).setY(0).normalize();
  const r = new Vector3(toCam.z, 0, -toCam.x);
  return who.clone().addScaledVector(r, right).addScaledVector(toCam, fwd).setY(who.y + up);
};
const faceCam = (o: Object3D, s: S, F: number) => {
  const cam = s.pose(F - s.from).pos;
  o.lookAt(cam.x, o.position.y, cam.z);
};

// ---------------------------------------------------------------- held things

const youHeapToy = (s: S): MovingProp => ({
  name: "toy in your hands",
  make: duckToy,
  pose: (o, F) => {
    o.position.copy(onCard(s, F, HEAP, 0, 0.84, 0.2));
    faceCam(o, s, F);
    o.rotateY(Math.PI / 2);
  },
  heldBy: "you",
});
/** The battery pops out of the toy on "batteries" and tumbles to the floor. */
const poppedBattery = (s: S): MovingProp => ({
  name: "popped battery",
  make: battery,
  pose: (o, F) => {
    const t0 = Math.round(0.52 * 30) - 2, t = (F - t0) / 18;
    const start = onCard(s, F, HEAP, 0.05, 0.86, 0.26);
    if (t <= 0) return false;
    const k = Math.min(t, 1);
    o.position.copy(start).add(new Vector3(0.35 * k, 0.45 * k - 0.95 * k * k, 0.15 * k));
    o.position.y = Math.max(o.position.y, 0.03);
    o.rotation.set(F * 0.6, 0, F * 0.4);
    return true;
  },
  heldBy: "you",
});

const MEGA_AT = (s: S, F: number, who: Vector3, atMouth: boolean, look = chadLook) =>
  atMouth ? onCard(s, F, who, 0.3, headHeight(look) - 0.12, 0.25) : onCard(s, F, who, 0.42, 0.92, 0.18);
const megaProp = (s: S, who: () => Vector3, atMouth: (F: number) => boolean, clutched = false): MovingProp => ({
  name: "megaphone",
  make: megaphone,
  pose: (o, F) => {
    const shake = clutched && F < BEAT.but ? 0.015 * Math.sin(F * 0.8) : 0;
    o.position.copy(clutched ? onCard(s, F, who(), 0.08, 0.86, 0.24) : MEGA_AT(s, F, who(), atMouth(F))).add(new Vector3(shake, shake, 0));
    o.scale.setScalar(clutched ? 0.75 : 1);
    const cam = s.pose(F - s.from).pos;
    // Bell toward the street (camera side) and out to screen right; clutched: bell up, hugged to the chest.
    if (clutched) {
      const toCam = cam.clone().sub(o.position).setY(0).normalize();
      o.lookAt(o.position.clone().add(new Vector3(toCam.z, 0, -toCam.x))); // hugged sideways across the chest
    } else {
      const toCam = cam.clone().sub(o.position).setY(0).normalize();
      const r = new Vector3(toCam.z, 0, -toCam.x);
      o.lookAt(o.position.clone().add(toCam.multiplyScalar(0.6)).add(r.multiplyScalar(0.8)).add(new Vector3(0, atMouth(F) ? 0.15 : -0.5, 0)));
    }
  },
  heldBy: "chad",
  touches: ["CHAD'S HARDWARE"],
});
const brushProp = (s: S, who: () => Vector3): MovingProp => ({
  name: "toothbrush",
  make: toothbrush,
  pose: (o, F) => {
    // In his other hand (in the mouth it would cut through the head card).
    o.position.copy(onCard(s, F, who(), -0.36, 0.86, 0.2));
    o.rotation.set(0, 0, 0.5);
  },
  heldBy: "chad",
});

// ---------------------------------------------------------------- Chad's store

const floods = (): MovingProp[] =>
  FLOODS.flatMap((p, i) => {
    const off = BEAT.dies - 2 + i * 9; // one by one on "dies"
    const lens = p.clone().add(new Vector3(-0.2, 0, 0));
    return [
      { name: `flood ${i} on`, make: () => floodGlass(true), pose: (o: Object3D, F: number) => (o.position.copy(lens), F < off), touches: ["CHAD'S HARDWARE"] },
      { name: `flood ${i} off`, make: () => floodGlass(false), pose: (o: Object3D, F: number) => (o.position.copy(lens), F >= off), touches: ["CHAD'S HARDWARE"] },
      { name: `flood ${i} glow`, make: () => glowSprite(lens.clone().add(new Vector3(-0.15, 0, 0)), "#fff0c8", 2.6, 1.1), pose: (_o: Object3D, F: number) => F < off },
    ] as MovingProp[];
  });
/** Fuel cans by the generator: three on day 28, none on day 30 (the last one went in at night). */
const cans = (): MovingProp[] =>
  [0, 1, 2].map((i) => ({ name: `fuel can ${i}`, make: fuelCan, pose: (o: Object3D, F: number) => (o.position.copy(FUEL_AT(i)), F < BEAT.day30 - 20), touches: ["CHAD'S HARDWARE"] }));
const shutterProp: MovingProp = {
  name: "shutter",
  make: shutter,
  pose: (o, F) => {
    o.position.copy(SHUTTER_AT);
    const open = ease((F - BEAT.electric + 4) / (BEAT.up - BEAT.electric));
    const c = o.getObjectByName("curtain")!;
    c.position.y = open * (CHAD.shutterH - 0.15);
    c.scale.y = 1 - 0.95 * open;
    const lid = o.getObjectByName("lid")!;
    const slotOpen = F >= Math.round(16.19 * 30) - 2 && F < BEAT.only - 1; // "He said" .. "only" (slams)
    lid.position.y = slotOpen ? 0.17 : 0;
    o.getObjectByName("slot")!.visible = open < 0.05;
  },
  touches: ["CHAD'S HARDWARE"],
};
/** The generator's sad smoke ring on "coughs". */
const smokeRing: MovingProp = {
  name: "smoke ring",
  make: () => new Mesh(new TorusGeometry(0.16, 0.06, 8, 20), new MeshBasicMaterial({ color: "#3a3640", transparent: true, opacity: 0.9, depthWrite: false })),
  pose: (o, F) => {
    const t = (F - BEAT.coughs + 2) / 40;
    if (t < 0 || t > 1) return false;
    o.position.copy(GENERATOR).add(new Vector3(0.2, 1.3 + 1.2 * t, -0.4 + 0.3 * t));
    o.rotation.set(Math.PI / 2 - 0.3, 0, 0);
    o.scale.setScalar(1 + 2.2 * t);
    ((o as Mesh).material as MeshBasicMaterial).opacity = 0.9 * (1 - t);
    return true;
  },
  touches: ["CHAD'S HARDWARE"],
};

// ---------------------------------------------------------------- the megaphone's sound rings

const ringMat = () => new ShaderMaterial({
  uniforms: { uA: { value: 1 } },
  vertexShader: "void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
  fragmentShader: "uniform float uA; void main(){ gl_FragColor = vec4(vec3(1.0, 0.92, 0.7) * 1.6 * uA, 1.0); }",
  blending: AdditiveBlending, transparent: true, depthWrite: false,
});
const soundRings = (s: S, starts: number[]): MovingProp => ({
  name: "sound rings",
  make: () => {
    const g = new Group();
    for (let i = 0; i < 6; i++) {
      const m = new Mesh(new TorusGeometry(1, 0.035, 6, 40), ringMat());
      m.layers.set(SKY);
      g.add(m);
    }
    return g;
  },
  pose: (o, F) => {
    const mouth = MEGA_AT(s, F, CHAD_ROOF, true);
    const cam = s.pose(F - s.from).pos;
    let any = false;
    o.children.forEach((m, i) => {
      const t = (F - starts[Math.floor(i / 3)] - (i % 3) * 5) / 26;
      m.visible = t > 0 && t < 1;
      if (!m.visible) return;
      any = true;
      // Rings travel toward the street (the camera side) and grow.
      const dir = cam.clone().sub(mouth).normalize();
      m.position.copy(mouth).addScaledVector(dir, 0.4 + 3.5 * t);
      m.lookAt(m.position.clone().add(dir));
      m.scale.setScalar(0.25 + 1.6 * t);
      ((m as Mesh).material as ShaderMaterial).uniforms.uA.value = 1 - t;
    });
    return any;
  },
  heldBy: "chad",
  touches: ["CHAD'S HARDWARE"],
});

// ---------------------------------------------------------------- the cart

/** Cart pieces built once per taped amount; `taped` grows while you tape (A9). */
const cartProp = (name: string, place: (F: number) => { pos: Vector3; yaw: number; tilt?: number }, taped: (F: number) => number = () => 1, held?: string): MovingProp => ({
  name,
  make: () => {
    const g = new Group();
    for (const k of [0.25, 0.5, 0.75, 1]) {
      const c = hedgehogCart(k, k === 1);
      c.name = `t${k}`;
      g.add(c);
    }
    return g;
  },
  pose: (o, F) => {
    const q = place(F), k = taped(F);
    o.position.copy(q.pos);
    o.rotation.set(0, q.yaw, q.tilt ?? 0, "YXZ");
    for (const c of o.children) c.visible = c.name === `t${k <= 0.25 ? 0.25 : k <= 0.5 ? 0.5 : k <= 0.75 ? 0.75 : 1}`;
  },
  touches: ["FRESHMART", "CHAD'S HARDWARE"],
  heldBy: held,
});
const CART_YAW_EXT = Math.PI / 2; // front (+z local) toward Chad's (+x)
const cartExt = (held?: string) =>
  cartProp("hedgehog cart", (F) => {
    const p = cartAt(F), next = cartAt(F + 1);
    const moving = F > CART_RUN.foot && F < CART_RUN.stop;
    const bump = moving ? 0.035 * Math.abs(Math.sin(F * 0.9)) : 0;
    const onRamp = F >= CART_RUN.kick && F < CART_RUN.foot;
    return { pos: p.add(new Vector3(0, bump, 0)), yaw: CART_YAW_EXT, tilt: onRamp ? -Math.atan2(DOCK.floor, DOCK.run) * (next.y < p.y ? 1 : 0) : moving ? 0.05 * Math.sin(F * 1.3) : 0 };
  }, undefined, held);
const cartIn = cartProp("hedgehog cart", () => ({ pos: CART_IN.clone(), yaw: -0.5 }), (F) => (F < BEAT.tape ? 0.25 : 0.25 + 0.75 * clamp01((F - BEAT.tape) / (BEAT.hedgehog - BEAT.tape))));

/** A glowing rainbow streak behind the cart: its path over the last ~2 s, colour bands along it. */
const trail: MovingProp = {
  name: "noise trail",
  make: () => {
    const m = new Mesh(new BufferGeometry(), new ShaderMaterial({
      vertexShader: "attribute float aT; varying float vT; void main(){ vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: `varying float vT;
vec3 hue(float h){ return clamp(abs(mod(h*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0,0.0,1.0); }
void main(){ gl_FragColor = vec4(hue(fract(vT*2.5)) * 1.8 * smoothstep(0.0, 0.4, vT), 1.0); }`,
      blending: AdditiveBlending, transparent: true, depthWrite: false,
    }));
    m.layers.set(NOINK);
    m.frustumCulled = false;
    return m;
  },
  pose: (o, F) => {
    if (F < CART_RUN.foot || F > CART_RUN.stop + 20) return false;
    const pts: Vector3[] = [];
    for (let k = 60; k >= 0; k -= 3) pts.push(cartAt(Math.max(F - k, CART_RUN.foot)).add(new Vector3(-0.1, 0.95 + 0.12 * Math.sin((F - k) * 0.5), 0)));
    if (pts[0].distanceTo(pts[pts.length - 1]) < 0.2) return false;
    const tube = new TubeGeometry(new CatmullRomCurve3(pts), 40, 0.09, 6);
    const n = tube.attributes.position.count, aT = new Float32Array(n);
    for (let i = 0; i < n; i++) aT[i] = Math.floor(i / 7) / 41;
    tube.setAttribute("aT", new BufferAttribute(aT, 1));
    (o as Mesh).geometry.dispose();
    (o as Mesh).geometry = tube;
    return true;
  },
  touches: ["FRESHMART", "CHAD'S HARDWARE"],
};

// ---------------------------------------------------------------- night pieces

const dinoProp = (s: S, you: Vector3): MovingProp => ({
  name: "dino",
  make: dinoToy,
  pose: (o, F) => {
    o.position.copy(onCard(s, F, you, -0.02, 0.86, 0.22));
    o.scale.setScalar(0.5);
    faceCam(o, s, F);
    o.rotateY(Math.PI / 2);
  },
  heldBy: "you",
});
const batteryIn = (s: S, you: Vector3): MovingProp => ({
  name: "battery going in",
  make: battery,
  pose: (o, F) => {
    const t = ease((F - BEAT.battery) / (BEAT.gently + 10 - BEAT.battery));
    o.position.copy(onCard(s, F, you, 0.2 - 0.14 * t, 0.86 + 0.02 * Math.sin(F * 0.7) * (1 - t), 0.28));
    o.rotation.set(0, 0, Math.PI / 2);
  },
  heldBy: "you",
});
/** A flashlight pool: a warm glow that follows `at(F)` (glowSprite reads the vector it was given every frame). */
const torchPool = (at: (F: number) => Vector3, size = 1.1, k = 0.9): MovingProp => ({
  name: "flashlight pool",
  make: () => {
    const p = new Vector3(), g = glowSprite(p, "#fff2c8", size, k);
    g.userData.at = p;
    return g;
  },
  pose: (o, F) => void (o.userData.at as Vector3).copy(at(F)),
});

// ---------------------------------------------------------------- per shot

export const propsFor = (s: S): MovingProp[] => {
  const id = s.id.split("/")[1].split("-")[0];
  const ext = s.w.startsWith("ext");
  const out: MovingProp[] = ext ? [...floods(), ...cans(), shutterProp] : [];
  const roof = () => CHAD_ROOF;
  switch (id) {
    case "A1": out.push(youHeapToy(s), poppedBattery(s)); break;
    case "A2": case "A3": out.push(megaProp(s, roof, () => false)); break;
    case "A6": out.push(megaProp(s, roof, (F) => F >= BEAT.grabs + 6), soundRings(s, [BEAT.morning - 2, BEAT.boy - 4])); break;
    case "A7": out.push(megaProp(s, roof, () => false)); break;
    case "A9": out.push(cartIn); break;
    case "A10": out.push(cartExt()); break;
    case "A14": {
      const you = s.cast!.find((c) => c.name === "you")!.at(0);
      out.push(cartIn, dinoProp(s, you), batteryIn(s, you), torchPool(() => you.clone().add(new Vector3(0.1, 1.0, 0.25)), 0.9, 0.7));
      break;
    }
    case "A13": out.push(torchPool((F) => s.pose(F - s.from).look.clone().add(new Vector3(-0.04, 0, 0)), 1.6, 0.8)); break;
    case "A15": out.push(smokeRing); break;
    case "A16": out.push(brushProp(s, () => CHAD_DOOR)); break;
    case "A17": out.push(cartExt("you")); break;
    case "A18": case "A19": case "A20": case "A21": out.push(cartExt(), trail); break;
    case "A22": case "A23": out.push(megaProp(s, roof, () => false, true), brushProp(s, roof)); break;
  }
  return out;
};
