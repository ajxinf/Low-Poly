---
name: toon-world-short
description: Make a Stickrified vertical Short (61-90 s) in the "2D stickman cartoon characters in a painted 3D world" style - flat round-head stickman cards with thick ink outlines, hand-inked painted 3D world, saturated colour script, lit cards, an always-moving camera, 10-frame dissolves, literal visual gags, second-person ElevenLabs narration, synthesized SFX and an original score - rendered with three.js inside Remotion. Use for any new Stickrified video, "make the next short", a what-if scenario, strange-true-history or "In this world..." fiction short, writing or punching up a script, building the toon kit, or "use the toon world skill".
---

# Toon-world short (three.js + Remotion)

Stickrified Shorts: flat 2D stickman cartoon **cards** (characters) living in a **painted 3D world** with black ink lines.
Three pillars, all narrated in **second person ("you")**, all built to be as entertaining as possible:
- **Scenario**: "What if you were trapped in a supermarket for 30 days during a zombie apocalypse?"
- **Strange true history**: "You're one of 74 soldiers about to knock down an iron bridge just by walking across it."
- **"In this world..." fiction**: an invented world with one changed rule, and you're stuck living in it.
  "In this world, everyone's lies float above their head as a number. Yours says 4,000."

**Look authority: `docs/style/LOOK_SPEC.md`** (craft numbers we adopt + the Stickrified identity layer + the
current gap list). It merges the MIT-licensed 20-video study in `vendor/cartoon-3d-short/reports/` (with code
recipes for ink, lens blur, two-tone shading, card shading, grade and faces) and our own 4-video study. When this
file and LOOK_SPEC disagree, LOOK_SPEC wins.

Everything (story, characters, world, music) is our own. Our own frame-by-frame study of seven reference shorts
(R1-R4 look and motion, R5-R7 story and visual storytelling): numbers in `docs/style/REFERENCE_NOTES.md`, the
videos themselves in `assets/references/` on the laptop (git-ignored). Those videos are **private study material**: never upload, publish or send them, never copy their
stories, characters, jokes or shots, never name their channels. Once our pilot is approved, our own frames in
`docs/style/frames/` become the main reference and `docs/STYLE.md` holds our final values.

## House rules
- English only. Narration in second person. One narrator voice (ElevenLabs Eleven v4, voice ID
  `zfc8CJQpe8Kqyl0vvCzo`, every video): a fast, energetic storyteller, deadpan only on single punchlines.
- **Scripts: follow the `stickrified-script` skill** (`.claude/skills/stickrified-script/SKILL.md`): pillars,
  formulas, entertainment and exaggeration rules, Eleven v4 tags, length (200-270 words), `script.json` format.
- Captions (measured + identity): the one key word per sentence (number, twist, punchline) is rust-orange
  `#ff8a3d` and scales up 8 % for 4 frames; mark it with `*word*` in `script.json`. Otherwise: 1-2 words at a time from `words.json`, white `#ffffff` bold rounded sans (e.g. Nunito Black or
  Poppins ExtraBold, bundled locally), dark outline `#141014` ~0.006 W plus a soft drop shadow (offset 0.003 W, blur
  0.006 W, 60 % black), centred horizontally at y = 0.70 H, font size 0.055 W (~60 px at 1080 wide), punctuation kept,
  no pop or bounce: each group appears instantly on its first word and holds until the next (median 10 f). Never over
  a face: nudge the shot, not the caption.
