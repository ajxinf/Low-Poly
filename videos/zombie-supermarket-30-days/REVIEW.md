# VIDEO REVIEW REPORT: zombie-supermarket-30-days (round 1, 2026-11-14)

Mode: **QA + critics, no changes** (sections 6 and 8 not applicable). Stage reviewed: rendered
(`out/zombie-supermarket-30-days/final.mp4`, 1080x1920, 80.8 s, -14.1 LUFS / -1.2 dBFS, measured today).
Not reviewed: `sources.md` (scenario, none needed), analytics (none exist: every performance line is a prediction).
Nobody heard the audio: audio lines come from `words.json`, `cues.md` and `loudness.json`.
Raw module reports: `out/zombie-supermarket-30-days/review/r1-*.md`. Coverage: QA layer 3 and Cold Viewer read all
76 frame sheets; Content Manager 27, Regular Viewer 15. The lead re-checked the disputed gag shots (B10, B25, B27,
B32) on full sheets and measured the B31 blink.

## 1. Technical QA: 7/10
- Layer 1 (scene guard): 16/16 checks pass.
- Layer 2 (pixels, re-run today): 26 flags; 23 explained as planned (whips, night shots, the generator dying, the
  2D x-ray insert). Unexplained: f15-17, f2074, f2207-2211.
- Layer 3 (all sheets): nothing major, about a dozen minor items. Defects:
  1. **f2207-2211 B31: dark blink** after the B30b->B31 dissolve: mean luma 0.39 -> **0.16** -> back over 5 frames
     (measured). Visible.
  2. **f1924-1980 x-ray insert**: labels in a serif fallback font (not Nunito), caption covers the speaker, MOTION
     SWITCH leader line strikes its label, SPEAKER label on the foot, REC half under the bracket. The insert is not
     in `plan.json`/`shots.json`, so no QA layer guards it (pipeline gap).
  3. f14-18 B01: QUACK card swells over half the face, cut by the edge, gone in 2 frames (in the hook second).
  4. f2072->2074 B30: a zombie pops into the foreground; crowd heads inside heads, some semi-transparent cards.
  5. f1539-1589 B22: held toy's head floats off its body; forearm through the toy.
  6. Razor wire: Chad's shins in the coil (B13), megaphone bell in the wire (B04/B05), arm snaps pose f398->400.
  7. f514->516 B07: eyes drawn over the closed slot cover.
  8. Captions over the gag object: bean can (B10), generator face (B23), zombie head (B29), megaphone (B33).
  9. Cosmetic: sky banding (B13, B23), blurred foreground toys 25-40 % of frame (B02, B15), cart sign cut (B17).
- Audio (numbers, unheard): button only **3.3 dB** under the voice on the last word (toon skill rule: FAIL below
  15 dB; `mix.py` only asserts > 0, so it passed). Whispered **"gently"** (49 s): music 14.9 dB above the voice.

## 2. Cold Viewer: 5.6 avg
- Impression: "why pull batteries out?" hooks; Chad reads as a villain instantly (f165 "Members only").
- Strengths: the hook question, Chad, the shutter-rise pyjama reveal (f1706-1760), the laugh -> silence loop.
- Weaknesses: ending guessable from ~44.7 s ("pointed at Chad's door" + "counting his fuel cans"), with no twist
  after; the fuel chart shows every can crossed out while the voice says "one can a day" (f1360-1392); "electric"
  shutters first heard at 56.2 s and "only talk when shaken" at 64.1 s, after the cart already screams (so
  "batteries back in" at 48.4 s raises "won't they make noise?"); zombies stand still, eyes closed, while the toys
  scream (f1831-1923) and "chase" (f2066-2142); dead climax shots (static generator 2.5 s, blank shutter 0.7 s,
  POV with no cart, cart a speck from above); "Dave" named with no intro (17.8 s); title promises survival, video
  is a neighbour feud.
- Scores: first impression 6, hook 6, clarity 5, entertainment 6, retention 5.
- Verdict: **keeps watching until ~45 s**, likely swipes before the 56 s payoff.

## 3. Regular Viewer: 6.2 avg
- Identity: protagonist on spec and on screen at f0; DAY stamp, rust key words, second person all on spec. Drift:
  Chad's store front/roof are rust-orange (LOOK_SPEC keeps large surfaces off the rust accent); B25 and B27 go
  blurry single-colour violet with little ink; no approved frame of the redesigned protagonist in
  `docs/style/frames/`.
