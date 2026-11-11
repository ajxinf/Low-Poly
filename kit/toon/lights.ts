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
  haze: { color: string; start: number; amount: number };
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
    haze: { color: "#7fa3d6", start: 60, amount: 0.15 },
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
    haze: { color: "#f0b48c", start: 50, amount: 0 },
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
    sat: 1.12,
    haze: { color: "#ffb39a", start: 60, amount: 0 },
    sunGlow: ["#ffb27a", 0.9],
    clouds: { lit: "#ffa58f", shade: "#9070b8", cover: 0.68 },
    lamp: ["#ffa245", 2.4],
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
