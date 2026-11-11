import { useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useRef } from "react";
import { getInputProps, useCurrentFrame, useVideoConfig } from "remotion";
import { Box3, DirectionalLight, Matrix3, Matrix4, Mesh, Object3D, PerspectiveCamera, Quaternion, Raycaster, Vector3 } from "three";
import { OBB } from "three/examples/jsm/math/OBB.js";
import { CamPose, applyCam } from "./camera";
import { CONTACT_Y } from "./cast";
import type { CaptionWord } from "./Captions";
import { layout } from "./figure";
import type { CharState, Look } from "./figure";
import { GRADE } from "./grade";
import { LIGHTS } from "./lights";
import { youLook } from "./protagonist";
import { DESIGN } from "./toon";

/**
 * QA layer 1 (video-qa skill): exact scene and plan checks, every frame of every shot, before anything is rendered.
 * - `<ShotCamera {...shot} />` (inside the canvas) checks what needs the built scene: camera clearance, feet, card
 *   penetration, props through props, shadows.
 * - `<QAPlan plan={...} />` (composition root) checks what needs only the plan: camera curve, subject in frame, caption
 *   vs face, reaction timing, light continuity, and exports the plan for layer 2 (scripts write out/<slug>/plan.json).
 * Results go to the browser console as `QA1 {json}` lines (scripts/remotion-api.mjs `guardPass` collects them). A
 * failure throws (stops `remotion still`/`render`) unless the render runs with inputProps `{qa: "collect"}`.
 * Colliders opt in with `userData.collider = "<name>"`; boxes are taken in each object's own frame.
 */
export const CLEARANCE = 0.3;
const FEET_TOL = 0.02, CARD_DEPTH = 0.3, ZFIGHT = 0.25, PROP_EPS = 0.01, FLOAT_TOL = 0.02;
const MAX_SPEED = 25, MAX_ACCEL = 20, MAX_ZOOM = 2.2, SNAP = 25, STILL_PX = 0.5, STILL_RUN = 12;
// measure.py motion blocks (96 px at 540x960): centres as frame fractions.
const GRID_X = [72, 204, 336, 468].map((x) => x / 540), GRID_Y = [96, 224, 352, 480, 608, 736, 864].map((y) => y / 960);
const SAFE_X: [number, number] = [0.08, 0.92], CAPTION_Y: [number, number] = [0.64, 0.76];

export const CHECKS = [
  "Camera clearance", "Feet on the ground", "Card penetration", "Props through props", "Camera curve",
  "Subject in frame", "Caption vs face", "Reaction timing", "Light continuity", "Shadows",
] as const;
export type Check = (typeof CHECKS)[number];
export type Span = [number, number];

/** A character in a shot. `at` and `state` take the shot-local frame (the same functions draw the card). */
export type CastSpec = { name: string; look?: Look; at: (f: number) => Vector3; state: (f: number) => CharState; sit?: boolean };
/** One shot of the plan. Frames are shot-local (0 = first frame of the shot) except `from`, the composition frame. */
export type Shot = {
  id: string;
  pose: (f: number) => CamPose;
  frames: number;
  from?: number;
  cast?: CastSpec[];
  /** The speaking/reacting character: head stays fully in frame and inside the horizontal safe area. */
  subject?: string;
  /** Scene + time of day: shots with the same tag must share the light. */
  scene?: string;
  light?: keyof typeof LIGHTS;
  sun?: Vector3;
  whips?: Span[];
  kicks?: Span[];
  flash?: Span[];
  /** Marked intended (check -> why): reported, not failed. */
  allow?: Partial<Record<Check, string>>;
};
export type Plan = { slug: string; shots: Shot[]; words?: CaptionWord[] };
export type Fail = { check: Check; shot: string; frame: number; to: number; object: string; note: string; intended?: string };

class Report {
  fails: Fail[] = [];
  ran = new Set<Check>();
  na: Partial<Record<Check, string>> = {};
  /** Per-frame median scene motion (px/f), for comparing with measure.py. */
  creep?: number[];
  /** Consecutive frames of the same check/shot/object collapse into one entry. */
  add(check: Check, shot: Shot, f: number, object: string, note: string, intended = shot.allow?.[check]) {
    const frame = (shot.from ?? 0) + f;
    const last = this.fails.find((x) => x.check === check && x.shot === shot.id && x.object === object && x.to >= frame - 1);
    if (last) last.to = Math.max(last.to, frame);
    else this.fails.push({ check, shot: shot.id, frame, to: frame, object, note, intended });
  }
}

