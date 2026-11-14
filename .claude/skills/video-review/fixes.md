# Fixing findings

Fix the cause, in the file that owns it, with the tools the production skills already use. Every edit names its
finding id in the commit message or the plan comment. Preserve what works: no finding, no edit.

## Where each fix lives
| Finding is about | Edit | Follow the rules in |
|---|---|---|
| Hook, wording, exposition, pacing of words, ending, loop | `videos/<slug>/script.json` (`narration`, `spoken`, `audioTag`), then `check_script.py --md` | `stickrified-script` skill |
| A gag that is not on screen, the wrong picture for a word, a weak line's visual | the line's `scene` / `camera` / `gag` in `script.json`, and the shot in `src/videos/<slug>/story.ts` | `toon-world-short` "Shoot the gag", "Visual storytelling" |
| Shot length, wide vs close, framing, camera move, empty foreground, holds | `story.ts` (`SHOTS`, `CAMS`, `frameOn`, `reframe`, `KICKS`, `XFADE`) | "Staging and camera" |
| Set layout, missing dressing, signs, window views | `src/videos/<slug>/build.ts` | "Shoot the gag" (sets say what they are) |
| Character look, expression on a word, pose, props in hand | `src/videos/<slug>/roles.ts`, `props.ts` | protagonist spec, "Visual storytelling" |
| SFX placement, missing hit, too many air sounds, music build | `videos/<slug>/audio/events.json` (word-synced cues) | `toon-world-short` step 8 |
| Mix levels, voice vs music gap | `scripts/audio/mix.py` inputs, never raise the music | House rules: Mix |
| Clipping, flicker, light jumps, captions on faces | the `video-qa` skill's own fix rules | `video-qa` |
| Title, description, disclosure | `videos/<slug>/PUBLISH.md` | `CLAUDE.md` content rules |
| A kit-wide weakness (every video would have it) | note it for `kit/toon/`; fix in the kit only if the user asks | `toon-world-short` Polish loop |

Music: the channel uses an original synthesized score bed under the voice (`CLAUDE.md`, mix rules). A critic may
recommend less music, a later build or silence on a beat; removing the bed for all videos is a channel decision
for the user, not a review fix.

## Gate: narration changes
The user edits and approves every script (`CLAUDE.md` pipeline). So:
- **Script-only video**: apply narration fixes to `script.json`, re-run the checker, and hand `SCRIPT.md` to the
  user with the changed lines marked and their finding ids. Re-review the new script.
- **Voiced or rendered video**: a new line costs ElevenLabs credits and moves every word time. Write the
  proposed lines into the report (old -> new, finding id) and ask the user before running `tts.ts --new`. Visual,
  sound and shot fixes that do not change words go ahead without asking.

## Rebuild chain (run only the part a fix touched, in this order)
1. Words changed: `node scripts/tts.ts videos/<slug> --new` -> check `words.json` -> re-time shots in `story.ts`.
2. Shots / world / cast changed: `node scripts/stills.mjs <Comp> out/<slug>/x_ <frames> 0.5` at the changed
   frames (QA layer 1 runs first) and look at them.
3. Timing changed, or cues changed: `python scripts/audio/sfx_gen.py videos/<slug>`, `music.py`, `mix.py`;
   update `cues.md`.
4. Anything on screen changed: `node scripts/render.mjs <Comp> out/<slug>/video.mp4`, mux (`toon-world-short`
   step 10), then `video-qa` layers 2-3 on the new `final.mp4` and `frames.py` for the critics.
   Render settings per `CLAUDE.md` (`--gl=angle`, concurrency 1, `$env:TEMP`/`$env:TMP` = `C:\remotion-tmp`).
   A full 80 s render runs unattended for a long time: start it in the background and wait for it.
If a render is not possible this session, the fix is "applied to the plan, not yet rendered": list the shots that
must be re-rendered under Remaining issues and do not re-score their visuals.

## Not fixable by editing
Concept-level problems (a premise that cannot compete, a repeat of an earlier episode's whole idea), missing
assets (a back-view card), or anything that needs the user's taste: write them under Remaining issues with the
reason and, if useful, a concrete option for the user.
