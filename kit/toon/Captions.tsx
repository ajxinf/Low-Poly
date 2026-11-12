import { createTikTokStyleCaptions } from "@remotion/captions";
import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Burned-in word captions (SKILL "Captions", LOOK_SPEC identity 3): 1-2 words at a time from words.json, white bold
 * rounded sans with a dark outline and a soft drop shadow, centred at y = 0.70 H, size 0.055 W, no pop or bounce:
 * each group appears on its first word and holds until the next. The sentence's key word (marked `*word*` in
 * script.json, the marks carried into the word list) is rust-orange #ff8a3d and scales up 8 % for 4 frames.
 */
export type CaptionWord = { text: string; start: number; end: number };

// shortcut: system fonts until Nunito Black (OFL) is bundled in public/ and recorded in assets/CREDITS.md.
export const CAPTION_FONT = '"Nunito Black", "Segoe UI Black", "Arial Rounded MT Bold", "Arial Black", sans-serif';
/** Sizes as fractions of the frame width: font, outline, max line width (longer groups wrap; the guard checks). */
export const CAPTION = { size: 0.055, stroke: 0.012, maxWidth: 0.84, maxLines: 2 };
export const KEY_COLOR = "#ff8a3d";
const KEY = /\*([^*]+)\*/;

/** Caption groups (1-2 words) exactly as drawn: shared with the QA guard's "Caption width" check. */
export const captionPages = (words: CaptionWord[]) =>
  createTikTokStyleCaptions({
    captions: words.map((w) => ({ text: ` ${w.text}`, startMs: w.start * 1000, endMs: w.end * 1000, timestampMs: null, confidence: null })),
    combineTokensWithinMilliseconds: 350,
  }).pages;

export const Captions: React.FC<{ words: CaptionWord[] }> = ({ words }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const pages = useMemo(() => captionPages(words), [words]);
  const ms = (frame / fps) * 1000;
  const i = pages.filter((p) => p.startMs <= ms).length - 1; // pages are in time order
  const page = pages[i];
  if (!page || (i === pages.length - 1 && ms > page.startMs + page.durationMs + 300)) return null;
  const size = CAPTION.size * width;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center" }}>
      <div
        style={{
          position: "absolute",
          top: "70%",
          transform: "translateY(-50%)",
          fontFamily: CAPTION_FONT,
          fontWeight: 900,
          fontSize: size,
          lineHeight: 1.1,
          color: "#ffffff",
          WebkitTextStroke: `${CAPTION.stroke * width}px #141014`,
          paintOrder: "stroke fill",
          filter: `drop-shadow(0 ${0.003 * width}px ${0.003 * width}px rgba(0,0,0,0.6))`,
          maxWidth: CAPTION.maxWidth * width, // wraps inside the safe area instead of running off-frame
          whiteSpace: "normal",
          textAlign: "center",
        }}
      >
        {page.tokens.map((t, k) => {
          const m = t.text.match(KEY);
          if (!m) return <span key={k}>{t.text}</span>;
          const pop = ms - t.fromMs >= 0 && ms - t.fromMs < (4 / fps) * 1000;
          const [before, after] = t.text.split(m[0]);
          return (
            <span key={k}>
              {before}
              <span style={{ color: KEY_COLOR, display: "inline-block", transform: `scale(${pop ? 1.08 : 1})` }}>{m[1]}</span>
              {after}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
