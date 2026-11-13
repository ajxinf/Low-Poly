import { ConeGeometry, CylinderGeometry, SphereGeometry, TorusGeometry } from "three";
import { rng } from "../paint";
import { Group } from "three";
import { Kit, MAT } from "./kit";
import { signFace } from "./signs";

/**
 * Toys (from the zombie pilot, 2026-11-13): rubber duck, robot, dinosaur, teddy bear, beach ball, rocket, toy car, each
 * with a face or a readable detail (critique: bare boxes and spheres read as blocks, not toys). `toyParts` adds one
 * toy to a Kit; `toyPile` builds a heap; `duckToy`/`dinoToy` are single held toys.
 */
export const TOY_COLS = ["#f2c84a", "#4ab0d8", "#e8506a", "#7ac860", "#b06ad0", "#f28a3a", "#f4f0e6"];
const ell = (k: Kit, m: ReturnType<typeof MAT.color>, rx: number, ry: number, rz: number, x: number, y: number, z: number) => {
  const g = new SphereGeometry(1, 10, 7); // hundreds of toys: keep them light
  g.scale(rx, ry, rz);
  k.add(m, g, x, y, z);
};
/** Two dot eyes with white catch-lights, looking along +z (toys are drawn cute, unlike the cast). */
const eyes = (k: Kit, x: number, y: number, z: number, gap: number, r: number) => {
  for (const e of [-1, 1]) {
    k.add(MAT.color("#1e1a24"), new SphereGeometry(r, 6, 4), x + e * gap, y, z);
    k.add(MAT.color("#ffffff"), new SphereGeometry(r * 0.35, 4, 3), x + e * gap + r * 0.3, y + r * 0.35, z + r * 0.75);
  }
};
/**
 * One toy (origin at its base, ~0.25 m at s = 1), facing +z: rubber duck, robot, dinosaur, teddy bear, beach ball,
 * rocket, toy car. Every one has a face or a readable detail, so a heap reads as toys, not blocks.
 */
