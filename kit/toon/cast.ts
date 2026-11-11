import { useFrame, useThree } from "@react-three/fiber";
import { createElement, useMemo } from "react";
import { DoubleSide, Group, Mesh, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry, ShaderMaterial, Vector3 } from "three";
import { CARD_LOOK, castShadowMaterial, cardMaterial, contactMaterial } from "./cardshade";
import { CharState, Look, drawPerson } from "./figure";
import { CASTER, NOINK, SKY } from "./ink";
import { rng } from "./paint";
import { youLook } from "./protagonist";
import { shared } from "./shade";
import { BUILD_YOU, DESIGN, Pen, inkPx, makeCanvas, rig } from "./toon";

export type { CharState } from "./figure";
export { STRIDE, idlePose, posed, reactSquash, runPose, walkPose } from "./poses";

/** Blinks every 0.5-2.3 s, 4 frames long (seeded so every render tab agrees). */
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
 * A character card standing at `position` (soles on the ground): camera-facing on the NOINK layer, with a tight
 * contact shadow, a real cast shadow (an invisible sun-facing copy of the card, alpha-tested into the shadow map)
 * and a lamp-thrown decal shadow. Redraws only when the drawn state, ink width or light direction changes.
 */
export const Character: React.FC<{ position: Vector3; state: CharState; look?: Look }> = ({ position, state, look = youLook }) => {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const p = useMemo(() => {
    const cv = makeCanvas();
    const w = DESIGN.W / DESIGN.PX_PER_M, h = DESIGN.H / DESIGN.PX_PER_M;
    const geo = new PlaneGeometry(w, h);
    geo.translate(0, h / 2 - (DESIGN.H - DESIGN.SOLE) / DESIGN.PX_PER_M, 0);
    const card = new Mesh(geo, cardMaterial(cv.texture, cv.shade, cv.ink));
    card.layers.set(NOINK);
    card.receiveShadow = true;
    // Shadow caster: never drawn (no colour, no depth), only seen by the key light's shadow camera.
    // three copies map + alphaTest from this material into its shadow depth material, so the alpha test lives here.
    const caster = new Mesh(geo, new MeshBasicMaterial({ map: cv.texture, alphaTest: 0.5, colorWrite: false, depthWrite: false, side: DoubleSide }));
    caster.castShadow = true;
    caster.layers.set(CASTER);
    caster.frustumCulled = false;
    const lampCast = new Mesh(geo, castShadowMaterial(cv.texture, "lamp"));
    lampCast.layers.set(SKY);
    lampCast.frustumCulled = false;
    const contactGeo = new PlaneGeometry(0.55, 0.3);
    contactGeo.rotateX(-Math.PI / 2);
    const contact = new Mesh(contactGeo, contactMaterial());
    contact.position.y = 0.014;
    contact.layers.set(SKY);
    const feet = new Group().add(contact);
    const group = new Group().add(card, caster, lampCast, feet);
    const r = rig(look.build);
    const head = new Vector3(), headUp = (DESIGN.SOLE - r.head.y) / DESIGN.PX_PER_M;
    return { cv, card, caster, lampCast, feet, group, key: "", head, headUp };
  }, [look]);

  useFrame(() => {
    p.group.position.copy(position);
    const yaw = Math.atan2(camera.position.x - position.x, camera.position.z - position.z);
    p.card.rotation.y = p.feet.rotation.y = yaw;
    const sun = shared.uSunDir.value;
    p.caster.rotation.y = Math.atan2(sun.x, sun.z); // full silhouette as seen from the sun
    // Nearest lamp throws a second shadow, fading out over the lamp radius.
    let lamp = shared.uLampPos.value[0], best = Infinity;
    for (const l of shared.uLampPos.value) {
      const d = Math.hypot(l.x - position.x, l.z - position.z);
      if (d < best) [best, lamp] = [d, l];
    }
    const lu = (p.lampCast.material as ShaderMaterial).uniforms;
    lu.uLampP.value.copy(lamp);
    const k = Math.max(0, 1 - best / shared.uLampRadius.value);
    lu.uStrength.value = CARD_LOOK.lampCast * k * k;
    p.lampCast.visible = k > 0;
    p.lampCast.rotation.y = Math.atan2(position.x - lamp.x, position.z - lamp.z);
    // Key light direction on the card (canvas space: x right, y down), quantised to 6 deg.
    const lx = sun.x * Math.cos(yaw) - sun.z * Math.sin(yaw);
    const ang = Math.round(Math.atan2(-sun.y, lx) / (Math.PI / 30)) * (Math.PI / 30);
    const light: [number, number] = [Math.cos(ang), Math.sin(ang)];
    // Ink: constant on screen and the same for every character (sized from the protagonist's head at this distance).
    const dist = camera.position.distanceTo(p.head.copy(position).setY(position.y + p.headUp));
    const pxPerDesign = 1920 / (2 * Math.tan((camera.fov * Math.PI) / 360) * dist) / DESIGN.PX_PER_M;
    const w = Math.min(Math.round((inkPx(YOU_HEAD * pxPerDesign) / pxPerDesign) * 4) / 4, 24);
    const cu = (p.card.material as ShaderMaterial).uniforms;
    cu.uRimUv.value.set((w * 2) / DESIGN.W, (w * 2) / DESIGN.H);
    // Street-shadow probes (chest and knees, nudged toward the sun past the card's own caster).
    cu.uProbeA.value.copy(position).setY(position.y + p.headUp * 0.75).addScaledVector(sun, 0.6);
    cu.uProbeB.value.copy(position).setY(position.y + 0.35).addScaledVector(sun, 0.6);
    const key = JSON.stringify(state) + ang + w;
    if (key !== p.key) {
      p.key = key;
      for (const mode of ["color", "shade", "ink"] as const) p.cv.draw(mode, (ctx) => drawPerson(new Pen(ctx, light, w, mode), look, state));
    }
  });

  return createElement("primitive", { object: p.group });
};

/** Protagonist head height in design px: the ink reference for every card. */
const YOU_HEAD = rig(BUILD_YOU).HH;
