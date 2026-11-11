import { Color, Vector3 } from "three";

type RGB = [number, number, number];

export type LightPreset = {
  /** Sun azimuth in degrees from the camera's forward direction (0 = sun ahead, backlit), clockwise from above. */
  az: number;
  el: number;
  /** Linear multipliers on albedo for sun-facing and turned-away faces; lift is added in shade only. */
  lit: RGB;
  shade: RGB;
  lift: RGB;
  skyTop: string;
  skyMid?: string;
  skyHorizon: string;
  fog: string;
  fogNear: number;
  fogFar: number;
  sat: number;
  /** Aerial perspective: from `start` m, desaturate and mix up to `amount` of the horizon colour (full at 3x start). */
  haze: { color: string; start: number; amount: number };
  /** Sunlit luma at most this x the shade luma (default 1.6). */
  litMax?: number;
  /** Palette tint the sunlit hue is pulled toward (75 %). */
  litTint?: string;
  sunDisc?: string;
  /** Warm glow in the sky around the sun (colour, strength). */
  sunGlow?: [string, number];
  /** Painted clouds: lit underside and shaded top colours. */
  clouds?: { lit: string; shade: string; cover: number };
  /** Street lamps and lit windows: colour and HDR strength of their light pools. */
  lamp?: [string, number];
};

export const LIGHTS = {
  day: {
    az: 75,
    el: 48,
    lit: [1.58, 1.5, 1.33],
    shade: [0.3, 0.29, 0.36],
    lift: [0.05, 0.06, 0.11],
    skyTop: "#3e7fd2",
    skyHorizon: "#b8d0ec",
    fog: "#b8d0ec",
    fogNear: 25,
    fogFar: 300,
    sat: 1.08,
    haze: { color: "#b8d0ec", start: 30, amount: 0.3 },
    litTint: "#fff2dc",
  },
  golden: {
    az: 6,
    el: 7,
    lit: [1.5, 1.05, 0.63], // #FFB36B x1.5
    shade: [0.3, 0.29, 0.56],
    lift: [0.05, 0.04, 0.12],
    skyTop: "#ffc47c",
    skyHorizon: "#8a6f8a",
    fog: "#f0b48c",
    fogNear: 50,
    fogFar: 300,
    sat: 1.08,
    haze: { color: "#f0b48c", start: 30, amount: 0.3 },
    litTint: "#ffc89c",
    sunDisc: "#ffcf9e",
  },
  // Low warm key from ahead-left; shade is cool and ~45 % of the lit luma; low ambient; fog = horizon, past 40 m.
  dusk: {
    az: -28,
    el: 30,
    lit: [1.62, 1.12, 0.74],
    shade: [0.5, 0.55, 0.8],
    lift: [0.01, 0.01, 0.03],
    skyTop: "#6468c0",
    skyMid: "#c48ad2",
    skyHorizon: "#ffb39a",
    fog: "#ffb39a",
    fogNear: 40,
    fogFar: 260,
    sat: 1.08,
    haze: { color: "#ffb39a", start: 30, amount: 0.35 },
    litTint: "#ffd4bc",
    sunGlow: ["#ffb27a", 0.9],
    clouds: { lit: "#ffa58f", shade: "#9070b8", cover: 0.68 },
    lamp: ["#ffa245", 2.4],
  },
  // Moon-blue key, warm practicals carry the scene (lamp pools, lit windows).
  night: {
    az: 40,
    el: 35,
    lit: [0.55, 0.66, 1.0],
    shade: [0.24, 0.28, 0.48],
    lift: [0.01, 0.015, 0.04],
    skyTop: "#0d1838",
    skyMid: "#1f3266",
    skyHorizon: "#4a5e9a",
    fog: "#3a4a7a",
    fogNear: 30,
    fogFar: 220,
    sat: 1.05,
    haze: { color: "#4a5e9a", start: 30, amount: 0.3 },
    litTint: "#a9c4ff",
    lamp: ["#ffa245", 3.2],
  },
  // Indoors (supermarket): overhead key through the (non-shadowing) ceiling, soft shade, ceiling panels as practicals.
  interior: {
    az: 20,
    el: 72,
    lit: [1.3, 1.28, 1.2],
    shade: [0.86, 0.86, 0.92],
    lift: [0.02, 0.02, 0.03],
    skyTop: "#e8eef2",
    skyHorizon: "#f2f0ea",
    fog: "#e8e6e0",
    fogNear: 40,
    fogFar: 160,
    sat: 1.04,
    haze: { color: "#e8e6e0", start: 30, amount: 0.25 },
    litTint: "#f4fff4",
    lamp: ["#e6fff0", 0.9], // fluorescent strips: slightly green-white
  },
  // Abandoned interior at night: power off, moonlight through the front windows (key from behind the lens), deep
  // shade. litMax is raised here on purpose: a dark store lit only by window light needs more than 1.6x.
  moonInterior: {
    az: 180,
    el: 24,
    lit: [0.62, 0.74, 1.1],
    shade: [0.05, 0.06, 0.11],
    lift: [0.004, 0.006, 0.014],
    litMax: 8,
    litTint: "#a8c0ff",
    skyTop: "#0d1838",
    skyMid: "#1f3266",
    skyHorizon: "#3a4a7a",
    fog: "#121828",
    fogNear: 20,
    fogFar: 80,
    sat: 1.0,
    haze: { color: "#1a2236", start: 14, amount: 0.3 },
    lamp: ["#e6fff0", 0.7],
  },
} satisfies Record<string, LightPreset>;

/** World-space direction toward the sun, relative to the shot's opening camera (frozen per shot). */
export const sunDirection = (p: LightPreset, camPos: Vector3, look: Vector3) => {
  const f = look.clone().sub(camPos);
  const yaw = Math.atan2(f.x, -f.z) + (p.az * Math.PI) / 180;
  const el = (p.el * Math.PI) / 180;
  return new Vector3(Math.cos(el) * Math.sin(yaw), Math.sin(el), -Math.cos(el) * Math.cos(yaw));
};

export const linear = (hex: string) => new Color(hex); // three converts sRGB hex to linear
