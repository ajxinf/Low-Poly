import { CharState, Look, drawPerson } from "./figure";
import { BUILD_YOU, Pen } from "./toon";

export { EXPRESSIONS } from "./face";
export type { Effects, Expr } from "./face";
export type { PropName } from "./figure";

/** The protagonist ("you"): same card in every video. Costumes are overlays that keep the quiff and a rust accent. */
export const YOU = {
  skin: "#f4ece0",
  hair: "#211915",
  hairLight: "#4a3830",
  jacket: "#a8502c",
  jacketDark: "#7e3a20",
  jacketLight: "#bd6238",
  stitch: "#5a2410",
  tee: "#2e2f30",
  teeStripe: "#4a4c50",
  jeans: "#33456b",
  jeansLight: "#5a76a6",
  thread: "#c8904e",
  boots: "#5a3a26",
};

const outfit: Look["outfit"] = (pen, r) => {
  const { top: t, bottom: b, rb } = r.torso, cx = 300, h = b - t, W = rb + 24, w = pen.w;
  const hem = t + h * 0.74;
  // Striped charcoal tee.
  pen.fill((c) => c.rect(cx - W, t - 10, 2 * W, h + 20), YOU.tee);
  for (let y = t + 8; y < hem; y += 24) pen.fill((c) => c.rect(cx - W, y, 2 * W, 10), YOU.teeStripe);
  // Jeans below the jacket: fly seam and thread-coloured pocket stitching.
  pen.fill((c) => c.rect(cx - W, hem, 2 * W, b - hem + 20), YOU.jeans);
  pen.line([[cx + 6, hem + 4], [cx + 6, b - 14], [cx - 8, b - 4]], w * 0.35, "rgba(20,20,40,0.7)");
  for (const s of [-1, 1]) pen.line([[cx + s * rb * 0.9, hem + 8], [cx + s * rb * 0.55, hem + 22], [cx + s * rb * 0.35, hem + 6]], w * 0.3, YOU.thread, [5, 5]);
  // Jacket: two panels zipped from the hem up to a V at the chest.
  const vY = t + h * 0.4;
  for (const s of [-1, 1]) {
    const panel = (c: CanvasRenderingContext2D) => {
      c.moveTo(cx + s * 3, vY);
      c.lineTo(cx + s * 30, t - 10);
      c.lineTo(cx + s * W, t - 10);
      c.lineTo(cx + s * W, hem);
      c.lineTo(cx + s * 3, hem);
    };
    pen.fill(panel, YOU.jacket);
    pen.line([[cx + s * 3, vY], [cx + s * 30, t - 10]], w * 0.5);
    // Stitching inset along the front edge and the shoulder seam.
    pen.line([[cx + s * 13, hem - 26], [cx + s * 13, vY + 6], [cx + s * 36, t + 6]], w * 0.28, YOU.stitch, [6, 6]);
    pen.line([[cx + s * 48, t + 2], [cx + s * (r.torso.rt + 6), t + h * 0.2]], w * 0.3, YOU.stitch, [6, 6]);
    // Patch pocket with a flap.
    const px = cx + s * rb * 0.5, py = hem - h * 0.26;
    const pocket = (c: CanvasRenderingContext2D) => c.roundRect(px - 24, py, 48, h * 0.2, [3, 3, 8, 8]);
    pen.shape(pocket, YOU.jacket, w * 0.45);
    pen.line([[px - 18, py + 6], [px - 18, py + h * 0.2 - 6], [px + 18, py + h * 0.2 - 6], [px + 18, py + 6]], w * 0.25, YOU.stitch, [4, 4]);
    pen.shape((c) => c.roundRect(px - 26, py - 4, 52, 16, [4, 4, 8, 8]), YOU.jacketDark, w * 0.45);
  }
  // Ribbed waistband.
  pen.shape((c) => c.rect(cx - W, hem - 20, 2 * W, 20), YOU.jacketDark, w * 0.5);
  for (let x = cx - W + 8; x < cx + W; x += 12) pen.line([[x, hem - 16], [x, hem - 4]], w * 0.2, YOU.stitch);
  // Zip line with teeth and a pull at the V.
  pen.line([[cx, vY], [cx, hem]], w * 0.45);
  for (let y = vY + 10; y < hem - 22; y += 9) pen.line([[cx - 4, y], [cx + 4, y]], w * 0.18, "#d8c8a8");
  pen.shape((c) => c.roundRect(cx - 7, vY - 2, 14, 24, 4), "#d8c8a8", w * 0.35);
  // Collar: two pointed flaps standing over the shoulders.
  for (const s of [-1, 1])
    pen.shape((c) => {
      c.moveTo(cx + s * 22, t - 8);
      c.quadraticCurveTo(cx + s * 60, t - 4, cx + s * (r.torso.rt + 14), t + 12);
      c.lineTo(cx + s * 52, t + h * 0.3);
      c.quadraticCurveTo(cx + s * 34, t + h * 0.12, cx + s * 22, t - 8);
    }, YOU.jacketLight, w * 0.5);
};

/** Tall swept quiff with one cowlick up and forward; short sideburns. Drawn in the head frame. */
const HAIR = (c: CanvasRenderingContext2D) => {
  c.moveTo(-168, -62);
  c.bezierCurveTo(-188, -142, -152, -202, -92, -206);
  c.bezierCurveTo(-72, -262, -12, -300, 48, -290);
  c.quadraticCurveTo(84, -318, 132, -352); // cowlick tip, up and forward
  c.quadraticCurveTo(108, -304, 94, -278);
  c.bezierCurveTo(134, -260, 172, -200, 174, -122);
  c.quadraticCurveTo(178, -82, 168, -58);
  c.quadraticCurveTo(150, -70, 140, -104);
  c.quadraticCurveTo(110, -128, 70, -124);
  c.quadraticCurveTo(40, -150, 8, -130);
  c.quadraticCurveTo(-30, -148, -66, -128);
  c.quadraticCurveTo(-110, -140, -138, -108);
  c.quadraticCurveTo(-152, -82, -168, -62);
};

const hair: Look["hair"] = (pen, _ry, look) => {
  const c = pen.c;
  c.save();
  c.translate(look * 6, 0);
  pen.shape(HAIR, YOU.hair);
  pen.clip(HAIR, () => {
    pen.crescent(0, -150, 200, 160);
    for (const [a, m, e] of [
      [[-140, -160], [-80, -240], [30, -276]],
      [[-70, -146], [10, -226], [92, -262]],
      [[20, -140], [100, -190], [150, -170]],
    ] as [number, number][][])
      pen.line([a, m, e], pen.w * 0.5, YOU.hairLight);
  });
  c.restore();
};

export const youLook: Look = {
  build: BUILD_YOU,
  skin: YOU.skin,
  boots: YOU.boots,
  cuff: [YOU.jeansLight, YOU.jeans],
  outfit,
  hair,
};

/** Full protagonist card drawing. */
export const drawYou = (pen: Pen, s: CharState) => drawPerson(pen, youLook, s);
