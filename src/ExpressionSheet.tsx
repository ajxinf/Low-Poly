import { useLayoutEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { CharState, Look, drawPerson } from "../kit/toon/figure";
import { PoseName, posed } from "../kit/toon/poses";
import { EXPRESSIONS, Effects, Expr, youLook } from "../kit/toon/protagonist";
import { DESIGN, Pen, inkPx, rig } from "../kit/toon/toon";

// The 14 expressions, each on a different body pose, then two effect cells. 4x4 grid, neutral background.
const POSE_OF: Record<Expr, PoseName> = {
  neutral: "idle", tired: "facepalm", worried: "chin", scared: "panic", shocked: "point", smug: "crossed",
  determined: "run", sad: "hold", angry: "hips", sneaky: "lean", relieved: "walk", confused: "shrug",
  deadpan: "hold", laughing: "panic",
};
const CELLS: { expr: Expr; pose: PoseName; label: string; fx: Effects; prop?: CharState["prop"] }[] = [
  ...EXPRESSIONS.map((e) => ({ expr: e, pose: POSE_OF[e], label: `${e} / ${POSE_OF[e]}`, fx: {}, prop: e === "sad" ? ("box" as const) : e === "deadpan" ? ("can" as const) : undefined })),
  { expr: "shocked", pose: "lean", label: "ring eyes + sweat + !", fx: { ringEyes: true, sweat: 0.5, bang: 12 } },
  { expr: "angry", pose: "crossed", label: "steam + colour fill", fx: { steam: 0.4, fill: { color: "rgba(214,60,50,0.55)", t: 0.7 } } },
];
/** Neutral ambient for the shade side on the sheet (the card shader tints it per scene). */
const SHADE = "#b4adc4";

/** Draws a character card at scale k into `c` at (x, y): colour, then the shade mask multiplied on top. */
export const drawCard2D = (c: CanvasRenderingContext2D, look: Look, s: CharState, x: number, y: number, k: number, light: [number, number] = [-0.6, -0.8]) => {
  const make = () => {
    const cv = document.createElement("canvas");
    cv.width = DESIGN.W;
    cv.height = DESIGN.H;
    return cv;
  };
  const col = make(), mask = make();
  const r = rig(look.build);
  const w = inkPx(r.HH * k) / k;
  drawPerson(new Pen(col.getContext("2d")!, light, w), look, s);
  const m = mask.getContext("2d")!;
  drawPerson(new Pen(m, light, w, "shade"), look, s);
  m.globalCompositeOperation = "source-in";
  m.fillStyle = SHADE;
  m.fillRect(0, 0, DESIGN.W, DESIGN.H);
  const cc = col.getContext("2d")!;
  cc.globalCompositeOperation = "multiply";
  cc.drawImage(mask, 0, 0);
  c.drawImage(col, x, y, DESIGN.W * k, DESIGN.H * k);
};

export const ExpressionSheet: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current!.getContext("2d")!;
    c.fillStyle = "#ddd6cc";
    c.fillRect(0, 0, 1080, 1920);
    const cw = 270, ch = 480, k = 0.45;
    CELLS.forEach((cell, i) => {
      const x = (i % 4) * cw, y = Math.floor(i / 4) * ch;
      const s: CharState = { pose: posed(cell.pose, 0.2), expr: cell.expr, blink: false, fx: cell.fx, prop: cell.prop };
      drawCard2D(c, youLook, s, x + (cw - DESIGN.W * k) / 2, y, k);
      c.fillStyle = "#3a2e30";
      c.font = "bold 20px sans-serif";
      c.textAlign = "center";
      c.fillText(cell.label, x + cw / 2, y + ch - 14);
    });
  }, []);
  return (
    <AbsoluteFill>
      <canvas ref={ref} width={1080} height={1920} />
    </AbsoluteFill>
  );
};
