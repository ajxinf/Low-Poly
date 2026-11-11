import { LIGHTS } from "../lights";
import { RoofType, WallKind, WindowStyle } from "./building";
import { GroundOpts } from "./ground";

/**
 * Era and place presets: palette, materials, building ranges and props, so a new video builds a believable world
 * fast (`<Street preset={PRESETS.wild_west} seed={..} />`). Every video still gets its own layout (seed, length,
 * curve, lamp spots, landmark), never a reskin.
 */
export type PropKind =
  | "bench" | "barrel" | "crate" | "cart" | "signpost" | "bollard" | "hayBale" | "waterTrough" | "pine" | "mailbox"
  | "hedge" | "car" | "trashBin" | "fence" | "campfire";

export type EraPreset = {
  name: string;
  light: keyof typeof LIGHTS;
  layout: "terrace" | "detached" | "interior";
  road: GroundOpts;
  walk: GroundOpts;
  /** Front yards between the walk and the houses (detached layouts). */
  yard?: GroundOpts;
  walls: { kind: WallKind; colors: string[] }[];
  roofs: { types: RoofType[]; colors: string[]; snow?: boolean };
  trims: string[];
  doors: string[];
  shutters: string[];
  curtains: string[];
  shops: { chance: number; frames: string[]; signs: string[]; awnings: [string, string][] };
  floors: [number, number];
  width: [number, number];
  /** Gap between buildings (m): [min, max]; 0 = terrace. */
  gap: [number, number];
  windowStyles: WindowStyle[][];
  lit: number;
  porch: number;
  chimneys: [number, number];
  posters: number;
  props: PropKind[];
  debris: string[];
  scraps: string[];
  puddles: number;
  /** Wet-ground tone for puddles (dark version of the road). */
  puddleRim?: string;
  birds: number;
  flags: [string, string][];
  washing: boolean;
  smoke: string;
  /** Interiors: power on (strip lights) or off, and abandoned (barricades, empty shelves, litter). */
  interior?: { power: boolean; abandoned: boolean };
  /** Distant backdrop beyond the street end: hills (or mesas / snowy mountains) with optional tree dots. */
  backdrop?: { color: string; shape: "hills" | "mesas" | "mountains"; trees?: string };
};

export type PresetName = "victorian_town" | "wild_west" | "modern_suburb" | "supermarket_interior" | "supermarket_abandoned" | "snowy_village";

/** Supermarket, lit and open; `supermarket_abandoned` is the same store at night with the power off. */
const SUPERMARKET: EraPreset = {
  name: "Supermarket interior",
  light: "interior",
  layout: "interior",
  interior: { power: true, abandoned: false },
  road: { kind: "tiles", base: "#e8dcc4", accent: "#d8cbb0", contrast: 0.5, grime: 0.6 },
  walk: { kind: "tiles", base: "#e8dcc4", contrast: 0.5 },
  walls: [{ kind: "plaster", colors: ["#e8dcc4"] }],
  roofs: { types: ["flat"], colors: ["#e8e8ec"] },
  trims: ["#d84a3a", "#2a5a9a"],
  doors: ["#a0a8b0"],
  shutters: [],
  curtains: [],
  shops: { chance: 0, frames: [], signs: ["FRUIT & VEG", "BAKERY", "CANNED GOODS", "DRINKS", "FROZEN", "SNACKS"], awnings: [] },
  floors: [1, 1],
  width: [24, 24],
  gap: [0, 0],
  windowStyles: [],
  lit: 0,
  porch: 0,
  chimneys: [0, 0],
  posters: 0,
  props: ["crate"],
  debris: [],
  scraps: [],
  puddles: 0,
  birds: 0,
  flags: [],
  washing: false,
  smoke: "",
};

