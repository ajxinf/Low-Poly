import { random } from "remotion";
import { BoxGeometry, BufferGeometry, CylinderGeometry } from "three";

// Joint layout in metres at design height. Character faces +z, his left is +x.
export const PELVIS_Y = 0.94;
export const HIP = { x: 0.085, y: -0.05 };
export const THIGH = 0.4;
export const SHIN = 0.42; // ankle ends 0.07 above the floor = foot height
export const SPINE_Y = 0.05;
export const TORSO = 0.44;
export const SHOULDER = { x: 0.22, y: 0.4 };
export const UPPER_ARM = 0.28;
export const FOREARM = 0.25;
export const NECK = 0.07;
/** Hair top ≈ 1.78 m; head + hair ≈ 0.27 m, so ≈ 6.5 heads tall with a slightly big head. */
export const DESIGN_HEIGHT = 1.78;
export const HEAD_CENTER_Y = PELVIS_Y + SPINE_Y + TORSO + NECK + 0.125;
/** Right-hand attach point, in the wrist frame: palm centre (his right palm faces +x). */
export const HAND_GRIP: [number, number, number] = [0.025, -0.05, 0];

// Unshared vertices, so the Gouraud shader lights each triangle as one flat facet.
const faceted = (g: BufferGeometry) => {
  const f = g.toNonIndexed();
  f.computeVertexNormals();
  g.dispose();
  return f;
};

// Hexagonal prism hanging from its joint (y 0 down to -h). thetaStart π puts u=0.5 at the front.
const limb = (rTop: number, rBot: number, h: number, sides = 6, open = false) =>
  faceted(new CylinderGeometry(rTop, rBot, h, sides, 1, open, Math.PI).translate(0, -h / 2, 0));

// Box head (32 tris): tapered jaw, nose ridge pushed forward; front face carries the 64×64 face.
const head = () => {
  const g = new BoxGeometry(0.2, 0.25, 0.22, 2, 2, 1);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let z = pos.getZ(i);
    const y = pos.getY(i);
    if (z > 0.1 && Math.abs(x) < 0.001 && y < 0.01) z += 0.025; // nose and chin point
    if (y < -0.1) {
      x *= 0.68;
      z *= 0.85;
    } else if (y > 0.1) x *= 0.92;
    pos.setXYZ(i, x, y, z);
  }
  // Other faces sample a cheek patch of the face texture, so the whole head is one material.
  const front = g.groups[4]; // BoxGeometry groups: px nx py ny pz nz
  const frontVerts = new Set<number>();
  for (let k = front.start; k < front.start + front.count; k++) frontVerts.add(g.index!.getX(k));
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    if (!frontVerts.has(i)) uv.setXY(i, 0.08 + uv.getX(i) * 0.1, 0.35 + uv.getY(i) * 0.12);
  }
  return faceted(g.translate(0, 0.125, 0)); // pivot at the neck
};

// Hair cap (32 tris) with seeded spiky top, hanging lower at the back and sideburns.
const hair = () => {
  const g = new BoxGeometry(0.225, 0.1, 0.25, 2, 1, 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    let z = pos.getZ(i);
    let y = pos.getY(i);
    // Seed by position so duplicated corner vertices move together (no cracks).
    if (y > 0) {
      y += random(`hair${x.toFixed(3)},${z.toFixed(3)}`) * 0.035;
      if (z > 0.1) z -= 0.05; // front slopes back, so it reads as hair, not a hat brim
    } else if (z < -0.05) y -= 0.13;
    else if (Math.abs(z) < 0.001) y -= 0.05;
    else if (Math.abs(x) < 0.001) y -= 0.03; // fringe point
    pos.setXYZ(i, x, y, z);
  }
  return faceted(g.translate(0, 0.21, -0.005));
};

const box = (w: number, h: number, d: number, y: number, z = 0) => faceted(new BoxGeometry(w, h, d).translate(0, y, z));

export const GEO = {
  head: head(),
  hair: hair(),
  neck: limb(0.045, 0.05, NECK, 5, true).translate(0, NECK, 0), // 10 tris, grows up
  torso: faceted(new CylinderGeometry(0.21, 0.15, TORSO, 6, 1, false, Math.PI).scale(1, 1, 0.6).translate(0, TORSO / 2, 0)),
  pelvis: faceted(new CylinderGeometry(0.15, 0.14, 0.13, 6, 1, false, Math.PI).scale(1, 1, 0.65)),
  upperArm: limb(0.05, 0.042, UPPER_ARM),
  forearm: limb(0.042, 0.034, FOREARM),
  hand: box(0.04, 0.09, 0.085, -0.045),
  thigh: limb(0.075, 0.055, THIGH),
  shin: limb(0.055, 0.042, SHIN),
  foot: box(0.09, 0.07, 0.23, -0.035, 0.05),
};
