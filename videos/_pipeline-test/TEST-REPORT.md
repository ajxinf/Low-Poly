# _pipeline-test: pipeline smoke test report

Internal 15 s test (450 f @ 30 fps), **not for posting**. Script: "What if your toast always landed butter-side
down?" (`script.json`, approved 2026-11-12).

- **Final (2K):** `out/_pipeline-test/final.mp4`, 1440x2560, 450 frames, 15.000 s, AAC 320k
- **1080 cut:** `out/_pipeline-test/final_1080.mp4`

## Result per item

Timestamps are in the final video (frame / 30 = seconds).

| # | Item | Result | Where to see it | Notes | Fix |
|---|---|---|---|---|---|
| 1 | Script | PASS | Whole video. Hook "butter-side down" by **1.9 s**. Gag: "½" judge card **7.07 s** (f212), 10-foot table + ladder **12.4-15 s**. Punchline "ladder" **14.28 s** | 39 words, scenario pillar, all "you". `check_script.py` reports only the expected length errors (39 words / ~13 s against 200-270 / 61-90). Fact checked (Matthews 1995, Eur. J. Phys. 16:172). Script shown and approved before any ElevenLabs credits were spent | none |
| 2 | Voice | PARTIAL | Base tag 0.0 s. `[gasps]` **6.24-6.76 s**. `[laughs]` **12.80-13.40 s** | Eleven v4, narrator `zfc8CJQpe8Kqyl0vvCzo`, stability 0.3, one generation. Word timings from the character alignment (`voice/words.json`, 39 words, last word ends 14.88 s). Both tag spans contain sound (-30 / -18 dBFS), but no tool here can tell a performed gasp/laugh from the word read aloud. **Needs an ear check:** `voice/tag_gasps.wav`, `voice/tag_laughs.wav` | listen; if a tag was read aloud, regenerate with `node scripts/tts.ts videos/_pipeline-test --new` |
| 3 | Captions | PASS | Orange key words: physics **2.96 s**, somersault **5.44 s**, Splat **6.88 s**, up **10.40 s**, ladder **14.28 s**. Long words "somersault..." and "butter-side" | Groups of 1-2 words from `words.json`, at 0.70 H. QA layer 1 "Caption vs face" passes on every frame, and the reviewer confirmed. **Wrapping was not tested:** `Captions.tsx` uses `white-space: pre`, so captions never wrap; the longest group fits at 1080 wide | none here; see skill notes |
| 4 | Camera | PARTIAL | S1 push-in 0-3.97 s. Dissolve **3.67-4.0 s**. S2 lateral truck (+ slow push) 3.67-8.03 s. Dissolve **7.73-8.07 s**. S3 crane up + orbit 7.73-15 s. Planned shake **6.87-7.10 s** (f206-212) on "Splat" | QA layer 1 camera-curve passes on every frame; `video_qa.py` finds no SHAKE, SNAP or JERK flags. **But `measure.py` reports still frames 0-30** (still run 15 f, still 6.5 %, drift p50 2.06 vs >= 2.5) | not fixed: see "Open issues" 3 |
| 5 | Characters | PASS | Walk with planted feet **0-3.2 s**. You: neutral → **shocked f204 (6.80 s)** for "Splat" (f206) → **smug f370 (12.33 s)** for "table" (f372). Friend: deadpan → **worried + sweat f426 (14.20 s)** for "ladder" (f428) | Every swap lands 2 frames before its word (guard "Reaction timing", 0-3 f). "Feet on the ground" passes every frame (pavement, stool top at 2.4 m, ladder tread at 0.9 m). Ink outlines and lit cards per kit. The smug face is small in the S3 wide | none |
| 6 | World / look | PASS | Whole video. Prop interaction: you nudge the toast **5.73 s**, it falls **6.27-6.87 s**. Friend holds the card **7.07 s**. You on the stool, friend on the ladder **7.7-15 s** | Own layout (seed 41, gentle curve, café in the carriageway; S3 swaps in the tall table, stool and ladder). Day colour script. `measure.py`: luma 0.53, sat 0.54, C*p90 63, all in range. **Vignette 1.44 (target 0.8-0.9) is OFF** | not fixed: see "Open issues" 4 |
| 7 | SFX | PASS | Steps **0.70 / 1.40 / 2.10 / 2.77 s**. Whoosh **3.83 s**, **7.90 s**. Swish 6.27 s. **Splat 6.87 s**. Pop 7.07 s. Pat 10.40 s. **UI sting 14.27 s** | 11 synthesized events (`audio/events.json`, `cues.md`), each placed on its frame, derived from `words.json` or the walk formula. Timed by construction; not checked by ear | none |
| 8 | Music | PASS | Whole video. Comic drop-out **6.83-7.60 s**. Button **14.27 s** | Original 120 bpm plucked loop (`scripts/audio/music.py`), ducked -10 dB under the voice. The button lands on "ladder" and decays to -57 dBFS before the last frame: no hard cut | none |
| 9 | Mix / master | PASS | Whole video | `mix.wav` measures **-14.3 LUFS integrated, -1.3 dBTP true peak** (EBU R128 via ffmpeg loudnorm). The final AAC measures -14.1 LUFS with sample peak -1.2 dBFS (`short_qa.py`; true peak of the AAC file not measured). Premaster was -18.6 LUFS / -0.8 dBTP, so the look-ahead true-peak limiter (ceiling -1.3) does about 4.5 dB of peak reduction. Length exactly 720,000 samples | none |

