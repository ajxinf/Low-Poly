// shortcut: mp3_44100_128 (192 kbps and PCM need the Creator tier), upgrade the format if the plan changes.
// ElevenLabs Eleven v4 with timestamps -> videos/<slug>/voice/voice.wav (48 kHz) + words.json (caption words + times).
// usage: node scripts/tts.ts videos/<slug>   (reads script.json; the whole script in one generation)
// words.json holds the caption text from `narration` (keeps *key* marks and numerals); times come from the spoken
// text's character alignment, tags in [brackets] skipped. Spoken and caption word counts must match line by line.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) throw new Error("usage: node scripts/tts.ts videos/<slug>");
const script = JSON.parse(fs.readFileSync(path.join(dir, "script.json"), "utf8"));
const key = fs.readFileSync(".env", "utf8").match(/^ELEVENLABS_API_KEY=(.*)$/m)?.[1]?.trim();
if (!key) throw new Error("ELEVENLABS_API_KEY missing in .env");

type Line = { narration: string; spoken?: string; audioTag?: string };
const lines: Line[] = script.lines;
const untag = (s: string) => s.replace(/\[[^\]]*\]/g, " ");
const tokens = (s: string) => untag(s).split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));
for (const [i, l] of lines.entries()) {
  const a = tokens(l.spoken ?? l.narration).length, b = tokens(l.narration).length;
  if (a !== b) throw new Error(`line ${i + 1}: spoken has ${a} words, narration ${b}`);
}
const text = lines.map((l) => (l.audioTag ? `[${l.audioTag}] ` : "") + (l.spoken ?? l.narration)).join(" ");

const voiceDir = path.join(dir, "voice");
fs.mkdirSync(voiceDir, { recursive: true });
const raw = path.join(voiceDir, "tts_response.json");
// Re-use a saved response unless --new (credits): delete it or pass --new to regenerate.
if (!fs.existsSync(raw) || process.argv.includes("--new")) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${script.voiceId}/with-timestamps?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({ text, model_id: script.model, voice_settings: { stability: 0.3, similarity_boost: 0.75 } }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  fs.writeFileSync(raw, await res.text());
}
const r = JSON.parse(fs.readFileSync(raw, "utf8"));
const mp3 = path.join(voiceDir, "voice.mp3");
fs.writeFileSync(mp3, Buffer.from(r.audio_base64, "base64"));
execFileSync("npx", ["remotion", "ffmpeg", "-y", "-loglevel", "error", "-i", mp3, "-ar", "48000", "-ac", "1", path.join(voiceDir, "voice.wav")], { stdio: "inherit", shell: true });

// Spoken words with times from the character alignment (skip [tags]).
const al = r.normalized_alignment ?? r.alignment;
const chars: string[] = al.characters, t0: number[] = al.character_start_times_seconds, t1: number[] = al.character_end_times_seconds;
const spoken: { start: number; end: number }[] = [];
let inTag = false, cur: { start: number; end: number; real: boolean } | null = null;
const flush = () => void (cur?.real && spoken.push({ start: cur.start, end: cur.end }), (cur = null));
chars.forEach((c, i) => {
  if (c === "[") return void (flush(), (inTag = true));
  if (c === "]") return void (inTag = false);
  if (inTag) return;
  if (/\s/.test(c)) return flush();
  cur ??= { start: t0[i], end: t1[i], real: false };
  cur.end = t1[i];
  if (/[\p{L}\p{N}]/u.test(c)) cur.real = true;
});
flush();
const caption = lines.flatMap((l) => tokens(l.narration));
if (spoken.length !== caption.length) throw new Error(`alignment has ${spoken.length} words, captions ${caption.length}`);
const words = caption.map((text, i) => ({ text, start: +spoken[i].start.toFixed(3), end: +spoken[i].end.toFixed(3) }));
fs.writeFileSync(path.join(voiceDir, "words.json"), JSON.stringify(words, null, 1));
console.log(`${words.length} words, voice ${words[words.length - 1].end.toFixed(2)} s -> ${voiceDir}`);
