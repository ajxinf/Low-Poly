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