## QA summary

| Layer | Check | Result |
|---|---|---|
| 1 (scene, every frame) | 10 checks (`qa/layer1.md`) | **PASS**. 14 intended items: terrace buildings built to meet; the friend standing between the ladder rails |
| 2 (pixels) | `video_qa.py` on the 2K final | **No flags** (`qa/layer2/report.md`) |
| 2 | `short_qa.py` | Specs OK, -14.1 LUFS, no silences, black, white or frozen frames, no pops (`qa/short_qa/`) |
| 2 | `measure.py` | Colour OK. **Vignette, drift p50, still % and still run OFF** (see Open issues 3-4) |
| 3 (fresh reviewer) | 10 findings (`qa/layer3/REVIEW.md`) | 6 fixed, 2 partly fixed, 2 not fixed (staging and light) |

Stills: `qa/f0000.png` ... `qa/f0449.png` (shot starts, mids, every expression swap ±2 f) and the contact sheet
`qa/sheet.png`.

## Render times (this laptop, 15 s / 450 frames, `--gl=angle`)

| Render | Concurrency | Time | Notes |
|---|---|---|---|
| 17 stills, 0.5 scale | - | 76 s | includes bundle and QA layer 1 |
| 1080x1920 | 1 | 145 s | stable |
| 1080x1920 | 2 | 129 s, 136 s (two runs) | stable; output byte-identical to the concurrency 1 render |
| 1440x2560 (2K) | 1 | 232 s, 189 s (two runs) | stable |

All times include bundling and the QA layer 1 pass (~30-40 s of fixed cost).

**Is 2K realistic for daily posting?** Yes, on this evidence. The 2K render costs about 0.35-0.45 s per frame at
concurrency 1, so a 75 s Short (2,250 frames) would take roughly 13-17 min, under the skill's 30 min limit.

Caveats:
- This test scene is light: one street, two characters, few practical lights. Heavier scenes will be slower.
- 2K at concurrency 2 was not tried.
- One early concurrency 2 timing (185 s) is discarded: it overlapped another render by mistake.

## Errors and warnings hit (and what was done)

1. **ElevenLabs 403.** `mp3_44100_192` needs the Creator tier. `tts.ts` uses `mp3_44100_128` (marked `shortcut:` in the file). No credits were charged for the failed call.
2. **2K render failed at `--scale 1.3333`:** "height must be an integer, but is 2559.936". `render.mjs` now accepts `4/3`.
3. **The ffmpeg bundled with Remotion has no `ebur128` filter.** Loudness is metered with `loudnorm`'s measuring pass, which reports EBU R128 integrated loudness and true peak.
4. **`loudnorm` linear mode was impossible:** a +4.6 dB gain would have pushed the true peak past -1. It fell back to dynamic mode (-15.2 LUFS). Replaced with gain plus a look-ahead true-peak limiter.
5. **`npx tsx` isn't installed.** `scripts/tts.ts` runs with `node` (Node 26 strips TypeScript types). Node prints a `MODULE_TYPELESS_PACKAGE_JSON` warning; run with `--no-warnings`.
6. **`tsc` failed on `scripts/tts.ts`** because `@types/node` isn't installed. Excluded `scripts/` from `tsconfig.json` (the other scripts are `.mjs`). Also added `resolveJsonModule` so a video can import its `words.json`.
7. **Python `soundfile` isn't installed** (Python 3.15). The audio scripts use `scipy.io.wavfile`.
8. **`render.mjs` hard-coded concurrency 2.** Added `--concurrency N` and a total-time line.
9. **The first guard runs failed** (subject out of frame, caption band, still holds, ladder through table, friend between the rails). All fixed, or marked intended with a reason, before the first render.

## What the skills got wrong or left vague (suggested edits, not applied)