- Originality (pilot, nothing published yet, so script-to-script): the next two scripts copy the pilot's spine:
  smug "perfect" rival (Chad / Brock / Brad), rival's power dies (pilot L14 / ice-house L13), his feast vs your
  scraps, "the mocker is silenced" ending (pilot L21 / lie-counter L19), the same opener shape, and the line "Then
  it gets weirder" (pilot L9 / ice-house L6). Only broughton-bridge has its own shape.
- Satisfaction: the plan and "electric" shutters are planted late; Chad's final face (B33) is his smug default, so
  "silenced" barely reads.
- Scores: identity 7, originality 6, satisfaction 6, entertainment 6, returning retention 6.
- Verdict: a fan would come back for the character, not yet for the stories.

## 4. Professional Content Manager: 5.9 avg, decision **REVISE**
- Entertainment / script: script is strong (hook, cause-and-effect chain, peak at ~85-90 %, loop ending);
  premise competes. Trims without adding words: L8 "Dave might be right" (or give Dave a joke), "Then it gets
  weirder", the after-the-fact half of L18.
- Visual: the picture does not carry the story at the peak (kick, cart, zombie reaction all missing on screen);
  ~8 scripted gags absent; Chad gets the same flat-sky medium shot four times (B03, B05, B11, B33); Chad in
  pyjamas loses cap and shades and reads like "you".
- Retention/platforms (predicted): first second is "guy holding a duck" with no threat on screen, in a crowded
  "what if zombie" title space (title option 2 stronger); drop-off risk at the dead climax shots.
