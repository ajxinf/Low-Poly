import { CylinderGeometry, SphereGeometry, TorusGeometry } from "three";
import { Kit, MAT } from "./kit";

/**
 * Story props from the zombie pilot (2026-11-13) for any episode: held props (origin = grip point, place them with
 * cast.ts `handWorld`) and set dressing that says "fortress" or "survival" at phone size.
 */
/** Megaphone (local +z = the bell's open end), origin at the grip. */
export const megaphone = () => {
  const k = new Kit();
  // Red body, white bell face and rim: reads as a megaphone at phone size (a pale cone didn't).
  k.add(MAT.color("#d8342c"), new CylinderGeometry(0.17, 0.05, 0.42, 14), 0, 0.08, 0.2, { rx: Math.PI / 2 });
  k.add(MAT.color("#f4f0e6"), new CylinderGeometry(0.155, 0.155, 0.01, 14), 0, 0.08, 0.415, { rx: Math.PI / 2 });
  k.add(MAT.color("#f4f0e6"), new TorusGeometry(0.17, 0.025, 6, 18), 0, 0.08, 0.41);
  k.add(MAT.color("#24222a"), new CylinderGeometry(0.05, 0.05, 0.06, 10), 0, 0.08, -0.01, { rx: Math.PI / 2 });
  k.box(MAT.color("#2a2a30"), 0.05, 0.14, 0.06, 0, -0.02, 0.03);
  return k.build();
};
/** Toothbrush, origin at the handle middle. */
export const toothbrush = () => {
  const k = new Kit();
  k.box(MAT.color("#4ab0d8"), 0.02, 0.16, 0.02, 0, 0, 0);
  k.box(MAT.color("#f4f0e6"), 0.03, 0.04, 0.025, 0, 0.09, 0.015);
  return k.build();
};


/** Battery lantern (origin at its base); add a glowSprite ~0.13 m up for the light (glowSprite takes world positions). */
export const lantern = () => {
  const k = new Kit();
  k.box(MAT.metal(), 0.16, 0.04, 0.16, 0, 0.02, 0);
  k.box(MAT.glow("#ffc070", 4), 0.13, 0.18, 0.13, 0, 0.13, 0);
  k.box(MAT.metal(), 0.16, 0.03, 0.16, 0, 0.235, 0);
  k.add(MAT.metal(), new TorusGeometry(0.06, 0.008, 4, 10), 0, 0.29, 0);
  return k.build();
};

/** Barbed wire along local z (length `len` m): posts every 1.2 m, coils every 0.14 m. Origin at the base line. */
export const barbedWire = (len: number) => {
  const k = new Kit();
  for (let z = -len / 2; z <= len / 2; z += 1.2) k.add(MAT.metal(), new CylinderGeometry(0.02, 0.02, 0.5, 5), 0, 0.25, z);
  for (let z = -len / 2; z <= len / 2; z += 0.14) k.add(MAT.color("#8a8e98"), new TorusGeometry(0.13, 0.012, 4, 10), 0, 0.33, z, { ry: Math.PI / 2 + 0.3 });
  return k.build();
};
/** A sandbag wall along local z: `n` bags in the bottom row, stepping in each row (3 rows). Origin at its base. */
export const sandbags = (n = 4) => {
  const k = new Kit(), bag = MAT.color("#c8b48a");
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < n - row; i++) {
      const g = new SphereGeometry(1, 10, 6);
      g.scale(0.36, 0.13, 0.24);
      k.add(bag, g, (i % 2) * 0.05, 0.12 + row * 0.22, i * 0.5 + row * 0.25);
    }
  return k.build();
};
/** Kettle grill with a steak on it (origin at its base, grate at 0.83 m). */
export const kettleGrill = (steak = true) => {
  const k = new Kit();
  for (const [dx, dz] of [[-0.2, -0.2], [0.2, -0.2], [0, 0.25]]) k.add(MAT.metal(), new CylinderGeometry(0.02, 0.02, 0.7, 5), dx, 0.35, dz);
  k.add(MAT.color("#24222a"), new SphereGeometry(0.32, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), 0, 0.82, 0);
  k.add(MAT.metal(), new CylinderGeometry(0.31, 0.31, 0.02, 16), 0, 0.83, 0);
  if (steak) {
    k.box(MAT.color("#8a3a2a"), 0.3, 0.05, 0.2, 0, 0.865, 0);
    for (const dz of [-0.06, 0, 0.06]) k.box(MAT.color("#3a1a14"), 0.3, 0.052, 0.015, 0, 0.866, dz);
  }
  return k.build();
};
