/**
 * Display-referred grade after the tone map (vendor/cartoon-3d-short/reports/grade.md section 4-5):
 * 1. one RGB tone curve, monotone cubic Hermite through knots at x = 0, .1, .25, .5, .75, .9, 1;
 * 2. saturation around luma per zone (shadows / mids / highlights);
 * 3. three-way tint (RGB offsets per zone, /255);
 * 4. vignette x (1 - k smoothstep(r0, 1, r)), r = 1 at the corners.
 * DAY and GOLDEN are the report's fits to the 20-video reference; NIGHT and INTERIOR are authored from the same
 * study's cluster stats (night: violet darks, corners ~.6; interior: rose darks, corners ~.75).
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
};
export type GradeName = "day" | "golden" | "night" | "interior";

export const GRADE: Record<GradeName, Grade> = {
  day: {
    y: [0.0345, 0.1828, 0.3812, 0.6605, 0.8814, 0.9631, 1],
    m: [1.483, 1.404, 1.22, 0.987, 0.661, 0.435, 0.369],
    sat: [0.983, 1.273, 1.457],
    tint: { s: [16.5, -3.5, -13.8], m: [-4.2, -0.6, 17.8], h: [-1.9, -0.1, 6.8] },
    vig: [0.1, 0.45],
    amount: 0.8,
  },
  golden: {
    y: [0.0311, 0.1877, 0.4017, 0.6754, 0.875, 0.9582, 1],
    m: [1.567, 1.498, 1.253, 0.924, 0.645, 0.472, 0.418],
    sat: [0.832, 0.88, 1.706],
    tint: { s: [0.2, -2.6, 25], m: [-0.1, -2.7, 27.6], h: [0, 0, 0] },
    vig: [0.16, 0.4],
    amount: 0.8,
  },
  night: {
    y: [0.035, 0.13, 0.28, 0.54, 0.78, 0.92, 1],
    m: [1.0, 1.0, 1.04, 1.0, 0.86, 0.68, 0.5],
    sat: [1.2, 1.35, 1.2],
    tint: { s: [7, -3, 18], m: [3, -2, 8], h: [0, 0, 0] },
    vig: [0.4, 0.3],
    amount: 1,
  },
  interior: {
    y: [0.03, 0.12, 0.27, 0.52, 0.77, 0.92, 1],
    m: [1.0, 1.0, 1.05, 1.0, 0.9, 0.7, 0.5],
    sat: [1.15, 1.45, 1.35],
    tint: { s: [12, -4, -2], m: [-4, 0, 10], h: [-2, 0, 5] },
    vig: [0.25, 0.4],
    amount: 0.9,
  },
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
};
