import { useFrame, useThree } from "@react-three/fiber";
import { createElement, useMemo } from "react";
import { DoubleSide, Group, Mesh, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry, ShaderMaterial, Vector3 } from "three";
import { CARD_LOOK, cardMaterial, contactMaterial, lampShadowMaterial } from "./cardshade";
import { drawPerson, headHeight } from "./figure";
import type { CharState, Look } from "./figure";
import { CASTER, NOINK, SKY } from "./ink";
import { rng } from "./paint";
import { youLook } from "./protagonist";
import { practicals, shared } from "./shade";
import { DESIGN, Pen, makeCanvas } from "./toon";

export type { CharState, Look } from "./figure";
export { STRIDE, idlePose, posed, reactSquash, runPose, walkPose } from "./poses";

/** Blinks every 0.5-2.3 s, 4 frames long (seeded so every render tab agrees). */
/** Height of the contact blob above the soles (the QA guard checks it stays above the ground). */
export const CONTACT_Y = 0.014;

export const blinkAt = (frame: number, fps: number, seed = 1) => {
  const r = rng(seed);
  let t = Math.round(r() * fps);
  while (t <= frame) {
    if (frame < t + 4) return true;
    t += 4 + Math.round((0.5 + 1.8 * r()) * fps);
  }
  return false;
};

/**
 * A character card standing at `position` (soles on the ground): camera-facing on the NOINK layer, with a soft
 * contact blob offset away from the sun, a real cast shadow (an invisible sun-facing copy of the card, alpha-tested
 * into the shadow map) and a lamp-thrown decal shadow. Redraws only when the drawn state or light direction changes.
 */
export const Character: React.FC<{ position: Vector3; state: CharState; look?: Look }> = ({ position, state, look = youLook }) => {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const p = useMemo(() => {
    const cv = makeCanvas();
    const w = DESIGN.W / DESIGN.PX_PER_M, h = DESIGN.H / DESIGN.PX_PER_M;
    const geo = new PlaneGeometry(w, h);
    geo.translate(0, h / 2 - (DESIGN.H - DESIGN.SOLE) / DESIGN.PX_PER_M, 0);
    const card = new Mesh(geo, cardMaterial(cv.texture));
    card.layers.set(NOINK);
    card.receiveShadow = true;
    // Shadow caster: never drawn (no colour, no depth), only seen by the key light's shadow camera.
    // three copies map + alphaTest from this material into its shadow depth material, so the alpha test lives here.
    const caster = new Mesh(geo, new MeshBasicMaterial({ map: cv.texture, alphaTest: 0.5, colorWrite: false, depthWrite: false, side: DoubleSide }));
    caster.castShadow = true;
    caster.layers.set(CASTER);
    caster.frustumCulled = false;
    const lampCast = new Mesh(geo, lampShadowMaterial(cv.texture));
    lampCast.layers.set(SKY);
    lampCast.frustumCulled = false;
    const contactGeo = new PlaneGeometry(0.55, 0.3);
    contactGeo.rotateX(-Math.PI / 2);
    const contact = new Mesh(contactGeo, contactMaterial());
    contact.position.y = CONTACT_Y;
    contact.userData.contact = true;
    contact.layers.set(SKY);
    const group = new Group().add(card, caster, lampCast, contact);
    group.userData.character = true;
    return { cv, card, caster, lampCast, contact, group, key: "", headUp: headHeight(look) };
  }, [look]);

  useFrame(() => {
    p.group.position.copy(position);
    const yaw = Math.atan2(camera.position.x - position.x, camera.position.z - position.z);
    p.card.rotation.y = p.contact.rotation.y = yaw;
    const sun = shared.uSunDir.value;
    // Contact blob slides a little away from the sun (lighting.md 4: blob offset away from the key).
    const sh = Math.hypot(sun.x, sun.z) || 1;
    p.contact.position.set((-sun.x / sh) * 0.1, CONTACT_Y, (-sun.z / sh) * 0.1);
    p.caster.rotation.y = Math.atan2(sun.x, sun.z); // full silhouette as seen from the sun
    // Nearest lamp throws a second shadow, fading out over the lamp radius.
    let lamp = practicals[0], best = Infinity;
    for (const l of practicals) {
      const d = Math.hypot(l.pos.x - position.x, l.pos.z - position.z) / l.reach;
      if (d < best) [best, lamp] = [d, l];
    }
    const lu = (p.lampCast.material as ShaderMaterial).uniforms;
    if (lamp) lu.uLampP.value.copy(lamp.pos);
    const k = lamp ? Math.max(0, 1 - best) : 0;
    lu.uStrength.value = CARD_LOOK.lampCast * k * k;
    p.lampCast.visible = k > 0;
    if (lamp) p.lampCast.rotation.y = Math.atan2(position.x - lamp.pos.x, position.z - lamp.pos.z);
    // Canvas angle the key comes from on the card (x right, y down), quantised to 15 deg (texture redraws).
    const lx = sun.x * Math.cos(yaw) - sun.z * Math.sin(yaw);
    const ang = Math.round(Math.atan2(-sun.y, lx) / (Math.PI / 12)) * (Math.PI / 12);
    const cu = (p.card.material as ShaderMaterial).uniforms;
    // Street-shadow probes (chest and knees, nudged toward the sun past the card's own caster).
    cu.uProbeA.value.copy(position).setY(position.y + p.headUp * 0.75).addScaledVector(sun, 0.6);
    cu.uProbeB.value.copy(position).setY(position.y + 0.35).addScaledVector(sun, 0.6);
    const key = JSON.stringify(state) + ang;
    if (key !== p.key) {
      p.key = key;
      p.cv.draw((ctx) => drawPerson(new Pen(ctx, ang), look, state));
    }
  });

  return createElement("primitive", { object: p.group });
};
