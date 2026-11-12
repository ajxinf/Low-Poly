# Stickrified look spec (read this before any look work)

Two layers:
1. **Craft parity**: measured numbers that make the picture look professional. Taken from the MIT-licensed study in
   `vendor/cartoon-3d-short/reports/` (20 reference shorts) and our own study in `docs/style/REFERENCE_NOTES.md`
   (4 shorts). Where they disagree, the 20-video number wins unless noted.
2. **Stickrified identity**: things we deliberately do differently, so we do not look like every other channel
   built from the same skill. Never trade identity away to hit a number.

For code recipes (ink pass, lens blur, two-tone shading, grade, card shading, face library), read the matching
section of the vendored report and port it into `kit/toon/`; do not copy their characters, props or shots.

---

## 1. Craft parity (adopted numbers)

### Characters (`vendor/.../reports/characters.md` sections 1-2)
- **Proportions**: adults **3.5 head-heights** (head 1 : chin-to-torso-bottom 1.1 : legs 1.4); stout 3.47; kids 2.85.
  Our current medium shows ~2.2 HH (head ~45 % of the height): the main reason it reads "meme stick figure".
- **Head**: not a circle. Superellipse bean, H/W 0.94, crown exponent 1.75 (slightly pointed), jaw 2.3 (fuller),
  egg -0.12 (narrower chin), 8 % bulge to the facing side, tilt +-4 deg, 0.8 % soft noise, per-character seed.
- **Torso**: bean, 0.80 W wide, widest at 60-70 % of its height, fully round bottom, top hidden under the head.
- **Limbs**: single ink-ish strokes, legs 0.058 W, arms 0.052 W, coloured `mix(cloth, INK, .5)`; hands are ink
  dots 0.11 W; feet short strokes 0.16 W long pointing outward. No ball hands, no boot ovals.
- **Outline**: 5 % W, thick-thin `w0 * (1 + 0.45 cos(theta - thick))`, thickest away from the light and toward
  the ground (~64 deg for upper-left light). Inner lines (brows, mouth) 0.6-0.9x, clothing seams 0.4x.
- **Face**: eyes 0.26 W apart on the centre line, features slid 0.07-0.08 W toward the facing side. Default eye is
  a **lidded half-disc** (deadpan), not a dot. Shock eyes are white circles 0.22 W almost touching. Brows tapered,
  0.17 W long, 0.05 W thick, at -0.20 W. Mouth small, at +0.20 W. **No blush, no catchlights.**
- **Shading on cards**: heads stay bright (V >= .86, median .97) in every light and take the light colour as a
  tint; soft crescent on the far side (x0.88-0.89, lavender on pale heads); top slightly brighter; torso gradient
  1.0 -> 0.55-0.66 with an optional light rim on the shadow edge. No emissive "pasted-on" glow.
- **Ground**: soft offset blob shadow by day (0.5 W x 0.06 W, alpha .3); long soft shadows at sunset.
- **Animation**: on ones; blinks every 0.5-2.3 s (half / shut / shut / half) plus one on every expression swap;
  swaps 0-3 f before the word; walk bob 3-7 %, lean 1-7 deg, step 9-12 f, planted feet; extras still unless cued.

### Camera and editing (`motion.md`, our REFERENCE_NOTES)
- Moving on ~65 % of frames; holds always push in (median 0.14 %/f, p75 0.34, punch words 0.6 %/f for ~35 f).
- Moves are **symmetric ease-in-out glides**: ~10 f in, ~10 f out, ~23 f total, peak 14-16 px/f at 720p
  (= 21-24 px/f at 1080). Never a 3-frame snap.
- Whips: rare (< 1 per minute), 45-93 px/f at 720p for 7-25 f, always with strong directional motion blur.
- Impacts: 6-8 f kicks that flip sign every frame, ~3 px at 720p, roll +-0.1-0.35 deg; the push-in stops on the hit.
- Rolls: ~3 per 10 s, median 3.6 deg over 18 f. No hand-held float.
- Transitions: continuous moves (follow an object to the next subject, fly-through) or a 6-10 f crossfade when the
  place changes; hard cuts are rare.
- Shot mix: CU 3 %, MS 27 %, FS 28 %, WS 12 %, EWS 8 %, inserts 22 %. Camera height ~0.8 x character height, eye
  level 82 %. Horizon at y 0.45. Foreground framing object in ~38 % of MS/CU.

### Depth (`depth.md`)
- DOF on ~1/3 of shots (CU/MS/inserts): background blur C-inf 12-14 px (CU/MS), 8 (FS), 5 (WS, if used),
  foreground 15-24 px. Focus on the eyes. No rack focus inside shots.
- Aerial perspective: fog colour = horizon colour; skyline objects pulled 20-40 % toward it.
- Sky: day top ~#5e93d9 over a pale horizon (luminance ratio 1.28); golden bright #ffd08a horizon held to ~3 deg,
  then mauve/indigo.
- Bloom only on emissives and real whites: threshold 1.0, 6 levels, radius .6, intensity .5; emissive HDR x3,
  sparks x8. Faces never glow.

