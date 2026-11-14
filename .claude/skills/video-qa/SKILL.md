---
name: video-qa
description: Find visual defects in a Stickrified short before it ships - camera or characters clipping through floors, walls and props, floating or sinking feet, jerky or snapping camera moves, unplanned shakes, flicker, lighting that jumps inside a shot, crushed blacks, clipped whites, captions over faces, reactions off the word. Use after look changes, before every final render, on any rendered video, or when the user says "QA", "check the video", "find defects" or "check for clipping".
---

# Video QA (three layers)

This is also module 1 (Technical QA) of the `video-review` skill, which adds the audience critics on top.

Run all three layers before every final render, and layer 2 again on the final mp4. Fix everything flagged, or
mark it as intended in the plan, then re-run. Report results to the user as a short table: layer, check, result.

## Layer 1: scene checks, before rendering (exact, no noise)
Read the scene graph and the shot plan directly: `kit/toon/guard.tsx`, run by `scripts/stills.mjs` and
`scripts/render.mjs` (`guardPass`), every frame of every shot. A failure names the shot id, frame and object.
- Describe each shot as a `Shot` (id, from, frames, pose, cast with `at`/`state`, subject, scene, light, sun,
  whips/kicks/flash) and draw the cast from the same functions. Mount `<QAPlan plan={{ slug, shots, words }} />` at the
  composition root and `<ShotCamera {...shot} />` in each shot's canvas (one Sequence per shot).