const emit = (kind: "plan" | "shot", id: string, r: Report, extra: object = {}) => {
  const fails = r.fails, real = fails.filter((x) => !x.intended);
  console.log("QA1 " + JSON.stringify({ kind, id, ran: [...r.ran], na: r.na, fails, creep: r.creep, ...extra }));
  if (real.length && getInputProps().qa !== "collect") throw new Error(`QA layer 1: ${real.length} failure(s); first: ${failMessage(real[0])}`);
};
export const failMessage = (x: Fail) =>
  `${x.check}: shot "${x.shot}" frame ${x.frame}${x.to > x.frame ? `-${x.to}` : ""}: ${x.object}: ${x.note}`;

// ---------- geometry shared by both halves

type Collider = { name: string; root: Object3D; inv: Matrix4; box: Box3 };

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
    if (!box.isEmpty()) out.push({ name: String(o.userData.collider), root: o, inv, box });
  });
  return out;
};

/** Per-part oriented boxes of every collider (Kit meshes keep their parts' boxes; awnings don't fill the pavement). */
type Part = { name: string; root: Object3D; obb: OBB; r: number };
const parts = (cols: Collider[]): Part[] => {
  const out: Part[] = [];
  for (const c of cols)
    c.root.traverse((m) => {
      const mesh = m as Mesh;
      if (!mesh.isMesh || !mesh.geometry || (mesh as unknown as { isInstancedMesh?: boolean }).isInstancedMesh) return;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      for (const b of (mesh.userData.parts as Box3[] | undefined) ?? [mesh.geometry.boundingBox!]) {
        const obb = toOBB(b, mesh.matrixWorld);
        out.push({ name: c.name, root: c.root, obb, r: obb.halfSize.length() });
      }
    });
  return out;
};

/** Box in a mesh's frame -> world OBB (three's OBB.applyMatrix4 translates the centre without rotating it). */
const toOBB = (b: Box3, m: Matrix4) => {
  const pos = new Vector3(), q = new Quaternion(), sc = new Vector3();
  m.decompose(pos, q, sc);
  const half = b.getSize(new Vector3()).multiplyScalar(0.5).multiply(sc);
  half.set(Math.abs(half.x), Math.abs(half.y), Math.abs(half.z));
  return new OBB(b.getCenter(new Vector3()).applyMatrix4(m), half, new Matrix3().setFromMatrix4(new Matrix4().makeRotationFromQuaternion(q)));
};

const PX = DESIGN.PX_PER_M;
const cardYaw = (p: Vector3, cam: Vector3) => Math.atan2(cam.x - p.x, cam.z - p.z);
const yawMat = (yaw: number) => new Matrix3().setFromMatrix4(new Matrix4().makeRotationY(yaw));

/** Card measurements in metres for a frame: drawn figure width, head-top height, head rectangle (in the card plane). */
const card = (c: CastSpec, f: number) => {
  const look = c.look ?? youLook, L = layout(look, c.state(f).pose), sq = (c.state(f).pose.squash ?? 0) * 0.08;
  const w = (L.W * Math.max(1, look.build.tw, 0.76)) / PX;
  const top = ((DESIGN.SOLE - (L.hc - L.H.b)) / PX) * (1 - sq);
  const head = { x: ((L.hx - DESIGN.W / 2) / PX) * (1 + sq), y: ((DESIGN.SOLE - L.hc) / PX) * (1 - sq), a: ((L.H.a * 1.1) / PX) * (1 + sq), b: ((L.H.b * 1.1) / PX) * (1 - sq) };
  return { w, top, head };
};
/** Card body (footprint width x 0.3 m, from 5 cm above the soles to the head top), facing the lens. */
const cardOBB = (p: Vector3, yaw: number, w: number, top: number) =>
  new OBB(p.clone().setY(p.y + (0.05 + top) / 2), new Vector3(w / 2, (top - 0.05) / 2, CARD_DEPTH / 2), yawMat(yaw));
