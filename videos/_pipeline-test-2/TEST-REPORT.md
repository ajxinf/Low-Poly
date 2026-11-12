# _pipeline-test-2: second pipeline smoke test (2026-11-13)

**Final (2K):** `out/_pipeline-test-2/final.mp4` (1440x2560, 448 frames, 14.93 s). Not for posting.
**Story:** "You paint your shed roof white, and your neighbour laughs." Day 90 heatwave; white bounces sunlight,
black soaks it up; his ice cream melts; he paints his roof white "and you're the one laughing" (loop to line 1).

Purpose: run every step a real Short uses, after the story rules changed (rival/mocker, loop, in-world text),
and exercise parts the first test never touched: the DAY stamp, a colour-fill gag, a mirrored loop shot, HDR
practicals (rays), a new era preset (modern suburb) and a new kit component (`kit/toon/Stamp.tsx`).

| # | Step | Result | Notes |
|---|---|---|---|
| 1 | Script (`stickrified-script`) | PASS | 43 words, `loop` field set. Checker: the expected length errors for 15 s; long-word warn (12 %) is noise at 43 words |
| 2 | Voice (`scripts/tts.ts`) | PASS (ear check open) | Eleven v4, 14.72 s, `words.json` 43 words. `[laughs]` before "you're": **listen** to `voice/voice.wav` 13.4-13.6 s |
| 3 | Shot plan + world + cast | PASS | 5 shots, 3 dissolves + 1 hard cut. Two sheds and a fence in a modern-suburb front yard (`build.ts`) |
| 4 | QA layer 1 (guard, every frame) | PASS | 11/11 checks; 2 intended (closing row of buildings built to meet). It caught 12 real problems on the way (below) |
| 5 | Captions | PASS | Key words orange: laughs, heatwave, away, up, chance, laughing. No caption over a face (guard) |
| 6 | DAY stamp (new) | PASS | `kit/toon/Stamp.tsx`: upper third, thump on "Day" (f103), rust text, held 60 f |
| 7 | Reactions on the word | PASS | Neighbour laughs f70 ("laughs" f72), face fills red f324 ("chance" f326), you laugh f420 ("laughing" f422) |
| 8 | SFX + music + mix | PASS | 15 events (`audio/cues.md`). -14.1 LUFS / -1.3 dBTP. Voice over music 18.8 dB (FAIL < 15). Button 2.5 dB under the voice on the last word (same as test 1) |
| 9 | Final render 2K, concurrency 1 | PASS | **178 s** incl. bundle + QA layer 1 (test 1: 198 s) |
| 10 | QA layer 2 | PASS (1 minor) | `video_qa.py`: no flags. `short_qa.py`: -14.3 LUFS, no black/white/frozen/pops. `measure.py --light day`: luma **0.577 vs 0.57 max (OFF, minor)**, rest ok |
| 11 | QA layer 3 (review) | PASS after 2 fixes | Done by me on `qa/sheet.png`, not by a separate reviewer agent (see open issues) |

## What the QA caught and what changed
- Guard: feet were placed at y 0 but the yards sit at y 0.015, so the contact shadows were hidden under the grass.
  Characters now stand on `YARD_Y` / `WALK_Y`.
- Guard: a street hedge ran through both characters and the fence (seed changed), the sheds and fence touched a
  house's front path (moved), cast in S2/S3 sat under the captions (removed: nobody outside in the heat).
- Guard: three "Camera curve" holds (S1, S3, S5). Fixed with longer glides that start before the shot.
- Guard: S5 put your head on the caption band twice; fixed by tilting the lens down, not up.
- Layer 2: the sun disc clipped 7 % of the frame to pure white (`video_qa` CLIP). Now 0.97, not HDR.
- Layer 3: his roof never visibly turned white in the loop shot (the paint grew on the off-screen half); S1 cut the
  laughing neighbour at the frame edge. Both fixed and re-checked on stills.

## Open issues
1. **Ear check**: the `[laughs]` tag at ~13.5 s.
2. **Luma 0.577** (target max 0.57): bright day exterior; same family as test 1's minor colour note.
3. **Layer 3 by a fresh reviewer agent** (skill rule) was not run: the session's tool rules only allow sub-agents
   when you ask for them. Say so if you want it before production.
4. The rays' bounce is thin in S3 wides; fine at 15 s, worth a thicker ray helper (`BACKLOG.md`: glow streak).