export const toyParts = (k: Kit, kind: number, col: string, x: number, y: number, z: number, s = 1) => {
  const c = MAT.color(col), S = (v: number) => v * s;
  switch (kind % 7) {
    case 0: { // rubber duck
      const yel = MAT.color("#f2c84a"), wing = MAT.color("#e8b830");
      ell(k, yel, S(0.12), S(0.09), S(0.14), x, y + S(0.09), z);
      ell(k, yel, S(0.075), S(0.075), S(0.075), x, y + S(0.21), z + S(0.06));
      ell(k, MAT.color("#f28a3a"), S(0.045), S(0.018), S(0.04), x, y + S(0.195), z + S(0.135)); // beak
      for (const e of [-1, 1]) ell(k, wing, S(0.03), S(0.05), S(0.08), x + e * S(0.11), y + S(0.1), z - S(0.01));
      eyes(k, x, y + S(0.235), z + S(0.115), S(0.035), S(0.014));
      break;
    }
    case 1: { // robot
      k.box(c, S(0.16), S(0.17), S(0.12), x, y + S(0.13), z);
      k.box(MAT.color("#b8bcc4"), S(0.14), S(0.11), S(0.11), x, y + S(0.27), z);
      k.box(MAT.color("#24222a"), S(0.11), S(0.04), S(0.01), x, y + S(0.28), z + S(0.056)); // visor
      for (const e of [-1, 1]) k.add(MAT.glow("#7fe8ff", 2.2), new SphereGeometry(S(0.011), 6, 4), x + e * S(0.028), y + S(0.28), z + S(0.062));
      k.add(MAT.metal(), new CylinderGeometry(S(0.006), S(0.006), S(0.07), 5), x, y + S(0.36), z);
      k.add(MAT.color("#e8506a"), new SphereGeometry(S(0.02), 8, 6), x, y + S(0.4), z);
      k.box(MAT.color("#f2c84a"), S(0.07), S(0.05), S(0.01), x, y + S(0.14), z + S(0.062)); // chest panel
      for (const e of [-1, 1]) {
        k.add(MAT.color("#b8bcc4"), new CylinderGeometry(S(0.02), S(0.02), S(0.12), 6), x + e * S(0.1), y + S(0.13), z, { rz: e * 0.3 });
        k.box(MAT.color("#24222a"), S(0.05), S(0.05), S(0.07), x + e * S(0.04), y + S(0.025), z);
      }
      break;
    }
    case 2: { // dinosaur
      const g = MAT.color("#6ac060"), belly = MAT.color("#d8e890");
      ell(k, g, S(0.08), S(0.08), S(0.13), x, y + S(0.13), z);
      ell(k, belly, S(0.06), S(0.055), S(0.1), x, y + S(0.11), z + S(0.02));
      ell(k, g, S(0.06), S(0.055), S(0.075), x, y + S(0.25), z + S(0.13));
      k.add(g, new ConeGeometry(S(0.05), S(0.2), 8), x, y + S(0.11), z - S(0.2), { rx: -Math.PI / 2.3 });
      for (let i = 0; i < 4; i++) k.add(MAT.color("#f28a3a"), new ConeGeometry(S(0.018), S(0.05), 5), x, y + S(0.21) - i * S(0.012), z + S(0.05) - i * S(0.06));
      for (const [dx, dz] of [[-0.05, 0.06], [0.05, 0.06], [-0.05, -0.06], [0.05, -0.06]]) k.add(g, new CylinderGeometry(S(0.025), S(0.028), S(0.08), 7), x + S(dx), y + S(0.04), z + S(dz));
      eyes(k, x, y + S(0.28), z + S(0.18), S(0.03), S(0.012));
      break;
    }
    case 3: { // teddy bear
      const fur = MAT.color(col === "#f4f0e6" ? "#e8dcc4" : "#b07a4a"), pale = MAT.color("#ecd2a8");
      ell(k, fur, S(0.1), S(0.11), S(0.09), x, y + S(0.11), z);
      ell(k, pale, S(0.065), S(0.07), S(0.03), x, y + S(0.11), z + S(0.07)); // belly patch
      ell(k, fur, S(0.08), S(0.075), S(0.075), x, y + S(0.27), z);
      for (const e of [-1, 1]) {
        ell(k, fur, S(0.03), S(0.03), S(0.02), x + e * S(0.06), y + S(0.34), z); // ears
        ell(k, pale, S(0.017), S(0.017), S(0.012), x + e * S(0.06), y + S(0.34), z + S(0.012));
        ell(k, fur, S(0.035), S(0.06), S(0.035), x + e * S(0.1), y + S(0.14), z + S(0.02)); // arms
        ell(k, fur, S(0.04), S(0.035), S(0.05), x + e * S(0.055), y + S(0.03), z + S(0.03)); // feet
      }
      ell(k, pale, S(0.035), S(0.028), S(0.03), x, y + S(0.25), z + S(0.065)); // snout
      k.add(MAT.color("#1e1a24"), new SphereGeometry(S(0.012), 6, 4), x, y + S(0.26), z + S(0.094));
      eyes(k, x, y + S(0.295), z + S(0.06), S(0.03), S(0.011));
      break;
    }
    case 4: { // beach ball: two colours and a white band
      k.add(c, new SphereGeometry(S(0.1), 14, 10), x, y + S(0.1), z);
      k.add(MAT.color("#f4f0e6"), new TorusGeometry(S(0.1), S(0.012), 6, 20), x, y + S(0.1), z);
      k.add(MAT.color(col === "#4ab0d8" ? "#f2c84a" : "#4ab0d8"), new TorusGeometry(S(0.07), S(0.03), 6, 20), x, y + S(0.1), z, { ry: Math.PI / 2 });
      break;
    }
    case 5: { // rocket
      k.add(MAT.color("#f4f0e6"), new CylinderGeometry(S(0.05), S(0.055), S(0.22), 12), x, y + S(0.13), z);
      k.add(MAT.color("#e8506a"), new ConeGeometry(S(0.05), S(0.1), 12), x, y + S(0.29), z);
      k.add(MAT.color("#4ab0d8"), new CylinderGeometry(S(0.022), S(0.022), S(0.01), 10), x, y + S(0.17), z + S(0.05), { rx: Math.PI / 2 });
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        k.box(c, S(0.01), S(0.08), S(0.06), x + Math.sin(a) * S(0.06), y + S(0.05), z + Math.cos(a) * S(0.06));
      }
      break;
    }
    default: { // toy car
      k.box(c, S(0.14), S(0.06), S(0.24), x, y + S(0.07), z);
      k.box(c, S(0.12), S(0.06), S(0.12), x, y + S(0.13), z - S(0.02));
      k.box(MAT.color("#9ad0ec"), S(0.122), S(0.04), S(0.1), x, y + S(0.135), z - S(0.02));
      for (const [dx, dz] of [[-0.075, 0.07], [0.075, 0.07], [-0.075, -0.07], [0.075, -0.07]])
        k.add(MAT.color("#24222a"), new CylinderGeometry(S(0.035), S(0.035), S(0.03), 12), x + S(dx), y + S(0.035), z + S(dz), { rz: Math.PI / 2 });
    }
  }
};

export const TOY_KINDS = [0, 0, 3, 3, 1, 2, 4, 5, 6];
/** A rubber duck to hold (cold open), origin at its middle. */
export const duckToy = () => {
  const k = new Kit();
  toyParts(k, 0, "#f2c84a", 0, -0.12, 0, 1.1);
  return k.build();
};
/**
 * A toy mountain: a ring of toys up to ~0.7 m high around a gap (where a character stands, camera side = +z kept
 * clear). Origin at the gap. Light enough for hundreds of toys (merged, 6-10 segment spheres; not a collider).
 */
export const toyPile = ({ count = 160, radius = 1.5, seed = 212 } = {}) => {
  const k = new Kit(), r = rng(seed);
  // Columns, not random heights (pilot defect 2026-11-14: toys hung in the air): each spot stacks toys from the floor
  // up to the mound's height there, each one resting on the one below (LAYER = a toy's height at this size).
  const LAYER = 0.15;
  for (let n = 0; n < count; ) {
    const a = r() * Math.PI * 2, d = 0.35 + Math.sqrt(r()) * radius;
    const front = Math.cos(a) > 0.55 && d < 0.9; // keep the camera side of your feet clear-ish
    const layers = 1 + Math.floor((Math.max(0, radius + 0.1 - d) * 0.4 * r()) / LAYER);
    for (let j = 0; j < layers && n < count; j++, n++) {
      if (front) continue;
      const kind = TOY_KINDS[Math.floor(r() * TOY_KINDS.length)];
      toyParts(k, kind, TOY_COLS[Math.floor(r() * TOY_COLS.length)], Math.sin(a) * d + (r() - 0.5) * 0.05, j * LAYER, Math.cos(a) * d - 0.2 + (r() - 0.5) * 0.05, 0.55 + r() * 0.35);
    }
  }
  return k.build();
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
