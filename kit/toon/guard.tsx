import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import { useCurrentFrame } from "remotion";
import { Box3, Matrix4, Mesh, Object3D, PerspectiveCamera, Vector3 } from "three";
import { CamPose, applyCam } from "./camera";

/**
 * Camera guard: every shot's camera path, sampled every frame, must stay at least `CLEARANCE` m from every building
 * and prop box (near-plane clearance). Objects opt in with `userData.collider = "<name>"`; boxes are taken in each
 * object's own frame (oriented, so a building turned along the curved street is not inflated).
 * A failure throws during the render, so `remotion still`/`render` (and scripts/stills.mjs, scripts/render.mjs) stop
 * with the shot id and frame.
 */
export const CLEARANCE = 0.3;

type Collider = { name: string; inv: Matrix4; box: Box3 };

export const colliders = (root: Object3D): Collider[] => {
  root.updateMatrixWorld(true);
  const out: Collider[] = [];
  root.traverse((o) => {
    if (!o.userData.collider) return;
    const inv = o.matrixWorld.clone().invert();
    const box = new Box3();
    o.traverse((m) => {
      const mesh = m as Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      box.union(mesh.geometry.boundingBox!.clone().applyMatrix4(inv.clone().multiply(mesh.matrixWorld)));
    });
    if (!box.isEmpty()) out.push({ name: String(o.userData.collider), inv, box });
  });
  return out;
};

export type GuardHit = { frame: number; name: string; distance: number; pos: Vector3 };

/** First frame whose camera is closer than `min` m to a collider box (inside = negative distance shown as 0). */
export const guardPath = (pose: (f: number) => CamPose, frames: number, boxes: Collider[], min = CLEARANCE): GuardHit | null => {
  const p = new Vector3();
  for (let f = 0; f < frames; f++) {
    const pos = pose(f).pos;
    for (const b of boxes) {
      const d = b.box.distanceToPoint(p.copy(pos).applyMatrix4(b.inv));
      if (d < min) return { frame: f, name: b.name, distance: d, pos: pos.clone() };
    }
  }
  return null;
};

export const guardMessage = (shot: string, h: GuardHit) =>
  `Camera guard: shot "${shot}" frame ${h.frame}: lens ${h.distance.toFixed(2)} m from ${h.name} ` +
  `(needs >= ${CLEARANCE} m) at (${h.pos.x.toFixed(2)}, ${h.pos.y.toFixed(2)}, ${h.pos.z.toFixed(2)})`;

/**
 * The camera for one shot: applies `pose(localFrame)` every frame and, once per mount, checks the whole path
 * (`frames` long) against the scene's colliders. `from` = composition frame where the shot starts.
 */
export const ShotCamera: React.FC<{ id: string; pose: (f: number) => CamPose; frames: number; from?: number }> = ({ id, pose, frames, from = 0 }) => {
  const frame = useCurrentFrame();
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const scene = useThree((s) => s.scene);
  const checked = useRef(false);
  useLayoutEffect(() => {
    if (checked.current) return;
    checked.current = true;
    const hit = guardPath(pose, frames, colliders(scene));
    if (hit) throw new Error(guardMessage(id, { ...hit, frame: hit.frame + from }));
  }, [scene, pose, frames, id, from]);
  useLayoutEffect(() => applyCam(camera, pose(frame)), [frame, camera, pose]);
  return null;
};
