# _pipeline-test: pipeline smoke test report

**Final (2K):** `out/_pipeline-test/final.mp4` (1440x2560, 450 frames, 15.000 s). A 1080 copy is
`out/_pipeline-test/final_1080.mp4`.

**Summary (follow-up round, 2026-11-12):**
1. Music fixed: the bed is 6 dB lower and ducked 16 dB under speech. The voice now sits **18.8 dB** over the music during
   speech (was 13.1 dB, below the new 15 dB FAIL line). The master is still -14.2 LUFS / -1.3 dBTP.
2. S3 restaged into four shots. The ladder and friend exist only in the reveal shot, so nothing gives the punchline
   away before "Your friend". The insert shows the toast landing butter-up at ~40 % of the frame width.
3. Measurement decisions applied: the guard decides whether the camera moves (`measure.py` motion numbers are now
   reference only); day exteriors get a vignette range of 1.1-1.4 (this video: 1.34).
4. All the clear-cut skill edits applied. Captions now wrap at 0.84 W, with a new guard check. A key word always
   starts its own caption group, so a punchline never shows before it is spoken.
5. QA layer 1 passes 11 of 11 checks and layer 2 has no flags. A new reviewer found **3 major S2 readability issues**
   (nudge, splat toast at the frame edge, card stick). They were outside this round's scope and are listed under Open.

Internal 15 s test (450 f @ 30 fps), **not for posting**. Script: "What if your toast always landed butter-side
down?" (`script.json`, approved 2026-11-12).

## Result per item

Timestamps are in the final video (frame / 30 = seconds). "Changed" marks what this round changed.

| # | Item | Result | Where to see it | Notes | Fix / changed |
|---|---|---|---|---|---|
| 1 | Script | PASS | Hook "butter-side down" by **1.9 s**. Gag: "½" card **7.07 s**, 10-foot table **11-13.4 s**, ladder reveal **13.4 s**. Punchline "ladder" **14.28 s** | 39 words, scenario pillar, all "you". The checker's only errors are the expected length ones. Fact checked (Matthews 1995) | none |
| 2 | Voice | PARTIAL | `[gasps]` **6.24-6.76 s**, `[laughs]` **12.80-13.40 s** | Eleven v4, narrator voice, word timings from the alignment. The tag spans contain sound, but only an ear can tell a performed gasp/laugh from the word read aloud. **Needs your ear check:** `voice/tag_gasps.wav`, `voice/tag_laughs.wav` | listen; regenerate with `node scripts/tts.ts videos/_pipeline-test --new` if a tag was read aloud |
| 3 | Captions | PASS | Orange key words: physics 2.96 s, somersault 5.44 s, Splat 6.88 s, up 10.40 s, ladder 14.28 s. "needs a" **13.92 s**, then "ladder." alone **14.28 s** | **Changed:** captions wrap inside 0.84 W (max 2 lines). The new guard "Caption width" check passes, and was tested to fail at 0.2 W. A key word always starts its own group (the reviewer saw "ladder." 10 frames early; fixed). "Caption vs face" passes on every frame | done |
| 4 | Camera | PASS | S1 push-in 0-4.0 s · dissolve 3.67 s · S2 truck 3.67-8.07 s, planned shake **6.87-7.10 s** · dissolve 7.73 s · S3a push+arc 7.73-9.73 s · **hard cut 9.73 s** · S3b insert 9.73-11.3 s · dissolve 11.0 s · S3c low-angle arc/crane 11.0-13.7 s · dissolve **13.37 s** · S3d reveal arc 13.37-15 s | Guard "Camera curve" passes on every frame of all 6 shots (the authority, per section 3); `video_qa.py` finds no SHAKE, SNAP or JERK. `measure.py` motion (reference only): still 5.1 %, longest still run 5 f, drift p50 1.88 (S1 push-in on distant buildings, start of the insert) | **Changed:** S3 split into S3a-d |
| 5 | Characters | PASS | Walk with planted feet **0-3.2 s**. You: neutral → **shocked 6.80 s** ("Splat" 6.87 s) → **smug 12.33 s** ("table" 12.40 s). Friend: deadpan → **worried + sweat 14.20 s** ("ladder" 14.27 s) | Every swap lands 2 frames before its word (guard "Reaction timing"). Feet planted every frame | none |
| 6 | World / look | PASS | Whole video; S2 vignette before/after: `qa/vignette/S2_before_after.png` | **Changed:** day grade vignette .06 → .14. `measure.py --light day`: vignette **1.34** (new day range 1.1-1.4), luma .51, sat .54, C*p90 67. **std 0.191 is just under 0.21** (flatter since the S3 restage: more sky and a ground-level insert) | std: open (minor) |
| 7 | SFX | PASS | Steps 0.70/1.40/2.10/2.77 s · whoosh 3.83, 7.90, 11.17, 13.53 s · swish 6.27, 8.73, 9.73 s · **splat 6.87 s** · pop 7.07 s · pat 10.40 s · **UI sting 14.27 s** | 15 synthesized events (`audio/events.json`, `cues.md`); 4 new for the S3 transitions | re-timed to the new shots |
| 8 | Music | PASS | Whole video. Drop-out 6.83-7.60 s. Button **14.27 s** | **Changed:** bed -3 dB (was +3), ducked **-16 dB** (was -10). The button is its own stem, not ducked: above the bed, **3.2 dB under the voice** on "ladder". It decays to -57 dBFS before the last frame | done |
| 9 | Mix / master | PASS | Whole video | `mix.wav`: **-14.2 LUFS, -1.3 dBTP**. Final AAC: -14.1 LUFS, sample peak -1.2 dBFS. **Voice over music during speech: 18.8 dB** (was 13.1 dB; on "table" the music used to be 6.3 dB louder than the voice). Checked by `mix.py` on every build: FAIL below 15 dB | done |

