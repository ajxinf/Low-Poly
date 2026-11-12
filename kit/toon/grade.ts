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
export const GRADE: Record<GradeName, Grade> = {
  // vig .06 -> .14 (2026-11-12, _pipeline-test): day corners read flat; day exteriors have their own measure.py range.
  day: { ...S_CURVE, exposure: 1.15, sat: [1.3, 1.5, 1.3], tint: { s: [8, 0, 2], m: [0, 0, 4], h: [0, 0, 2] }, vig: [0.14, 0.45], amount: 1 },
  golden: { ...S_CURVE, exposure: 1.95, sat: [1.35, 1.6, 1.4], tint: { s: [8, -1, 6], m: [2, 0, 2], h: [3, 0, -4] }, vig: [0.28, 0.4], amount: 1 },
  night: { ...S_CURVE, sat: [1.3, 1.45, 1.3], tint: { s: [6, -1, 10], m: [2, -1, 6], h: [0, 0, 0] }, vig: [0.35, 0.3], amount: 1 },
  interior: { ...S_CURVE, sat: [1.25, 1.5, 1.35], tint: { s: [8, 0, 2], m: [-2, 0, 6], h: [-2, 0, 4] }, vig: [0.18, 0.4], amount: 1 },
};

/** The grade the Composer applies; set by applyLight() from the shot's light preset. */
export const gradeState = { current: GRADE.day };

/** GLSL: needs uniforms uKy[7], uKm[7], uGSat (vec3), uTintS/M/H (vec3), uVig (vec2), uGAmount. Input/output sRGB 0..1. */
export const GRADE_GLSL = /* glsl */ `
uniform float uKy[7], uKm[7], uGAmount;
uniform vec3 uGSat, uTintS, uTintM, uTintH;
uniform vec2 uVig;
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
  u.uGAmount.value = g.amount;
  u.uExposure.value = g.exposure ?? 1;
};
