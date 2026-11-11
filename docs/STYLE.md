# Stickrified style bible

Flat 2D cartoon cards in a painted, ink-lined 3D world. The numbers below are the kit defaults; code is the source
of truth (`kit/toon/*`), this file records what was approved and why. Approved frames live in `docs/style/frames/`.

## Approved frames
| Frame | What it locks |
|---|---|
| `frames/street_dusk.png` | ToonTest frame 30 (2026-11-11): dusk light, cast shadows, paint, ink, post |

## Colour targets (`python scripts/measure.py <png|mp4>`)
| Metric | Dusk target | street_dusk.png | ToonTest video |
|---|---|---|---|
| median luma | .39-.51 | .449 | .445 |
| p5 luma (non-ink) | .08-.17 | .124 | .119 |
| C* p90 | 57-68 | 58.8 | 59.2 |
| mean HSV sat | .50-.58 | .520 | .528 |
| vignette (corner/centre) | ~.85 | 1.02 | 1.00 |

Vignette is applied at .85 in the grade; the measured ratio depends on what sits in the corners (lamps read high).

## Light: `LIGHTS.dusk` (`kit/toon/lights.ts`)
- Key: az -28 / el 30 (ahead-left of the opening camera), lit `[1.62, 1.12, 0.74]` (warm).
- Shade: `[0.5, 0.55, 0.8]`, cool, ~45 % of lit luma. Hard terminator (smoothstep +-.03). Lift `[.01, .01, .03]`.
- Real cast shadows: 4096 shadow map, PCF, area set per shot (`ToonWorld shadow={{center, size}}`).
- Sky: `#6468c0` top -> `#c48ad2` mid -> `#ffb39a` horizon, sun glow `#ffb27a` x.9, painted clouds
  (lit `#ffa58f`, shade `#9070b8`, cover .68).
- Fog = horizon colour, 40 -> 260 m. No haze.
- Practicals: lamp glass emissive `#ffb35a` x6, lit windows `#ffb76a` x2.6, shop fronts x2.2. Light pools
  `#ffa245` x2.4, radius 6.5 m, up to 12 (`setLamps`).
- Keep the sun-side buildings low (2-3 floors) or leave alleys, or a narrow street ends up fully shaded.

## Paint (`kit/toon/paint.ts`)
Seeded Canvas2D, 2 m tiles (1 m for props), world-metre box mapping in `props.ts`. Every surface: base fill,
broad strokes, fine strokes, grain, seams as dark tints. Albedos used in ToonTest: cobbles `#c09078`, slabs
`#c4a283`, plaster `#c98f6a #d8b07a #9fae8e #8a9fbc #dcc4a0 #b97a84 #c2a26a`, bricks `#9a5a44 #8a4e4a`,
roofs `#a4503a #7a4a5c #5a4a6a #8a5a3a #9a4a40`.

## Ink (`kit/toon/ink.ts`)
`#1c1210`, 4 px at 6 m -> 2.5 px at 90 m (at 1080x1920). Creases from 35 deg, depth jumps from 1 %, fog tint .3.
Silhouettes, depth jumps and major edges only. Character cards are on `NOINK` and carry their own outline.

## Post (`kit/toon/Composer.tsx`, `POST`)
ink -> lens blur -> bloom -> NEUTRAL tone map -> grade.
- Lens blur (background): 0 px before 14 m, 6.5 px past 45 m; overridden per shot with `<Composer dof>`.
- Bloom: threshold 1.0, intensity .5, 6 levels, radius .6 (HDR emissives only).
- Grade: sat 1.22, contrast 1.06, lift .035, warm split .02, vignette .85.

## Composition (street shots)
Narrow street (11 m between fronts) that bends or ends in a landmark within ~60 m. Lens 1.2 m high, offset to one
side, fov 60. Foreground props 3.5-6 m from the lens, cut by the frame edge (frame half-width ~ .32 x distance).

## Render speed (this laptop)
ToonTest, 150 frames at 1080x1920, `--concurrency=2`: ~30 s.

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