## Voice vs music (new check)

`scripts/audio/mix.py`, speech band 200-4000 Hz, RMS of the voice stem vs the music as mixed (bed + button) over
every word of `words.json`; written to `audio/loudness.json`.

| Mix | Voice over music, all words | Lowest word | Voice over button ("ladder") | Verdict (>= 15 dB) |
|---|---|---|---|---|
| Before (bed +3 dB, duck 10 dB, button ducked) | 13.1 dB | -6.3 dB on "table." | 7.1 dB | FAIL |
| **Now** (bed -3 dB, duck 16 dB, button -3 dB not ducked) | **18.8 dB** | 3.2 dB on "ladder." (the button) | 3.2 dB | **PASS** |

## QA summary (final 2K)

| Layer | Check | Result |
|---|---|---|
| 1 (scene, every frame, 6 shots) | 11 checks incl. the new "Caption width" (`qa/layer1.md`) | **PASS.** 14 intended: terrace buildings built to meet; the friend between the ladder rails |
| 2 (pixels) | `video_qa.py` | **No flags** (`qa/layer2/report.md`) |
| 2 | `short_qa.py` (now given `shots.json`) | -14.1 LUFS, no silences, black, white or frozen frames. One pop at f312: the toast landing big in the insert, a planned image change, not a cut |
| 2 | `measure.py --light day` | Colour OK, vignette 1.34 OK. std 0.191 OFF (minor). Motion: reference only |
| 3 (new reviewer) | 10 findings (`qa/layer3/REVIEW.md`, round 2) | S3 restage confirmed (punchline hidden through f402, insert reads). Caption finding fixed. **3 major S2 issues open**, plus minor ones |

Stills: `qa/f0000.png` ... `qa/f0449.png` (every shot start, mid-shot and expression swap ±2 f, all 6 shots) and
the contact sheet `qa/sheet.png`.

## Render times (this laptop, 15 s / 450 frames, `--gl=angle`; all include bundle + QA layer 1)

| Render | Concurrency | First test (3 shots) | Follow-up (6 shots) |
|---|---|---|---|
| 1080x1920 | 1 | 145 s | not re-run |
| 1080x1920 | 2 | 129 s, 136 s | 143 s, 136 s, 136 s |
| 1440x2560 (2K) | 1 | 232 s, 189 s | **198 s, 197 s** |
| 20 stills, 0.5 scale | - | 76 s (17 stills) | 81 s |

**Six shots did not slow the render.** A dissolve only renders two canvases for 10 frames. A 75 s Short in 2K would take
about 15-17 min at concurrency 1, under the 30 min limit. 2K at concurrency 2 is still untested.

## What changed this round (by section and commit)

| Section | Commit | Changes |
|---|---|---|
| 1. Music | `571934d` | `music.py` writes the bed and the button separately. `mix.py`: bed -3 dB, duck 16 dB, button not ducked, voice-vs-music check (FAIL < 15 dB), `loudness.json` levels. Skill "Mix" rule rewritten with the reference levels |
| 2. S3 restage | `3d369a1` | S3a tabletop / S3b insert (hard cut) / S3c low angle / S3d reveal; `OPTS_TALL` without the ladder, `OPTS_REVEAL` with it; 4 new sound cues |
| 3. Measurement | `9656657` | `measure.py`: motion reference only, texture by gradient, untracked frames skipped, `--light` vignette ranges (day 1.1-1.4). Day grade vignette .14. Both skills updated |
| 4. Skill edits | `d338d6a` | See the diff summary below, plus caption wrapping, the Caption width guard check, `subjectFrom`, the non-verbal tag time in `check_script.py`, Studio-only preview audio, `videos/BACKLOG.md` |
| 5. QA + report | (this commit) | Final renders, QA layers 1-3, this report. Includes the key-word caption split, found by the reviewer |

