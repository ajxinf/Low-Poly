import { Look } from "./figure";
import { Build, HEAD, Pen, Rig } from "./toon";

/**
 * Cast generator: extras from a body shape, an outfit and ONE strong accessory, so crowds don't look cloned.
 * Eye variety: dots (default), sleepy half-lids (`eyes: "sleepy"`), dots behind glasses.
 * Accessories and hair are drawn in the head frame (head centre 0,0, HEAD.W = 350 wide, `ry` half-height).
 */
export const BUILDS = {
  tallThin: { h: 900, head: 0.32, aspect: 1.1, torso: 0.33, shoulder: 0.17, hip: 0.21 },
  shortRound: { h: 690, head: 0.43, aspect: 0.9, torso: 0.36, shoulder: 0.28, hip: 0.45 },
  old: { h: 780, head: 0.4, aspect: 0.96, torso: 0.32, shoulder: 0.2, hip: 0.3, stoop: 1 },
  child: { h: 560, head: 0.48, aspect: 0.98, torso: 0.26, shoulder: 0.2, hip: 0.26 },
  pear: { h: 810, head: 0.39, aspect: 1.0, torso: 0.33, shoulder: 0.17, hip: 0.38 },
  stocky: { h: 790, head: 0.4, aspect: 0.94, torso: 0.33, shoulder: 0.27, hip: 0.35 },
} satisfies Record<string, Build>;

const R = HEAD.W / 2;
type Path = (c: CanvasRenderingContext2D) => void;
const ell = (x: number, y: number, rx: number, ry: number): Path => (c) => c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);

// ------------------------------------------------------------- outfits

type Top = {
  color: string;
  /** Trousers / skirt colour and where they start (fraction of torso height). */
  bottom?: [string, number];
  stripes?: { color: string; gap: number; vertical?: boolean };
  /** Shirt V at the neck with an optional tie. */
  shirt?: { color: string; tie?: string };
  buttons?: string;
  /** Ribbed hem band (knits). */
  rib?: string;
  collar?: string;
};

const outfit = (o: Top) => (pen: Pen, r: Rig) => {
  const { top: t, bottom: b, rb, rt } = r.torso, cx = 300, h = b - t, W = rb + 24, w = pen.w;
  pen.fill((c) => c.rect(cx - W, t - 10, 2 * W, h + 20), o.color);
  if (o.stripes) {
    const s = o.stripes;
    if (s.vertical) for (let x = cx - W + s.gap / 2; x < cx + W; x += s.gap) pen.fill((c) => c.rect(x, t - 10, s.gap * 0.4, h + 20), s.color);
    else for (let y = t + s.gap / 2; y < b; y += s.gap) pen.fill((c) => c.rect(cx - W, y, 2 * W, s.gap * 0.45), s.color);
  }
  const hem = o.bottom ? t + h * o.bottom[1] : b + 20;
  if (o.bottom) {
    pen.fill((c) => c.rect(cx - W, hem, 2 * W, b - hem + 20), o.bottom![0]);
    pen.line([[cx - W, hem], [cx + W, hem]], w * 0.5);
  }
  if (o.rib) {
    pen.shape((c) => c.rect(cx - W, hem - 22, 2 * W, 22), o.rib, w * 0.5);
    for (let x = cx - W + 6; x < cx + W; x += 11) pen.line([[x, hem - 18], [x, hem - 4]], w * 0.2, "rgba(0,0,0,0.3)");
  }
  if (o.shirt) {
    const vY = t + h * 0.34;
    pen.shape((c) => {
      c.moveTo(cx - rt * 0.55, t - 10);
      c.lineTo(cx, vY);
      c.lineTo(cx + rt * 0.55, t - 10);
    }, o.shirt.color, w * 0.5);
    if (o.shirt.tie)
      pen.shape((c) => {
        c.moveTo(cx - 9, t + 4);
        c.lineTo(cx + 9, t + 4);
        c.lineTo(cx + 13, vY - 6);
        c.lineTo(cx, vY + 8);
        c.lineTo(cx - 13, vY - 6);
      }, o.shirt.tie, w * 0.4);
  }
  if (o.collar)
    for (const s of [-1, 1])
      pen.shape((c) => {
        c.moveTo(cx, t + 2);
        c.lineTo(cx + s * rt * 0.95, t - 4);
        c.lineTo(cx + s * rt * 0.6, t + h * 0.18);
      }, o.collar, w * 0.45);
  if (o.buttons) {
    const end = o.bottom ? hem - 18 : b - 24;
    for (let y = t + h * (o.shirt ? 0.42 : 0.22); y < end; y += h * 0.15) pen.shape(ell(cx, y, 6, 6), o.buttons, w * 0.3);
  }
};

// ------------------------------------------------------------- hair

