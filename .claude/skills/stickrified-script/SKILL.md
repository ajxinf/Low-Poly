---
name: stickrified-script
description: Write, revise or punch up a Stickrified Short script (scenario "what if", strange true history, or "In this world..." fiction) - SCRIPT.md + script.json + sources.md with Eleven v4 audio tags, 200-270 words. Use for "write the script", "next script", script feedback or rewrites, new topics, or before any voiceover. toon-world-short calls this for its script step.
---

# Stickrified script

Writes the script for one Stickrified Short: `videos/<slug>/script.json` (single source of truth), `SCRIPT.md`
(readable view, generated) and, for history, `sources.md`. The user edits every script; once they approve it,
`toon-world-short` takes over ("just do it").

## Steps
1. **Topic.** From `videos/BACKLOG.md` or the user. It must be drawable: a physical cause and effect, or (fiction)
   one impossible rule with obvious everyday fallout.
2. **Facts.** Scenario: the Turn must be real-world logic; look up any real fact it uses. History: research every
   claim with web search, note conflicting sources, write `sources.md` (claim | source table, discrepancies, and a
   list of the lines that are comic exaggeration). Fiction: no sources.
3. **Draft** `script.json` with the formula for the pillar and every rule below.
4. **Check**: `python .claude/skills/stickrified-script/check_script.py videos/<slug>/script.json --md`. Fix every
   ERROR and every warn (or say why a warn stays). This also writes `SCRIPT.md`.
