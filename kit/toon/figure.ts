import { drawFace, drawFill } from "./face";
import type { Effects, Expr, Head } from "./face";
import { REST } from "./poses";
import type { Arm, Pose } from "./poses";
import { CREAM, DESIGN, INK, INK_K, Pen, SH_CLOTH, SH_PALE, blobPts, clamp, headBlob, mix, rad } from "./toon";
import type { Blob, Build, P2 } from "./toon";

/**
 * Body v2 (LOOK_SPEC section 1, characters.md 2.6 / 3 `bodyFrontV2`): bean torso widest low with a round bottom, its
 * top hidden under the head (no neck); legs, arms and feet are single strokes in a darkened cloth colour; hands are
 * ink dots; arms come out from behind the bean and hang outside it. Our pose library (poses.ts) drives the hands
 * (2-bone IK, elbows bend outward), lifts, bob, sway, tilt, lean, shrug and squash.
 */
export type Torso = { pts: P2[]; cx: number; cy: number; a: number; b: number; top: number; bot: number; chin: number; u: number; HH: number; facing: number };

/** What a character looks like. Heads are always cream (identity); variety comes from build, clothes, hair, hats. */
export type Look = {
  build: Build;
  /** Per-character seed: head shape, tilt, noise. */
  seed: number;
  jacket: string;
  pants: string;
  shoes: string;
  /** Torso contents, drawn clipped to the bean before its shading. */
  outfit?: (p: Pen, t: Torso) => void;
  /** Hair or hat, after the head and before the face. */
  hair?: (p: Pen, h: Head) => void;
  /** Behind the head (buns). */
  hairBack?: (p: Pen, h: Head) => void;
  /** Over the face (glasses, moustache). */
  face?: (p: Pen, h: Head) => void;
  /** Brimmed hat: brows sit lower. */
  brim?: boolean;
  /** Light rim on the torso's shadow edge. */
  rim?: boolean;
};

export type PropName = "phone" | "flashlight" | "box" | "can";
export type CharState = { pose: Pose; expr: Expr; blink: boolean; fx: Effects; prop?: PropName };

const { SOLE } = DESIGN;
const CX = DESIGN.W / 2;

/** Landmarks for a look in a pose (design px). Total height = (1 + torso + legs) head heights. */
export const layout = (look: Look, pose: Pose = REST) => {
  const B = look.build, facing = clamp(pose.look, -1, 1), stoop = B.stoop ?? 0;
  const H = headBlob(look.seed, B.a, facing), W = 2 * H.a, HH = 2 * H.b, u = W / 100;
  const torsoBot = SOLE - B.legs * HH - pose.bob;
  const chin = torsoBot - B.torso * HH;
  const fwd = facing < 0 ? -1 : 1;
  const hx = CX + stoop * 0.1 * W * fwd;
  const hc = chin - H.b + stoop * 0.1 * HH + (pose.lean ?? 0) * 0.08 * HH - (pose.shrug ?? 0) * 0.3;
  return { H, W, HH, u, torsoBot, chin, hx, hc, facing, fwd, stoop };
};

/** Head centre above the soles (m), standing at rest. */
export const headHeight = (look: Look) => (SOLE - layout(look).hc) / DESIGN.PX_PER_M;

/** Acceptance numbers (LOOK_SPEC section 4) from the same geometry that is drawn. */
export const measureLook = (look: Look) => {
  const L = layout(look);
  const pts = blobPts(0, 0, { ...L.H, rot: 0 });
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
  const hh = Math.max(...ys) - Math.min(...ys), hw = Math.max(...xs) - Math.min(...xs);
  return { heads: (SOLE - (L.hc + Math.min(...ys))) / hh, hw: hh / hw, thickThin: (1 + INK_K) / (1 - INK_K), meters: (SOLE - L.hc + hh / 2) / DESIGN.PX_PER_M };
};

type Solved = { S: P2; E: P2; H: P2; side: number; a: Arm; front: boolean };

