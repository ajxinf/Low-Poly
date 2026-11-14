---
name: video-review
description: Full review-and-fix pass on a Stickrified short by a four-member team - Technical QA (the video-qa skill), a Cold Viewer who has never seen the channel, a Regular Viewer who has seen every episode, and a Professional Content Manager (retention, platforms, monetization) - then consolidates their findings, fixes what can be fixed, re-reviews and writes REVIEW.md. Works on a script alone, a voiced cut or a rendered mp4. Use for "run the complete video review", "review the video", "critique this short", "is this ready to publish", "run the cold viewer critic", "run the critics without changes", or before delivering any video.
---

# Video review & optimization

Four independent modules judge one video, then the findings are merged, fixed and re-judged. Technical quality is
the `video-qa` skill's job. This skill adds whether the video is worth watching. It never replaces `video-qa`.

| Module | File | Question it answers |
|---|---|---|
| 1. Technical QA | `.claude/skills/video-qa/SKILL.md` (unchanged) | Is anything broken? |
| 2. Cold Viewer | `critics/cold-viewer.md` | Would a stranger scrolling past stop and stay? |
| 3. Regular Viewer | `critics/regular-viewer.md` | Is this a good episode of *our* channel, and not a repeat? |
| 4. Content Manager | `critics/content-manager.md` | Can it compete, grow the channel and earn money? |

Fixes: `fixes.md`. Report: `report.md`. Authorities the critics judge against (they never invent their own):
`CLAUDE.md`, `docs/STYLE.md`, `docs/style/LOOK_SPEC.md`, the `stickrified-script` and `toon-world-short` skills.

## Modes (pick from the request)
| Request | Runs |
|---|---|
| "Run the complete video review" (default) | steps 1-8 |
| "Run the critics" / "without making changes" | steps 1-4 and the report, minus sections 6 and 8 |
| "Run Technical QA only" | the `video-qa` skill, then report section 1 |
| "Run the Cold Viewer / Regular Viewer / Content Manager only" | steps 1 and 3 for that critic, report section for it |

## Steps
1. **Evidence pack.** `python scripts/review_pack.py <slug>` writes `out/<slug>/review/pack.md`: which assets
   exist, the review stage (script only / voiced / rendered), a line-by-line timeline (time, shots, gag, text,
   sfx), pacing numbers and the channel catalogue. If `final.mp4` exists but `out/<slug>/qa/frames/` does not, run
   `python scripts/frames.py out/<slug>/final.mp4 out/<slug>/shots.json videos/<slug>` so critics see exact frames.
2. **Technical QA.** Rendered video: run the `video-qa` skill as written (it is module 1, reuse its outputs:
   `layer1.md`, `out/qa/<name>/report.md`, `QA.md`). Script only: run
   `python .claude/skills/stickrified-script/check_script.py videos/<slug>/script.json` instead and say QA layers
   1-3 were not possible. Score: see "Scores".
3. **Three critics, independently.** Each critic is a fresh agent (Opus, no `model` override needed) given ONLY: its
   critic file, `pack.md`, the paths of the assets marked present, and the authorities above. No critic sees
   another's report or any earlier score. Run the three in parallel. Each writes
   `out/<slug>/review/r<N>-<critic>.md` in the format its file sets. (If agents are unavailable, run them one at a
   time yourself and write each report before reading the next critic file.)
4. **Consolidate** (you, not a critic) into `out/<slug>/review/r<N>-findings.md`: one row per problem, merged
   across critics. Columns: id, severity, critics who raised it, evidence (time / frame / line / shot), fix, owner
   file. Severity:
   - **CRITICAL**: confusing story, weak or misleading opening, wrong or missing picture for the narration, major
     pacing hole, technical defect, policy or copyright risk.
   - **HIGH**: a dull stretch, weak visual storytelling, narration the picture already says, predictable turn,
     weak ending.
   - **MEDIUM**: better angle, composition, transition, SFX or phrasing.
   - **LOW**: polish.
   A problem raised by 2+ critics moves up one level. **Disagreements**: write the disagreement, each side's
   reason, and a decision that serves the most viewers without hurting the others (keep the information, cut the
   words). Technical correctness and platform compliance always win over entertainment.
5. **Fix.** Work down the list by severity with `fixes.md`. Every change names the finding id it fixes. Do not
   touch what no finding names.
6. **Re-review.** Rebuild what the fixes changed (fixes.md "Rebuild chain"), regenerate the pack and frames, then
   run step 2 and step 3 again with fresh agents on the revised material (round N+1). Critics still never see
   earlier scores. Check: each finding resolved? new problems? story coherent? picture still on the words? identity
   intact?
7. **Stop** when all CRITICAL are fixed, every HIGH is fixed or documented with a reason, nothing major remains in
   QA, and each critic's verdict is publishable (or the disagreement is documented). Stop after round 3 regardless:
   list the rest under Remaining issues. Never polish LOW items into another round.
8. **Report.** Write `videos/<slug>/REVIEW.md` from `report.md` (committed; `out/` is git-ignored), commit
   (`<slug>: review round N`), and give the user the decision line plus the before/after table.

## Scores
Every score is an integer /10 with a one-line reason tied to evidence. Anchors (all critics):
- 9-10: as strong as the best reference shorts (`docs/style/REFERENCE_NOTES.md`) on this axis.
- 7-8: publishable, clear weaknesses named. 5-6: a viewer notices the problem. <=4: the problem loses most viewers.
Technical QA score: 10 = layer 1 passes, layer 2 has no unexplained flags, layer 3 nothing above minor. Minus 1 per
unexplained layer 2 flag cluster or minor layer 3 item (max -3), minus 3 per major item; a layer 1 failure caps it
at 4. Script-only reviews give no QA score ("n/a").

## Honesty rules (every module)
- Cite only what you opened. `pack.md` lists what exists; an asset marked missing is "not reviewed", never guessed.
- **Nobody hears the audio.** Audio judgments come from `words.json` timings, `events.json`/`cues.md`,
  `loudness.json` and the tag clips; say so in the audio lines.
- Watching = reading frame sheets and key frames (`qa/frames/`), never playback, never a summary.
- A prompt or plan edit is not a changed video: footage changes only after the re-render, and re-review reads the
  new render.
- No analytics in the repo means performance lines are predictions from what is on screen, labelled as such.
- Be harsh. "Matches our format" is not praise. A technically clean video can still be boring.