### Lighting (`lighting.md`)
- **Shadows keep their colour**: day shade/lit ~0.5 in luminance with saturation kept (slightly redder); sunset
  shadows are violet-blue on orange ground (B up to 3x the lit value). Never grey or brown shadows.
- Day key from the side-back (az ~50-75 deg, el ~48), frozen per shot; sunset is **backlit** (sun ahead, el 3-15 deg).
- No SSAO; contact = ink line + blob shadow.
- Night and interiors: heads still V >= .86, tinted (moonlight #b1ace7, lamp #fcdfbd, window #d9b5e7).

### Outlines (`outlines.md`)
- World ink on ~74 % of geometry edges: silhouettes, depth jumps, convex creases, contacts. **Not** on wall/floor
  junctions, baseboards or the horizon.
- ~3 px at 1080, nearly constant with distance (3.4 -> 2.2 px), slightly lighter far away; crisp, then blurred by
  DOF with the background (ink pass runs **before** DOF).
- Texture lines (planks, grout, tiles) are painted soft dark tints, never ink.

### Textures and colour (`textures.md`, `grade.md`)
- Surfaces are a few flat colour fields with thin painted lines (3-5 px at 1080). Lit surfaces bright and
  saturated (wood L* 72-80); nothing below L* 19 except ink; iron and timber are coloured darks, never black.
- Clouds in three tones with a lavender underside.
- Day grade targets: median Y' .57, p99 .97, non-ink p5 .23 with a warm black point (35,19,20), lit C* p50 34 /
  p90 55, vignette corners ~0.86 of centre. (Our 4-video study measured darker, more saturated story frames:
  luma .39-.51; use .45-.57 by mood, but never crushed, grey or blue-black darks.)
- Each video uses 3-4 hue families including ~25 % violet/blue/magenta/rose in golden scenes.

---

## 2. Stickrified identity (ours, not in the reference)

1. **"You" is a recurring character.** The protagonist (tall forward quiff with one cowlick, rust-orange jacket over
   a striped charcoal tee, jeans) appears in every video and is the first thing on screen in the hook. Competitors
   cast new characters every time; we build one face people recognise.
2. **Rust-orange signature accent** `#c8582c`: the protagonist's jacket plus one story prop per video. Keep other
   large surfaces away from this hue so it always points at "you".
3. **Captions with a key word**: the standard white-and-outline caption, but the one key word per sentence (the
   number, the twist, the punchline) is rust-orange `#ff8a3d` and scales up 8 % for 4 frames. Nobody else does it.
4. **Scenario counter stamp**: in the scenario pillar, "DAY 3", "HOUR 12" etc. appear as a chunky stamped card in
   the upper third with a thump SFX. It becomes the series' visual signature.
5. **POV shots**: at least one over-the-shoulder or first-person shot per video ("you look down the aisle...").
   Second-person narration + a camera that is literally you.
6. **Warm ink**: world and character ink are one warm brown-black family (`#1c1210` world, `#2a1a14` characters),
   not neutral black / plum.
7. **Heads**: pale cream `#f4ece0` for the cast (reads at phone size, shows light tints); the protagonist keeps the
   same cream so colour-fill gags work on him too.

---

## 3. Diagnosis of the kit frames (2026-11-12)

| Frame | Problem | Rule broken |
|---|---|---|
| SupermarketWide | Washed-out beige everything, yellow floor, white ceiling tiles repeating, almost no hue families, scratchy black lines inside shelves | grade targets, 3-4 hue families, texture lines must be soft tints |
| SupermarketMedium | Head ~45 % of height (~2.2 HH), perfect circle, uniform black outline, flat cream head, white ball hands, tiny box torso | proportions 3.5 HH, bean head, thick-thin outline, ink-dot hands, bean torso, crescent shading |
| SupermarketNight | Big crushed-black blobs (barricade unreadable), flat elliptical light pool, a bright reflection blob at the bottom edge | no darks below L* 19 except ink, coloured darks, readable silhouettes with ink |
| Preset supermarket night | Everything one blue, muddy | keep 3-4 hue families at night: warm practicals, green exit, moonlight lavender |
| Snowy village | Huge flat grey mountains, flat navy sky without gradient or stars | sky gradient, aerial perspective, three-tone clouds/snow |

## 4. Acceptance checks
- `python scripts/measure.py <render>`: camera and colour numbers inside section 1.
- Side-by-side against reference frames from `assets/references/frames/` (private, git-ignored).
- Story check (R5-R7 study, `REFERENCE_NOTES.md`): every speaking role recognisable in silhouette, text in the
  world rather than on cards (except DAY/year stamps), the payoff mechanism shown step by step, the last word on a
  face close-up. Full rules: "Visual storytelling" in the toon-world-short skill.
- Character check: total height / head height = 3.4-3.6 for adults on the expression sheet; head H/W 0.90-0.98;
  outline thick/thin ratio >= 2.5.
- Identity check: protagonist recognisable in silhouette at 120 px tall; rust accent present; key-word caption working.
