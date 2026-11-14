/**
 * Display-referred grade after the tone map (vendor/cartoon-3d-short/reports/grade.md section 4-5):
 * 1. one RGB tone curve, monotone cubic Hermite through knots at x = 0, .1, .25, .5, .75, .9, 1;
 * 2. saturation around luma per zone (shadows / mids / highlights);
 * 3. three-way tint (RGB offsets per zone, /255);
 * 4. vignette x (1 - k smoothstep(r0, 1, r)), r = 1 at the corners.
 * The report's fitted curves lifted the mids for its darker source frames and made ours milky; we keep its
 * structure (curve, zone saturation, three-way tint, vignette) with our own values, tuned with measure.py.
 */
export type Grade = {
  y: number[];
  m: number[];
  /** Saturation: shadows, mids, highlights. */
  sat: [number, number, number];
  /** RGB offsets /255 per zone. */
  tint: { s: [number, number, number]; m: [number, number, number]; h: [number, number, number] };
  vig: [number, number];
  /** Darken the top of the frame by up to this (ceilings, night skies: the light sits low, ref13). */
  top: number;
  /** Film grain amplitude (sRGB, strongest in the mids). */
  grain: number;
  /** Warm halation: extra bloom tinted orange-red around bright practicals. */
  halation: number;
  /** 0 = off, 1 = full. */
  amount: number;
  /** Linear exposure after bloom, before the tone map (backlit dusk frames are mostly shade). */
  exposure?: number;
};
export type GradeName = "day" | "golden" | "night" | "interior";

/**
 * One house S-curve for every preset: black point at sRGB ~(20,12,14) (curve 0.045 + a small warm shadow tint, no
 * global lift), gentle toe and shoulder for contrast, saturation up. Presets differ only in the tints and vignette
 * (corners ~.85 of centre; darker at night).
 */
const S_CURVE = { y: [0.045, 0.095, 0.19, 0.47, 0.83, 0.96, 1], m: [0.45, 0.55, 1.1, 1.65, 1.0, 0.5, 0.3] };
// Night and interiors: a deeper toe so corners and ceilings reach L* ~15 (ref13 measured 16) while ink stays darker.
const DEEP_CURVE = { y: [0.03, 0.075, 0.17, 0.46, 0.83, 0.96, 1], m: [0.4, 0.5, 1.05, 1.7, 1.0, 0.5, 0.3] };
// 2026-11-13 reference pass (R11/R13/R14): saturation down ~12 % (refs C*p90 27-49, ours 52-57), exposure down,
// vignette + top darkening up (refs .77-.86 corner/centre, ours .95-.98), grain and halation on every preset.
const FILM = { grain: 0.022, halation: 0.35 };
export const GRADE: Record<GradeName, Grade> = {
  day: { ...S_CURVE, ...FILM, exposure: 1.05, sat: [1.15, 1.3, 1.15], tint: { s: [8, 0, 2], m: [0, 0, 4], h: [0, 0, 2] }, vig: [0.22, 0.4], top: 0, amount: 1 },
  golden: { ...S_CURVE, ...FILM, exposure: 1.8, sat: [1.2, 1.38, 1.2], tint: { s: [8, -1, 6], m: [2, 0, 2], h: [3, 0, -4] }, vig: [0.36, 0.35], top: 0.1, amount: 1 },
  night: { ...DEEP_CURVE, ...FILM, sat: [1.15, 1.28, 1.15], tint: { s: [6, -1, 10], m: [2, -1, 6], h: [0, 0, 0] }, vig: [0.5, 0.25], top: 0.3, amount: 1 },
  interior: { ...DEEP_CURVE, ...FILM, sat: [1.1, 1.3, 1.2], tint: { s: [8, 0, 2], m: [-2, 0, 6], h: [-2, 0, 4] }, vig: [0.4, 0.3], top: 0.3, amount: 1 },
};

/** The grade the Composer applies; set by applyLight() from the shot's light preset. */
export const gradeState = { current: GRADE.day };

/** GLSL: needs uniforms uKy[7], uKm[7], uGSat (vec3), uTintS/M/H (vec3), uVig (vec2), uGAmount. Input/output sRGB 0..1. */
export const GRADE_GLSL = /* glsl */ `
uniform float uKy[7], uKm[7], uGAmount, uTop, uGrain, uFrame;
uniform vec3 uGSat, uTintS, uTintM, uTintH;
uniform vec2 uVig;
float grainHash(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float gradeCurve(float x) {
  float xs[7];
  xs[0] = 0.0; xs[1] = 0.1; xs[2] = 0.25; xs[3] = 0.5; xs[4] = 0.75; xs[5] = 0.9; xs[6] = 1.0;
  x = clamp(x, 0.0, 1.0);
  for (int i = 0; i < 6; i++) {
    if (x <= xs[i + 1] || i == 5) {
      float h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
      return (2.0 * t3 - 3.0 * t2 + 1.0) * uKy[i] + (t3 - 2.0 * t2 + t) * h * uKm[i]
           + (-2.0 * t3 + 3.0 * t2) * uKy[i + 1] + (t3 - t2) * h * uKm[i + 1];
    }
  }
  return x;
}
vec3 grade(vec3 src, vec2 uv) {
  vec3 c = vec3(gradeCurve(src.r), gradeCurve(src.g), gradeCurve(src.b));
  float y = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float wS = 1.0 - smoothstep(0.0, 0.55, y), wH = smoothstep(0.45, 1.0, y), wM = 1.0 - wS - wH;
  float s = uGSat.y + (uGSat.x - uGSat.y) * wS + (uGSat.z - uGSat.y) * wH;
  c = vec3(y) + s * (c - vec3(y));
  c += wS * uTintS + wM * uTintM + wH * uTintH;
  float r = length(uv * 2.0 - 1.0) * 0.70710678;
  c *= 1.0 - uVig.x * smoothstep(uVig.y, 1.0, r);
  c *= 1.0 - uTop * smoothstep(0.6, 1.0, uv.y);
  // Grain from the frame number (deterministic per render tab), strongest in the mids, none in pure ink or white.
  float gy = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c += uGrain * (grainHash(vec3(gl_FragCoord.xy, uFrame)) - 0.5) * 4.0 * gy * (1.0 - gy);
  // 1-LSB dither before the 8-bit output: smooth sky gradients banded (pilot review L1).
  c += (grainHash(vec3(gl_FragCoord.xy, uFrame + 17.0)) - 0.5) / 255.0;
  return mix(src, clamp(c, 0.0, 1.0), uGAmount);
}`;

/** Copy a grade into the shader's uniforms. */
export const setGradeUniforms = (u: Record<string, { value: unknown }>, g: Grade) => {
  u.uKy.value = g.y;
  u.uKm.value = g.m;
  u.uGSat.value = g.sat;
  u.uTintS.value = g.tint.s.map((v) => v / 255);
  u.uTintM.value = g.tint.m.map((v) => v / 255);
  u.uTintH.value = g.tint.h.map((v) => v / 255);
  u.uVig.value = g.vig;
  u.uTop.value = g.top;
  u.uGrain.value = g.grain;
  u.uHalation.value = g.halation;
  u.uGAmount.value = g.amount;
  u.uExposure.value = g.exposure ?? 1;
};