### Diff summary of every skill change (since the first test, `21cf88b`)

**toon-world-short/SKILL.md**:
- *Mix* rule rewritten:
  - stem reference levels: music bed RMS -20 dBFS, SFX peaks -3 dBFS, voice as delivered;
  - voice 0, bed -3 dB ducked 16 dB, button -3 dB not ducked, SFX -6 dB;
  - voice-vs-music check (FAIL < 15 dB; never fix it by raising the music);
  - true-peak limiter for -14 LUFS / -1 dBTP;
  - a musical button may land on the last word and must decay before the last frame.
- *Final export*: scale `4/3` instead of `1.3333`.
- *Layout*: the real `scripts/` list (no `timeline.py`); "until the pilot copy `src/videos/_pipeline-test/`".
- *Step 2*: POV-only "you" shots, with the back view in BACKLOG.
- *Step 3*: `node scripts/tts.ts` (was `npx tsx`), plus `--new` and response reuse.
- *Step 4*: template fallback.
- *Step 8*: the `events.json` format, the three audio commands, `loudness.json`, the Studio preview audio.
- *Step 10*: `render.mjs ... 4/3 [--concurrency 1|2]`.
- *Vignette*: target by lighting (day 1.1-1.4).
- *Camera*: "POV for 'you'".

**stickrified-script/SKILL.md**:
- The POV rule.
- A new *Non-verbal tags* paragraph: ~0.5-0.6 s each, 2.6 words/s measured with two of them, ear-check before
  approving.

**stickrified-script/check_script.py**: `NONVERBAL` tag time is added to the length estimate (this script: ~14 s
estimated, 14.9 s actual; was ~13 s).

**video-qa/SKILL.md**:
- `short_qa.py` takes `out/<slug>/shots.json`.
- New *Caption width* row.
- *Subject in frame* honours `subjectFrom`.
- `measure.py --light ...`, and its motion numbers are reference only (the layer 1 guard decides).

## Errors and warnings hit

First round, all handled:
- ElevenLabs 403 on 192 kbps (Creator tier; using 128 kbps).
- `--scale 1.3333` refused.
- No `ebur128` in the bundled ffmpeg.
- loudnorm fell back to dynamic mode.
- No `tsx` and no `@types/node`.
- No Python `soundfile`.
- `render.mjs` hard-coded concurrency 2.

This round:
- A shell heredoc broke on a long inline Python edit (re-run from a scratch file).
- PowerShell 5.1 `Set-Content -Encoding utf8` added a BOM to `Captions.tsx` during the caption-width negative test
  (stripped). Use the Edit tool, or `[IO.File]::WriteAllText`, for UTF-8 without a BOM.
- The guard caught S3a's head at the frame edge on the first try (re-aimed).

## Scaled down for the 15 s length (or skipped)

- 15 s / 39 words.
- No DAY stamps, no "Luckily / Unluckily", no mystery beat, no `FLASH_AT` flash, no whips.
- POV rule: S1 faces you; no true POV shot was built.
- Delivery step skipped (not for posting).
- No `sources.md` (scenario; the fact is in `script.json`).
- No `sbs_sheet.py` side-by-sides.

## Open issues

1. **S2 readability, 3 major** (reviewer round 2):
   - the nudge doesn't read: you stand ~250 px from the toast;
   - the splat toast lands at the right edge as a plain brown tile;
   - the card stick doesn't meet the friend's hand and the card overlaps the cap.

   Fix: walk you to the table edge with a hand-to-toast touch at ~f177; land the toast at ~65 % of the frame width
   with a butter squish; put the stick's foot at the raised hand dot.
2. **The voice tags need your ear check** (item 2).
3. **S3c sky** clips the blue channel (#1165fe vs spec #5e93d9) and dust reads as stars against it. This is a sky
   shader / day preset question for low angles.
4. **std 0.191** (target 0.21-0.29): the image is slightly flat since the restage.
5. **Minor (reviewer):** S3a doesn't show the height; feet on the table rim at f20-40; table base blob f85-110; leg
   sliver in the insert; two of "you" during the reveal dissolve; the friend's hands hover outside the rails; ink
   specks and a faceted table rim in S2.
6. **`measure.py` motion** still reads the S1 push-in as low (distant blurred buildings barely move in a push-in).
   By decision the guard rules; it's listed for the record.
