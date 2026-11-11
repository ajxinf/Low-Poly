import { BODY, CARD_INK, HH, HW, Look, Pen, Pose, drawFigure, headPath } from "./toon";

/** The protagonist ("you"): same card in every video. Costumes are overlays that keep the hair and a rust accent. */
export const YOU = {
  skin: "#deaa80",
  skinShade: "rgba(150,70,80,0.28)",
  hair: "#241b17",
  hairLight: "#43342c",
  jacket: "#a8502c",
  jacketShade: "#7e3a20",
  tee: "#2e2f30",
  jeans: "#33456b",
  boots: "#5a3a26",
};

const outfit: Look["outfit"] = (pen, cx, t, b, rw) => {
  const hem = b - 62;
  pen.fill((c) => c.rect(cx - rw - 10, t - 10, 2 * rw + 20, b - t + 20), YOU.tee);
  // Jacket panels, open over the tee.
  for (const s of [-1, 1]) {
    pen.fill((c) => {
      c.moveTo(cx + s * 24, t - 10);
      c.lineTo(cx + s * 34, hem);
      c.lineTo(cx + s * (rw + 20), hem);
      c.lineTo(cx + s * (rw + 20), t - 10);
    }, s === pen.shadowSide ? YOU.jacketShade : YOU.jacket);
    // Lapel.
    pen.c.beginPath();
    pen.c.moveTo(cx + s * 24, t + 8);
    pen.c.lineTo(cx + s * 62, t + 22);
    pen.c.lineTo(cx + s * 32, t + 120);
    pen.c.closePath();
    pen.c.fillStyle = YOU.jacketShade;
    pen.c.fill();
    pen.line([[cx + s * 24, t + 8], [cx + s * 62, t + 22], [cx + s * 32, t + 120]], pen.w * 0.45);
    pen.line([[cx + s * 26, t], [cx + s * 34, hem]], pen.w * 0.55);
    // Pocket flap and a seam.
    pen.line([[cx + s * 50, hem - 72], [cx + s * 84, hem - 70]], pen.w * 0.45);
    pen.line([[cx + s * 70, t + 40], [cx + s * 78, hem - 10]], pen.w * 0.3, "rgba(29,20,22,0.5)");
  }
  // Jeans below the jacket hem, with a belt line and a centre seam.
  pen.fill((c) => c.rect(cx - rw - 10, hem, 2 * rw + 20, b - hem + 20), YOU.jeans);
  pen.line([[cx - rw, hem], [cx + rw, hem]], pen.w * 0.6);
  pen.line([[cx, hem + 8], [cx, b]], pen.w * 0.35, "rgba(29,20,22,0.6)");
  pen.line([[cx - 30, hem + 14], [cx - 8, hem + 30]], pen.w * 0.3, "rgba(29,20,22,0.5)");
};

/** Dark hair, 4 chunky locks swept to the card's right, short fringe. */
const hair: Look["hair"] = (pen, x, y, look) => {
  const L = x - HW / 2, R = x + HW / 2, T = y - HH / 2, o = look * 10;
  const path = (c: CanvasRenderingContext2D) => {
    c.moveTo(L - 4, y + 4);
    c.bezierCurveTo(L - 14, T - 22, R + 10, T - 30, R + 6, y - 8);
    c.quadraticCurveTo(R - 4, y - 26, R - 30 + o, y - 30);
    c.quadraticCurveTo(R - 44 + o, y - 60, R - 64 + o, y - 66);
    c.quadraticCurveTo(x + 34 + o, y - 34, x + 10 + o, y - 38);
    c.quadraticCurveTo(x - 6 + o, y - 70, x - 26 + o, y - 74);
    c.quadraticCurveTo(x - 46 + o, y - 46, x - 68 + o, y - 46);
    c.quadraticCurveTo(x - 84 + o, y - 66, L + 16, y - 70);
    c.quadraticCurveTo(L + 6, y - 34, L - 4, y + 4);
  };
  pen.shape(path, YOU.hair);
  // Lock strokes, kept inside the hair.
  pen.clip(path, () => {
  for (const [a, b2, e] of [[[L + 30, T + 10], [x - 30 + o, T + 20], [x - 40 + o, y - 54]], [[x - 10, T - 2], [x + 30 + o, T + 20], [x + 20 + o, y - 46]], [[x + 40, T + 4], [R - 20, T + 40], [R - 44 + o, y - 52]]] as [number, number][][])
    pen.line([a, b2, e], pen.w * 0.45, YOU.hairLight);
  });
};