5. **Hand over** `SCRIPT.md` to the user: word count, estimated length, and one line on any judgement call
   (conflicting sources, a joke you're unsure of). Revise from their notes, re-run the check each time.

## Length
- **200-270 words** (aim ~235). The narrator reads at **~3.1 words/s** (measured 2026-11-12 on the production voice:
  96 words in 31 s), so that is ~65-87 s inside the 61-90 s window. If a real voice take lands outside 61-90 s,
  re-measure (words / seconds), update `WPS_DEFAULT` in `check_script.py` and this line.

## Pillars and formulas (all in second person, "you")
- **Scenario** ("What if you were trapped in a supermarket for 30 days during a zombie apocalypse?"):
  Hook (premise + stakes, one line) -> time markers ("Day 3, ...") escalating over 4-6 beats -> Snap (the worst
  moment) -> deadpan double "Luckily... / Unluckily..." -> Turn (the real-world fact that saves or dooms you) ->
  Callback ending that loops into the hook.
- **Strange true history** ("You're one of 74 soldiers about to destroy a bridge... by walking."):
  Hook (the absurd fact) -> Setting (year, place, pride) -> Action escalating over 3-4 beats -> Snap -> deadpan
  double -> Explanation (one idea through an everyday analogy) -> Consequence (the rule or change it caused) ->
  Callback twist that loops.
- **"In this world..." fiction** ("In this world, every lie you've ever told floats above your head as a number.
  Yours says 4,000."): Rule (sentence 1, shown in the cold open) -> You're the exception (your version is the worst
  or weirdest) -> Everyday fallout (3 escalating gags: work/school, dating, family, money) -> Snap -> deadpan double
  -> Turn (the rule's own logic, taken literally, saves or dooms you) -> Callback that loops into the rule.
  - One changed rule; everything else normal and played straight; never explain the rule scientifically.
  - Rotate openers: "In this world...", "In a world where...", "Everyone gets <X> at 18. You get <worse X>.",
    "You wake up and...", "Imagine if...". Not the same opener 3 videos in a row.
  - Our own worlds only: never adapt a book, film, show, game or another channel's story.
- Every script: hook = a paradox stated as fact in sentence 1 (~10-16 words, no setup); the first frame shows the
  most absurd image; one mystery beat ("Wait...?"); a "You see," pivot into the real mechanism or rule logic; at
  least one POV / over-the-shoulder "you" shot; end on the last word (no outro, no "subscribe").
- Too big for 90 s: Part 1 / Part 2. Part 1 stops mid-sentence on the cliffhanger; Part 2 opens by replaying it.

## Entertainment rules
Goal: the most entertaining 61-90 s possible. A swipe-away means a line was boring.
- **A gag, twist or surprising fact every 5-8 s**, and every one is a picture: put it in the line's `gag` field.
  The checker flags any gap over 8 s.
- **Exaggerate.** Push numbers, stakes and reactions past reality until clearly absurd.
  - Scenario and fiction: exaggerate anything; the Turn stays logical so the ending lands.
  - History: every stated fact (names, dates, numbers, events) is true and in `sources.md`. Exaggerate only the
    comic framing: your feelings, asides, impossible comparisons ("basically a trampoline with a river under it").
    Test: no viewer could mistake the joke for a fact. If it could be believed, cut it or make it bigger.
    Invented dialogue and thoughts stay vague.
- **Specific beats generic**: "11 rotisserie chickens", "a cardboard man who really loves yogurt". Odd numbers > round.
- **Rule of three**: two normal items, then the absurd one.
- **Punchline last**: the funny word ends the sentence and is its caption key word (`*word*`).
- **Escalate** every beat; never the same joke shape twice in a row.
- **Undercut**: big build-up, flat payoff (the one place `[deadpan]` goes).
- **Give "you" a flaw**, and give the story a running bit (Greg the cardboard cutout) that pays off at the end.
- **No setup words**: no "So basically", "Now", "Let's", "Imagine this" (except as a fiction opener).
- **Advertiser-friendly**: no slurs, no punching down at real groups, no real private people; real public figures
  only in true facts; violence off-screen and cartoonish; no graphic true crime.

## Voice (Eleven v4)
- Production narrator: voice ID `zfc8CJQpe8Kqyl0vvCzo`, model `eleven_v4`, every video. Settings in `docs/STYLE.md`
  (start: Stability **0.3**, Similarity 0.75). Lower stability = more expressive; below ~0.25 takes drift.
- **Delivery: fast, energetic storyteller.** Line 1's `audioTag` sets the base: `fast-paced, energetic storyteller`.
  Tags carry forward until the next one, so a `[deadpan]` left in place flattens everything after it: use deadpan
  only on a single punchline, then switch back with the next line's tag.
- **Tag most lines** (energy drops without them): `audioTag` is sent in front of the line; extra inline tags go in
  `spoken`. Good set: `excited`, `playful`, `amused`, `mischievous`, `urgent`, `quick`, `rushed`, `panicked`,
  `nervous`, `tense, hushed`, `whispers`, `relieved`, `amazed`, `building excitement`, `sneaky, quick`, `deadpan`,
  `sighs`. Free text works ("realizing, excited"). Stack with commas in one bracket; one tag per clause; never two
  contrasting tags on the same words.
- **Pace through punctuation**: commas, not full stops, between related beats ("Day 3, the power's still on, so
  you..."). Full stops and colons add pauses: keep them for the deliberate stop before a punchline. `...` = a
  beat. No `<break>` (v4 ignores SSML); exact gaps get added in the edit.
- **Emphasis**: at most one CAPS word per sentence, in `spoken` only.
- **No sound-effect tags** (`[footsteps]`, `[thunder]`...): our SFX are synthesized. If a delivery tag comes out as a
  sound, describe the voice instead ("[low, dry voice]").
- **Numbers, dates, names**: written out in `spoken` ("seventy-four", "eighteen thirty-one"); captions keep numerals.
  Odd names in IPA between slashes.
- Whole script in one generation (v4 performs better with context). If one line misses, try a neighbouring
  emotion and regenerate only that line.

## script.json
```json
{
  "slug": "zombie-supermarket-30-days", "title": "...", "pillar": "Scenario", "formula": "...",
  "voiceId": "zfc8CJQpe8Kqyl0vvCzo", "model": "eleven_v4", "facts": ["..."],
  "lines": [{
    "narration": "Day 3, the power's still on, so you live like royalty: ... eaten *standing up*!",
    "spoken": "Day three, the power's still on, so you live like royalty: ... eaten standing up!",
    "audioTag": "excited",
    "scene": "Three quick inserts: sushi tray, whole cake, you gnawing a chicken.",
    "camera": "Hard cuts on each food, final arc around you",
    "onScreenText": "DAY 3",
    "gag": "Paper crown"
  }]
}
```
- `narration` = caption text: normal case, numerals, one `*key word*` per sentence, **never** a tag.
- `spoken` (optional) = what the voice reads when it differs: numbers written out, inline tags, CAPS, `...`.
- `audioTag` = the line's lead tag without brackets. `onScreenText` = stamp cards ("DAY 3", "1831"). `gag` = the
  literal visual gag on that line (empty if none).
- Never describe on screen what the viewer already sees; the scene shows it, the narration adds to it.

## Examples
Example scripts (first drafts, still under the user's critique): `videos/zombie-supermarket-30-days/`,
`videos/broughton-bridge-1831/`, `videos/lie-counter/`.
