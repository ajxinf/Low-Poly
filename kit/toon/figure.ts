import { Effects, Expr, drawFace } from "./face";
import { Arm, Grip, Pose } from "./poses";
import { Build, DESIGN, HEAD, Pen, Rig, pearPath, rig } from "./toon";

/** What a character looks like: build, colours and hooks for the parts that vary per character. */
export type Look = {
  build: Build;
  skin: string;
  boots: string;
  /** Trouser hem band at the ankle (e.g. rolled jeans), optional. */
  cuff?: [string, string];
  /** Torso contents, called clipped to the torso (rig gives the torso box). */
  outfit: (pen: Pen, r: Rig) => void;
  /** Hair / hat in the head frame (head centre 0,0, HEAD.W wide, `ry` half-height), drawn before the face. */
  hair: (pen: Pen, ry: number, look: number) => void;
  /** Behind the head (buns, long hair). */
  hairBack?: (pen: Pen, ry: number, look: number) => void;
  /** Over the face (glasses, moustache). */
  face?: (pen: Pen, ry: number, look: number) => void;
  eyeScale?: number;
};

export type PropName = "phone" | "flashlight" | "box" | "can";
export type CharState = { pose: Pose; expr: Expr; blink: boolean; fx: Effects; prop?: PropName };

type Pt = [number, number];
type Solved = { S: Pt; E: Pt; H: Pt; side: number; a: Arm };

/** 2-bone arm: shoulder S to hand target, elbow pushed outward-and-down (bend +1) or inward-and-up (-1). */
const solveArm = (r: Rig, cx: number, sy: number, side: number, a: Arm): Solved => {
  const L = r.arm;
  const S: Pt = [cx + side * r.shoulder.dx, sy];
  let H: Pt = [S[0] + side * a.at[0] * 2 * L, S[1] + a.at[1] * 2 * L];
  let dx = H[0] - S[0], dy = H[1] - S[1];
  let d = Math.hypot(dx, dy);
  if (d > 2 * L * 0.995) {
    const k = (2 * L * 0.995) / d;
    H = [S[0] + dx * k, S[1] + dy * k];
    dx *= k;
    dy *= k;
    d = 2 * L * 0.995;
  }
  const ux = dx / d, uy = dy / d, h = Math.sqrt(Math.max(L * L - (d / 2) ** 2, 0));
  const mid: Pt = [S[0] + dx / 2, S[1] + dy / 2];
  let E: Pt = [mid[0] - uy * h, mid[1] + ux * h];
  const out = [side * 0.5, 1], b = a.bend ?? 1; // elbows hang down and a little out
  if (((E[0] - mid[0]) * out[0] + (E[1] - mid[1]) * out[1]) * b < 0) E = [mid[0] + uy * h, mid[1] - ux * h];
  return { S, E, H, side, a };
};

/** Mitten with a thumb, rotated along the forearm. */
const mitten = (pen: Pen, r: Rig, cx: number, s: Solved, skin: string) => {
  const c = pen.c, R = r.hand, grip: Grip = s.a.grip ?? "mitt";
  const th = Math.atan2(s.H[1] - s.E[1], s.H[0] - s.E[0]);
  // Thumb on the side facing the body centre (or up).
  const px = -Math.sin(th), py = Math.cos(th);
  const ts = px * Math.sign(cx - s.H[0] || 1) - py * 0.5 > 0 ? 1 : -1;
  c.save();
  c.translate(...s.H);
  c.rotate(th);
  const el = (x: number, y: number, rx: number, ry: number, rot = 0) => (q: CanvasRenderingContext2D) => q.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  if (grip === "point") {
    pen.shape((q) => q.roundRect(R * 0.2, -R * 0.3, R * 2.1, R * 0.6, R * 0.3), skin, pen.w * 0.8);
    pen.shape(el(R * 0.1, 0, R * 0.95, R * 0.85), skin);
    pen.shape(el(R * 0.3, ts * R * 0.7, R * 0.45, R * 0.3, ts * 0.5), skin, pen.w * 0.8);
  } else {
    const spread = grip === "open" ? 1 : grip === "fist" ? 0 : 0.5;
    const open = grip === "open" ? 1.25 : 1;
    pen.shape(el(R * 0.45 * open, 0, R * (grip === "fist" ? 0.95 : 1.15) * open, R * 0.88 * open), skin);
    if (grip === "open") for (const y of [-0.3, 0.12]) pen.line([[R * 1.15, y * R], [R * 1.75, y * R * 1.2]], pen.w * 0.55);
    // Thumb on top, so it reads at phone size.
    pen.shape(el(R * (0.15 + spread * 0.25), ts * R * (0.72 + spread * 0.35) * open, R * 0.48, R * 0.3, ts * (0.4 + spread * 0.7)), skin, pen.w * 0.75);
  }
  c.restore();
};

const PROP_COLORS = { box: "#c8975a", tape: "#e6cf98", can: "#c0c4c8", label: "#c8423a" };