export const youLook: Look = { skin: YOU.skin, skinShade: YOU.skinShade, boots: YOU.boots, outfit, hair };

// ---------------------------------------------------------------- faces

export const EXPRESSIONS = [
  "neutral", "tired", "worried", "scared", "shocked", "smug", "determined",
  "sad", "angry", "sneaky", "relieved", "confused", "deadpan", "laughing",
] as const;
export type Expr = (typeof EXPRESSIONS)[number];

type Eyes = "dot" | "ring" | "half" | "wide" | "side" | "happy" | "content" | "closed";
type Mouth = "flat" | "frown" | "smile" | "open" | "o" | "wavy" | "smirk" | "laugh" | "grit" | "tight";
/** brow = [inner, outer] drop in px for the left and right brow (+ = lower). */
const SPEC: Record<Expr, { eyes: Eyes; brow: [number, number, number, number]; mouth: Mouth }> = {
  neutral: { eyes: "dot", brow: [8, 0, 8, 0], mouth: "flat" },
  tired: { eyes: "half", brow: [2, 12, 2, 12], mouth: "flat" },
  worried: { eyes: "dot", brow: [-16, 6, -16, 6], mouth: "wavy" },
  scared: { eyes: "wide", brow: [-22, -4, -22, -4], mouth: "o" },
  shocked: { eyes: "ring", brow: [-30, -22, -30, -22], mouth: "open" },
  smug: { eyes: "half", brow: [6, 2, -8, -16], mouth: "smirk" },
  determined: { eyes: "dot", brow: [16, -6, 16, -6], mouth: "tight" },
  sad: { eyes: "dot", brow: [-16, 8, -16, 8], mouth: "frown" },
  angry: { eyes: "dot", brow: [22, -10, 22, -10], mouth: "grit" },
  sneaky: { eyes: "side", brow: [10, 4, 10, 4], mouth: "smirk" },
  relieved: { eyes: "content", brow: [-8, 6, -8, 6], mouth: "smile" },
  confused: { eyes: "dot", brow: [12, 2, -14, -12], mouth: "wavy" },
  deadpan: { eyes: "half", brow: [4, 4, 4, 4], mouth: "flat" },
  laughing: { eyes: "happy", brow: [-10, 0, -10, 0], mouth: "laugh" },
};

export type Effects = {
  /** Sweat drop, 0..1 slide progress. */
  sweat?: number;
  /** Steam puffs, time in s. */
  steam?: number;
  /** Colour rising up the face, t 0..1 (reach 1 over ~8 frames). */
  fill?: { color: string; t: number };
  /** Ring eyes regardless of expression. */
  ringEyes?: boolean;
  /** "!" pop, frames since it appeared. */
  bang?: number;
};

const drawEye = (pen: Pen, x: number, y: number, kind: Eyes, side: number, skin: string) => {
  const w = pen.w;
  switch (kind) {
    case "dot":
      return pen.dot(x, y, 9.5);
    case "ring":
      pen.shape((c) => c.arc(x, y, 24, 0, Math.PI * 2), "#fbf6ee", w * 0.6);
      return pen.dot(x, y, 6);
    case "wide":
      pen.shape((c) => c.arc(x, y, 16, 0, Math.PI * 2), "#fbf6ee", w * 0.45);
      return pen.dot(x, y + 1, 6);
    case "half":
    case "side":
      pen.dot(x + (kind === "side" ? 6 : 0), y + 2, 9.5);
      pen.fill((c) => c.rect(x - 16, y - 14, 32, 13), skin);
      return pen.line([[x - 16, y - 1], [x + 16, y - 1]], w * 0.55);
    case "happy":
      return pen.line([[x - 15, y + 5], [x, y - 12], [x + 15, y + 5]], w * 0.6);
    case "content":
      return pen.line([[x - 15, y - 2], [x, y + 9], [x + 15, y - 2]], w * 0.6);
    case "closed":
      return pen.line([[x - 14, y + 2], [x + 14, y + 2]], w * 0.6);
  }
  void side;
};