const obbDistance = (o: OBB, q: Vector3) => o.clampPoint(q, new Vector3()).distanceTo(q);

const camera = (pose: CamPose, aspect: number) => {
  const c = new PerspectiveCamera(pose.fov, aspect);
  applyCam(c, pose);
  c.updateMatrixWorld(true);
  return c;
};
const screen = (c: PerspectiveCamera, p: Vector3) => {
  const v = p.clone().project(c);
  return { x: (v.x + 1) / 2, y: (1 - v.y) / 2, front: v.z > -1 && v.z < 1 };
};
/** Head rectangle on screen (0..1, y down). */
const headBox = (c: CastSpec, f: number, cam: PerspectiveCamera) => {
  const p = c.at(f), { head } = card(c, f), yaw = cardYaw(p, cam.position);
  const r = new Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => screen(cam, p.clone().addScaledVector(r, head.x + i * head.a).setY(p.y + head.y + j * head.b)));
  return { x0: Math.min(...pts.map((q) => q.x)), x1: Math.max(...pts.map((q) => q.x)), y0: Math.min(...pts.map((q) => q.y)), y1: Math.max(...pts.map((q) => q.y)), front: pts.every((q) => q.front) };
};
const inSpans = (f: number, spans: Span[] | undefined, pad: number) => !!spans?.some(([a, b]) => f >= a - pad && f <= b + pad);

// ---------- scene checks (need the built three scene)

