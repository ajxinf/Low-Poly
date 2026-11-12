# Reference study — measured numbers (2026-11-11)

Four 9:16 reference shorts (30–65 s, 30 fps, 5,711 frames total) were measured frame by frame with OpenCV
(optical-flow camera motion, colour, sharpness, vignette, caption timing) and reviewed visually on contact sheets
(every 10th frame) and every-frame strips around transitions and gags.

The videos are **private study material**: they live only in `assets/references/` on the laptop (git-ignored). Never
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

---

# Story study: R5, R6, R7 (2026-11-12)

Three more 9:16 shorts (67 / 63 / 62 s, 30 fps), same private rules as above. Each was studied on contact sheets
(every 15th frame) and with its full script, read word by word off the burned-in captions (caption band every 6th
frame). Transcripts: `assets/references/transcripts/` (git-ignored, never commit). All three are "how one clever
person beat a problem" stories: a siege weapon, a roller-coaster loop, an insurance scam caught on camera.

**Why we studied them:** our first three scripts read as lists of separate jokes. These three tell one story.

## Measured script numbers
| | R5 | R6 | R7 | our drafts (before) |
|---|---|---|---|---|
| Words / pace | 235 / 3.5 w/s | 239 / 3.8 w/s | 236 / 3.8 w/s | 246-255 / 3.1 w/s |
| Sentences, mean / max words | 17, 13.8 / 31 | 19, 12.6 / 25 | 20, 11.8 / 24 | longer, many 20+ |
| Words of 8+ letters | 6.8 % | 1.7 % | 4.7 % | "investigators", "personality", "experienced" |
| "But" + "So" + "Then" | 5 | 9 | 7 | mostly "Day N," list openers |
| Hook length | 7 words | 7 words | 6 words | 10-20 words |
| Names, dates, places spoken | none | none | none | year, city, regiment |

## The story engine (all three)
1. **Sentence 1 is a strange action, not a premise**, 6-9 words, no context: someone drills holes / bends a loop /
   slams the brakes. The viewer's "why?" is the hook. (The title asks the question; the narration starts doing.)
2. **Sentence 2 answers "why" with stakes** ("because an army is marching straight for his fort") but keeps the
   *how* secret.
3. **A causal chain, never a list.** Each sentence happens because of the last one, joined by But / So / Then /
   That night / The next morning / Eventually / Until. Time words mark only big jumps (2-3 per video).
4. **An opponent and a doubter.** An army, a rival, an insurance company pushes back; a side character says the
   viewer's doubt out loud in one short, funny line of dialogue. The hero answers with silence or one word.
5. **Weird preparation, mystery protected.** The hero does 3-4 odd things in a row that make no sense yet, each
   stranger than the last ("But it gets weirder"), and protects them oddly (slaps a hand away, lies on the cart in
   the rain). The trick is never named, not even at the end.
6. **A setback at night**: rain, a rival's sabotage, a phone call. The colour script goes dark with it.
7. **Stretch the tension** right before the payoff: repetition ("closer and closer and closer"), one sensory detail
   (close enough to see teeth), "But it's too late."
8. **Payoff in plain physical steps**, one picture per step; when the reason is not obvious, one "You see," and an
   everyday analogy in its own mini-scene (a car taking a hairpin at 5 vs 60 mph).
9. **Everything pays off**: the opening number comes back, the rival's own trick ruins him, the quiet victim's
   little box was a camera.
10. **Last line 4-8 words, ending on the punch word**, over the winner's smug face. No moral, no outro.

## Where the peak lands (measured by word position)
| | R5 | R6 | R7 | our 2nd drafts |
|---|---|---|---|---|
| Climax starts | 73 % (lights the rope) | 58 % (ride starts), resolved at ~95 % | 86 % (points to the box) | 43-55 % |
| After the climax | the chain reaction itself, then 1 line | the explanation told mid-ride, then the rival's crash | 2 lines | aftermath, lecture, epilogue |

The references explain *during* the danger (R6 explains loop physics while the cart is climbing), and each has a
late reversal (sabotage that saves him, the victim's camera). Rules: "The back half" in the stickrified-script skill.

## Language
- Plain spoken English: almost every word one or two syllables; contractions everywhere (he's, can't, it's).
- Physical verbs carry the story: drill, bolt, slap, rip, race, bend, crank, beat, slam, smash, limp, clutch.
- Present tense after the hook. Sentences 10-14 words on average, mixed with 2-3 word punches ("He's in.",
  "Not really.", "But it's too late.").
- Comparisons from the kitchen and the street, never from books: like a soda can, like a twig, a human umbrella.
- One number, repeated as a motif (the same count opens, builds and closes the story). Other numbers only when
  they are the joke.
- Lists of three for routine or escalation, often as fragments: "A guy on his phone. A kid who just got his
  license. Anyone driving a little too close."
- Jokes come only from the story (characters reacting to the hero's odd behaviour); no unrelated asides.
- Delivery: one steady, fast, conversational read; little acting, no deadpan doubles.

## Visuals (R5-R7)
- **Worlds**: lush and dense (grass blades, crowds of 100+ extras, full props), bright cobalt-sky days, then a
  blue moonlit night or rain for the setback, then a clean bright morning for the payoff. Time of day follows the
  story beat, not the clock.
- **Characters**: the same white round heads and stick limbs, but every role has a costume that reads in
  silhouette: helmet with plume, cap, headband, slick hair, ranger hat, sunglasses pushed up on the head, beards,
  overalls, armour with rivets. Hero and rival have opposite silhouettes and colours. Faces do the acting: smug
  half-lids, gritted-teeth grins, ring-eyed shock, sweat drops.
- **The mechanism is the star**: macro close-ups walk through the trick step by step; a glowing light streak runs
  along the path that matters (along a track, down a fuse); exploded or cut-away views when the inside matters.
- **Words live in the world**: banners and signs carry text ("opening tomorrow", a "first!" placard, a desk counter
  that resets to 0, a dashcam overlay with REC, date and speed) instead of floating title cards.
- **Literal exaggeration**: money piles up like a snowdrift and buries the yard; explosions fill the sky.
- **Point-of-view shots from objects and seats**: from the driver's seat, from the coaster cart, through the dashcam.
- **Endings**: the winner in close-up in the foreground, smug or arms crossed, the payoff (explosion, crash)
  behind him, on the last word.
- **Pace**: a new shot about every 2-3 s, continuous camera motion, dissolves between places; captions as in R1-R4
  (1-2 words, white, dark outline, y ≈ 0.70).

**What we take**: the story engine, the plain language, costumes per role, in-world signs, mechanism close-ups,
time-of-day by story beat, smug ending shot. **What we don't**: their stories, jokes, characters or shots; their
third-person "he" (we keep "you"); R7's made-up invention ending (our history stays true).
