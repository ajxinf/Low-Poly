import { useFrame, useThree } from "@react-three/fiber";
import { createElement, useMemo } from "react";
import { Group, Mesh, PerspectiveCamera, PlaneGeometry, ShaderMaterial, Vector3 } from "three";
import { CARD_LOOK, castShadowMaterial, cardMaterial, contactMaterial } from "./cardshade";
import { CharState, Look, drawPerson } from "./figure";
import { NOINK, SKY } from "./ink";
import { rng } from "./paint";
import { youLook } from "./protagonist";
import { shared } from "./shade";
import { DESIGN, Pen, inkPx, makeCanvas, rig } from "./toon";

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
 * A character card standing at `position` (soles on the ground): camera-facing on the NOINK layer, with a contact
 * shadow and a cast shadow. Redraws only when the drawn state changes. Expression swaps are instant.
 */
export const Character: React.FC<{ position: Vector3; state: CharState; look?: Look }> = ({ position, state, look = youLook }) => {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const p = useMemo(() => {
    const cv = makeCanvas();
    const w = DESIGN.W / DESIGN.PX_PER_M, h = DESIGN.H / DESIGN.PX_PER_M;
    const geo = new PlaneGeometry(w, h);
    geo.translate(0, h / 2 - (DESIGN.H - DESIGN.SOLE) / DESIGN.PX_PER_M, 0);
    const card = new Mesh(geo, cardMaterial(cv.texture, cv.mask));
    card.layers.set(NOINK);
    card.receiveShadow = true;
    const cast = new Mesh(geo, castShadowMaterial(cv.texture));
    cast.layers.set(SKY);
    cast.receiveShadow = true;
    cast.frustumCulled = false;
    const lampCast = new Mesh(geo, castShadowMaterial(cv.texture, "lamp"));
    lampCast.layers.set(SKY);
    lampCast.frustumCulled = false;
    const contactGeo = new PlaneGeometry(0.95, 0.45);
    contactGeo.rotateX(-Math.PI / 2);
    const contact = new Mesh(contactGeo, contactMaterial());
    contact.position.y = 0.014;
    contact.layers.set(SKY);
    const feet = new Group().add(contact);
    const group = new Group().add(card, cast, lampCast, feet);
    const r = rig(look.build);
    const head = new Vector3(), headUp = (DESIGN.SOLE - r.head.y) / DESIGN.PX_PER_M;
    return { cv, card, cast, lampCast, feet, group, key: "", r, head, headUp };
  }, [look]);

  useFrame(() => {
    p.group.position.copy(position);
    const yaw = Math.atan2(camera.position.x - position.x, camera.position.z - position.z);
    p.card.rotation.y = p.feet.rotation.y = yaw;
    const sun = shared.uSunDir.value;
    p.cast.rotation.y = Math.atan2(sun.x, sun.z); // silhouette as seen from the sun
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
    // Thicker outline on the side turned away from the sun (card right = (cos yaw, 0, -sin yaw)).
    const shadowSide = sun.x * Math.cos(yaw) - sun.z * Math.sin(yaw) > 0 ? -1 : 1;
    // Outline: constant on screen (inkPx of the head's screen height), converted to design px for this frame.
    const dist = camera.position.distanceTo(p.head.copy(position).setY(position.y + p.headUp));
    const headPx = ((p.r.HH / DESIGN.PX_PER_M) * 1920) / (2 * Math.tan((camera.fov * Math.PI) / 360) * dist);
    const w = Math.min(Math.round(((inkPx(headPx) * p.r.HH) / headPx) * 4) / 4, 24);
    const cu = (p.card.material as ShaderMaterial).uniforms;
    cu.uRimUv.value.set((w * 2) / DESIGN.W, (w * 2) / DESIGN.H);
    const key = JSON.stringify(state) + shadowSide + w;
    if (key !== p.key) {
      p.key = key;
      p.cv.draw((ctx) => drawPerson(new Pen(ctx, shadowSide, w), look, state));
      p.cv.drawMask((ctx) => drawPerson(new Pen(ctx, shadowSide, w, true), look, state));
    }
  });

  return createElement("primitive", { object: p.group });
};
