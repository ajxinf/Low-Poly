# Stickrified — project instructions

Faceless channel **Stickrified** (YouTube Shorts, TikTok, Facebook Reels; long-form later). **Style: flat 2D cartoon characters in a painted, ink-lined 3D world.** Three pillars: survival "what if" scenarios, strange true history, and fictional "In this world..." stories. Entertainment first: comic exaggeration is welcome, but real facts in history videos stay true (see the skill's "Entertainment rules"). All narration in **second person ("you")**. Audience: US/UK/Canada, Gen Z + Millennials. English only.

**How to make a video: follow `.claude/skills/toon-world-short/SKILL.md`.** It holds the pipeline, look values, protagonist spec and gotchas. **Scripts (formulas, jokes, Eleven v4 tags, length): follow `.claude/skills/stickrified-script/SKILL.md`.** This file only holds the project-wide rules.

## Machine
Windows 11 laptop: i5-11400H, RTX 3050 4 GB VRAM, 16 GB RAM. Commands must work in PowerShell. Render with `--gl=angle` and `--concurrency=1` (default since 2026-11-13: concurrency 2 ran the laptop out of memory on the 80 s pilot). Set `$env:TEMP`/`$env:TMP` to `C:\remotion-tmp` before rendering.

## Stack
- Remotion + `@remotion/three` (React Three Fiber). Every motion (characters, camera, shaders) must be driven by `useCurrentFrame()`, never by clocks or `useFrame` time.
- ElevenLabs **Eleven v4** TTS (one narrator voice, audio tags only on beats). API key in `.env` as `ELEVENLABS_API_KEY` (never commit it).
- Assets: CC0 only (Kenney, Quaternius, similar). Record each asset's source + license in `assets/CREDITS.md`.
- Sound: synthesized SFX + original score (Python scripts). No commercial music.

## Pipeline (audio-first)
Script (`videos/<slug>/script.json`, the single source of truth; Claude drafts, the user edits) → voice + word timings → shot plan timed to words → world, cast, captions → sound → look checks → render, mux, QA. Details in the skill.

## Formats
- Shorts: 61–90 s, 1080×1920 composition, 30 fps, final export 1080×1920 (default since 2026-11-13; 2K 1440×2560 only on request).
- Shorts: word-by-word burned-in captions (see skill). Long-form (later): 1920×1080, no burned captions (export .srt).

## Content rules
- Advertiser-friendly, evergreen. No graphic true crime; violence stays off-screen.
- True history: every script ships with `sources.md`; check claims before voiceover; keep invented details (dialogue, thoughts) vague.
- Every video gets its own world layout and shots (no reskinned templates). Protects against YouTube's inauthentic-content policy.
- Every description includes "Narration: AI voice".

## Repo layout
```
kit/toon/          shared toon look (world, lights, ink, paint, characters, post, captions)
src/videos/<slug>/ per-video compositions (story.ts, build.ts, roles.ts)
videos/<slug>/     script, sources, voice, audio
templates/base/    starting point for new videos (made after the pilot)
docs/STYLE.md      style bible + approved frames in docs/style/frames/
scripts/           tts, audio, stills, QA helpers
```
Rendered output (`out/`, `*.mp4`) is git-ignored.

## Current phase
Weeks 1–2: Phase 0 of the skill (build the toon kit) and a pilot Short ("What if you were trapped in a supermarket for 30 days during a zombie apocalypse" unless the user picks another). Daily posting starts week 3.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