- Mark intended exceptions with `allow: { "<Check>": "why" }` on the shot, or `userData.joins` on scene objects
  built to meet (terraced rows, a building's walls; up to 35 cm). Intended items are listed, not failed.
- **Every story prop that moves or appears goes in `Shot.moving`** (`MovingProp`: `make`, `pose(obj, f)`, `touches`,
  `heldBy`), from the same definitions the render mounts (one `props.ts` per video). Split a prop whose parts have
  different contact rules (roller head may touch the roof; the pole may touch only the holder's hand).
- **Tag every door** with `userData.door = height` (m) on its collider, so "Scale" can check people against it.
- `node scripts/stills.mjs ... --draft` renders look stills while layer 1 still fails (prints every failure);
  final renders always keep the hard gate.
- Results: `out/<slug>/layer1.md` (table + every failure) and `out/<slug>/plan.json`.

| Check | Rule |
|---|---|
| Camera clearance | lens >= 0.3 m from every building, prop and character card; never inside a box (exists) |
| Feet on the ground | each standing character's sole within +-2 cm of the ground height under it (no floating, no sinking); sitting characters touch their seat |
| Card penetration | a character card's footprint (width x 0.3 m) never overlaps walls, shelves or props; two cards never closer than 0.25 m in depth when they overlap on screen (z-fighting) |
| Props through props | no two prop boxes intersect at setup (beyond 1 cm), nothing floats above its support by > 2 cm |
| Camera curve | from the camera keys, per frame: screen speed of the look point <= 25 px/f at 1080 outside planned whips; acceleration <= 20 px/f per frame; zoom change <= 2.2 %/f per frame; no 3-frame snaps; every hold creeps (no run >= 12 f where the median motion of what rays through `measure.py`'s 7x4 block centres hit is < 0.5 px/f) |
| Subject in frame | the speaking/reacting character's head fully inside the frame and inside the 0.08-0.92 horizontal safe area (from the shot's `subjectFrom` frame, if it enters later) |
| Caption vs face | while a caption is visible, no character head box overlaps the caption band (y 0.64-0.76 H) |
| Caption width | every caption group fits in 2 lines inside 0.84 W (the captions wrap there), and no single word is wider than 0.84 W |
| Reaction timing | expression swaps and gag effects land 0-3 frames before their word in `words.json` |
| Light continuity | all shots marked with the same scene/time-of-day use the same light preset, sun direction within 10 deg, exposure within 5 % |
| Shadows | sun shadows enabled in day/golden presets; every character has a contact blob |
| Moving props | every frame, each `Shot.moving` prop vs every collider part and every character card; `touches` names allowed contacts, `heldBy` lets the holder's body touch it but never the holder's head (a pole through a hat). Found in `_pipeline-test-2`: poles through roofs and heads, rays through a house |
| Scale | nobody within 3 m of a tagged door is taller than the door minus 10 cm (head top, + 18 cm for a brimmed hat). Found: a 1.88 m neighbour by a 1.30 m shed door |

Export the plan for layer 2 at the same time: `out/<slug>/plan.json` with
`{"cuts": [...], "xfade": [[a,b], ...], "flash": [[a,b]], "kicks": [[a,b], ...], "whips": [[a,b], ...]}`.

## Layer 2: pixel checks, after rendering
1. `python scripts/video_qa.py out/<slug>/final.mp4 out/<slug>/plan.json`: POP (unplanned cut), FROZEN, SNAP,
   JERK, SHAKE, FLICKER, LIGHTJUMP, CRUSH, CLIP, EDGEPOP. Writes `out/qa/<name>/report.md`, `flags.json` and a
   before/flag/after strip per flag. Thresholds are calibrated on 4 correct reference shorts (just above their
   p99.5), so a clean video should give almost no flags. Without a plan it skips transitions and reports them as info.
2. `python vendor/cartoon-3d-short/templates/scripts/short_qa.py out/<slug>/final.mp4 out/<slug>/qa out/<slug>/shots.json`
   (`shots.json`, not `plan.json`: `guardPass` writes it in short_qa's own format):
   specs, loudness, silences, black/white/frozen frames, 2 s contact sheets.
3. `python scripts/measure.py out/<slug>/final.mp4 --light <day|dusk|golden|night|interior>`: colour numbers
   against LOOK_SPEC (vignette range by lighting) and camera motion numbers.
   - **The camera-motion numbers are reference only.** Whether the camera moves is decided by layer 1 "Camera
     curve", which works from the scene geometry.
   - Optical flow under-reads flat sky, blurred backgrounds and far objects during push-ins. `measure.py` skips
     untextured blocks and frames with fewer than 8 trackable blocks.
   - A "low (info)" still run that layer 1 passes is not a defect.

## Layer 3: eyes on exact frames, never on playback
1. `python scripts/frames.py out/<slug>/final.mp4 out/<slug>/shots.json videos/<slug>` decodes every frame (exact
   index, no seek rounding) into `qa/frames/`: per-shot sheets of every 2nd frame labelled `f123  S3  word`, full-size
   key frames (shot first/last, dissolve middles, every word start, every sound cue) and `INDEX.md` with a checklist.
2. Read **every** sheet and tick every tile: clipping, scale, contact, background, faces on the word, light. Note
   problems by frame number, then open the key frame at full size to confirm. Any clip found here that layer 1
   missed means a missing `moving` prop, collider or door tag: add it, so the guard catches it next time.
3. A fresh reviewer (when the user asks for sub-agents) gets the same sheets and key frames, layer 2's flag strips
   and `docs/style/LOOK_SPEC.md`, and answers in <= 200 words plus a numbered list with frame numbers, checking:
- clipping or intersections the boxes missed (hands through tables, hats through ceilings, props through hands);
- floating or sliding characters, feet skating during walks;
- lighting that does not match between neighbouring shots, characters lit differently from the world around them;
- unreadable silhouettes, props cut by the frame edge, foreground blobs, the readability traps in the toon skill;
- anything that looks broken: missing textures, black or pink materials, z-fighting stripes, shadow acne, popping LODs;
- caption problems: over faces or gags, wrong word, out of sync;
- empty backgrounds: every wide needs sky detail (clouds), a horizon (hills/trees) and set dressing in the yard or
  street; a frame of bare sky and flat grass is a defect;
- characters that look generic: every speaking role needs its signature pattern and accessory (toon skill).

## Done when
Layer 1 passes, layer 2 has no unexplained flags, layer 3 lists nothing above "minor". Write the result into
`out/<slug>/QA.md` and include the one-line verdict in the delivery message.