const sceneChecks = (shot: Shot, scene: Object3D, aspect: number) => {
  const r = new Report();
  const cols = colliders(scene), ps = parts(cols), cast = shot.cast ?? [];
  const cams = Array.from({ length: shot.frames }, (_, f) => camera(shot.pose(f), aspect));

  // Camera clearance: lens vs every collider part (a wall, post, shelf board, awning) and every character card.
  r.ran.add("Camera clearance");
  cams.forEach((cam, f) => {
    for (const pt of ps) {
      if (pt.obb.center.distanceTo(cam.position) > pt.r + CLEARANCE) continue;
      const d = obbDistance(pt.obb, cam.position);
      if (d < CLEARANCE) r.add("Camera clearance", shot, f, pt.name, d === 0 ? `lens inside ${partInfo(pt)}` : `lens ${d.toFixed(2)} m from ${partInfo(pt)} (needs >= ${CLEARANCE})`);
    }
    for (const c of cast) {
      const p = c.at(f), k = card(c, f);
      const d = obbDistance(cardOBB(p, cardYaw(p, cam.position), k.w, k.top), cam.position);
      if (d < CLEARANCE) r.add("Camera clearance", shot, f, `card "${c.name}"`, `lens ${d.toFixed(2)} m from the card`);
    }
  });

  // Camera curve, creep part: every hold creeps. Median screen motion (px/f at 1080 wide) of what rays through
  // measure.py's 7x4 block centres hit (the world is static), so both layers agree; sky misses are skipped.
  if (shot.frames > 1) {
    r.ran.add("Camera curve");
    const look = new Raycaster(), W = 1080, H = W / aspect;
    let still = 0;
    const creep: number[] = (r.creep = []);
    for (let f = 0; f < shot.frames - 1; f++) {
      const moves: number[] = [];
      for (const gx of GRID_X)
        for (const gy of GRID_Y) {
          look.setFromCamera({ x: 2 * gx - 1, y: 1 - 2 * gy } as never, cams[f]);
          const hit = look.intersectObject(scene, true)[0];
          if (!hit) continue;
          const a = screen(cams[f], hit.point), b = screen(cams[f + 1], hit.point);
          moves.push(Math.hypot((b.x - a.x) * W, (b.y - a.y) * H));
        }
      moves.sort((x, y) => x - y);
      const m = moves.length ? moves[moves.length >> 1] : 0;
      creep.push(+m.toFixed(2));
      still = m < STILL_PX ? still + 1 : 0;
      const note = `no creep: median motion < ${STILL_PX} px/f for ${STILL_RUN}+ frames`;
      if (still === STILL_RUN) for (let g = f - STILL_RUN + 1; g <= f; g++) r.add("Camera curve", shot, g, "camera hold", note);
      else if (still > STILL_RUN) r.add("Camera curve", shot, f, "camera hold", note);
    }
  }

  // Ground height under a point: first surface below (layer 0 meshes; cards, blobs and sky live on other layers).
  const ray = new Raycaster();
  ray.far = 1.2;
  const groundAt = (p: Vector3, skip?: Object3D): number | null => {
    ray.set(p.clone().setY(p.y + 0.6), new Vector3(0, -1, 0));
    const hit = ray.intersectObject(scene, true).find((h) => !skip || !isUnder(h.object, skip));
    return hit ? hit.point.y : null;
  };

  if (cast.length) {
    r.ran.add("Feet on the ground");
    r.ran.add("Card penetration");
    const memo = new Map<string, number | null>();
    for (let f = 0; f < shot.frames; f++) {
      const cam = cams[f];
      for (const c of cast) {
        const p = c.at(f), key = `${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)}`;
        if (!memo.has(key)) memo.set(key, groundAt(p));
        const g = memo.get(key)!;
        const gy = g ?? 0;
        const d = p.y - gy;
        if (Math.abs(d) > FEET_TOL)
          r.add("Feet on the ground", shot, f, `"${c.name}"`, `soles ${(d * 100).toFixed(1)} cm ${d > 0 ? "above" : "below"} the ${c.sit ? "seat" : "ground"} (y ${gy.toFixed(3)})`);
        const k = card(c, f), o = cardOBB(p, cardYaw(p, cam.position), k.w, k.top), rad = o.halfSize.length();
        for (const pt of ps) {
          if (pt.obb.center.distanceTo(o.center) > pt.r + rad) continue;
          if (o.intersectsOBB(pt.obb)) r.add("Card penetration", shot, f, `"${c.name}" vs ${pt.name}`, "card footprint overlaps it");
        }
      }
      // Two cards overlapping on screen must be >= 0.25 m apart in depth (z-fighting).
      for (let i = 0; i < cast.length; i++)
        for (let j = i + 1; j < cast.length; j++) {
          const a = cast[i], b = cast[j];
          const ba = bodyBox(a, f, cam), bb = bodyBox(b, f, cam);
          const overlap = ba.x0 < bb.x1 && bb.x0 < ba.x1 && ba.y0 < bb.y1 && bb.y0 < ba.y1;
          const fwd = cam.getWorldDirection(new Vector3());
          const dz = Math.abs(a.at(f).clone().sub(cam.position).dot(fwd) - b.at(f).clone().sub(cam.position).dot(fwd));
          if (overlap && dz < ZFIGHT) r.add("Card penetration", shot, f, `"${a.name}" vs "${b.name}"`, `cards overlap on screen ${dz.toFixed(2)} m apart in depth (z-fighting, needs >= ${ZFIGHT})`);
        }
    }
  } else r.na["Feet on the ground"] = r.na["Card penetration"] = "no characters";

  // Props through props (setup, reported once as shot "setup"): part boxes of different colliders, and nothing
  // floating above its support.
  r.ran.add("Props through props");
  const setup: Shot = { ...shot, id: "setup", from: 0 };
  for (let i = 0; i < ps.length; i++)
    for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i], b = ps[j];
      if (a.root === b.root || isUnder(a.root, b.root) || isUnder(b.root, a.root)) continue;
      if (a.obb.center.distanceTo(b.obb.center) > a.r + b.r) continue;
      const sa = a.obb.clone(), sb = b.obb.clone();
      sa.halfSize.subScalar(PROP_EPS / 2).max(new Vector3());
      sb.halfSize.subScalar(PROP_EPS / 2).max(new Vector3());
      if (!sa.intersectsOBB(sb)) continue;
      const d = depth(a.obb, b.obb), joins = a.root.userData.joins;
      // Parts of one structure that meet on purpose (`userData.joins`: terraced rows, a building's walls): party
      // walls, plinths and cornices (curve sag + 15 cm overhangs), up to 35 cm deep.
      const why = joins && joins === b.root.userData.joins && d <= 0.35 ? `${joins}: built to meet` : undefined;
      r.add("Props through props", setup, 0, `${a.name} vs ${b.name}`, `boxes intersect by more than ${PROP_EPS * 100} cm (${d > 0 ? `a corner is ${(d * 100).toFixed(0)} cm inside` : "edges cross"}); parts ${partInfo(a)} and ${partInfo(b)}`, why);
    }
  for (const c of cols) {
    const box = new Box3().setFromObject(c.root);
    if (box.min.y < FLOAT_TOL) continue;
    const g = groundAt(new Vector3((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2), c.root);
    const gap = box.min.y - (g ?? 0);
    if (gap > FLOAT_TOL) r.add("Props through props", setup, 0, c.name, `floats ${(gap * 100).toFixed(1)} cm above its support`);
  }

  // Shadows: sun shadows on in day/golden presets; every character card has a contact blob on top of the ground.
  r.ran.add("Shadows");
  const grade = shot.light ? LIGHTS[shot.light].grade : null;
  if (grade === "day" || grade === "golden") {
    let sun = false;
    scene.traverse((o) => void ((o as DirectionalLight).isDirectionalLight && (o as DirectionalLight).castShadow && (sun = true)));
    if (!sun) r.add("Shadows", shot, 0, "key light", `no shadow-casting sun in a ${shot.light} shot`);
  }
  const chars: Object3D[] = [];
  scene.traverse((o) => void (o.userData.character && chars.push(o)));
  if (shot.cast && chars.length !== cast.length) r.add("Shadows", shot, 0, "cast", `${chars.length} character cards in the scene, ${cast.length} in the plan`);
  for (const ch of chars) if (!ch.children.some((m) => m.userData.contact && m.visible)) r.add("Shadows", shot, 0, "character card", "no contact blob");
  for (const c of cast) {
    const p = c.at(0), g = groundAt(p);
    const blob = p.y + CONTACT_Y;
    if (g !== null && blob < g + 0.002) r.add("Shadows", shot, 0, `"${c.name}" contact blob`, `blob at y ${blob.toFixed(3)} is under the ground (y ${g.toFixed(3)}): hidden`);
  }
  return r;
};
/** "w x h x d m at (x, y, z)" in the collider's own frame (x across, y up, z toward its front for buildings). */
const partInfo = (p: Part) => {
  const c = p.root.worldToLocal(p.obb.center.clone()), h = p.obb.halfSize;
  return `${(2 * h.x).toFixed(2)}x${(2 * h.y).toFixed(2)}x${(2 * h.z).toFixed(2)} m at (${c.x.toFixed(2)}, ${c.y.toFixed(2)}, ${c.z.toFixed(2)})`;
};
/** Deepest corner of either box inside the other (m), as a hint of how bad an intersection is. */
const depth = (a: OBB, b: OBB) => {
  let d = 0;
  for (const [p, q] of [[a, b], [b, a]] as const) {
    const inv = new Matrix4().setFromMatrix3(q.rotation).transpose();
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      const c = new Vector3(sx, sy, sz).multiply(p.halfSize).applyMatrix3(p.rotation).add(p.center).sub(q.center).applyMatrix4(inv);
      d = Math.max(d, Math.min(q.halfSize.x - Math.abs(c.x), q.halfSize.y - Math.abs(c.y), q.halfSize.z - Math.abs(c.z)));
    }
  }
  return d;
};
const isUnder = (o: Object3D, root: Object3D) => {
  for (let p: Object3D | null = o; p; p = p.parent) if (p === root) return true;
  return false;
};
const bodyBox = (c: CastSpec, f: number, cam: PerspectiveCamera) => {
  const p = c.at(f), k = card(c, f), yaw = cardYaw(p, cam.position);
  const r = new Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const pts = [[-1, 0], [1, 0], [1, 1], [-1, 1]].map(([i, j]) => screen(cam, p.clone().addScaledVector(r, (i * k.w) / 2).setY(p.y + j * k.top)));
  return { x0: Math.min(...pts.map((q) => q.x)), x1: Math.max(...pts.map((q) => q.x)), y0: Math.min(...pts.map((q) => q.y)), y1: Math.max(...pts.map((q) => q.y)) };
};