const drawMouth = (pen: Pen, x: number, y: number, kind: Mouth) => {
  const w = pen.w * 0.6;
  switch (kind) {
    case "flat":
      return pen.line([[x - 22, y], [x + 22, y]], w);
    case "tight":
      return pen.line([[x - 20, y + 4], [x - 14, y], [x + 14, y], [x + 20, y + 4]], w);
    case "frown":
      return pen.line([[x - 22, y + 8], [x, y - 8], [x + 22, y + 8]], w);
    case "smile":
      return pen.line([[x - 24, y - 6], [x, y + 12], [x + 24, y - 6]], w);
    case "smirk":
      return pen.line([[x - 20, y + 2], [x + 6, y + 4], [x + 24, y - 10]], w);
    case "wavy":
      pen.c.strokeStyle = CARD_INK;
      pen.c.lineWidth = w;
      pen.c.beginPath();
      pen.c.moveTo(x - 24, y);
      pen.c.bezierCurveTo(x - 12, y - 10, x - 4, y + 10, x + 6, y);
      pen.c.bezierCurveTo(x + 14, y - 10, x + 20, y + 6, x + 26, y);
      return pen.c.stroke();
    case "o":
      return pen.shape((c) => c.ellipse(x, y + 4, 9, 12, 0, 0, Math.PI * 2), "#4a1a22", w);
    case "open":
      return pen.shape((c) => c.ellipse(x, y + 10, 17, 24, 0, 0, Math.PI * 2), "#4a1a22", w);
    case "laugh":
      pen.shape((c) => {
        c.moveTo(x - 30, y - 6);
        c.lineTo(x + 30, y - 6);
        c.quadraticCurveTo(x + 28, y + 36, x, y + 36);
        c.quadraticCurveTo(x - 28, y + 36, x - 30, y - 6);
      }, "#4a1a22", w);
      return pen.fill((c) => c.ellipse(x, y + 26, 14, 7, 0, 0, Math.PI * 2), "#d0606a");
    case "grit":
      pen.shape((c) => c.roundRect(x - 26, y - 8, 52, 20, 6), "#fbf6ee", w);
      for (const dx of [-9, 9]) pen.line([[x + dx, y - 6], [x + dx, y + 10]], w * 0.6);
      return pen.line([[x - 24, y + 2], [x + 24, y + 2]], w * 0.6);
  }
};

/** Face on a head centred at (x, y): expression, blink, look direction and effects. */
export const drawFace = (pen: Pen, x: number, y: number, expr: Expr, o: { look: number; blink: boolean; fx: Effects }) => {
  const s = SPEC[expr];
  const fx = o.look * 26;
  const fxs = o.fx;
  if (fxs.fill && fxs.fill.t > 0) {
    // Colour rising from the chin.
    pen.clip(headPath(x, y), () => {
      const top = y + HH / 2 - fxs.fill!.t * HH * 0.95;
      pen.fill((c) => c.rect(x - HW, top, HW * 2, HH), fxs.fill!.color);
    });
    pen.shape(headPath(x, y), null);
  }
  const eyes: Eyes = o.blink ? "closed" : fxs.ringEyes ? "ring" : s.eyes;
  for (const [i, side] of [[0, -1], [1, 1]] as const) {
    drawEye(pen, x + fx + side * 38, y + 8, eyes, side, YOU.skin);
    const inner = s.brow[i * 2], outer = s.brow[i * 2 + 1];
    pen.line([[x + fx + side * 18, y - 24 + inner], [x + fx + side * 64, y - 32 + outer]], pen.w * 1.05);
  }
  pen.line([[x + fx * 1.25 + 2, y + 30], [x + fx * 1.25 + 8, y + 42], [x + fx * 1.25 - 2, y + 44]], pen.w * 0.45);
  drawMouth(pen, x + fx, y + 70, s.mouth);
  drawEffects(pen, x, y, fxs);
};