- Mix (`scripts/audio/mix.py`), gains relative to these stem reference levels: music bed RMS -20 dBFS
  (`music.py`), every SFX peaking at -3 dBFS (`sfx_gen.py`), voice as ElevenLabs delivers it.
  - Voice 0 dB.
  - Music bed -3 dB, ducked a further 16 dB while the voice speaks (30 ms attack, 250 ms release).
  - Button (final hit, its own `button.wav`) -3 dB, not ducked: above the bed, below the voice.
  - SFX -6 dB.
  - **Check (FAIL below 15 dB):** voice over music in the speech band (200-4000 Hz) during the words of
    `words.json`, and the button below the voice on the last word. `mix.py` prints both and writes them to
    `audio/loudness.json`. Never fix a failed gap by raising the music; lower it.
  - Master to -14 LUFS integrated, true peak -1 dBTP (the louder references measure -14.2 LUFS / -0.8 dBTP): gain
    into a look-ahead true-peak limiter (ceiling -1.3 dBTP). Loudnorm alone falls back to dynamic mode.
  - End the mix on the last word. A musical button may land on the last word and must decay before the last frame;
    no outro sting after it, no end card.
- Final export 2K vertical 1440x2560: scale `4/3` (`1.3333` gives 2559.936 px and Remotion refuses it). If a final render on the laptop takes more than 30 min,
  export 1080x1920 instead and note it in `docs/STYLE.md`.
