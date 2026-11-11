# Reference study — measured numbers (2026-11-11)

Four 9:16 reference shorts (30–65 s, 30 fps, 5,711 frames total) were measured frame by frame with OpenCV
(optical-flow camera motion, colour, sharpness, vignette, caption timing) and reviewed visually on contact sheets
(every 10th frame) and every-frame strips around transitions and gags.

The videos are **private study material**: they live only in `references/` on the laptop (git-ignored). Never
upload, publish or send them, never copy their stories, characters, jokes or shots, and never name their channels.
We take the craft (numbers below), not the content.

| | R1 (65 s) | R2 (65 s) | R3 (30 s) | R4 (31 s) |
|---|---|---|---|---|
| World look | near-realistic lit 3D | saturated painted 3D, light ink | hand-inked painted 3D | hand-inked painted 3D |
| Characters | 2D cards, skin heads, some volume shading | white round heads, stick limbs | white/pale round heads, stick limbs | same as R3 |
| Luma median / p5 | .40 / .08 | .51 / .17 | .43 / .12 | .39 / .11 |
| Chroma C* p90 | 37 | 57 | 68 | 61 |
| Corner/centre luma (vignette) | .93 | .84 | .54 | .89 |
| Still frames / longest still | 3 % / 11 f | 5 % / 14 f | 8 % / 14 f | 4 % / 7 f |
| Caption changes per s / median hold | 2.2 / 13 f | 3.0 / 10 f | 2.9 / 10 f | 2.8 / 10 f |
| Loudness / true peak | −14.2 LUFS / −0.8 | −14.2 / −1.6 | −17.3 / −4.7 | −17.0 / −4.5 |

R3 and R4 are parts 1 and 2 of one story: part 1 ends mid-sentence on a cliffhanger, part 2 opens by repeating
part 1's last line over its last shot.

## Camera (all four, valid frames only)
- Translation at 1080 wide: median 2.9 px/f, p75 11, p90 26, p99 59 (fast follow moves).
- Scale change: |zoom| median 0.5 %/f, p90 2.6 %/f. Push-in on 65 % of frames, pull-out on 26 %.
- Roll: p95 0.25–1.2 °/f (arcs and orbits around characters, slow banking).
- The camera is almost never still: holds always drift, push or arc.
- Fast moves are continuous follows (tilt down with a falling character, tilt up to reveal sky), not cuts.

## Transitions
- Main transition: a **crossfade of ~10 frames** (measured 394→404 in R3) between two moving shots; the caption
  switches to the next word mid-dissolve.
- Hard cuts for punch close-ups, reaction inserts and object close-ups.
- Big jumps (place or era): fly-through or fast pull-out with strong motion blur streaks, or a white-wash dissolve.
- About one new shot every 3–5 s, with continuous camera motion inside each shot.

## Characters
- Flat 2D cards with thick near-black outlines, stick limbs, ink-dot or mitten hands; big round heads (h/w ≈ 1.0).
- Faces: dot eyes, heavy angled brows, small mouths; shock = ring eyes; extras = sweat drop, steam puffs,
  colour fill over the face (rises bottom to top over ~8 f on the word).
- Expression swaps are instant (on the word); bodies hold still poses with small bob/lean.
- Cards take the scene light: window light shafts cross faces, night scenes tint faces blue, lamps warm them.

## World and light
- Strong colour script per scene: dusk pink→violet skies, deep blue nights with warm practical lights, hot orange
  desert under cobalt sky, warm wooden interiors.
- Practical lights glow (bloom), volumetric light shafts through windows, falling snow or dust particles.
- Hand-inked worlds: dark brown-black outlines on every edge, painted fills with visible strokes and grain.
- Depth of field: close-ups and mediums soften the background clearly; wides stay sharp.

## Captions
- White bold rounded sans, dark outline plus a soft drop shadow, 1–2 words at a time, centred at y ≈ 0.70 of the
  frame height, cap height ≈ 0.035 of the width (font size ≈ 60 px at 1080 wide), punctuation kept, no pop animation.

## Storytelling craft seen
- Cold open on the most absurd image of the story, on the first word.
- Every key phrase is shown literally (a metaphor becomes a picture: "like climbing a mountain" → a staircase up a
  mountain).
- Ends on the last word with no outro; endings loop or hand off to a part 2.