const drawProp = (pen: Pen, name: PropName | undefined, arms: Solved[]) => {
  if (!name) return;
  const [l, rr] = [arms[0].H, arms[1].H];
  const mx = (l[0] + rr[0]) / 2, my = (l[1] + rr[1]) / 2;
  if (name === "box") {
    const w = Math.max(Math.abs(rr[0] - l[0]) - 10, 120);
    pen.shape((c) => c.rect(mx - w / 2, my - 70, w, 100), PROP_COLORS.box);
    pen.fill((c) => c.rect(mx - 10, my - 70, 20, 100), PROP_COLORS.tape);
    pen.line([[mx - w / 2, my - 46], [mx + w / 2, my - 46]], pen.w * 0.4);
  } else if (name === "can") {
    pen.shape((c) => c.roundRect(mx - 32, my - 56, 64, 84, 8), PROP_COLORS.can);
    pen.fill((c) => c.rect(mx - 32, my - 38, 64, 46), PROP_COLORS.label);
    pen.line([[mx - 32, my - 38], [mx + 32, my - 38]], pen.w * 0.4);
    pen.line([[mx - 32, my + 8], [mx + 32, my + 8]], pen.w * 0.4);
  } else {
    const [hx, hy] = rr;
    if (name === "phone") {
      pen.shape((c) => c.roundRect(hx - 22, hy - 62, 44, 74, 9), "#25242a", pen.w * 0.7);
      pen.fill((c) => c.roundRect(hx - 15, hy - 55, 30, 52, 4), "#9fd8ff");
    } else {
      pen.shape((c) => c.roundRect(hx - 14, hy - 78, 28, 88, 8), "#3a3438", pen.w * 0.7);
      pen.shape((c) => c.roundRect(hx - 20, hy - 92, 40, 22, 6), "#ffe7a0", pen.w * 0.7);
    }
  }
};

/** Draws a whole character: legs, torso and outfit, arms with elbows and mittens, head, hair and face. */
export const drawPerson = (pen: Pen, look: Look, s: CharState) => {
  const c = pen.c, r = rig(look.build), p = s.pose, cx = DESIGN.W / 2;
  const stoop = look.build.stoop ?? 0;
  const sq = (p.squash ?? 0) * 0.08;
  c.save();
  c.translate(cx, DESIGN.SOLE);
  c.scale(1 + sq, 1 - sq);
  c.translate(-cx, -DESIGN.SOLE);

  // Legs: short sticks with a slight outward knee bend; small shoes.
  const hipY = r.hip.y - p.bob + stoop * 10;
  [-1, 1].forEach((side, i) => {
    const lift = p.lift[i];
    const hx = cx + side * r.hip.dx, ax = cx + side * (r.ankle.dx - lift * 0.2), ay = r.ankle.y - lift;
    const kx = (hx + ax) / 2 + side * (5 + (p.knee ?? 0) + stoop * 8 + lift * 0.35), ky = (hipY + ay) / 2 - lift * 0.15;
    pen.poly([[hx, hipY], [kx, ky], [ax, ay]]);
    if (look.cuff) {
      const cuff = (q: CanvasRenderingContext2D) => q.roundRect(ax - 16, ay - 26, 32, 18, 5);
      pen.shape(cuff, look.cuff[0], pen.w * 0.7);
      pen.line([[ax - 14, ay - 18], [ax + 14, ay - 18]], pen.w * 0.3, look.cuff[1]);
    }
    pen.shape((q) => q.roundRect(ax - (side < 0 ? 30 : 12), ay - 6, 42, 22, [11, 13, 6, 6]), look.boots, pen.w * 0.85);
  });

  // Upper body pivots around the hips.
  c.save();
  c.translate(cx, hipY);
  c.rotate((p.sway * Math.PI) / 180);
  c.translate(-cx, r.hip.y * -1);
  const sy = r.shoulder.y - (p.shrug ?? 0);
  const arms = p.arms.map((a, i) => solveArm(r, cx, sy, i === 0 ? -1 : 1, a));
  const drawArms = (layer: Arm["layer"]) =>
    arms
      .filter((a) => a.a.layer === layer)
      .forEach((a) => {
        pen.poly([a.S, a.E, a.H]);
        mitten(pen, r, cx, a, look.skin);
      });

  drawArms("back");
  const { top, bottom, rt, rb } = r.torso;
  const torso = pearPath(cx, top, bottom, rt, rb);
  pen.shape(torso, "#000");
  pen.clip(torso, () => {
    look.outfit(pen, r);
    pen.crescent(cx, (top + bottom) / 2, rb, (bottom - top) / 2, rb * 0.55);
  });
  pen.shape(torso, null);
  drawProp(pen, s.prop, arms);
  drawArms(undefined);

  // Head frame: centre (0,0), HEAD.W wide; ink width kept constant on the card.
  const lean = p.lean ?? 0;
  const k = r.head.k * (1 + lean * 0.07);
  const ry = r.head.ry;
  c.save();
  c.translate(r.head.x, r.head.y + lean * 22 + stoop * 26 - (p.shrug ?? 0) * 0.4);
  c.rotate((((p.tilt ?? 0) + stoop * 5) * Math.PI) / 180);
  c.scale(k, k);
  const w0 = pen.w;
  pen.w = w0 / k;
  look.hairBack?.(pen, ry, p.look);
  const head = (q: CanvasRenderingContext2D) => q.ellipse(0, 0, HEAD.W / 2, ry, 0, 0, Math.PI * 2);
  pen.shape(head, look.skin);
  pen.clip(head, () => pen.crescent(0, 0, HEAD.W / 2, ry, HEAD.W * 0.22));
  pen.shape(head, null);
  look.hair(pen, ry, p.look);
  pen.occlude = false;
  drawFace(pen, s.expr, { look: p.look, blink: s.blink, fx: s.fx, skin: look.skin, eyeScale: look.eyeScale, ry });
  look.face?.(pen, ry, p.look);
  pen.occlude = true;
  pen.w = w0;
  c.restore();

  drawArms("front");
  c.restore();
  c.restore();
};