- A fresh verifier agent (Opus, max effort) checks every look step and the final video.
- Commit after every step (`git add -A; git commit -m "<video>: <step>"`). Push at the end of each session.
- Once the user approves the script: "just do it". No more check-ins until delivery unless blocked.
- Content: advertiser-friendly and evergreen; violence stays off-screen (cutaways, sound, reactions); no graphic true
  crime. History scripts ship with `sources.md`. Every video gets its own world layout and shots (no reskinned
  templates: this protects against YouTube's inauthentic-content policy).

## Machine (Windows 11, PowerShell)
- i5-11400H, RTX 3050 4 GB, 16 GB RAM. Render with `--gl=angle --concurrency=2` (drop to 1 if it crashes).
- Before any render in a new terminal: `$env:TEMP='C:\remotion-tmp'; $env:TMP='C:\remotion-tmp'`
  (use another drive if it has more space). See Gotchas: Disk.
- Python 3 is needed for the sound and QA scripts (`pip install numpy scipy soundfile pillow`).
  ffmpeg comes with Remotion: `npx remotion ffmpeg ...`.

## Layout
```
kit/toon/          shared look: lights.ts shade.ts paint.ts world.tsx ink.ts camera.ts Composer.tsx
                   toon.ts figure.ts face.ts poses.ts cast.ts cardshade.ts protagonist.ts extras.ts
kit/toon/build/    world library: building.ts props.ts ground.ts street.tsx presets.ts (era presets)
src/videos/<slug>/ per video: story.ts (shots, cameras), build.ts (world layout), roles.ts (who is where), Video.tsx
videos/<slug>/     SCRIPT.md, script.json, sources.md, voice/ (voice.wav, words.json), audio/ (mix.wav, stems, cues.md)
templates/base/    clean copy of a finished video folder to start new ones from (made after the pilot; until then
                   copy src/videos/_pipeline-test/)
scripts/           stills.mjs, render.mjs, measure.py, video_qa.py, tts.ts, audio/ (sfx_gen.py music.py mix.py)
docs/STYLE.md      our style bible: the look values below + approved frames in docs/style/frames/
videos/BACKLOG.md  topic backlog (20+), videos/TIMELOG.md minutes per step per video
```

## Phase 0: build the kit (once, weeks 1-2)
Build in this order, commit after each, and get a verifier pass on stills before moving on:
1. **World**: `world.ts` sky shader, fog = horizon colour; `lights.ts` day + golden presets; `shade.ts` two-tone shading.
2. **Ink**: `ink.ts` outline pass (its own pass, before any blur), `NOINK` layer for character cards.
3. **Materials**: `paint.ts` Canvas2D painted textures with seams painted in as dark tints; Kenney CC0 props recoloured
   (record each in `assets/CREDITS.md`).
4. **Characters**: `toon.ts` Pen API (600x1000 design canvas, soles at y = 975), round heads, stick limbs, near-black
   variable-width outline, face library (14 expressions); `protagonist.ts` (spec below).
5. **Cast**: `cast.ts` camera-facing billboards, walk cycles, blinks, crowds, effect cards; `cardshade.ts` card lighting.
6. **Post**: `Composer.tsx` ink -> lens pre -> lens main -> bloom -> NEUTRAL tone map -> grade, MSAA 4.
7. **Captions**: `Captions.tsx` from `words.json`.
8. **Scripts**: `measure.py` (the reference-study measurements: optical-flow camera motion, still frames, colour,
   vignette, caption change rate), `tts.ts` (ElevenLabs with-timestamps -> voice.wav + words.json), audio scripts, `stills.mjs`,
   `sbs_sheet.py`, `short_qa.py`.
9. **Pilot Short** through the full pipeline, then copy its folder to `templates/base/`, save the best frames to
   `docs/style/frames/` and write `docs/STYLE.md` with the final values and measured render speed.

## The protagonist ("you")
The same character in every video; he is the viewer and the channel's face (LOOK_SPEC section 2). Costumes are
overlays (hat, coat, uniform) that always keep the quiff and a rust-orange `#c8582c` accent.
- Adult build 3.5 head-heights; bean head (H/W .94, pointed crown, fuller jaw) in pale cream `#f4ece0`.
- Signature silhouette: tall forward quiff with one cowlick, near-black brown `#241b17`, readable in pure silhouette.
- Rust-orange jacket (collar, two pockets, zip) open over a striped charcoal tee; jeans; dark shoes as short strokes.
- Faces from the face library in LOOK_SPEC: lidded deadpan default, no blush, no catchlights.
- Expressions: neutral (lidded), tired, worried, scared, shocked (white circles almost touching), smug, determined,
  sad, angry, sneaky, relieved, confused, deadpan, laughing. Extras: sweat drop, steam puffs, colour fill, "!" pop.
- Current kit build (`kit/toon`, local; port to the spec above):
  The same card in every video; he is the viewer. Costumes are overlays (hat, coat, uniform) that always keep the hair
  and a rust-orange accent.
  - Head 40 % of height, h/w .98, pale cream `#f4ece0`, ink `#1d1416`. Pear torso, short stick legs, elbowed stick
    arms, mitten hands with a thumb (values in `docs/STYLE.md`).
  - Hair: dark brown-black `#211915`, tall swept quiff with one cowlick up and forward (reads in pure silhouette).
  - Face: eyes high and close (.24 head widths apart, 45 % down), thick wedge brows that do the acting, big mouths.
  - Default outfit: rust jacket `#a8502c` with collar, two pockets, zip and darker stitching over a striped charcoal tee
    `#2e2f30`; jeans `#33456b` with a rolled cuff; boots `#5a3a26`.
  - Expressions: neutral, tired, worried, scared, shocked, smug, determined, sad, angry, sneaky, relieved, confused,
    deadpan, laughing.

## Pipeline per video (hands-on target <= 2 h; renders run unattended)
1. **Topic and facts.** Pick from `videos/BACKLOG.md`. It must be visual: a physical cause and effect, plus one
   everyday analogy that explains it. Facts with sources at the top of `SCRIPT.md`; history also gets `sources.md`.
   Fiction instead needs one impossible rule that is instantly drawable and has obvious everyday fallout.
2. **Script.** Run the `stickrified-script` skill: it writes `script.json`, `SCRIPT.md` and (history)
   `sources.md`, checks them with its `check_script.py`, and hands `SCRIPT.md` to the user. The user edits; once
   approved, "just do it". Visual rules that come from the script:
   - **Cold open**: the first frame already shows the most absurd image of the story, on the first word.
   - **Literal gags**: every line's `gag` becomes a picture (a face "goes purple" -> it fills purple).
   - Scenario pillar: show the 2-3 big time jumps with the "DAY 3" stamp card (upper third, thump SFX); history
     uses the year card the same way. Every other bit of text lives in the world (see "Visual storytelling").
   - At least one POV "you" shot per video. POV only until a back-view card exists (cards always face the
     camera, so an over-the-shoulder shot shows your face); the back view is in `videos/BACKLOG.md`.
   - Captions change 2.2-3 times per second; end on the last word, no outro.
3. **Voice.** `node scripts/tts.ts videos/<slug>` (Node 22.6+ runs TypeScript directly; `--new` regenerates,
   otherwise the saved `voice/tts_response.json` is reused so credits are not spent twice) -> `voice/voice.wav` + `voice/words.json` (character
   alignment converted to word times). Hand-check the word times; everything is timed to `words.json`.
4. **Shot plan** in `src/videos/<slug>/story.ts` (copy `templates/base/`, or until the pilot
   `src/videos/_pipeline-test/`; register the composition in `src/Root.tsx`):
   - `SHOTS`: id, a/b frames, light day/golden, crowd mode, `tau` story time.
   - `XFADE` crossfades at place/time changes; `FLASH_AT` white flash after the hook.
   - `CAMS`: per-shot keys `{f, dur?, cut?, s: f => {pos, look, fov, roll}}`; `KICKS` impact flip-shakes;
     `DOF`/`dofAt` lens blur per beat; `FOREGROUND` near framing props.
   - Every visual reaction lands 0-3 frames before its word.
5. **World**: pick an era preset (`kit/toon/build/presets.ts`) and build this story's own layout with
   `<Street preset opts>` (seed, length, curve, lamp spots, landmark, `extra` props) in `build.ts`. Keep cameras
   clear of facades and props (no culler yet).
6. **Cast**: roles, costumes, expressions and walks in `roles.ts`.
7. **Captions** on, from `words.json`.
8. **Sound** (`scripts/audio/`): lock picture timing first. Any later timing change means re-running sound.
   - Event table `videos/<slug>/audio/events.json`, every frame taken from `words.json` or a motion formula:
     `{"fps": 30, "frames": N, "events": [{"f": 206, "sfx": "splat", "note": "why"}],
     "music": {"bpm": 120, "frames": N, "button": <frame of the last word>, "stop": [f0, f1]}}`.
     Sounds: step, whoosh (centred on its frame, for dissolves), swish, splat, pat, pop, sting.
   - `python scripts/audio/sfx_gen.py videos/<slug>` -> `sfx.wav`.
   - `python scripts/audio/music.py videos/<slug>` -> `music.wav` (bed) + `button.wav`.
   - `python scripts/audio/mix.py videos/<slug>` -> `mix.wav` (48 kHz, exact length), `loudness.json` (LUFS, true
     peak, voice-vs-music gap), and `public/<slug>/mix.wav`, which `Video.tsx` mounts with `<Audio>` in Studio only.
   - Write `cues.md` (frame, time, sound, what it is synced to).
9. **Look checks**: `node scripts/stills.mjs <Comp> out/<slug>/x_ 100,400 0.5` (QA layer 1 first: every check of the
   video-qa skill on every frame of every shot; a failure stops with the shot id, frame and object); side-by-sides against
   `docs/style/frames/` (and, until the pilot is approved, frames grabbed from `assets/references/`) with
   `python scripts/sbs_sheet.py out.jpg --ours ... --ref ...`; a verifier gives a <=200-word
   verdict, scores (colour, lighting, ink, textures, characters, depth, composition) and a numbered fix list.
10. **Final render**:
    `node scripts/render.mjs <Comp> out/<slug>/video.mp4 4/3 [--concurrency 1|2]` (QA layer 1 + `out/<slug>/plan.json`, then h264 crf 16, angle; prints the total time),
    mux with `npx remotion ffmpeg -i out/<slug>/video.mp4 -i videos/<slug>/audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k out/<slug>/final.mp4`.
    QA: run the **video-qa** skill (scene checks before rendering, `scripts/video_qa.py` + `short_qa.py` +
    `measure.py` on the final, then a fresh reviewer agent). Fix everything, then a final verifier audit.
11. **Deliver**: SendUserFile `final.mp4`; 3 title options; description with "Narration: AI voice" (+ sources for
    history); add minutes per step to `videos/TIMELOG.md`; mark the topic done in `BACKLOG.md`; commit and push.

## Visual storytelling (from the R5-R7 study)
The look values below make a frame pretty; these rules make the frames tell the story. Plan them in the shot plan.
- **Cast by silhouette.** Every speaking role gets a costume that reads in pure silhouette at 120 px: a hat, a
  hairdo or a prop (helmet with plume, cap, beanie, slick hair, name-tag vest, braces, sunglasses on the head).
  "You" keeps the quiff and rust accent under any costume; the opponent or rival gets the opposite silhouette and
  colour (tall vs short, cool vs warm). Crowds of extras share one costume family so the leads pop.
- **Faces carry the jokes.** Pick the expression per word: smug half-lids, gritted-teeth grin, ring-eyed shock,
  sweat drop, colour fill. A reaction close-up after every turn in the story.
- **Words live in the world.** Signs, labels, banners, name tags, calendars, screens and placards carry text
  (a "DO NOT PUSH" sign, a "SHAKE ME!" box, a scoreboard number rolling over). Floating cards only for the
  identity stamps (DAY N, year) and effect cards. Sign faces use an unlit material (Readability traps).
- **The mechanism is the star.** When the payoff explains how something works, show it as 2-4 macro inserts, one
  per step, in the order the narration says them, and trace the path that matters with a glowing streak (a sound
  trail behind the cart, a wave running along the deck, the arc of a swing).
- **The analogy gets its own mini-set** (a park swing, a road with a hairpin): its own light and palette, a fast
  pull-out or dissolve in and a match cut back to the story.
- **Time of day follows the story**, not the clock: bright day for the setup, blue night or rain for the scheme or
  setback (warm practicals), a clean bright morning or golden light for the payoff. Change it on a dissolve.
- **Exaggerate literally.** A big number becomes a big picture: 400 heads turning at once, a cart bristling with
  212 toys, a crowd that fills the frame edge to edge (instanced extras).
- **Object POVs**: besides "your" POV, ride on the thing that matters (the cart down the ramp, the bridge deck,
  the swing). They count as the video's POV shot.
- **End on a face**: the last word lands on a close-up (smug, guilty, sly) with the payoff blurred behind it.
  When there is a rival, end on the rival's face (silenced, shocked) or the hero and rival together, with the
  payoff happening behind them.
- **Mirror the opening shot at the end** so the loop is seen as well as heard (same framing, flipped meaning:
  your zipped mouth in the cold open, Brad's zipped mouth at the end).
- **Mocker shots**: the rival or crowd laughing in a medium two-shot early; the same framing, silent, late.
- **Cross-section cut-aways** for hidden spaces (under the ground, inside a wall, inside a toy).
- **Colour encodes the physics** (rails glow hotter, a fuse burns down, a fuel gauge drops) so the viewer sees the
  plan ripening.
- **Device POV** through a circular mask (binoculars, a window slot, a telescope) for spying on the rival.
- **Rough stills before the build**: block each shot as a quick still (`scripts/stills.mjs`) and check it reads
  with the sound off: who wants what, and what just changed.

## Look values (measured from the references; tune in Phase 0, then record finals in docs/STYLE.md)
Full measurements: `docs/style/REFERENCE_NOTES.md`. The house look is the **hand-inked painted world** (references
R3/R4) with the **saturated daylight colour** of R2. No near-realistic PBR worlds.

- **Colour script**: every scene gets one strong time-of-day palette and keeps it:
  - day: cobalt sky `#2f62d8` -> pale horizon `#cfe0f5`, warm sun, fog = horizon colour.
  - golden/dusk: sky pink `#f2a6c8` -> violet `#7b6fd6` -> blue `#3f5fd8` at the top; peach rim light; violet-blue
    shadows (never brown).
  - night: deep blue ambient `#1d2a8c` -> `#3646c4`, snow/ground lit blue `#6f86e8`; warm practicals (lamps, candles,
    windows `#ffb35c`) as HDR emissives with bloom.
  - interior: warm wood and lamplight `#ffc27a`; if it is night outside, blue window light crosses the room.
  - desert/heat: orange-red rock `#e0552a`/`#f28a2f` under cobalt sky.
- **Targets** (measured): luma median .39-.51 (darker than "storybook"), non-ink p5 .08-.17 (deep but not crushed),
  lit chroma C* p90 57-68 (saturated), saturation median .50-.58.
- **Light**: key light + one practical per scene; volumetric light shafts through windows and doors (additive
  cones, 15-25 % opacity, slow drifting dust); bloom threshold 1.0, intensity .6 only on emissives; particles
  (snow, dust, embers, rain) in most outdoor shots.
- **Vignette**: corner/centre luma .85 by default, .60 at night or in dark interiors. `measure.py` checks the
  corner/centre ratio by lighting (`--light`): dusk, golden, night and interior 0.8-0.9; **day exteriors 1.1-1.4**
  (mean over the sampled frames). Sky and sunlit ground fill a day frame's corners, so the ratio stays above 1
  whatever the vignette does. Measured on `_pipeline-test` with the day grade vignette at .14.
- **Ink** (`ink.ts`): near-black brown `#1c1210`, 4 px near -> 2.5 px far at 1080x1920, on silhouettes, depth
  jumps and creases from 30 deg, including major wall/floor edges (the inked look draws them). Character cards are
  on `NOINK` and carry their own outline.
- **Paint** (`paint.ts`): visible brush strokes and grain in every fill (wood grain, plaster mottling, grass
  strokes, snow sparkle), seams painted as dark tints; never flat untextured fills on big surfaces.
- **Lens** (`dofAt`): background clearly soft in close-ups (cInf 10-14 px at 1080) and mediums (5-8 px), wides and
  establishing shots sharp (0). Focus on the speaking or reacting character's eyes.
- **Post**: ink -> lens -> bloom -> NEUTRAL tone map -> grade -> vignette; MSAA 4; film grain off.
- **Characters** (`toon.ts`/`cast.ts`/`cardshade.ts`): follow LOOK_SPEC section 1 "Characters" exactly
  (3.5 HH adults, bean heads and torsos, stroke limbs, ink-dot hands, thick-thin warm ink, lidded default eyes,
  bright tinted heads with a soft crescent, blob ground shadows, blinks and swaps on the word). Port the drawing
  code from `vendor/cartoon-3d-short/reports/characters.md` section 3, with our colours and identity.
- **Camera** (`story.ts`, measured):
  - never still: still frames <= 5 %, never a static hold >= 12 f. Every hold drifts, pushes or arcs.
  - drift speed at 1080 wide: typical 3 px/f, normal moves 10-25 px/f, fast follows up to ~60 px/f.
  - every move is a symmetric ease-in-out glide (~10 f in, ~10 f out, ~23 f total, peak 21-24 px/f at 1080);
    never a 3-frame snap. Whips (< 1 per minute) always carry strong directional motion blur.
  - push-in on ~65 % of screen time (0.2-0.6 %/f; up to 2.5 %/f on punch words), pull-out ~25 %.
  - arcs/orbits around characters with slow banking (roll 0.2-1 deg/f, max 5 deg).
  - fast moves are continuous follows (tilt down with a falling object, tilt up to reveal sky), smootherstep eased,
    with motion blur when faster than 40 px/f.
  - impact kicks: flip sign every frame, decay over 7 f.
  - a new shot every 2-5 s (R5-R7 run ~2-3 s in their builds and payoffs, R1-R4 3-5 s); foreground framing props
    in ~1/3 of shots; low angles for authority, top-down for maps and graves, POV for "you".
- **Transitions** (`XFADE`):
  - default: a 10 f crossfade between two moving shots; the caption switches on its word mid-dissolve.
  - hard cut: punch close-ups, reaction inserts, object close-ups.
  - big jump in place or era: fly-through or fast pull-out with motion-blur streaks, or a white-wash dissolve.

### Current kit values (local Phase 0 tuning; reconcile with the targets above)
- **Light presets** (`lights.ts`, sun camera-relative and frozen per shot):
  - day: az 75 / el 48, lit [1.58,1.5,1.33], shade [.30,.29,.36], lift [.05,.06,.11] (cool tint only in shade), sky
    top `#3e7fd2` -> horizon `#b8d0ec`, fog = horizon, 25->300 m, uSat 1.08, ~15 % blue haze past 60 m.
  - golden: az 6 / el 7 (backlit low sun), key toward `#FFB36B` x1.5, violet-blue shade (facade ~ `#444380`), sky
    `#ffc47c` -> `#8a6f8a`, peach fog only past 50 m, sun disc `#ffcf9e` + bloom, contact blobs + real card shadows.
  - dusk (`LIGHTS.dusk`, ToonTest): az -28 / el 30 key, lit [1.62,1.12,.74], shade [.5,.55,.8] (~45 % of lit), lift
    ~0, sky `#6468c0` -> `#c48ad2` -> horizon `#ffb39a` + painted clouds, fog = horizon past 40 m, shadow maps on,
    lamps/lit windows as HDR emissives with warm light pools (`setLamps`), drifting dust (`Dust`).
  - night (add for scenarios): moon-blue key, warm practical lights (lamps, fires, shop signs) as HDR emissives.
- **Albedos** (`paint.ts`/`build.ts`): muted, never neon. Buildings with plinth, cornice, sills, door step; warm grey/
  beige stone; wood with near-black seams; metal dark and desaturated. Never lemon, never lavender lit faces.
- **Ink** (`ink.ts`): `#1c1210`, 4 px near (6 m) -> 2.5 px far (90 m) at 1080x1920; creases from 35 deg; depth
  jumps from 1 %; same ink at every distance (no fog tint). Silhouettes, depth jumps and creases only: no lines on wall/floor joins or the
  horizon. Character cards are on `NOINK` and carry their own plum ink.
- **Colour** (`python scripts/measure.py <png|mp4>`): dusk luma .39-.51, p5 .08-.17, C* p90 57-68, mean sat .50-.58.
  Day median luma ~.57, non-ink p5 ~.23 (no crushed blacks), lit chroma C* p90 ~55. Golden shadows
  violet-blue, never brown.
- **Lens** (`dofAt`): cInf px at 1080: hook CU 15-16, close-ups 12-14, mediums 10-12, wides/aerials 0. Focus on the
  eyes of the front character. DOF on about 1/3 of screen time.
- **Post** (`Composer.tsx`, `POST`): background DOF 6.5 px past 45 m, grade sat 1.22, vignette .85; bloom threshold 1.0, intensity .5, 6 levels, radius .6 (HDR emissives only); NEUTRAL tone map; grade last.
  Film grain off.
- **Characters**: head 40 % of height; mitten hands; ink constant on screen (8 px mediums, 14 px cap) and
  thicker on the shadow side; poses from `POSES` + any expression; 4-frame squash on reactions; walk bob 3-7 %, lean 1-7 deg, planted 0.8 m stride; blinks every 0.5-2.3 s lasting 4 f;
  tight contact shadow under the feet + sun-direction tail by day; golden rim light inner only, head/torso only.
- **Camera** (`kit/toon/camera.ts`: drift, pushIn, pullOut, arc, followTilt, reveal): hard cuts on big jumps;
  everything else a glide (peak <= 25 px/f, typical ~3 px/f, no still run of 12+ f; check with measure.py);
  every hold creeps in 0.15-0.35 %/f (0.6 %/f on punch words), never a static hold >= 4 f; rolls 4-5 deg; impact
  shakes flip sign every frame and decay over 7 f; foreground props in ~1/3 of shots.

## Polish loop (Phase 0, or when a video's scores stay low)
Heavy on time and tokens: use it for the kit, not for every video.
1. **Targets**: the numbers above, `docs/style/REFERENCE_NOTES.md` and `docs/STYLE.md` are the source of truth for
   every agent. To re-measure our own render the same way, run `python scripts/measure.py out/<slug>/final.mp4`
   (camera motion, still frames, colour, vignette, caption rate) and compare with REFERENCE_NOTES.
2. **Sandboxes, one owner per file area**: copy the video folder to `src/videos/<slug>_{cam,world,mat,char,post}`
   with entries `src/sandboxes/<n>/index.tsx`. Owners: cam = story.ts; world = world/lights/shade/grade;
   mat = paint/build; char = toon/cast/cardshade/protagonist; post = ink/Composer/lensblur. Agents edit only their own
   files and render stills from their sandbox entry.
3. **Merge** owned files back to main (back up first to `backup/<slug>_<time>/`), run `npx tsc --noEmit`, then
   re-sync every sandbox from main before the next round.
4. **Verify** with a fresh verifier: side-by-side sheets vs `docs/style/frames/`, scores per area, numbered fixes with
   frame numbers; send each fix to its owner (SendMessage keeps the agent's context).
5. Contracts between owners are exported constants (`NOINK`, `dofAt`, `FOREGROUND`, `LIGHTS`, `LOOK`). Changing one
   means telling every owner that reads it.

## Gotchas
- **Disk**: every Remotion bundle copies `public/` into `%TEMP%\remotion-webpack-bundle-*` and never deletes it. Set
  `$env:TEMP`/`$env:TMP` to `C:\remotion-tmp` (or a bigger drive) before rendering, keep `public/` small, and when
  nothing is rendering delete old `remotion-webpack-bundle-*` and `puppeteer_dev_chrome_profile-*` folders there
  (ask the user first).
- In JS strings write `"C:/remotion-tmp"`, never `"C:\remotion-tmp"` (`\r` becomes a carriage return).
- Kenney nature-kit materials come out teal: recolour them by material name in `build.ts`.
- Cameras end up inside buildings: the sight-line culler removes anything blocking any camera ray.
- Ink in the same pass as DOF gets overwritten: ink is its own pass before the blur.
- Pixel-sized post parameters must scale with output height / 1920 (stills render at 0.5, finals at 1.333).
- Remotion writes a silent audio track: always mux with `-map 0:v:0 -map 1:a:0`.
- Sub-agents may not be able to write files: ask for a <=150-word final message and save it yourself to
  `out/<slug>/<n>/REPORT.md`.
- Scratch `.ts` files inside `out/` break `tsc`: name them `.txt`.
- Measure render speed on this laptop (stills, 1080 final, 2K final) during the pilot and record it in `docs/STYLE.md`.
- 4 GB VRAM: if a render crashes or goes black, lower `--concurrency` to 1 before changing anything else.

## Readability traps (check every new prop and shot)
- A swing with one rope that disappears behind the character reads as a hanging: two ropes, wide plank, clear frame.
- Props closer than ~2 m to the lens become huge cut-off blobs; re-check props whenever a camera moves.
- A foreground object cut by the frame edge must still be recognisable, or remove it.
- Flags and symbols must be period- and place-correct, and must not accidentally match another country's flag.
- Painted signs lit from the side go grey and unreadable: give sign faces an unlit material.
- Rim light as an offset outer copy turns hats into picture frames: inner rim only.
- Railings at chest height cut through characters: raise the lens so rails cross legs, not torsos.
- Flat holds read as freezes in QA (frozen span >= 12 f): every hold needs a creeping push-in.
- A dissolve between two static shots looks like a slideshow: both sides of every crossfade must be moving.
- A caption over a face or a gag kills the joke: reframe so the action sits above y = 0.62 H or below 0.78 H.
- Anything that could read as graphic violence: cut away to a reaction or a sound instead.
