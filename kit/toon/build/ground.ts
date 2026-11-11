import { CircleGeometry, DodecahedronGeometry, InstancedMesh, Matrix4, Mesh, PlaneGeometry, Quaternion, ShaderMaterial, UniformsLib, UniformsUtils, Vector3 } from "three";
import { LightPreset, linear } from "../lights";
import { grain, painted, rng, shade, strokes } from "../paint";
import { toonMaterial } from "../shade";

/**
 * Ground textures (2 m tiles, 512 px), all on the same variation rules:
 * - pieces (stones, boards, tiles, pebbles) vary in size 0.7-1.3x;
 * - `contrast` scales every value swing (default .5 = half the old cobbles);
 * - joints are a lighter tint of the base (mortar, gaps, grout), never near-black;
 * - the worn path, puddles and edge debris are added by the street (toonMaterial `wear`, `puddle`, `debris`).
 */
export type GroundKind = "cobbles" | "planks" | "dirt" | "snow" | "tiles" | "slabs" | "asphalt" | "grass";
export type GroundOpts = { kind: GroundKind; base: string; contrast?: number; accent?: string };

type R = () => number;
type Ctx = CanvasRenderingContext2D;
const W = 512;
const size = (r: R) => 0.7 + 0.6 * r();
/** Colour jitter scaled by contrast. */
const jit = (base: string, r: R, k: number, c: number) => shade(base, (r() - 0.5) * k * c * 2);

const wrapDraw = (ctx: Ctx, f: (dx: number, dy: number) => void) => {
  for (const dx of [-W, 0, W]) for (const dy of [-W, 0, W]) f(dx, dy);
};