// ---------- plan checks (camera keys, cast functions, words, lights)

const planChecks = (plan: Plan, fps: number, aspect: number) => {
  const r = new Report();
  const W = 1080, H = W / aspect;
  for (const shot of plan.shots) {
    const from = shot.from ?? 0, n = shot.frames, cast = shot.cast ?? [];
    const poses = Array.from({ length: n }, (_, f) => shot.pose(f));
    const cams = poses.map((p) => camera(p, aspect));

    // Camera curve: screen motion of what is under the frame centre, and zoom rate.
    if (n > 1) {
      r.ran.add("Camera curve");
      const v: [number, number][] = [], z: number[] = [];
      const scale = (p: CamPose) => 1 / (Math.tan((p.fov * Math.PI) / 360) * p.pos.distanceTo(p.look));
      for (let f = 0; f < n - 1; f++) {
        const s = screen(cams[f + 1], poses[f].look);
        v.push([(s.x - 0.5) * W, (s.y - 0.5) * H]);
        z.push((scale(poses[f + 1]) / scale(poses[f]) - 1) * 100);
      }
      const sp = v.map(([x, y]) => Math.hypot(x, y));
      const planned = (f: number) => inSpans(f, shot.whips, 2) || inSpans(f, shot.kicks, 2);
      for (let f = 0; f < n - 1; f++) {
        if (!planned(f)) {
          if (sp[f] > MAX_SPEED) r.add("Camera curve", shot, f, "camera", `screen speed ${sp[f].toFixed(1)} px/f (max ${MAX_SPEED} outside whips)`);
          if (f > 0) {
            const dv = Math.hypot(v[f][0] - v[f - 1][0], v[f][1] - v[f - 1][1]), dz = Math.abs(z[f] - z[f - 1]);
            if (dv > MAX_ACCEL) r.add("Camera curve", shot, f, "camera", `acceleration ${dv.toFixed(1)} px/f per frame (max ${MAX_ACCEL})`);
            if (dz > MAX_ZOOM) r.add("Camera curve", shot, f, "camera zoom", `zoom rate changes ${dz.toFixed(2)} %/f per frame (max ${MAX_ZOOM})`);
          }
          if (f >= 3 && Math.abs(sp[f] - sp[f - 3]) > SNAP) r.add("Camera curve", shot, f, "camera", `speed changes ${Math.abs(sp[f] - sp[f - 3]).toFixed(1)} px/f in 3 frames (snap)`);
        }
      }
    }

    // Subject in frame.
    const subj = cast.find((c) => c.name === shot.subject);
    if (shot.subject && !subj) r.add("Subject in frame", shot, 0, `"${shot.subject}"`, "subject is not in the shot's cast");
    if (subj) {
      r.ran.add("Subject in frame");
      cams.forEach((cam, f) => {
        const b = headBox(subj, f, cam);
        if (!b.front || b.x0 < SAFE_X[0] || b.x1 > SAFE_X[1] || b.y0 < 0 || b.y1 > 1)
          r.add("Subject in frame", shot, f, `"${subj.name}" head`, `head box x ${b.x0.toFixed(2)}-${b.x1.toFixed(2)}, y ${b.y0.toFixed(2)}-${b.y1.toFixed(2)} (needs x in ${SAFE_X.join("-")}, y in 0-1)`);
      });
    }

    // Caption vs face: while a caption is on screen, no head in the caption band.
    if (plan.words?.length && cast.length) {
      r.ran.add("Caption vs face");
      const w = plan.words, on = [w[0].start * fps, (w[w.length - 1].end + 0.3) * fps];
      cams.forEach((cam, f) => {
        if (from + f < on[0] || from + f > on[1]) return;
        for (const c of cast) {
          const b = headBox(c, f, cam);
          if (b.front && b.y0 < CAPTION_Y[1] && b.y1 > CAPTION_Y[0] && b.x1 > 0 && b.x0 < 1)
            r.add("Caption vs face", shot, f, `"${c.name}" head`, `head y ${b.y0.toFixed(2)}-${b.y1.toFixed(2)} overlaps the caption band ${CAPTION_Y.join("-")}`);
        }
      });
    }

    // Reaction timing: expression swaps and new gag effects land 0-3 frames before a word starts.
    if (cast.length) {
      if (!plan.words?.length) r.na["Reaction timing"] = "no words.json (no narration)";
      else {
        r.ran.add("Reaction timing");
        const starts = plan.words.map((x) => Math.round(x.start * fps));
        for (const c of cast)
          for (let f = 0; f < n; f++) {
            const a = c.state(f - 1), b = c.state(f);
            const fx = Object.keys(b.fx).filter((k) => !(k in a.fx));
            if (a.expr === b.expr && !fx.length) continue;
            const what = [a.expr !== b.expr ? `expression ${a.expr} -> ${b.expr}` : "", ...fx.map((k) => `fx ${k}`)].filter(Boolean).join(", ");
            const lead = starts.map((s) => s - (from + f)).filter((d) => d >= 0).sort((x, y) => x - y)[0];
            if (lead === undefined || lead > 3) r.add("Reaction timing", shot, f, `"${c.name}"`, `${what} lands ${lead === undefined ? "after the last word" : `${lead} frames before the next word`} (needs 0-3)`);
          }
      }
    }
  }

  // Light continuity across shots with the same scene tag.
  r.ran.add("Light continuity");
  const groups = new Map<string, Shot[]>();
  for (const s of plan.shots) {
    if (!s.scene || !s.light || !s.sun) {
      r.add("Light continuity", s, 0, "shot", "missing scene, light or sun in the plan");
      continue;
    }
    groups.set(s.scene, [...(groups.get(s.scene) ?? []), s]);
  }
  for (const [scene, list] of groups) {
    const a = list[0], ea = GRADE[LIGHTS[a.light!].grade].exposure ?? 1;
    for (const b of list.slice(1)) {
      const eb = GRADE[LIGHTS[b.light!].grade].exposure ?? 1;
      const deg = (a.sun!.angleTo(b.sun!) * 180) / Math.PI;
      if (a.light !== b.light) r.add("Light continuity", b, 0, `scene "${scene}"`, `light ${b.light} vs ${a.light} in "${a.id}"`);
      if (deg > 10) r.add("Light continuity", b, 0, `scene "${scene}"`, `sun ${deg.toFixed(1)} deg from "${a.id}" (max 10)`);
      if (Math.abs(eb / ea - 1) > 0.05) r.add("Light continuity", b, 0, `scene "${scene}"`, `exposure ${eb} vs ${ea}`);
    }
  }
  return r;
};

