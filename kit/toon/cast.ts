import { useFrame, useThree } from "@react-three/fiber";
import { createElement, useMemo } from "react";
import { Group, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from "three";
import { CARD_LOOK, castShadowMaterial, cardMaterial, contactMaterial } from "./cardshade";
import { NOINK, SKY } from "./ink";
import { rng } from "./paint";
import { Effects, Expr, PropName, drawYou } from "./protagonist";
import { shared } from "./shade";
import { DESIGN, Pen, Pose, REST, makeCanvas } from "./toon";

/** One step (m). A full walk cycle is two steps. */
export const STRIDE = 0.8;

/**
 * Front-view walk at distance `dist` (m) along the path; `amount` 0..1 blends from rest (for starts and stops).
 * Feet alternate lifting while the other stays planted; body bobs (~3.5 % of figure height, highest at the
 * passing pose), leans over the planted leg, arms swing against the legs.
 */
export const walkPose = (dist: number, amount = 1, look = 0): Pose => {
  const s = Math.sin((dist / (2 * STRIDE)) * Math.PI * 2);
  const k = amount;
  return {
    bob: 30 * Math.abs(s) * k,
    sway: 2.5 * s * k,
    lift: [Math.max(0, s) * 30 * k, Math.max(0, -s) * 30 * k],
    hands: [
      [6 * s * k, -18 * s * k],
      [6 * s * k, 18 * s * k],
    ],
    look,
  };
};

/** Standing idle: slow breathing bob and a little weight shift. */
export const idlePose = (t: number, look = 0): Pose => ({
  ...REST,
  bob: 6 * Math.sin((t * Math.PI * 2) / 3),
  sway: 0.8 * Math.sin((t * Math.PI * 2) / 4.3),
  hands: [
    [0, 3 * Math.sin(t * 2)],
    [0, 3 * Math.sin(t * 2 + 1)],
  ],
  look,
});

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

export type CharState = { pose: Pose; expr: Expr; blink: boolean; fx: Effects; prop?: PropName };

/**
 * A character card standing at `position` (soles on the ground): camera-facing on the NOINK layer, with a contact
 * shadow and a cast shadow. Redraws only when the drawn state changes. Expression swaps are instant.
 */
export const Character: React.FC<{ position: Vector3; state: CharState; draw?: (pen: Pen, s: CharState) => void }> = ({ position, state, draw = drawYou }) => {
  const camera = useThree((s) => s.camera);
  const p = useMemo(() => {
    const cv = makeCanvas();
    const w = DESIGN.W / DESIGN.PX_PER_M, h = DESIGN.H / DESIGN.PX_PER_M;
    const geo = new PlaneGeometry(w, h);
    geo.translate(0, h / 2 - (DESIGN.H - DESIGN.SOLE) / DESIGN.PX_PER_M, 0);
    const card = new Mesh(geo, cardMaterial(cv.texture));
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
    return { cv, card, cast, lampCast, feet, group, key: "" };
  }, []);

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
    const key = JSON.stringify(state) + shadowSide;
    if (key !== p.key) {
      p.key = key;
      p.cv.draw((ctx) => draw(new Pen(ctx, shadowSide), state));
    }
  });

  return createElement("primitive", { object: p.group });
};