const PAINT: Record<GroundKind, (ctx: Ctx, r: R, base: string, c: number, accent: string) => void> = {
  cobbles: (ctx, r, base, c) => {
    ctx.fillStyle = shade(base, -0.28 * c * 2); // lighter mortar
    ctx.fillRect(0, 0, W, W);
    strokes(ctx, r, W, W, 260, [shade(base, -0.2 * c), shade(base, 0.1 * c)], 12, 5, 0.4);
    const rows = 13, rh = W / rows;
    for (let j = 0; j < rows; j++) {
      let x = r() * rh;
      while (x < W) {
        const k = size(r), w = rh * 1.15 * k, h = Math.min(rh * 0.82 * (0.85 + 0.3 * k), rh - 3);
        const y = j * rh + (r() - 0.5) * 3, col = jit(base, r, 0.42, c);
        const rad = Math.min(w, h) * (0.32 + r() * 0.18), rot = (r() - 0.5) * 0.14;
        wrapDraw(ctx, (dx, dy) => {
          ctx.save();
          ctx.translate(x + dx + w / 2, y + dy + rh / 2);
          ctx.rotate(rot);
          ctx.beginPath();
          ctx.roundRect(-w / 2 + 2.5, -h / 2, w - 5, h, rad);
          ctx.fillStyle = col;
          ctx.fill();
          ctx.globalAlpha = 0.5 * c * 2;
          ctx.lineWidth = 3;
          ctx.lineCap = "round";
          ctx.strokeStyle = shade(base, 0.3 * c);
          ctx.beginPath();
          ctx.moveTo(-w / 2 + 8, -h / 2 + 5);
          ctx.lineTo(w * 0.12, -h / 2 + 4);
          ctx.stroke();
          ctx.restore();
          ctx.globalAlpha = 1;
        });
        x += w;
      }
    }
    strokes(ctx, r, W, W, 500, [shade(base, -0.15 * c), shade(base, 0.12 * c), "#a07466", "#7e7a9a"], 14, 3, 0.15);
  },
  slabs: (ctx, r, base, c) => {
    ctx.fillStyle = shade(base, -0.25 * c * 2);
    ctx.fillRect(0, 0, W, W);
    const n = 4, s = W / n;
    for (let j = 0; j < n; j++) {
      let x = (j % 2) * s * 0.5 - s;
      while (x < W) {
        const w = s * size(r), col = jit(base, r, 0.22, c);
        wrapDraw(ctx, (dx, dy) => {
          ctx.fillStyle = col;
          ctx.fillRect(x + dx + 2.5, j * s + dy + 2.5, w - 5, s - 5);
        });
        x += w;
      }
    }
    strokes(ctx, r, W, W, 300, [shade(base, -0.15 * c), shade(base, 0.15 * c)], 24, 4, 0.18);
  },
  planks: (ctx, r, base, c) => {
    ctx.fillStyle = shade(base, -0.32 * c * 2); // gaps: dark but not black
    ctx.fillRect(0, 0, W, W);
    let y = 0;
    while (y < W) {
      const bh = Math.min(W / 10 * size(r), W - y);
      let x = -r() * 200;
      while (x < W) {
        const len = 160 * size(r) + 60, col = jit(base, r, 0.3, c);
        ctx.fillStyle = col;
        ctx.fillRect(x + 2, y + 2, len - 4, bh - 4);
        ctx.fillStyle = shade(base, -0.4 * c);
        for (const nx of [x + 8, x + len - 10]) for (const ny of [y + bh * 0.3, y + bh * 0.7]) ctx.fillRect(nx, ny, 3, 3);
        x += len;
      }
      y += bh;
    }
    strokes(ctx, r, W, W, 400, [shade(base, -0.25 * c), shade(base, 0.18 * c)], 50, 2, 0.35, 0);
  },
  dirt: (ctx, r, base, c) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, W);
    strokes(ctx, r, W, W, 60, [shade(base, -0.18 * c), shade(base, 0.15 * c)], 140, 50, 0.3);
    for (let i = 0; i < 260; i++) {
      const x = r() * W, y = r() * W, k = size(r) * 4, col = jit(base, r, 0.5, c);
      wrapDraw(ctx, (dx, dy) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(x + dx, y + dy, k * 1.3, k, r() * 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  },
  snow: (ctx, r, base, c, accent) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, W);
    strokes(ctx, r, W, W, 50, [shade(base, -0.06 * c), shade(base, 0.06 * c)], 160, 60, 0.35);
    // Tracks along the street (v): two cart ruts 1.4 m apart, soft blue-grey, slightly wobbly.
    ctx.lineCap = "round";
    for (const x0 of [W * 0.15, W * 0.15 + W * 0.7]) {
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 9;
      ctx.beginPath();
      for (let y = -10; y <= W + 10; y += 16) ctx.lineTo(x0 + Math.sin(y / 70) * 4, y);
      ctx.stroke();
    }
    // Footprints.
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = accent;
    let fx = W * 0.5;
    for (let y = 0; y < W; y += 22) {
      fx += (r() - 0.5) * 6;
      const side = (y / 22) % 2 ? 1 : -1;
      ctx.beginPath();
      ctx.ellipse(fx + side * 7, y, 4.5 * size(r), 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
  tiles: (ctx, r, base, c, accent) => {
    ctx.fillStyle = shade(base, 0.35); // light grout
    ctx.fillRect(0, 0, W, W);
    const n = 8, s = W / n;
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const col = jit((i + j) % 2 ? base : accent, r, 0.12, c);
        ctx.fillStyle = col;
        ctx.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
        if (r() < 0.06) {
          ctx.strokeStyle = shade(base, -0.3);
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(i * s + r() * s, j * s + 2);
          ctx.lineTo(i * s + r() * s, (j + 1) * s - 2);
          ctx.stroke();
        }
      }
    strokes(ctx, r, W, W, 200, [shade(base, 0.2), "#ffffff"], 30, 3, 0.08, 0.8);
  },
  asphalt: (ctx, r, base, c) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, W);
    strokes(ctx, r, W, W, 900, [shade(base, -0.15 * c), shade(base, 0.15 * c)], 6, 3, 0.4);
    ctx.strokeStyle = shade(base, -0.3 * c);
    ctx.lineWidth = 2;
    for (let k = 0; k < 4; k++) {
      let x = r() * W, y = r() * W;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let q = 0; q < 6; q++) ctx.lineTo((x += (r() - 0.5) * 40), (y += (r() - 0.5) * 40));
      ctx.stroke();
    }
  },
  grass: (ctx, r, base, c) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, W);
    strokes(ctx, r, W, W, 80, [shade(base, -0.15 * c), shade(base, 0.12 * c)], 120, 40, 0.3);
    strokes(ctx, r, W, W, 1600, [shade(base, -0.25 * c), shade(base, 0.25 * c), shade(base, 0.1)], 9, 2, 0.5, -Math.PI / 2);
  },
};

/** A ground texture (2 m tile). */
export const groundTex = ({ kind, base, contrast = 0.5, accent }: GroundOpts) =>
  painted(`ground${kind}${base}${contrast}${accent ?? ""}`, W, W, (ctx, r) => {
    PAINT[kind](ctx, r, base, contrast, accent ?? (kind === "snow" ? "#9fb0d0" : base));
    grain(ctx, r, W, W, 8 * contrast * 2);
  });

/** Ground material; `wear` = a smoother worn path down the middle (lateral uv in metres). */
export const groundMaterial = (o: GroundOpts, wear?: { center: number; width: number }) =>
  toonMaterial({ map: groundTex(o), repeat: [0.5, 0.5], wear: wear ? { ...wear, amount: 0.75 } : undefined });