- Monetization: advertiser-friendly (cartoon peril, CC0/OFL assets credited, synthesized sound, "Narration: AI
  voice"). Open: tick the platforms' AI-voice/altered-content labels at upload. `PUBLISH.md` specs are wrong
  (says 1440x2560, -14.2 LUFS).
- Scores: overall 6, entertainment 6, script 7, visual 4, retention 5, engagement 6, monetization 9,
  competitiveness 4.

## 5. Consolidated problems
Raised by 2+ modules moves up one level. CV = Cold Viewer, RV = Regular Viewer, CM = Content Manager, QA.
| id | sev | raised by | evidence | problem | decision / fix (owner) |
|---|---|---|---|---|---|
| C1 | CRITICAL | CV CM RV, lead verified | B27 f1791-1829 | The kick, cart and ramp are not on screen at the story's peak (blurred violet storefront) | Restage B27: cart + DO NOT PUSH sign in frame, object POV riding the cart (`story.ts` L293) |
| C2 | CRITICAL | CV CM RV | B28 f1831-1923, B29, B30 f2066-2142 | Zombies don't react to the screaming cart or chase it; cart a speck in B29 | Heads snap on "once", crowd runs (crowd idle states, `story.ts`/crowd), B29 closer |
| C3 | CRITICAL | CV CM RV, lead verified 4 | B10, B20, B22, B25, B32 | Scripted gags missing: pinky beans (no Dave), skull can, sweat drop, ring-eyed shock + toothbrush, final wave | One gag shot per line on its word ("Shoot the gag"): `roles.ts` expressions/poses, `story.ts` |
| C4 | CRITICAL | CV CM | B20 f1360-1392 | Fuel chart shows every can crossed out while the line says "one can a day" | Cross out cans day by day; skull on the last one (`build.ts`/props) |
| C5 | CRITICAL | QA, measured | f2207-2211 | Dark blink after the dissolve into B31 | Find the first-frame exposure/shadow warm-up; QA check for it |
| H1 | HIGH | CV RV | 56.2 s, 64.1 s | "Electric" shutters and "only talk when shaken" arrive after they matter; ending guessable from 44.7 s with no late reversal | Plant "electric" in L3 (Chad's list) and SHAKE ME boxes visibly early; shorten L18 (script: **needs your OK**, see 7) |
| H2 | HIGH | CM QA RV | B25, B31, B33 | Chad without cap/shades reads like "you"; final face = his smug default, so "silenced" doesn't land | Keep one Chad signature on in pyjamas (shades on head); B33 face shocked/silent (`roles.ts`) |
| H3 | HIGH | CV RV | B23 f1590-1664, B25 f1686-1706 | Dead holds at the climax: static generator 2.5 s, blank shutter 0.7 s | Cut in on the smoke ring; start B25 as the shutter starts rising |
| H4 | HIGH | QA (numbers) | `loudness.json` | Button 3.3 dB under the last word (rule: 15); whispered "gently" under the music by 14.9 dB | `button_db` lower in `events.json`; duck harder / stop the bed under "gently"; make `mix.py` enforce 15 dB |
| H5 | HIGH (channel) | RV | ice-house, lie-counter scripts | Next two scripts repeat the pilot's rival, power-dies turn, feast contrast, silenced ending, opener and "Then it gets weirder" | Rework before voicing: a non-mocking foil in ice-house, new ending for lie-counter |
| M1 | MEDIUM | QA | f1924-1980 | X-ray insert: serif fallback font, caption over speaker, label overlaps; insert not in plan (QA blind spot) | Load Nunito in the insert; move labels; declare the insert in `plan.json` |
| M2 | MEDIUM | QA | B10 B23 B29 B33 | Captions over the gag object | Nudge the shot, not the caption |
| M3 | MEDIUM | QA | f14-18 | QUACK card swell/cut in the first second | Keep the card inside the frame, ease it out |
| M4 | MEDIUM | CM CV | f0, title | First frame shows no threat; title promises survival, video is a feud | Show Chad laughing through the window in f0 (as the script's scene field already says); use title option 2 |
| M5 | MEDIUM | CM | B03 B05 B11 B33 | Same flat-sky medium on Chad 4 times | Vary: telephoto, low angle, reverse from his roof |
| M6 | MEDIUM | CV CM | L5 17.8 s, L8, L9 | "Dave" with no intro; L8 and "Then it gets weirder" do no work | Introduce Dave on screen (name tag) in L5; trim L8/L9 (script: needs your OK) |
| M7 | MEDIUM | RV | B13 B30-B32 | Chad's store is rust-orange (rust is the hero's accent) | Repaint the facade a cool colour (`build.ts`) |
| M8 | MEDIUM | QA | f2074, B22, B13, B04/05, f398, f514 | Crowd pop, floating toy head, wire clipping, pose snap, eyes over slot cover | Fix each; add the wire and held toy as colliders/`moving` so the guard catches them |
| L1 | LOW | QA | B13 B23 B02 B15 B17 | Sky banding, big blurred foreground toys, cut cart sign | Dither the sky; crop tighter |
| L2 | LOW | CM | `PUBLISH.md` | Specs say 1440x2560 / -14.2 LUFS | Update to measured values |
| L3 | LOW | RV | `docs/style/frames/` | No approved frame of the redesigned protagonist | Save one after the fixes |

**Disagreements**
- *Hook (CV: works, 6/10; CM: no threat in frame 0).* Both are right: the strange act is the right opener (script
  skill rule), but the script's own scene puts the laughing neighbour in the same frame and the render dropped him.
  Decision: keep the act, restore Chad in the window (M4).
- *L18 explanation (CV: the rule comes too late; CM: cut it shorter).* Decision: show the rule early as a picture
  (SHAKE ME boxes, a toy squawking when bumped in B15) and keep L18 to one short clause. The cold viewer gets the
  information earlier, the pace gets shorter.
- *Severity of the B31 blink (QA reviewer: minor; lead: measured 60 % brightness drop).* Kept CRITICAL: it is a
  visible technical defect in the payoff stretch.

## 7. Remaining issues (all of them: this run made no changes, as asked)
- C1-C5, H2, H3, M1-M3, M5, M7, M8: fixable in the shot plan, cast and world, then a full re-render (~long,
  unattended) and a round-2 review.
- H1, M6 change the narration of an approved, voiced script: they need your OK, new ElevenLabs takes and re-timing.
- H4: one events.json/mix change; also a tool fix (`mix.py` enforces 0 dB where the skill says 15 dB).
- H5: a script-stage decision for the next two episodes.
- Pipeline gaps found: 2D inserts mounted outside the shot list escape every QA layer; the wire and held toys
  aren't colliders; `mix.py` and the toon skill disagree on the button rule.

## 9. Final publication decision
**REQUIRES FURTHER REVISION.** The script holds up and monetization is clean, but the video fails at the moment
that matters most: the kick, the cart and the zombies' reaction (the payoff the whole story builds to) are not on
screen, and five scripted gags never appear, so a first-time viewer is predicted to leave around 45 s. Fix C1-C5
and H2-H4 (all except H1 need no new voice), then run round 2.