/** 2-bone arm from shoulder S: hand target in arm lengths (x outward, y down), elbow out-and-down (bend +1). */
const solveArm = (S: P2, side: number, a: Arm, half: number): Omit<Solved, "front"> => {
  let H: P2 = [S[0] + side * a.at[0] * 2 * half, S[1] + a.at[1] * 2 * half];
  let dx = H[0] - S[0], dy = H[1] - S[1], d = Math.hypot(dx, dy);
  const max = 2 * half * 0.995;
  if (d > max) {
    const k = max / d;
    H = [S[0] + dx * k, S[1] + dy * k];
    dx *= k;
    dy *= k;
    d = max;
  }
  const ux = dx / d, uy = dy / d, h = Math.sqrt(Math.max(half * half - (d / 2) ** 2, 0));
  const mid: P2 = [S[0] + dx / 2, S[1] + dy / 2];
  let E: P2 = [mid[0] - uy * h, mid[1] + ux * h];
  if (((E[0] - mid[0]) * side * 0.5 + (E[1] - mid[1])) * (a.bend ?? 1) < 0) E = [mid[0] + uy * h, mid[1] - ux * h];
  return { S, E, H, side, a };
};

/** Ink-dot hand; pointing adds one finger stroke along the forearm. */
const hand = (p: Pen, s: Solved, u: number) => {
  const grip = s.a.grip ?? "mitt";
  p.dot(s.H[0], s.H[1], (grip === "open" ? 6.5 : 5.5) * u);
  if (grip === "point") {
    const l = Math.hypot(s.H[0] - s.E[0], s.H[1] - s.E[1]) || 1;
    p.stroke([s.H, [s.H[0] + ((s.H[0] - s.E[0]) / l) * 10 * u, s.H[1] + ((s.H[1] - s.E[1]) / l) * 10 * u]], 3 * u);
  }
};

const drawProp = (p: Pen, name: CharState["prop"], arms: Solved[], u: number) => {
  if (!name) return;
  const [l, r] = [arms[0].H, arms[1].H], mx = (l[0] + r[0]) / 2, my = (l[1] + r[1]) / 2, w = 3 * u;
  const rect = (x: number, y: number, rw: number, rh: number): P2[] => [[x, y], [x + rw, y], [x + rw, y + rh], [x, y + rh]];
  if (name === "box") {
    const bw = Math.max(Math.abs(r[0] - l[0]) - 4 * u, 44 * u);
    p.poly(rect(mx - bw / 2, my - 26 * u, bw, 36 * u), "#d8a868", w);
    p.poly(rect(mx - 4 * u, my - 26 * u, 8 * u, 36 * u), "#f0dca8");
    p.stroke([[mx - bw / 2, my - 17 * u], [mx + bw / 2, my - 17 * u]], 1.6 * u);
  } else if (name === "can") {
    p.poly(rect(mx - 11 * u, my - 22 * u, 22 * u, 30 * u), "#c9ced4", w);
    p.poly(rect(mx - 11 * u, my - 15 * u, 22 * u, 16 * u), "#3a8ad8");
    p.dot(mx + 2 * u, my - 7 * u, 4 * u, "#f2c84a");
    p.poly(rect(mx - 11 * u, my - 22 * u, 22 * u, 30 * u), null, w);
  } else if (name === "phone") {
    const [hx, hy] = r;
    p.poly(rect(hx - 8 * u, hy - 24 * u, 16 * u, 27 * u), "#3a3048", w);
    p.poly(rect(hx - 5.5 * u, hy - 21 * u, 11 * u, 19 * u), "#9fd8ff");
  } else {
    const [hx, hy] = r;
    p.poly(rect(hx - 5 * u, hy - 30 * u, 10 * u, 34 * u), "#4a4058", w);
    p.poly(rect(hx - 7.5 * u, hy - 36 * u, 15 * u, 8 * u), "#ffe7a0", w);
  }
};