export const PRESETS: Record<PresetName, EraPreset> = {
  victorian_town: {
    name: "Victorian town",
    light: "dusk",
    layout: "terrace",
    road: { kind: "cobbles", base: "#b8907a", contrast: 0.5 },
    walk: { kind: "slabs", base: "#c4a283", contrast: 0.5 },
    walls: [
      { kind: "brick", colors: ["#9a5a44", "#8a4e4a", "#a06048"] },
      { kind: "plaster", colors: ["#c98f6a", "#d8b07a", "#9fae8e", "#8a9fbc", "#dcc4a0", "#b97a84", "#c2a26a"] },
      { kind: "stone", colors: ["#b8a890"] },
    ],
    roofs: { types: ["gable", "gable", "hip", "flat"], colors: ["#a4503a", "#7a4a5c", "#5a4a6a", "#8a5a3a", "#9a4a40"] },
    trims: ["#e8dcc4", "#d8ccb4", "#c8b8a0", "#f0e6d2"],
    doors: ["#5a2e2a", "#2e4a5a", "#3e5a3a", "#6a4a2a"],
    shutters: ["#2e4a5a", "#3e5a3a", "#6a2e3a", "#5a4a3a"],
    curtains: ["#c2603c", "#a84a5a", "#c89a4a"],
    shops: {
      chance: 0.4,
      frames: ["#2f5a52", "#6a2e3a", "#2e3f6a", "#5a3a26"],
      signs: ["BAKERY", "GROCER", "TAILOR", "CHEMIST", "BOOKS", "TEA ROOM", "IRONMONGER"],
      awnings: [["#c8423a", "#f2e6d8"], ["#2e5a4a", "#e8dcc4"], ["#d8a03a", "#5a3a26"]],
    },
    floors: [2, 4],
    width: [5, 8],
    gap: [0, 0],
    windowStyles: [["sash"], ["sash", "shutters"], ["sash", "flowerBox"], ["shutters"], ["sash", "broken"], ["flowerBox", "shutters"]],
    lit: 0.35,
    porch: 0,
    chimneys: [0, 2],
    posters: 2,
    props: ["bench", "barrel", "crate", "cart", "signpost", "bollard"],
    debris: ["#a8988a", "#bca896", "#8e8078"],
    scraps: ["#c8903a", "#a8603a", "#e8dcc4"],
    puddles: 6,
    puddleRim: "#5e4a44",
    birds: 6,
    flags: [["#c8423a", "#f2ece2"], ["#2e4a8a", "#f2ece2"]],
    washing: true,
    smoke: "#d8cfe0",
    backdrop: { color: "#8a7a92", shape: "hills", trees: "#5a5a6a" },
  },
  wild_west: {
    name: "Wild West",
    light: "golden",
    layout: "terrace",
    road: { kind: "dirt", base: "#c89a6a", contrast: 0.5 },
    walk: { kind: "planks", base: "#9a7048", contrast: 0.5 },
    walls: [
      { kind: "planks", colors: ["#a87a52", "#8a6040", "#b88a5a", "#7a5a40"] },
      { kind: "clapboard", colors: ["#d8c4a0", "#c8a87a", "#a8b8a0", "#c88a6a"] },
    ],
    roofs: { types: ["falseFront", "falseFront", "gable", "flat"], colors: ["#6a4a3a", "#5a4a40", "#7a5a3a"] },
    trims: ["#e8d8b8", "#5a3a26", "#f0e6d2"],
    doors: ["#5a3a26", "#3a2a1a", "#6a4a2a"],
    shutters: ["#5a3a26", "#3e5a3a"],
    curtains: ["#c8423a", "#d8a03a"],
    shops: {
      chance: 0.6,
      frames: ["#5a3a26", "#6a2e2a", "#3a2a1a"],
      signs: ["SALOON", "GENERAL STORE", "BANK", "SHERIFF", "HOTEL", "BLACKSMITH", "BARBER"],
      awnings: [["#c8423a", "#f2e6d8"], ["#d8a03a", "#5a3a26"]],
    },
    floors: [1, 2],
    width: [6, 9],
    gap: [0.4, 2.5],
    windowStyles: [["sash"], ["sash", "boarded"], ["shutters"], ["sash", "broken"]],
    lit: 0.25,
    porch: 0.8,
    chimneys: [0, 1],
    posters: 3,
    props: ["barrel", "hayBale", "waterTrough", "cart", "crate", "signpost"],
    debris: ["#a08060", "#8a6a4a", "#c0a080"],
    scraps: ["#d8b05a", "#a8803a"],
    puddles: 1,
    birds: 4,
    flags: [["#c8423a", "#f2ece2"]],
    washing: false,
    smoke: "#e0d4c4",
    backdrop: { color: "#c87a5a", shape: "mesas" },
  },
  modern_suburb: {
    name: "Modern suburb",
    light: "day",
    layout: "detached",
    road: { kind: "asphalt", base: "#6a6670", contrast: 0.5 },
    walk: { kind: "slabs", base: "#c8c0b4", contrast: 0.4 },
    yard: { kind: "grass", base: "#6a9a4a", contrast: 0.5 },
    walls: [
      { kind: "clapboard", colors: ["#e8e0d0", "#a8c4d8", "#e8d8a0", "#c8d8c0", "#f0d0c0"] },
      { kind: "brick", colors: ["#a8604a", "#b88a6a"] },
      { kind: "plaster", colors: ["#f0e8d8", "#d8c8b0"] },
    ],
    roofs: { types: ["gableFront", "hip", "gable"], colors: ["#4a4a52", "#6a4a3a", "#3a4a5a", "#7a5a4a"] },
    trims: ["#ffffff", "#f0ece4", "#3a3a40"],
    doors: ["#c8423a", "#2e4a6a", "#3e5a3a", "#f2c84a"],
    shutters: ["#2e4a6a", "#3a3a40", "#3e5a3a"],
    curtains: ["#e8e0d0", "#c8a87a"],
    shops: { chance: 0, frames: [], signs: [], awnings: [] },
    floors: [1, 2],
    width: [8, 11],
    gap: [3, 5],
    windowStyles: [["sash"], ["shutters"], ["sash", "flowerBox"]],
    lit: 0.15,
    porch: 0.4,
    chimneys: [0, 1],
    posters: 0,
    props: ["mailbox", "hedge", "car", "trashBin", "fence"],
    debris: ["#8a8a80", "#a0a098"],
    scraps: ["#c8903a", "#a8b04a"],
    puddles: 2,
    birds: 3,
    flags: [["#2e4a8a", "#f2ece2"]],
    washing: false,
    smoke: "#e8e8ee",
    backdrop: { color: "#6a9a5a", shape: "hills", trees: "#3e6a3a" },
  },
  supermarket_interior: SUPERMARKET,
  supermarket_abandoned: {
    ...SUPERMARKET,
    name: "Supermarket (abandoned, night)",
    light: "moonInterior",
    interior: { power: false, abandoned: true },
    road: { ...SUPERMARKET.road, grime: 1 },
  },
  snowy_village: {
    name: "Snowy village",
    light: "night",
    layout: "detached",
    road: { kind: "snow", base: "#dfe6f4", accent: "#9fb0d0", contrast: 0.5 },
    walk: { kind: "snow", base: "#e8eef8", accent: "#b0c0d8", contrast: 0.4 },
    yard: { kind: "snow", base: "#eef2fa", accent: "#c0cce0", contrast: 0.3 },
    walls: [{ kind: "clapboard", colors: ["#3e5a8a", "#6a3a4a", "#3a6a5a", "#8a6a4a", "#5a4a7a", "#a85a3a"] }],
    roofs: { types: ["steep", "gableFront", "steep"], colors: ["#4a3a4a"], snow: true },
    trims: ["#f2ece2", "#e8dcc4"],
    doors: ["#c8423a", "#5a3a26", "#2e4a5a"],
    shutters: ["#f2ece2", "#2e4a5a", "#c8423a"],
    curtains: ["#c8423a", "#d8a03a", "#5a8a5a"],
    shops: { chance: 0.15, frames: ["#5a3a26"], signs: ["POST OFFICE", "BAKERY", "INN"], awnings: [] },
    floors: [1, 2],
    width: [6, 8],
    gap: [1.2, 2.5],
    windowStyles: [["sash"], ["shutters"], ["sash", "shutters"], ["flowerBox"]],
    lit: 0.6,
    porch: 0.7,
    chimneys: [1, 2],
    posters: 0,
    props: ["pine", "fence", "crate", "campfire"],
    debris: [],
    scraps: [],
    puddles: 0,
    birds: 2,
    flags: [],
    washing: false,
    smoke: "#c8d0e8",
    backdrop: { color: "#dfe6f4", shape: "mountains", trees: "#2a4a3e" },
  },
};