const drawEffects = (pen: Pen, x: number, y: number, fx: Effects) => {
  if (fx.sweat !== undefined) {
    const sx = x + HW * 0.44, sy = y - 46 + fx.sweat * 34;
    pen.shape((c) => {
      c.moveTo(sx, sy - 22);
      c.quadraticCurveTo(sx + 14, sy - 2, sx + 12, sy + 6);
      c.arc(sx, sy + 6, 12, 0, Math.PI);
      c.quadraticCurveTo(sx - 14, sy - 2, sx, sy - 22);
    }, "#9fd8ff", pen.w * 0.5);
    pen.dot(sx - 4, sy + 4, 3, "rgba(255,255,255,0.8)");
  }
  if (fx.steam !== undefined) {
    for (const side of [-1, 1])
      for (let i = 0; i < 3; i++) {
        const p = (fx.steam * 0.9 + i / 3) % 1;
        const r = 12 + p * 16;
        pen.c.globalAlpha = 1 - p;
        pen.shape((c) => c.arc(x + side * (HW * 0.42 + p * 30), y - HH * 0.42 - p * 90, r, 0, Math.PI * 2), "#f3eef6", pen.w * 0.45);
        pen.c.globalAlpha = 1;
      }
  }
  if (fx.bang !== undefined) {
    // "!" pop: overshoot to 1.25, settle at 1 over ~6 frames.
    const t = Math.min(fx.bang / 6, 1);
    const k = 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2; // easeOutBack
    const bx = x + HW * 0.56, by = y - HH * 0.62;
    pen.c.save();
    pen.c.translate(bx, by);
    pen.c.scale(Math.max(k, 0.1), Math.max(k, 0.1));
    pen.c.rotate(0.18);
    pen.shape((c) => c.roundRect(-11, -46, 22, 56, 10), "#ffd23a", pen.w * 0.6);
    pen.shape((c) => c.arc(0, 30, 10, 0, Math.PI * 2), "#ffd23a", pen.w * 0.6);
    pen.c.restore();
  }
};

// ---------------------------------------------------------------- props in hand

export type PropName = "phone" | "flashlight";
export const drawProp = (name: PropName | undefined, handSide = 1) =>
  name
    ? (pen: Pen, [hx, hy]: [number, number], side: number) => {
        if (side !== handSide) return;
        if (name === "phone") {
          pen.shape((c) => c.roundRect(hx - 15, hy - 40, 30, 50, 6), "#25242a", pen.w * 0.5);
          pen.fill((c) => c.roundRect(hx - 10, hy - 35, 20, 34, 3), "#9fd8ff");
        } else {
          pen.shape((c) => c.roundRect(hx - 10, hy - 52, 20, 60, 6), "#3a3438", pen.w * 0.5);
          pen.shape((c) => c.roundRect(hx - 14, hy - 62, 28, 16, 4), "#ffe7a0", pen.w * 0.5);
        }
      }
    : undefined;

/** Full protagonist card drawing. */
export const drawYou = (
  pen: Pen,
  s: { pose: Pose; expr: Expr; blink: boolean; fx: Effects; prop?: PropName },
) => {
  const h = drawFigure(pen, youLook, s.pose, drawProp(s.prop));
  // Face shares the upper-body transform.
  pen.c.save();
  pen.c.translate(BODY.cx, h.hipY);
  pen.c.rotate((h.sway * Math.PI) / 180);
  pen.c.translate(-BODY.cx, -BODY.hip.y);
  drawFace(pen, h.hx, h.hy, s.expr, { look: s.pose.look, blink: s.blink, fx: s.fx });
  pen.c.restore();
};
