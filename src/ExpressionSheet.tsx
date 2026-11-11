import { useLayoutEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { EXPRESSIONS, Effects, Expr, drawYou } from "../kit/toon/protagonist";
import { DESIGN, Pen, REST } from "../kit/toon/toon";

// All 14 expressions in a 4x4 grid on a neutral background; the last two cells show the effects.
const CELLS: { expr: Expr; label: string; fx: Effects }[] = [
  ...EXPRESSIONS.map((e) => ({ expr: e, label: e, fx: {} })),
  { expr: "shocked", label: "ring eyes + sweat + !", fx: { ringEyes: true, sweat: 0.5, bang: 12 } },
  { expr: "angry", label: "steam + colour fill", fx: { steam: 0.4, fill: { color: "rgba(214,60,50,0.55)", t: 0.7 } } },
];

export const ExpressionSheet: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current!.getContext("2d")!;
    c.fillStyle = "#ddd6cc";
    c.fillRect(0, 0, 1080, 1920);
    const cw = 270, ch = 480, k = 0.42;
    CELLS.forEach((cell, i) => {
      const x = (i % 4) * cw, y = Math.floor(i / 4) * ch;
      c.save();
      c.translate(x + (cw - DESIGN.W * k) / 2, y + 6);
      c.scale(k, k);
      drawYou(new Pen(c, 1), { pose: REST, expr: cell.expr, blink: false, fx: cell.fx });
      c.restore();
      c.fillStyle = "#3a2e30";
      c.font = "bold 22px sans-serif";
      c.textAlign = "center";
      c.fillText(cell.label, x + cw / 2, y + ch - 20);
    });
  }, []);
  return (
    <AbsoluteFill>
      <canvas ref={ref} width={1080} height={1920} />
    </AbsoluteFill>
  );
};
