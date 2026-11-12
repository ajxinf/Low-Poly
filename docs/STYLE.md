# Stickrified style bible

Flat 2D cartoon cards in a painted, ink-lined 3D world. The numbers below are the kit defaults; code is the source
of truth (`kit/toon/*`), this file records what was approved and why. Approved frames live in `docs/style/frames/`.

## Approved frames
| Frame | What it locks |
|---|---|
| `frames/street_dusk.png` | ToonTest frame 30 (2026-11-11): dusk light, cast shadows, paint, ink, post (predates the world library) |

## Colour and motion targets (`python scripts/measure.py <png|mp4>`)
| Metric | Dusk target | StreetWide | StreetMedium | ToonTest move (5 s) |
|---|---|---|---|---|
| median luma | .39-.51 | .483 | .437 | .429 |
| p5 luma (non-ink) | .08-.17 | .177 | .136 | .190 |
| C* p90 | 57-68 | 63.5 | 73.0 | 60.0 |
| mean HSV sat | .50-.58 | .523 | .587 | .461 |
| drift p50 (px/f at 1080) | >= 2.5 | | | 2.58 |
| drift p95 | <= 25 | | | 4.1 |
| still frames (< .5 px/f) | <= 5 % | | | 0 % |
| longest still run | < 12 f | | | 0 |

Colour depends on content: road-heavy frames read flatter (the 1.6x lit cap and aerial haze), orange-heavy mediums
read hotter. The grade (sat 1.28) is the compromise. Vignette (graded .85) is a trend only.
Motion is block phase correlation on every frame; flat blocks (clear sky) are skipped.

## Camera (`kit/toon/camera.ts`)
`shot(base, [moves], frames)` with moves `drift`, `pushIn`, `pullOut`, `arc`, `followTilt`, `reveal`, `roll`.
Easing `glide` = .55 smootherstep + .45 linear: the ends creep at ~45 % of the average speed (no still holds), the
peak is ~1.5x. Rolls clamp to 5 deg.
- To drift ~3 px/f, turn the view: arc around a subject 10-15 m away (18 deg over 5 s from mid-street). Pushing down
  a street barely moves a view that is mostly far away.
- Never pass within ~2 m of a prop (it sweeps across the frame at 30-60 px/f) and keep arcs clear of facades (from
  the pavement, a 6 deg arc around a far point put the lens inside a shop front).

## Light (`kit/toon/lights.ts`, `kit/toon/shade.ts`)
- Presets: day, golden, dusk, night (moon-blue), interior. Key az/el per preset; the sun is frozen per shot.
- Sunlit vs shade: lit luma at most 1.6x shade (both pulled toward their geometric mean), lit hue pulled 75 % toward
  the preset's `litTint` (dusk `#ffd4bc` peach). Hard terminator; cast-shadow edges are PCF-soft (~2-4 px at 10-25 m).
- Practicals are real three PointLights (`practicalLights`): lamps reach 4.4 m (ground pool ~3.5 m wide under a
  3.55 m lantern), shop fronts 3.6 m, lit windows 3 m, fires 4 m; plateau-then-edge falloff, colour/strength from the
  preset `lamp`. They light walls, ground and character cards (with a thin warm card rim). Max 24 per street, nearest
  the shot first.
- Aerial perspective (`haze`): from 30 m, desaturate and mix toward the horizon colour, up to 35 % at 90 m (dusk).
- Fog = horizon colour, 40 -> 260 m (dusk).

## Ground (`kit/toon/build/ground.ts`)
One rule set for cobbles, slabs, planks, dirt, snow (cart tracks + footprints), tiles, asphalt, grass: pieces 0.7-1.3x,
`contrast` .5 (half the old cobbles), joints lighter than before (never near-black). The street adds a worn smoother
path down the middle (`wear`), sky-reflecting puddles (mostly wet-ground tone, sky at grazing angles), loose stones
and scraps along curbs and wall bases.

## Ink (`kit/toon/ink.ts`)
`#1c1210`, 4 px at 6 m -> 2.5 px at 90 m (at 1080x1920), the same on every mesh at every distance (no fog tint;
lines only fade where fog fully hides the surface). Creases from 35 deg, depth jumps from 1 %. No silhouettes
against the sky past 150 m (keeps the horizon line-free). Character cards are on `NOINK` and carry their own outline.

