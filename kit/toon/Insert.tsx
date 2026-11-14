import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { CAPTION_FONT } from "./Captions";

/**
 * Full-frame 2D explainer insert (ref14: x-ray, thermal camera, satellite map, skin cross-section): a dark device
 * screen with a HUD (title top-left, a red readout top-right, corner brackets, blinking REC, a scan line) around
 * flat SVG artwork the caller draws in a 100 x 178 viewBox (9:16). The art pushes in slowly; everything is frame-driven.
 * Use for the mechanism or the body beat of a story, one per video, as a hard cut. Text is only labels, never a line
 * of narration.
 */
export type InsertKind = "xray" | "thermal" | "map";
const SKIN: Record<InsertKind, { bg: [string, string]; grid: string; accent: string }> = {
  xray: { bg: ["#0b1e3a", "#02060f"], grid: "#2b6fb855", accent: "#7fd4ff" },
  thermal: { bg: ["#1a0d2e", "#05030a"], grid: "#6a3a8a44", accent: "#ffb347" },
  map: { bg: ["#0d2a2a", "#020a0a"], grid: "#2e8a7a44", accent: "#7fffd4" },
};

export const Insert: React.FC<{ kind: InsertKind; title: string; readout: string; children: React.ReactNode }> = ({ kind, title, readout, children }) => {
  const f = useCurrentFrame();
  const { width, durationInFrames } = useVideoConfig();
  const u = width / 100, s = SKIN[kind];
  const zoom = interpolate(f, [0, durationInFrames], [1.0, 1.08]);
  const scan = (f * 2.2) % 120 - 10; // % of the frame height
  const label = { fontFamily: CAPTION_FONT, fontWeight: 800, fontSize: 4.4 * u, letterSpacing: 0.3 * u, position: "absolute" as const, top: 4.5 * u };
  const bracket = (x: "left" | "right", y: "top" | "bottom") => ({
    position: "absolute" as const, [x]: 6 * u, [y]: y === "top" ? 13 * u : 24 * u, width: 8 * u, height: 8 * u,
    [`border${y[0].toUpperCase() + y.slice(1)}`]: `${0.5 * u}px solid #ffffffcc`,
    [`border${x[0].toUpperCase() + x.slice(1)}`]: `${0.5 * u}px solid #ffffffcc`,
  });
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, ${s.bg[0]}, ${s.bg[1]} 80%)`, overflow: "hidden" }}>
      <AbsoluteFill style={{ backgroundImage: `linear-gradient(${s.grid} 1px, transparent 1px), linear-gradient(90deg, ${s.grid} 1px, transparent 1px)`, backgroundSize: `${8 * u}px ${8 * u}px` }} />
      <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
        <svg viewBox="0 0 100 178" width="100%" height="100%" style={{ filter: `drop-shadow(0 0 ${1.2 * u}px ${s.accent})` }}>
          {children}
        </svg>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: `${scan}%`, height: 1.2 * u, background: `linear-gradient(transparent, ${s.accent}55, transparent)` }} />
      <div style={{ ...label, left: 6 * u, color: s.accent }}>{title}</div>
      <div style={{ ...label, right: 6 * u, color: "#ff5a3d" }}>{readout}</div>
      <div style={{ position: "absolute", left: 9 * u, top: 14 * u, color: "#fff", fontFamily: CAPTION_FONT, fontWeight: 700, fontSize: 2.8 * u, opacity: f % 30 < 18 ? 1 : 0.25 }}>
        <span style={{ color: "#ff3b30" }}>●</span> REC
      </div>
      <div style={bracket("left", "top")} />
      <div style={bracket("right", "top")} />
      <div style={bracket("left", "bottom")} />
      <div style={bracket("right", "bottom")} />
    </AbsoluteFill>
  );
};