/** Draws a whole character (front view): legs, back arms, torso + clothing, props, front arms, head, face. */
export const drawPerson = (p: Pen, look: Look, s: CharState) => {
  const g = p.g, pose = s.pose, L = layout(look, pose), B = look.build;
  const { H, W, HH, u, torsoBot, chin, facing, fwd, stoop } = L;
  const ow = 5 * u;
  const sq = (pose.squash ?? 0) * 0.08;
  g.save();
  g.translate(CX, SOLE);
  g.scale(1 + sq, 1 - sq);
  g.translate(-CX, -SOLE);

  // Legs: single thin strokes from the hips, slight bow, A-stance; feet = short outward strokes.
  const legCol = mix(look.pants, INK, 0.55), footCol = mix(look.shoes, INK, 0.3);
  ([-1, 1] as const).forEach((side, i) => {
    const lift = pose.lift[i];
    const hx = CX + side * 15 * u, hy = torsoBot - 0.12 * HH;
    const fx = CX + side * (22 * u - lift * 0.15), fy = SOLE - 4 * u - lift;
    const bow = side * (1.5 * u + (pose.knee ?? 0) * 0.35 + lift * 0.25 + stoop * 3 * u);
    p.stroke([[hx, hy], [(hx + fx) / 2 + bow, (hy + fy) / 2], [fx, fy]], 5.8 * u, legCol);
    const drop = lift > 2 ? 0.35 : 0; // the toe drops while the foot is off the ground
    p.stroke([[fx, fy], [fx + side * 16 * u * Math.cos(drop), fy + 0.5 * u + 16 * u * Math.sin(drop)]], 7.5 * u, footCol);
  });

  // Upper body pivots around the hips.
  g.save();
  g.translate(CX, torsoBot);
  g.rotate(rad(pose.sway + stoop * 4 * fwd));
  g.translate(-CX, -torsoBot);
  const T: Blob = { a: ((B.tw / 2) * W) / 1.06, b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.6, egg: 0.12 + (B.egg ?? 0), asym: 0.04 * facing, rot: 0, noise: 0.006, seed: look.seed + 7 };
  const tcx = CX + 3 * u * facing, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  const sy = chin + 0.12 * HH - (pose.shrug ?? 0);
  const arms: Solved[] = pose.arms.map((a, i) => {
    const side = i === 0 ? -1 : 1;
    const r = solveArm([tcx + side * 0.85 * T.a, sy], side, a, 0.475 * HH);
    // A hand inside the bean's outline is in front of the body (crossed arms, holding a prop).
    const front = !!s.prop || Math.abs(r.H[0] - tcx) < T.a * 0.9;
    return { ...r, front };
  });
  const armCol = mix(look.jacket, INK, 0.5);
  const drawArm = (a: Solved) => {
    p.stroke([a.S, a.E, a.H], 5.2 * u, armCol);
    hand(p, a, u);
  };
  arms.filter((a) => !a.front && a.a.layer !== "front").forEach(drawArm);

  p.poly(tp, look.jacket);
  const torso: Torso = { pts: tp, cx: tcx, cy: tcy, a: T.a, b: T.b, top: chin - 0.25 * HH, bot: torsoBot, chin, u, HH, facing };
  if (look.outfit) p.clip(tp, () => look.outfit!(p, torso));
  p.shade(tp, SH_CLOTH, T.a, 0.55, 0.18);
  if (look.rim) p.rimLight(tp, mix(look.jacket, "#ffffff", 0.45), 2 * u);
  p.inkRing(tp, ow);
  drawProp(p, s.prop, arms, u);
  arms.filter((a) => a.front && a.a.layer !== "front").forEach(drawArm);

  // Head: tilts around the chin with its own random rot; hair, face and hats are drawn in the rotated frame.
  const k = 1 + (pose.lean ?? 0) * 0.07;
  g.save();
  g.translate(L.hx, chin);
  g.rotate(rad((pose.tilt ?? 0) + stoop * 5 * fwd) + H.rot);
  g.scale(k, k);
  g.translate(-L.hx, -chin);
  const hp = blobPts(L.hx, L.hc, { ...H, rot: 0 });
  const head: Head = { cx: L.hx, cy: L.hc, a: H.a, b: H.b, W, u, pts: hp, facing, look: pose.look };
  look.hairBack?.(p, head);
  p.poly(hp, CREAM);
  drawFill(p, head, s.fx);
  p.shade(hp, SH_PALE, H.a);
  p.inkRing(hp, ow);
  look.hair?.(p, head);
  drawFace(p, head, s.expr, { blink: s.blink, fx: s.fx, brim: look.brim });
  look.face?.(p, head);
  g.restore();

  arms.filter((a) => a.a.layer === "front").forEach(drawArm);
  g.restore();
  g.restore();
};