## Post (`kit/toon/Composer.tsx`, `POST`)
ink -> lens blur -> bloom -> NEUTRAL tone map -> grade.
- Lens blur: none by default (wides and establishing shots stay sharp). Close-ups and mediums pass
  `DOF.closeup(d)` / `DOF.medium(d)` (focus distance d m).
- Bloom: threshold 1.0, intensity .5, 6 levels, radius .6 (HDR emissives only).
- Grade: sat 1.28, contrast 1.06, lift .02, black point .07 (p5 .165 wide / .168 move; the 1.6x lit cap is
  untouched), warm split .02, vignette .85. Content still moves p5: orange-heavy mediums sit near .14.

## QA layer 1 guard (`kit/toon/guard.tsx`, video-qa skill)
Each video describes its shots as data (`Shot`: id, from, frames, pose, cast, subject, scene, light, sun, whips/kicks,
allow) and draws from the same functions. `<QAPlan plan>` at the composition root checks the camera curve, subject in
frame, caption vs face, reaction timing and light continuity for every frame of every shot and publishes the plan;
`<ShotCamera {...shot}>` (one per shot, inside its own Sequence) checks camera clearance (0.3 m from every collider
part and card), feet, card penetration, props through props and shadows against the built scene. Colliders are tagged
`userData.collider`; Kit meshes keep each part's box (`userData.parts`) so awnings don't fill the pavement; parts of
one structure that meet on purpose carry the same `userData.joins` (terraced rows, a building's walls). A failure
throws, so `scripts/stills.mjs` and `scripts/render.mjs` stop; both run `guardPass` first (tiny stills at frame 0 and
each shot start, inputProps `qa: "collect"`), which writes `out/<slug>/layer1.md` and `out/<slug>/plan.json`.

## Supermarket (`kit/toon/build/supermarket.ts`, presets `supermarket_interior` / `supermarket_abandoned`)
- Lit: fluorescent strips slightly green-white (`#e6fff0`) with real lights; walls and floor warm off-white
  `#e8dcc4` with grime (kick band, trolley scuffs, drips, scuffed tiles); analytic glossy reflections of the strips
  in the floor plus darker corners (one colour-only overlay); 24 m aisles of instanced products (boxes, cans, bottles,
  10 blocky label palettes), price tags, shelf-edge strips, hanging aisle signs, a few half-empty bays, fallen items;
  checkouts, produce crates, department signs; exit sign glowing green over the entrance.
- Abandoned night: power off (the shell casts shadows so moonlight only enters through the shop windows), moonlit
  glass with the street outside, one flickering strip (deterministic `flicker(f)`), barricaded doors, half-empty
  shelves, more fallen stock and litter. Light `moonInterior` (litMax 8: a dark store needs more than 1.6x).

## World library (`kit/toon/build/`)
- `building(spec)`: floors, width, wall (brick, plaster, clapboard, stone, planks), roof (gable, gableFront, hip, flat,
  falseFront, steep; snow caps), lean +-1.5 deg, roofline irregularity (cornice height, pitch, dormers, stepped
  parapets), windows (sash, shutters, flower boxes, boarded, broken; lit with curtains or a silhouette, or dark),
  shop fronts (painted sign, striped awning), chimneys with smoke, drainpipes, posters, porches.
- Every building in a street differs from every other in >= 3 of 13 parameters (`pickVaried`, self-test:
  `node kit/toon/build/variety.test.mjs`).
- Props: lamp post, bench, barrel, crate, cart, signpost, bollard, fence, washing line, birds (on roof perches),
  flags, campfire, hay bale, trough, pine, mailbox, hedge, car, bin, shelves, checkout, aisle signs, clock tower.
- `buildStreet(preset, light, opts)` / `<Street>`: spine, ground, varied buildings (terrace or detached), closing row
  or clock-tower square, lamps, props, practicals, puddles, debris, washing lines, birds, flags, smoke, a distant
  backdrop (hills, mesas or snowy mountains). Interiors (supermarket) get their own builder.
- Presets (`PRESETS`): victorian_town (dusk), wild_west (golden), modern_suburb (day), supermarket_interior
  (interior), snowy_village (night). Each video picks a preset and its own seed, length, curve, lamp spots and extras.

## Composition (street shots)
Narrow street (11 m between fronts) that bends or ends in a landmark or closing row within ~60 m. Lens 1.2-1.7 m
high, fov 56-60. Foreground props 3.5-6 m from the lens, cut by the frame edge (frame half-width ~ .32 x distance).

## Render speed (this laptop)
ToonTest (library street, 24 practical lights), 150 frames at 1080x1920, `--concurrency=2`: ~40 s.

## Characters (`kit/toon/`: toon.ts figure.ts face.ts poses.ts protagonist.ts extras.ts cast.ts cardshade.ts)
Review renders: ExpressionSheet, CastLineup (9:16 medium-wide, 4 characters, frame 10), CloseUp (9:16, frame 10);
side-by-side with the references in `out/char/sbs_refs2.jpg`. Old approved frames in `frames/` predate the redesign.
- Design canvas 600x1000, drawn at 2x (1200x2000) with mipmaps + anisotropy 8; soles at y 975, 500 px = 1 m.
  Proportions per `Build`: protagonist 840 px tall, head .40 (h/w .98), pear torso .30, short stick legs with a
  slight knee, small shoes. Arms are 2-bone sticks; mitten hands with a thumb (mitt / fist / open / point).
- Outline: one near-black ink (`#1d1416`) on every part (head, body, hands, hats, shoes) and on the stick limbs, at
  the same width. Constant on screen and the same for every character on a shot: `inkPx` of the protagonist's head
  height at that distance = 8 px in a medium, 14 px cap in close-ups, min 3 px in wides; ~35 % thicker on the side
  away from the key. An ink mask keeps ink near-black under any light. Dark skin (`isDark`) and `darkClothes` get a
  thin warm band (`#c9875a`) inside the outline.
- Face: eyes .24 head widths apart, 45 % down. Ink dots by default (lids for tired/smug/angry...), ring eyes only
  for shocked and scared. Extras: dots, sleepy half-lids (`eyes: "sleepy"`), dots behind glasses. Thick wedge brows
  do the acting; big mouths.
- Poses (`POSES`, combine with any expression): idle, hips, crossed, point, shrug, chin, facepalm, panic, lean,
  hold (props), walk, run. `reactSquash(f)`: 4-frame squash/stretch, 8 %.
- Card light (`CARD_LOOK`): key tint at .6 (lit luma capped 1.02). A soft shade band ~25 % of each part's width on
  the side away from the key (redrawn from the key direction, quantised to 6 deg); shade = lit x ambient tint x .52
  (linear, ~30 % darker on screen). If the street shadow falls on the character (shadow map probed at chest and
  knees) the whole card goes to shade. Thin warm inner rim on edges facing a lamp (.6).
- Grounding: contact shadow .55 x .3 m at .85 (tight); real sun shadow (an invisible sun-facing copy of the card on
  the `CASTER` layer, alpha-tested into the key's shadow map); lamp decal shadow .55 fading over the lamp radius.
- Cast (`EXTRAS`): tall thin + bowler, short round + flat cap, old (stoop) + moustache, child + glasses, pear + bun,
  stocky + nightcap.
- Framing: camera on the wall side of the character so the street is behind them. Close-up = head and shoulders at
  ~2.2 m, fov 36, look at 1.36 m.

## CharacterTest numbers (`out/char/charactertest.mp4`)
luma .471, p5 .170, C* p90 67.0, sat .620 (above .58: sunlit orange cobbles fill much of the frame). 240 frames at
1080x1920, `--concurrency=2`: ~57 s.

## Narrator voice (Eleven v4)
- Voice ID: `zfc8CJQpe8Kqyl0vvCzo` (production narrator, every video). Model `eleven_v4`.
- Settings: Stability 0.3, Similarity 0.75 (0.5 sounded flat; 0.3 approved 2026-11-12). Lock after the pilot.
- Measured rate: ~3.1 words/s (96 words in 31 s), so scripts are 200-270 words.
- Delivery: fast, energetic storyteller; deadpan only on single punchlines (see the `stickrified-script` skill).