1. **toon-world-short, "Final export" and step 10:** `--scale 1.3333` breaks the render. Use `4/3` (`node scripts/render.mjs <Comp> out/<slug>/video.mp4 4/3`).
2. **toon-world-short step 3:** `npx tsx scripts/tts.ts` should be `node scripts/tts.ts`, or add `tsx` as a devDependency.
3. **toon-world-short step 8 / Layout:** lists `scripts/audio/timeline.py sfx_gen.py music.py mix.py`, and none existed. This test created `sfx_gen.py`, `music.py` and `mix.py`, with the event table hand-written as `audio/events.json`. Document the event table format.
4. **House rules "Mix" is ambiguous.** "music +3 dB, SFX -6 dB, voice unchanged" doesn't say relative to what. Suggest: "relative to stems normalised to music RMS -20 dBFS and SFX peaks -3 dBFS" (what `mix.py` does). Also state that hitting -14 LUFS / -1 dBTP needs a true-peak limiter, because loudnorm alone falls back to dynamic mode.
5. **"End the mix on the last word: no outro sting" vs a musical button.** Suggest: "a button may land on the last word and must decay before the last frame".
6. **stickrified-script "tag most lines" vs the user's "2-3 tags on beats".** The two rules conflict. Non-verbal tags (`[gasps]`, `[laughs]`) aren't in the skill's tag list, and each added ~0.5 s. With them, the real pace was **2.6 words/s** (39 words → 14.9 s), not the 3.1 the checker assumes. Suggest listing non-verbal tags with their time cost.
7. **"At least one POV / over-the-shoulder 'you' shot" can't be built.** Cards are always camera-facing front views, so an over-the-shoulder shot shows your face, not your back. Needs a back-view card, or redefine the rule as POV only.
8. **video-qa layer 2 step 2** says to pass `plan.json` to `short_qa.py`, but it reads the `shots.json` format that `guardPass` writes. Use `out/<slug>/shots.json`.
9. **The guard and `measure.py` disagree on "still".** The guard traces geometry and passes S1. `measure.py` uses optical flow and flags it, because large flat sky areas carry no trackable motion. One of them needs recalibrating, or the skill should say which one rules.
10. **`measure.py` vignette target 0.8-0.9 vs day exteriors:** this video measures 1.44 (corners brighter than the centre: sky and sunlit cobbles). Either the Composer vignette is too weak for daylight or the target only fits dusk and interiors. Needs a decision.
11. **Captions "test wrapping":** `Captions.tsx` never wraps (`white-space: pre`) and has no max width, so a long two-word group could run off-frame. Suggest `maxWidth: 0.84 W` with wrapping, or a guard check on caption width.
12. **Step 4 "copy `templates/base/`":** it doesn't exist before the pilot. Suggest "until the pilot: start from `src/CharacterTest.tsx`".
13. **The guard's "Subject in frame"** can't express "subject enters during the shot" (S3 crane reveal), so S3 has no subject. Suggest a `subjectFrom` frame.
14. **The `Video` composition has no `<Audio>`,** so Studio previews are silent and the mix only arrives at the mux. Consider mounting `mix.wav` from `public/` for review.

## Scaled down for the 15 s length (or skipped as not needed for a test)

- **Length:** 15 s / 39 words instead of 61-90 s / 200-270 words. `check_script.py`'s two length errors were accepted.
- **Scenario formula:** dropped the DAY time markers and stamp cards, the "Luckily / Unluckily" double and the "Wait...?" mystery beat. Kept the hook, the snap, the "You see," real-world turn and the callback punchline.
- **Shots:** 3 instead of a new shot every 3-5 s (5 s average here). No `FLASH_AT` white flash after the hook, and no whips.
- **No true over-the-shoulder shot** (see skill note 7). S1 is a push-in facing you.
- **Verifier passes:** one fresh reviewer pass on the final, instead of a verifier after every look step. The re-render after its fixes wasn't re-reviewed by a new agent; I checked it myself against the contact sheet.
- **Side-by-side `sbs_sheet.py` against `docs/style/frames/`** wasn't run.
- **Delivery step skipped** (titles, description, TIMELOG, BACKLOG), because the video isn't for posting.
- **No `sources.md`** (scenario pillar; the fact and its source are in `script.json`).
- **Commits:** one commit at the end instead of one per step. Not pushed.

## Open issues (bigger than a small fix; not fixed)

1. **S3 gives away the punchline** (reviewer #5). The ladder and friend are visible from 7.7 s, but "needs a ladder" lands at 14.3 s. Needs restaging: start tight on the tabletop and reveal the ladder on "Your friend". Probably split S3 into two shots.
2. **The S3 toast reads small** (reviewer #2, partly fixed). It falls on open ground now but covers well under 15 % of the frame width. Needs an insert close-up or a follow-tilt on the fall.
3. **`measure.py` still frames 0-30** (see skill note 9). The first fix (S1 starting mid-glide) didn't change it, so the cause is the measurement, not the camera ease.
4. **Vignette 1.44 and the shaded S2 facade** (reviewer #10). A light-rig and grade decision for daylight scenes (see skill note 10).
5. **Audio tags need an ear check** (item 2).
