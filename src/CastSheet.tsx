import { useLayoutEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { EXTRAS } from "../kit/toon/extras";
import { layout, measureLook } from "../kit/toon/figure";
import type { CharState, Look } from "../kit/toon/figure";
import { posed } from "../kit/toon/poses";
import { youLook } from "../kit/toon/protagonist";
import { DESIGN } from "../kit/toon/toon";
import { drawCard2D } from "./ExpressionSheet";

// Cast review (LOOK_SPEC section 4): the protagonist large with head-height guides, the six extras, and everyone at
// 120 px tall in colour and as pure silhouettes (the protagonist must read from the quiff alone).
const STAND: CharState = { pose: posed("idle", 0.2), expr: "neutral", blink: false, fx: {} };
const LOOKS: { name: string; look: Look }[] = [{ name: "you", look: youLook }, ...EXTRAS];

const label = (c: CanvasRenderingContext2D, t: string, x: number, y: number, size = 18) => {
  c.fillStyle = "#3a2e30";
  c.font = `bold ${size}px sans-serif`;
  c.textAlign = "center";
  c.fillText(t, x, y);
};

export const CastSheet: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current!.getContext("2d")!;
    c.fillStyle = "#ddd6cc";
    c.fillRect(0, 0, 1080, 1920);

    // Protagonist, k .9, with a guide line at every head height from the soles up.
    const k = 0.9, x0 = 270 - (DESIGN.W * k) / 2, y0 = 20;
    const L = layout(youLook), m = measureLook(youLook);
    c.strokeStyle = "rgba(60,40,40,0.35)";
    c.lineWidth = 1.5;
    for (let i = 0; i <= 4; i++) {
      const y = y0 + (DESIGN.SOLE - i * L.HH) * k;
      c.beginPath();
      c.moveTo(20, y);
      c.lineTo(520, y);
      c.stroke();
      label(c, `${i} HH`, 40, y - 4, 14);
    }
    drawCard2D(c, youLook, STAND, x0, y0, k);
    label(c, `you: ${m.heads.toFixed(2)} HH, head H/W ${m.hw.toFixed(2)}, ink ${m.thickThin.toFixed(1)}:1, ${m.meters.toFixed(2)} m`, 270, 960, 17);

    // Six extras, 3 x 2.
    const ke = 0.42;
    EXTRAS.forEach((e, i) => {
      const cx = 540 + 90 + (i % 3) * 180, cy = 10 + Math.floor(i / 3) * 470;
      drawCard2D(c, e.look, { ...STAND, pose: posed("idle", 0.2 + i * 0.37, (i % 3) - 1) }, cx - (DESIGN.W * ke) / 2, cy, ke);
      const me = measureLook(e.look);
      label(c, e.name, cx, cy + 438, 14);
      label(c, `${me.heads.toFixed(2)} HH  H/W ${me.hw.toFixed(2)}`, cx, cy + 458, 14);
    });

    // Everyone at 120 px tall: colour row, then silhouettes.
    LOOKS.forEach(({ name, look }, i) => {
      const me = measureLook(look), ks = 120 / (me.meters * DESIGN.PX_PER_M), cx = 80 + i * 153;
      for (const [row, sil] of [[1060, false], [1280, true]] as const) {
        const top = row + 140 - DESIGN.SOLE * ks;
        drawCard2D(c, look, STAND, cx - (DESIGN.W * ks) / 2, top, ks, sil);
      }
      label(c, name.split(" ")[0], cx, 1460, 16);
    });
    label(c, "120 px tall: colour (top) and silhouette (bottom)", 540, 1510, 20);
  }, []);
  return (
    <AbsoluteFill>
      <canvas ref={ref} width={1080} height={1920} />
    </AbsoluteFill>
  );
};