/** A hair cap covering the top of the head down to `side` (fraction of ry) at the temples; `spikes` messy tips. */
const capHair = (color: string, opts: { line?: number; side?: number; spikes?: number; bald?: boolean } = {}) => (pen: Pen, ry: number) => {
  const line = -ry * (opts.line ?? 0.62), side = ry * (opts.side ?? 0.05);
  const path: Path = (c) => {
    c.moveTo(-R - 6, side);
    if (opts.bald) {
      // Tufts over the ears only.
      c.quadraticCurveTo(-R - 26, -ry * 0.35, -R + 8, -ry * 0.5);
      c.quadraticCurveTo(-R + 34, -ry * 0.2, -R + 16, side);
      c.closePath();
      c.moveTo(R + 6, side);
      c.quadraticCurveTo(R + 26, -ry * 0.35, R - 8, -ry * 0.5);
      c.quadraticCurveTo(R - 34, -ry * 0.2, R - 16, side);
      c.closePath();
      return;
    }
    c.bezierCurveTo(-R - 14, -ry * 0.9, -R * 0.6, -ry - 14, 0, -ry - 14);
    const n = opts.spikes ?? 0;
    if (n) for (let i = 1; i <= n; i++) c.lineTo(-R * 0.7 + (i - 0.5) * ((R * 1.4) / n), -ry - 14 - (i % 2 ? 34 : 6));
    c.bezierCurveTo(R * 0.6, -ry - 14, R + 14, -ry * 0.9, R + 6, side);
    c.quadraticCurveTo(R - 18, line * 0.4, R - 30, line);
    c.quadraticCurveTo(0, line - 34, -R + 30, line);
    c.quadraticCurveTo(-R + 18, line * 0.4, -R - 6, side);
  };
  pen.shape(path, color);
  pen.clip(path, () => pen.crescent(0, -ry * 0.5, R * 1.1, ry));
};

// ------------------------------------------------------------- accessories

const bowler = (pen: Pen, ry: number) => {
  const y = -ry * 0.68;
  pen.shape((c) => {
    c.moveTo(-R * 0.74, y);
    c.bezierCurveTo(-R * 0.78, -ry - 110, R * 0.78, -ry - 110, R * 0.74, y);
  }, "#2a2426");
  pen.fill((c) => c.rect(-R * 0.76, y - 30, R * 1.52, 24), "#4a3a3e");
  pen.shape(ell(0, y, R * 1.12, 22), "#2a2426");
  pen.clip((c) => c.ellipse(0, -ry - 30, R * 0.6, 50, 0, 0, Math.PI * 2), () => pen.fill(ell(-30, -ry - 50, 60, 22), "rgba(255,255,255,0.18)"));
};

const flatCap = (pen: Pen, ry: number) => {
  const y = -ry * 0.62;
  const crown: Path = (c) => {
    c.moveTo(-R - 10, y + 6);
    c.bezierCurveTo(-R - 30, -ry - 50, R + 40, -ry - 60, R + 20, y);
    c.closePath();
  };
  pen.shape(crown, "#7a6650");
  pen.clip(crown, () => {
    for (let x = -R; x < R + 40; x += 34) pen.line([[x, -ry - 60], [x + 8, y + 10]], pen.w * 0.3, "rgba(30,20,10,0.45)");
    for (let yy = -ry - 40; yy < y; yy += 30) pen.line([[-R - 30, yy], [R + 40, yy]], pen.w * 0.3, "rgba(230,210,170,0.35)");
    pen.crescent(0, -ry * 0.8, R * 1.2, ry * 0.4);
  });
  pen.shape((c) => {
    c.moveTo(-R * 0.7, y + 4);
    c.quadraticCurveTo(0, y + 50, R * 0.8, y);
    c.quadraticCurveTo(0, y + 16, -R * 0.7, y + 4);
  }, "#5a4a3a");
  pen.shape(ell(10, -ry - 36, 12, 8), "#5a4a3a", pen.w * 0.5);
};

const moustache = (pen: Pen, ry: number) => {
  const y = ry * 0.35;
  pen.shape((c) => {
    c.moveTo(0, y - 20);
    c.bezierCurveTo(30, y - 34, 80, y - 20, 92, y + 18);
    c.quadraticCurveTo(60, y + 6, 40, y + 16);
    c.quadraticCurveTo(14, y + 14, 0, y + 2);
    c.quadraticCurveTo(-14, y + 14, -40, y + 16);
    c.quadraticCurveTo(-60, y + 6, -92, y + 18);
    c.bezierCurveTo(-80, y - 20, -30, y - 34, 0, y - 20);
  }, "#e8e2da");
  pen.line([[0, y - 14], [0, y]], pen.w * 0.35, "rgba(29,20,22,0.5)");
};

const glasses = (pen: Pen) => {
  const y = -0.05 * HEAD.W, dx = 0.12 * HEAD.W;
  for (const s of [-1, 1]) {
    pen.shape(ell(s * dx, y, 40, 38), "rgba(190,225,255,0.22)", pen.w * 1.1);
    pen.line([[s * (dx + 40), y - 6], [s * (R - 4), y - 14]], pen.w * 0.9);
  }
  pen.line([[-dx + 40, y - 4], [0, y - 14], [dx - 40, y - 4]], pen.w * 0.9);
};