// ------------------------------------------------------------- puddles

const puddleFrag = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform vec3 uTop, uMid, uHorizon, uRim;
varying vec2 vUv;
varying vec3 vW;
void main() {
  // Mirror of the sky: reflect the view ray about the ground normal, read the painted sky gradient.
  vec3 v = normalize(vW - cameraPosition);
  vec3 rr = reflect(v, vec3(0.0, 1.0, 0.0));
  float h = pow(clamp(rr.y / 0.75, 0.0, 1.0), 0.6);
  vec3 c = mix(mix(uHorizon, uMid, smoothstep(0.0, 0.5, h)), uTop, smoothstep(0.45, 1.0, h));
  // Mostly the wet ground's own dark tone, the sky showing through more at grazing angles (Fresnel).
  float fres = 0.12 + 0.28 * pow(1.0 - abs(v.y), 3.0);
  c = mix(uRim, c, fres);
  float e = length(vUv - 0.5) * 2.0;
  c = mix(c, uRim, smoothstep(0.7, 1.0, e)); // wet dark rim
  gl_FragColor = vec4(c, 1.0);
  #include <fog_fragment>
}`;

/** A sky-reflecting puddle, rx x rz m, irregular rim (lies 1 cm above the ground at y = 0). */
export const puddle = (rx: number, rz: number, seed: number, p: LightPreset, rim = "#3a3040") => {
  const g = new CircleGeometry(1, 24);
  const r = rng(seed), pos = g.attributes.position;
  for (let i = 1; i < pos.count; i++) {
    const k = 0.75 + 0.35 * r();
    pos.setXY(i, pos.getX(i) * k, pos.getY(i) * k);
  }
  g.scale(rx, rz, 1);
  g.rotateX(-Math.PI / 2);
  const skyMid = p.skyMid ?? `#${linear(p.skyHorizon).lerp(linear(p.skyTop), 0.5).getHexString()}`;
  const m = new ShaderMaterial({
    vertexShader: "varying vec2 vUv; varying vec3 vW;\n#include <fog_pars_vertex>\nvoid main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;\n#include <fog_vertex>\n}",
    fragmentShader: puddleFrag,
    fog: true,
    uniforms: {
      ...UniformsUtils.clone(UniformsLib.fog),
      uTop: { value: linear(p.skyTop) },
      uMid: { value: linear(skyMid) },
      uHorizon: { value: linear(p.skyHorizon) },
      uRim: { value: linear(rim) },
    },
  });
  const mesh = new Mesh(g, m);
  mesh.position.y = 0.012;
  mesh.receiveShadow = false;
  return mesh;
};

// ------------------------------------------------------------- edge debris

/** Loose stones (and optional leaves/paper) scattered along a curb: `place(t)` gives a world point for t in 0..1. */
export const debris = (n: number, place: (t: number, r: () => number) => Vector3, colors: string[], seed: number) => {
  const r = rng(seed);
  const stone = new DodecahedronGeometry(1, 0);
  const meshes = colors.map((c) => new InstancedMesh(stone, toonMaterial({ color: c }), n));
  const counts = colors.map(() => 0);
  const m = new Matrix4(), q = new Quaternion(), sc = new Vector3();
  for (let i = 0; i < n; i++) {
    const k = i % colors.length, s = 0.04 + 0.05 * r() * r();
    q.setFromAxisAngle(new Vector3(r(), r(), r()).normalize(), r() * 6);
    sc.set(s * (1 + r() * 0.6), s * 0.55, s);
    m.compose(place(r(), r).setY(s * 0.4), q, sc);
    meshes[k].setMatrixAt(counts[k]++, m);
  }
  meshes.forEach((mm, k) => {
    mm.count = counts[k];
    mm.receiveShadow = true;
  });
  return meshes;
};

/** Flat scraps (leaves, paper) lying on the ground. */
export const scraps = (n: number, place: (t: number, r: () => number) => Vector3, colors: string[], seed: number) => {
  const r = rng(seed);
  const leaf = new PlaneGeometry(0.16, 0.1);
  leaf.rotateX(-Math.PI / 2);
  return colors.map((c, k) => {
    const im = new InstancedMesh(leaf, toonMaterial({ color: c }), n);
    const m = new Matrix4(), q = new Quaternion();
    for (let i = 0; i < n; i++) {
      q.setFromAxisAngle(new Vector3(0, 1, 0), r() * 6);
      const s = 0.6 + r() * 0.8;
      m.compose(place(r(), r).setY(0.008 + k * 0.001), q, new Vector3(s, 1, s));
      im.setMatrixAt(i, m);
    }
    im.receiveShadow = true;
    return im;
  });
};
