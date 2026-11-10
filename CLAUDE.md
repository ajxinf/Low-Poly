# LowPolyFeed — project instructions

Faceless channel (YouTube Shorts, TikTok, Facebook Reels; long-form later) of 3D low-poly **PS1-style** videos. Two pillars: survival "what if" scenarios and strange true history. All narration in **second person ("you")**. Audience: US/UK/Canada, Gen Z + Millennials. English only.

## Machine
Windows 11 laptop: i5-11400H, RTX 3050 4 GB VRAM, 16 GB RAM. Commands must work in PowerShell. Render with `--gl=angle` and `--concurrency=1` or `2` (raise only if stable).

## Stack
- Remotion + `@remotion/three` (React Three Fiber). Every motion (characters, camera, shaders) must be driven by `useCurrentFrame()`, never by clocks or `useFrame` time.
- ElevenLabs **Eleven v4** TTS with inline audio tags (`[whispers]`, `[nervous]`…). API key in `.env` as `ELEVENLABS_API_KEY` (never commit it).
- Assets: CC0 only (Kenney, Quaternius, similar). Record each asset's source + license in `assets/CREDITS.md`.

## Pipeline (audio-first)
1. **Script file** per video in `videos/<slug>/script.json`, the single source of truth. Each line: `narration`, `audioTag`, `scene`, `camera`, `onScreenText`. Claude drafts; the user edits.
2. Generate voiceover + word timestamps from the script (ElevenLabs with-timestamps endpoint).
3. Word timings drive cuts, camera moves and captions.
4. Render Three.js scenes in Remotion.

## Look
- Full-resolution output: 1080×1920 (Shorts), 1920×1080 (long-form), 30fps.
- PS1 feel comes from the shader layer: vertex snapping/jitter, affine texture warp, ordered dithering, distance fog, low-res nearest-filtered textures.
- Character animation **stepped at 15fps**; camera smooth at 30fps.
- One recurring low-poly protagonist with a signature item and swappable costumes/props.
- Shorts: word-by-word burned-in captions in a chunky pixel font. Long-form: no burned captions (export .srt).
- Audio: no commercial music. ElevenLabs SFX + royalty-free ambient/lo-fi beds.

## Shorts structure (61–90s)
Hook within the first 2s → timeline markers ("Day 3…") → escalating stakes → cut/camera move every 2–3s (push-in, whip pan, top-down cutaway) → ending that loops into the opening.

## Content rules
- Advertiser-friendly, evergreen. No graphic true crime; violence stays off-screen.
- True history: every script ships with `sources.md`; check claims before voiceover; keep invented details (dialogue, thoughts) vague.
- Every video gets its own scenes (no reskinned templates). Protects against YouTube's inauthentic-content policy.
- Every description includes "Narration: AI voice".

## Repo layout (target)
```
kit/        shared: PS1 shader, protagonist, scene library, camera presets, caption component
videos/     one folder per video: script.json, sources.md, audio/, timings.json
assets/     CC0 models, textures, fonts + CREDITS.md
scripts/    CLI: tts generation, render helpers
```
Rendered output (`out/`, `*.mp4`) is git-ignored.

## Current phase
Weeks 1–2: build the kit and one test Short ("What if you were trapped in a supermarket for 30 days during a zombie apocalypse" unless the user picks another). Daily posting starts week 3.