const bun = (pen: Pen, ry: number) => {
  pen.shape(ell(0, -ry - 40, 62, 56), "#3a2418");
  pen.clip(ell(0, -ry - 40, 62, 56), () => {
    pen.line([[-40, -ry - 60], [0, -ry - 20], [40, -ry - 66]], pen.w * 0.4, "#5a3a28");
    pen.crescent(0, -ry - 40, 62, 56);
  });
};

const nightcap = (pen: Pen, ry: number) => {
  const y = -ry * 0.6;
  const cone: Path = (c) => {
    c.moveTo(-R - 4, y + 8);
    c.bezierCurveTo(-R * 0.9, -ry - 120, R * 0.6, -ry - 150, R + 70, -ry * 0.25);
    c.quadraticCurveTo(R * 0.7, -ry - 40, R * 0.7, y + 4);
    c.closePath();
  };
  pen.shape(cone, "#f2e6d8");
  pen.clip(cone, () => {
    for (let i = -6; i < 8; i++) pen.fill((c) => {
      const x = i * 60;
      c.moveTo(x - 40, y + 20);
      c.lineTo(x + 120, -ry - 160);
      c.lineTo(x + 150, -ry - 160);
      c.lineTo(x - 10, y + 20);
    }, "#c23a3a");
    pen.crescent(0, -ry, R * 1.2, ry * 0.6);
  });
  pen.shape(cone, null);
  pen.shape((c) => c.roundRect(-R - 10, y - 10, R * 2 + 4, 34, 14), "#f2e6d8");
  pen.shape(ell(R + 72, -ry * 0.22, 30, 30), "#fbf6ee");
};

// ------------------------------------------------------------- the six extras

export const EXTRAS: { name: string; look: Look }[] = [
  {
    name: "tall thin + bowler",
    look: {
      build: BUILDS.tallThin,
      darkClothes: true,
      skin: "#efe2d0",
      eyes: "sleepy",
      boots: "#2a2224",
      outfit: outfit({ color: "#3e5a46", bottom: ["#2e2a30", 0.86], shirt: { color: "#f2ece2", tie: "#8a2a30" }, buttons: "#d8b45a" }),
      hair: (pen, ry) => {
        capHair("#3a2a22", { line: 0.45, side: 0.1 })(pen, ry);
        bowler(pen, ry);
      },
    },
  },
  {
    name: "short round + flat cap",
    look: {
      build: BUILDS.shortRound,
      skin: "#e8c4a0",
      boots: "#4a3020",
      outfit: outfit({ color: "#c9a23a", bottom: ["#5a4636", 0.8], stripes: { color: "#b08a2a", gap: 30 }, rib: "#a8852a" }),
      hair: (pen, ry) => {
        capHair("#6a4a32", { line: 0.4, side: 0.15 })(pen, ry);
        flatCap(pen, ry);
      },
    },
  },
  {
    name: "old + moustache",
    look: {
      build: BUILDS.old,
      darkClothes: true,
      skin: "#f0dcc8",
      eyes: "sleepy",
      boots: "#3a2a22",
      outfit: outfit({ color: "#7a5a44", bottom: ["#4a4a52", 0.82], collar: "#f2ece2", buttons: "#3a2a22" }),
      hair: capHair("#d4d0cc", { bald: true }),
      face: moustache,
    },
  },
  {
    name: "child + glasses",
    look: {
      build: BUILDS.child,
      skin: "#a86e4a",
      boots: "#c23a3a",
      eyeScale: 1.1,
      outfit: outfit({ color: "#f2e6d8", bottom: ["#3e6aa8", 0.78], stripes: { color: "#c8423a", gap: 34 } }),
      hair: capHair("#1e1612", { line: 0.5, spikes: 5 }),
      face: glasses,
    },
  },
  {
    name: "pear + bun",
    look: {
      build: BUILDS.pear,
      darkClothes: true,
      skin: "#7a4a32",
      boots: "#2a1e1a",
      outfit: outfit({ color: "#6a2e4a", collar: "#f2ece2", buttons: "#f2ece2" }),
      hairBack: bun,
      hair: capHair("#3a2418", { line: 0.5, side: 0.1 }),
    },
  },
  {
    name: "stocky + nightcap",
    look: {
      build: BUILDS.stocky,
      skin: "#f2e2cf",
      boots: "#8a3a3a",
      outfit: outfit({ color: "#7a92c4", bottom: ["#7a92c4", 0.76], stripes: { color: "#4e6496", gap: 28, vertical: true }, collar: "#4e6496", buttons: "#f2ece2" }),
      hair: (pen, ry) => {
        capHair("#8a5a32", { line: 0.3, side: 0.2 })(pen, ry);
        nightcap(pen, ry);
      },
    },
  },
];