/** Layer 2 plan (video_qa.py): cuts and dissolves from the shot timing, whips/kicks/flash in composition frames. */
export const exportPlan = (plan: Plan) => {
  const shots = [...plan.shots].sort((a, b) => (a.from ?? 0) - (b.from ?? 0));
  const cuts: number[] = [], xfade: Span[] = [];
  for (let i = 1; i < shots.length; i++) {
    const a = shots[i - 1], b = shots[i], end = (a.from ?? 0) + a.frames, s = b.from ?? 0;
    if (s < end) xfade.push([s, end]);
    else cuts.push(s);
  }
  const abs = (k: "whips" | "kicks" | "flash") => shots.flatMap((s) => (s[k] ?? []).map(([a, b]) => [a + (s.from ?? 0), b + (s.from ?? 0)] as Span));
  return { cuts, xfade, flash: abs("flash"), kicks: abs("kicks"), whips: abs("whips"), shots: shots.map((s) => ({ id: s.id, from: s.from ?? 0, frames: s.frames })) };
};

/** Mount once at the composition root: runs the plan checks for every shot and publishes the plan. */
export const QAPlan: React.FC<{ plan: Plan }> = ({ plan }) => {
  const { fps, width, height } = useVideoConfig();
  const done = useRef(false);
  useLayoutEffect(() => {
    if (done.current) return;
    done.current = true;
    emit("plan", plan.slug, planChecks(plan, fps, width / height), { slug: plan.slug, plan: exportPlan(plan) });
  }, [plan, fps, width, height]);
  return null;
};

/**
 * The camera for one shot (mount inside its own Sequence so the frame is shot-local): applies `pose(frame)` every
 * frame and, once per mount, runs the scene checks over the whole shot.
 */
export const ShotCamera: React.FC<Shot> = (shot) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const scene = useThree((s) => s.scene);
  const checked = useRef(false);
  // A passive effect: runs after every layout effect of the commit (ToonWorld adds the key light in one).
  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    emit("shot", shot.id, sceneChecks(shot, scene, width / height));
  }, [scene, shot, width, height]);
  useLayoutEffect(() => applyCam(camera, shot.pose(frame)), [frame, camera, shot]);
  return null;
};
