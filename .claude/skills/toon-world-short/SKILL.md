---
name: toon-world-short
description: Make a Stickrified vertical Short (61-90 s) in the "2D stickman cartoon characters in a painted 3D world" style - flat bean-head stickman cards with plum ink outlines, ink-lined painted 3D world, saturated sky, depth-of-field, gliding cameras, second-person ElevenLabs narration, synthesized SFX and an original score - rendered with three.js inside Remotion. Use for any new Stickrified video, "make the next short", a what-if scenario or strange-true-history short, building the toon kit, or "use the toon world skill".
---

# Toon-world short (three.js + Remotion)

Stickrified Shorts: flat 2D stickman cartoon **cards** (characters) living in a **painted 3D world** with black ink lines.
Two pillars, both narrated in **second person ("you")**:
- **Scenario**: "What if you were trapped in a supermarket for 30 days during a zombie apocalypse?"
- **Strange true history**: "You're one of 74 soldiers about to knock down an iron bridge just by walking across it."

Everything (story, characters, world, music) is our own. There is no outside reference channel: the style is defined
by the numbers in this file plus `docs/STYLE.md` and the approved frames in `docs/style/frames/`.

## House rules
- English only. Narration in second person. One narrator voice (ElevenLabs Eleven v4, same voice ID every video),
  steady delivery; audio tags only on beats (`[deadpan]`, `[whispers]`, `[nervous]`), at most one per two lines.
- Surprising lines and jokes are researched real facts (history) or real-world logic (scenarios).
- Captions: word-by-word, 1-3 words on screen, chunky rounded bold font, cream fill `#fff3df`, plum outline `#241726`,
  lower-middle third, never over a face. Timed from `words.json`.
- Mix: music +3 dB, SFX -6 dB, voice unchanged; master to -14 LUFS integrated, true peak -1 dBTP.
- Final export 2K vertical 1440x2560 (`--scale 1.3333`). If a final render on the laptop takes more than 30 min,
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
templates/base/    clean copy of a finished video folder to start new ones from (made after the pilot)
scripts/           stills.mjs, sbs_sheet.py, short_qa.py, tts.ts, audio/ (timeline.py sfx_gen.py music.py mix.py ...)
docs/STYLE.md      our style bible: the look values below + approved frames in docs/style/frames/
videos/BACKLOG.md  topic backlog (20+), videos/TIMELOG.md minutes per step per video
```

## Phase 0: build the kit (once, weeks 1-2)
Build in this order, commit after each, and get a verifier pass on stills before moving on:
1. **World**: `world.ts` sky shader, fog = horizon colour; `lights.ts` day + golden presets; `shade.ts` two-tone shading.
2. **Ink**: `ink.ts` outline pass (its own pass, before any blur), `NOINK` layer for character cards.
3. **Materials**: `paint.ts` Canvas2D painted textures with seams painted in as dark tints; Kenney CC0 props recoloured
   (record each in `assets/CREDITS.md`).
4. **Characters**: `toon.ts` Pen API (600x1000 design canvas, soles at y = 975), bean heads, stick limbs, plum
   variable-width outline, face library (14 expressions); `protagonist.ts` (spec below).
5. **Cast**: `cast.ts` camera-facing billboards, walk cycles, blinks, crowds, effect cards; `cardshade.ts` card lighting.
6. **Post**: `Composer.tsx` ink -> lens pre -> lens main -> bloom -> NEUTRAL tone map -> grade, MSAA 4.
7. **Captions**: `Captions.tsx` from `words.json`.
8. **Scripts**: `tts.ts` (ElevenLabs with-timestamps -> voice.wav + words.json), audio scripts, `stills.mjs`,
   `sbs_sheet.py`, `short_qa.py`.
9. **Pilot Short** through the full pipeline, then copy its folder to `templates/base/`, save the best frames to
   `docs/style/frames/` and write `docs/STYLE.md` with the final values and measured render speed.

## The protagonist ("you")
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
2. **Script.** 61-90 s at ~3.7 words/s = 225-330 words. Write `SCRIPT.md` and `script.json` (each line: `narration`,
   `audioTag`, `scene`, `camera`, `onScreenText`). The user edits; once approved, "just do it".
   - **Scenario formula:** Hook (premise + stakes in one line) -> time markers ("Day 3...") escalating over 4-6 beats
     -> Snap (the worst moment) -> deadpan double "Luckily... / Unluckily..." -> Turn (the real-world fact that saves
     or dooms you) -> Callback ending that loops into the hook.
   - **History formula:** Hook (the absurd fact, in "you") -> Setting (year, place, pride) -> Action escalating over
     3-4 beats -> Snap -> deadpan double -> Explanation (one idea through an everyday analogy) -> Consequence (the
     rule or change it caused) -> Callback twist that loops.
   - Never describe on screen what the viewer already sees.
3. **Voice.** `npx tsx scripts/tts.ts videos/<slug>` -> `voice/voice.wav` + `voice/words.json` (character
   alignment converted to word times). Hand-check the word times; everything is timed to `words.json`.
4. **Shot plan** in `src/videos/<slug>/story.ts` (copy `templates/base/`, register the composition in
   `src/Root.tsx`):
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
8. **Sound** (`scripts/audio/`): lock picture timing first. Event table -> synthesized SFX + original score ducked
   under the voice -> `mix.wav` (48 kHz, exact length), stems, `cues.md`. Any later timing change means re-running sound.
9. **Look checks**: `node scripts/stills.mjs out/<slug>/x_ 100,400 0.5`; side-by-sides against
   `docs/style/frames/` with `python scripts/sbs_sheet.py out.jpg --ours ... --ref ...`; a verifier gives a <=200-word
   verdict, scores (colour, lighting, ink, textures, characters, depth, composition) and a numbered fix list.
10. **Final render**:
    `npx remotion render src/index.ts <Comp> out/<slug>/video.mp4 --codec h264 --crf 16 --scale 1.3333 --gl=angle --concurrency=2`,
    mux with `npx remotion ffmpeg -i out/<slug>/video.mp4 -i videos/<slug>/audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k out/<slug>/final.mp4`.
    QA: `python scripts/short_qa.py out/<slug>/final.mp4 out/<slug>/qa shots.json` (black, white, frozen, pop frames,
    loudness). Fix, then a final verifier audit.
11. **Deliver**: SendUserFile `final.mp4`; 3 title options; description with "Narration: AI voice" (+ sources for
    history); add minutes per step to `videos/TIMELOG.md`; mark the topic done in `BACKLOG.md`; commit and push.

## Look values (starting targets; tune during Phase 0, then record finals in docs/STYLE.md)
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
1. **Targets**: the numbers above and `docs/STYLE.md` are the source of truth for every agent.
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
- Anything that could read as graphic violence: cut away to a reaction or a sound instead.
