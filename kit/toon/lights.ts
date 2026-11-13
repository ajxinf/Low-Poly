import { Color, Vector3 } from "three";
import type { GradeName } from "./grade";

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
  /**
   * Character cards: linear tint of the scene light on the (cream) heads and how far they dim in a street shadow.
   * Heads stay at V >= .86 in every light (lighting.md 5): day near-white, golden peach, lamp warm, moon lavender.
   */
  char: { tint: RGB; shade: number };
  /**
   * Character ink under this light (ref2/ref11: the drawn outline is a dark of the scene light, navy-violet at night,
   * plum at sunset). Unset = the identity warm ink (toon.ts INK) by day.
   */
  charInk?: string;
  /** World ink on concave contacts (an object standing on the ground), 0-1. Interiors 0: no wall/floor lines. */
  contactInk?: number;
  /** Grade preset (grade.ts) applied after the tone map. */
  grade: GradeName;
};

export const LIGHTS = {
  // Side-back key (az 60 / el 45), lit:shade ~2:1, shade keeps the surface hue with a little lavender.
  day: {
    az: 60,
    el: 45,
    lit: [1.34, 1.29, 1.18],
    shade: [0.58, 0.54, 0.66],
    lift: [0, 0, 0],
    litMax: 2.3,
    skyTop: "#3a72d2",
    skyHorizon: "#b8d0ec",
    fog: "#b8d0ec",
    fogNear: 50,
    fogFar: 400,
    sat: 1.1,
    haze: { color: "#b8d0ec", start: 50, amount: 0.25 },
    // Painted cumulus: white tops, cool lavender-blue undersides (2026-11-13, empty skies read unfinished).
    clouds: { lit: "#ffffff", shade: "#c4cdea", cover: 0.56 }, // refs: every day sky has clouds
    litTint: "#fff2dc",
    char: { tint: [1.0, 0.97, 0.96], shade: 0.86 },
    grade: "day",
  },
  // el 11 (was 7): at 7 deg a backlit street was all building shadow; refs keep sunlit ground beside violet shade.
  golden: {
    az: 6,
    el: 11,
    lit: [1.42, 0.79, 0.48],
    shade: [0.176, 0.206, 0.72],
    lift: [0.035, 0.03, 0.075],
    litMax: 4,
    skyTop: "#6a4f8c",
    skyMid: "#d88a96",
    skyHorizon: "#ffd08a",
    fog: "#f0b48c",
    fogNear: 50,
    fogFar: 300,
    sat: 1.08,
    haze: { color: "#f0b48c", start: 30, amount: 0.3 },
    litTint: "#ffc89c",
    sunDisc: "#ffcf9e",
    // Pilot critique: empty gradient skies read unfinished; golden skies get warm painted clouds too.
    clouds: { lit: "#ffc6a0", shade: "#a27ab8", cover: 0.5 },
    char: { tint: [1.0, 0.88, 0.76], shade: 0.88 },
    charInk: "#2e1530",
    grade: "golden",
  },
  // Backlit: the sun just right of straight ahead, 8 deg up; peach sunlit patches ~3x the violet shade, long
  // shadows toward the lens; haze only past 50 m.
  dusk: {
    az: 12,
    el: 10,
    lit: [1.78, 1.28, 0.87],
    shade: [0.52, 0.46, 0.78],
    lift: [0, 0, 0],
    litMax: 3.2,
    skyTop: "#6468c0",
    skyMid: "#c48ad2",
    skyHorizon: "#ffb39a",
    fog: "#ffb39a",
    fogNear: 60,
    fogFar: 320,
    sat: 1.1,
    haze: { color: "#ffb39a", start: 50, amount: 0.3 },
    litTint: "#ffc58a",
    sunGlow: ["#ffb27a", 0.9],
    clouds: { lit: "#ffa58f", shade: "#9070b8", cover: 0.68 },
    lamp: ["#ffa245", 3.0],
    char: { tint: [1.0, 0.9, 0.86], shade: 0.86 },
    charInk: "#2a1638",
    grade: "golden",
  },
  // Moon-blue key, warm practicals carry the scene (lamp pools, lit windows).
  night: {
    az: 40,
    el: 35,
    lit: [0.55, 0.66, 1.0],
    // 2026-11-13 (ref13): darker fill so the lamp pools carry the frame (was .24/.28/.48, lamps 3.2).
    shade: [0.17, 0.2, 0.38],
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
    lamp: ["#ffa245", 4.2],
    char: { tint: [0.8, 0.8, 0.97], shade: 0.86 },
    charInk: "#151a3c",
    grade: "night",
  },
  // Indoors (supermarket): overhead key through the (non-shadowing) ceiling, soft shade, ceiling panels as practicals.
  interior: {
    az: 20,
    el: 72,
    lit: [0.92, 0.91, 0.86],
    shade: [0.44, 0.4, 0.47], // was .52/.48/.54: the store read evenly lit (refs: pools under each light)
    lift: [0.02, 0.02, 0.03],
    skyTop: "#e8eef2",
    skyHorizon: "#f2f0ea",
    fog: "#cfc6dc",
    fogNear: 40,
    fogFar: 160,
    sat: 1.1,
    haze: { color: "#cfc6dc", start: 40, amount: 0.12 },
    litTint: "#f4fff4",
    lamp: ["#e6fff0", 0.7], // fluorescent strips: slightly green-white
    char: { tint: [1.0, 1.0, 0.97], shade: 0.9 },
    contactInk: 0,
    grade: "interior",
  },
  // Abandoned interior at night: power off, lavender moonlight through the front windows (key from behind the lens),
  // violet-blue coloured shade (never black). litMax is raised on purpose: a store lit only by window light needs it.
  moonInterior: {
    az: 180,
    el: 24,
    lit: [0.8, 0.76, 1.12],
    shade: [0.14, 0.12, 0.29],
    lift: [0.014, 0.01, 0.034],
    litMax: 8,
    litTint: "#b8b0f0",
    skyTop: "#0d1838",
    skyMid: "#1f3266",
    skyHorizon: "#3a4a7a",
    fog: "#1e1a36",
    fogNear: 20,
    fogFar: 80,
    sat: 1.0,
    haze: { color: "#2a2446", start: 14, amount: 0.3 },
    lamp: ["#e6fff0", 0.7],
    char: { tint: [0.8, 0.78, 0.98], shade: 0.88 },
    charInk: "#1a1640",
    contactInk: 0,
    grade: "night",
  },
  // Store by day with the power off (zombie pilot): warm daylight through the front windows from behind the lens, deep
  // cool shade toward the back; the windows are the practical. Same structure as moonInterior.
  sunInterior: {
    az: 180,
    el: 26,
    lit: [1.3, 1.18, 0.96],
    shade: [0.4, 0.37, 0.46], // first draft .24/.24/.36 read as night (the camera mostly sees the shade side)
    lift: [0.02, 0.02, 0.04],
    litMax: 4,
    litTint: "#ffe6c0",
    skyTop: "#8fb4e0",
    skyHorizon: "#e8eef2",
    fog: "#5a5068",
    fogNear: 22,
    fogFar: 90,
    sat: 1.05,
    haze: { color: "#6a6078", start: 16, amount: 0.25 },
    char: { tint: [1.0, 0.95, 0.9], shade: 0.88 },
    contactInk: 0,
    grade: "interior",
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
