import { createTikTokStyleCaptions } from "@remotion/captions";
import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Burned-in word captions (SKILL "Captions", LOOK_SPEC identity 3): 1-2 words at a time from words.json, white bold
 * rounded sans with a thick dark outline and a firm drop shadow, centred at y = 0.70 H, size 0.066 W, no pop or bounce:
 * each group appears on its first word and holds until the next. The sentence's key word (marked `*word*` in
 * script.json, the marks carried into the word list) is rust-orange #ff8a3d and scales up 8 % for 4 frames.
 */
export type CaptionWord = { text: string; start: number; end: number };

// shortcut: system fonts until Nunito Black (OFL) is bundled in public/ and recorded in assets/CREDITS.md.
export const CAPTION_FONT = '"Nunito Black", "Segoe UI Black", "Arial Rounded MT Bold", "Arial Black", sans-serif';
/** Sizes as fractions of the frame width: font, outline, max line width (longer groups wrap; the guard checks). */
// Larger and heavier than v1 (refs: big bold words, thick black outline, firm drop shadow; 2026-11-14 stress test).
export const CAPTION = { size: 0.066, stroke: 0.017, maxWidth: 0.84, maxLines: 2 };
export const KEY_COLOR = "#ff8a3d";
const KEY = /\*([^*]+)\*/;

/**
 * Caption groups (1-2 words) exactly as drawn: shared with the QA guard's "Caption width" check. A key word
 * (`*word*`, the punchline) always starts its own group, so it never shows before it is spoken.
 */
export const captionPages = (words: CaptionWord[]) =>
  createTikTokStyleCaptions({
    captions: words.map((w) => ({ text: ` ${w.text}`, startMs: w.start * 1000, endMs: w.end * 1000, timestampMs: null, confidence: null })),
    combineTokensWithinMilliseconds: 350,
  }).pages.flatMap((p) => {
    const k = p.tokens.findIndex((t, i) => i > 0 && KEY.test(t.text));
    if (k < 0) return [p];
    const end = p.startMs + p.durationMs, split = p.tokens[k].fromMs;
    const page = (tokens: typeof p.tokens, startMs: number, endMs: number) => ({ ...p, tokens, startMs, durationMs: endMs - startMs, text: tokens.map((t) => t.text).join("") });
    return [page(p.tokens.slice(0, k), p.startMs, split), page(p.tokens.slice(k), split, end)];
  });

export const Captions: React.FC<{ words: CaptionWord[] }> = ({ words }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const pages = useMemo(() => captionPages(words), [words]);
  const ms = (frame / fps) * 1000;
  const i = pages.filter((p) => p.startMs <= ms).length - 1; // pages are in time order
  const page = pages[i];
  if (!page || (i === pages.length - 1 && ms > page.startMs + page.durationMs + 300)) return null;
  const size = CAPTION.size * width;
  // Two stacked copies in one grid cell: the outline layer behind (thick stroke, dark fill), the letters on top with
  // no stroke. A stroke drawn over the fill (Chrome ignores paint-order on HTML text) ate thin glyphs: "!" read as
  // "?" in the pilot. Never draw the outline on the letters themselves.
  const text = (outline: boolean) =>
    page.tokens.map((t, k) => {
      const m = t.text.match(KEY);
      if (!m) return <span key={k}>{t.text}</span>;
      const pop = ms - t.fromMs >= 0 && ms - t.fromMs < (4 / fps) * 1000;
      const [before, after] = t.text.split(m[0]);
      return (
        <span key={k}>
          {before}
          <span style={{ color: outline ? undefined : KEY_COLOR, display: "inline-block", transform: `scale(${pop ? 1.08 : 1})` }}>{m[1]}</span>
          {after}
        </span>
      );
    });
  // Explicit stacking: a layer with a filter paints after unpositioned siblings, so z-index decides, not DOM order.
  const layer: React.CSSProperties = { gridArea: "1 / 1", position: "relative", maxWidth: CAPTION.maxWidth * width, whiteSpace: "normal", textAlign: "center" };
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center" }}>
      <div
        style={{
          position: "absolute",
          top: "70%",
          transform: "translateY(-50%)",
          display: "grid",
          fontFamily: CAPTION_FONT,
          fontWeight: 900,
          fontSize: size,
          lineHeight: 1.1,
        }}
      >
        <div aria-hidden style={{ ...layer, zIndex: 0, color: "#141014", WebkitTextStroke: `${CAPTION.stroke * width}px #141014`, filter: `drop-shadow(0 ${0.005 * width}px ${0.002 * width}px rgba(0,0,0,0.75))` }}>
          {text(true)}
        </div>
        <div style={{ ...layer, zIndex: 1, color: "#ffffff" }}>{text(false)}</div>
      </div>
    </AbsoluteFill>
  );
};
