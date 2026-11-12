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
   ERROR and every warn (or say why a warn stays). This also writes `SCRIPT.md`. The story-engine warnings (hook
   length, sentence length, long words, setup words, "Day N" diaries, too few but/so/then links) are tuned so all
   three reference transcripts pass clean.
5. **Read it aloud as a chain**: for every line, ask "because of the line before, ...?" If the answer is "and
   also", the line is a list item: cut it or tie it to the story.
6. **Hand over** `SCRIPT.md` to the user: word count, estimated length, and one line on any judgement call
   (conflicting sources, a joke you're unsure of). Revise from their notes, re-run the check each time.

## Length
- **200-270 words** (aim ~235). The narrator reads at **~3.1 words/s** (measured 2026-11-12 on the production voice:
  96 words in 31 s), so that is ~65-87 s inside the 61-90 s window. If a real voice take lands outside 61-90 s,
  re-measure (words / seconds), update `WPS_DEFAULT` in `check_script.py` and this line.

## The story engine (every pillar)
Measured on three strong reference shorts (`docs/style/REFERENCE_NOTES.md`, "Story study"). The video is **one
story told as a chain of cause and effect**, never a list of jokes. If you can swap two lines around and nothing
breaks, it is a list: rewrite it.
1. **Open on a strange action** (first clause 6-12 words, present or past tense, no context): "You pull the
   batteries out of 212 talking toys." The viewer's "why?" is the hook. The title asks the question; the narration starts doing.
2. **Sentence 2 answers "why" with stakes** ("Because outside, 400 zombies hunt by sound.") and keeps the *how*
   secret.
3. **Chain every line to the one before** with But / So / Then / That night / The next morning / Until /
   Eventually. "Day N" stamps only for the 2-3 biggest jumps; a "Day 1... Day 3... Day 7..." diary is a list.
4. **Give "you" a goal, an opponent and a doubter.** The opponent pushes back (zombies, a rival, a deadline, the
   rule itself). The doubter, a side character, says the viewer's doubt out loud in one short line of dialogue.
   "You" answers with an action or one word.
5. **Weird preparation, mystery protected**: 3-4 odd things "you" do that only make sense at the payoff, each
   stranger than the last. Never name the trick before it fires.
6. **A setback** (night, rain, sabotage, the opponent breaks in), then **stretch the tension** right before the
   payoff: repetition ("aisle one... aisle two... aisle three"), one sensory detail, "But it's too late."
7. **Payoff in plain physical steps**, each a picture. If the reason is not obvious: one "You see," and one everyday
   analogy (it gets its own mini-scene).
8. **Pay everything off**: the opening number or object comes back, the doubter's line comes back, the opponent's own
   plan backfires.
9. **End in 3-8 words on the punch word**, over a close-up of a face (smug, guilty, stunned), and **loop back
   to line 1** (see below). No moral, no outro.

### What the strongest references add (12-short study, `REFERENCE_NOTES.md` "All references")
- **The hook is a contradiction the ending answers.** "They built a machine to punish prisoners, and today
  millions pay to use it" -> "And that's how the treadmill was invented." Line 1 holds a question; the last line
  closes it.
- **Loop to line 1 (required, `loop` field).** The last line returns to the first, by its words ("it's all your
  fault" -> "And it's all your fault.") or by its idea flipped ("the room is laughing at him" -> "nobody's
  laughing anymore"; "you haven't said a word" -> "Brad hasn't said a word since"). Write the last line first.
- **Someone laughs at "you".** A rival, a boss or a whole crowd mocks the strange act out loud ("You're wrecking my
  railroad", "Hey, mirror man"). Viewers stay to see them proven wrong.
- **The rival has the "perfect" version** (a perfect railroad, a perfect circle, a fortress with steel shutters, a
  perfect number). The viewer believes the rival is right until the end.
- **Status flip**: the rival's own strength or habit beats him at the end (perfect rails buckle in the heat, his
  laugh, his megaphone, his hat). "You" wins by understanding the rule better, never by luck.
- **Hidden plan**: "you" knew something all along. One line reveals it late ("Every night, you've been counting
  his fuel cans."), and the viewer replays the video in their head. Plant it as a visible oddity early.
- **Measured progress**: show the plan ripening in steps ("a coin by May, a sheet of paper by July").

### The back half (where our first drafts died)
Our second drafts peaked at 43-55 % of the words and then wound down into aftermath and explanation. The
references peak at 73-86 %. The second half must be the best half.
- **Peak at 75-90 % of the words.** Everything before it builds toward it; after it, at most 2-3 short lines.
- **A reversal in the last act**: the plan fails at the worst moment (the cart jams on a bean can), or works in a
  way nobody expected (the truth raises the lie counter). A plan that simply works is a let-down.
- **Explain while the danger is live**, never after. "You see," and the analogy go in the middle of the action
  (mid-bounce, mid-roll), never in a flashback or once it's over. In history, plant the cause early as a ticking
  bomb ("somewhere in those chains, one badly made bolt") so the explanation is suspense, not a lecture.
- **No wind-down**: no casualty counts, investigations or "years later" summaries after the peak except one
  kicker line. Facts that must be said go before the peak or into the kicker.
- **The stakes never drop.** No turn to sweet or sentimental unless it is itself the twist.
- **Pay off the doubter**: the side character's early line or object (Dave's duck) decides the climax.
- **Test**: read only the last 30 % aloud. If it would not hold a viewer on its own, rewrite it before anything
  else.

## Plain words (how the references talk)
- Spoken, simple English: nearly every word one or two syllables; contractions everywhere. The checker warns when
  more than 7 % of words have 8+ letters (references: 1.7-6.8 %).
- Physical verbs carry the story (drill, slam, tape, kick, crack, grab, stomp). No abstract verbs ("develops",
  "experiences", "investigators found").
- Sentences 10-14 words on average, mixed with 2-4 word punches ("It works.", "Not really."). Over 25 words only
  for at most 2 deliberate run-ons (a tension stretch, a chain reaction).
- Present tense after the hook.
- Comparisons from the kitchen and the street: "like a soda can", "like a lamp with anxiety". Never literary.
- **One number as a motif**: say it in the hook, use it in the build, land it in the payoff. Other numbers only when
  they are the joke.
- Names, dates and places are rarely spoken; they go on screen (`onScreenText`). History: the year card shows it.
- Lists of three as short fragments for routine or escalation: "Your grandma's at two. The baby next door is at
  eleven. And the girl from the coffee shop is at zero."
- Dialogue: at most 2-3 short quoted lines in the whole script, from side characters, each a joke or a turn.

## Pillars and formulas (all in second person, "you")
Each formula is the story engine dressed for its pillar.
- **Scenario** ("What if you were trapped in a supermarket for 30 days during a zombie apocalypse?"):
  Strange act -> why (the threat and its one rule) -> weird preparation chain with a doubter -> setback -> tension
  stretch -> payoff (the real-world logic you prepared for) -> punch ending that calls back to the strange act.
- **Strange true history** ("You're one of 74 soldiers about to destroy a bridge... by walking."):
  Strange act (what "you" are doing inside the event) -> why (the real motive, true) -> escalation chain (true
  facts only) -> the snap -> consequence for people -> "You see," + everyday analogy -> what changed because of it
  -> punch ending that calls back. Year and place on screen, not in the narration.
- **"In this world..." fiction** ("In this world, every lie you've ever told floats above your head as a number.
  Yours says 4,000."): Strange act ("You haven't said a word in 3 weeks.") -> why (the one changed rule, plus your
  goal) -> your plan to beat the rule, with the rule taken literally against you -> the big test -> the turn (the
  rule's own logic saves or dooms you) -> twist ending that loops into the rule.
  - One changed rule; everything else normal and played straight; never explain the rule scientifically.
  - The rule can open the video instead of an act when it is itself the strangest image. Rotate openers: a strange
    act, "In this world...", "Everyone gets <X> at 18. You get <worse X>.", "You wake up and...". Not the same
    opener 3 videos in a row.
  - Our own worlds only: never adapt a book, film, show, game or another channel's story.
- Every script: the first frame shows the strange act on the first word; at least one POV shot (POV only until a
  back-view card exists: cards always face the camera, so an over-the-shoulder shot would show your face); end on
  the last word (no outro, no "subscribe").
- "Luckily... / Unluckily..." is a tool, not a requirement: at most once per video, and only when both halves are
  true and the second half moves the story.
- Too big for 90 s: Part 1 / Part 2. Part 1 stops mid-sentence on the cliffhanger; Part 2 opens by replaying it.

## Entertainment rules
Goal: the most entertaining 61-90 s possible. A swipe-away means a line was boring.
- **Something new to see every 5-8 s**: a reveal, a reaction, a step of the plan, or a gag. Every one is a picture:
  put it in the line's `gag` field. The checker flags any gap over 8 s. Every gag grows out of the story's own
  people and objects; an aside that could be cut without changing the plot (a fish with a personality) gets cut.
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
- **Undercut**: big build-up, flat payoff (the one place `[deadpan]` goes, once or twice per video).
- **Give "you" a flaw**, and give the story a running bit (Dave's rubber duck) that pays off at the end.
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
- **Non-verbal tags** (`[gasps]`, `[laughs]`, `[sighs]`, `[chuckles]`) are performed as sounds and cost time:
  ~0.5-0.6 s each (measured on `_pipeline-test`; `check_script.py` adds it to the length). Use them only on beats.
  With two of them, a 39-word script ran 14.9 s, i.e. 2.6 words/s, not 3.1. Listen to them before you approve
  the voice: a tag can come out read aloud as a word.
  **Place them after a full stop** ("...roof white. [laughs] And you're..."): mid-sentence, v4 skipped `[laughs]` in
  `_pipeline-test-2`, and even at a sentence start it took two takes. `tts.ts` now fails a skipped tag.
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
  "loop": "Line 1: the guy across the street laughs at you. Last: ...the guy across the street doesn't make a sound.",
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
- `loop` (required, checker ERROR if missing) = one line on how the last line returns to the first.
- `narration` = caption text: normal case, numerals, one `*key word*` per sentence, **never** a tag.
- `spoken` (optional) = what the voice reads when it differs: numbers written out, inline tags, CAPS, `...`.
- `audioTag` = the line's lead tag without brackets. `onScreenText` = stamp cards ("DAY 3", "1831"). `gag` = the
  literal visual gag on that line (empty if none).
- Never describe on screen what the viewer already sees; the scene shows it, the narration adds to it.

## Examples
Example scripts, third drafts (rival, hidden plan, loop; 2026-11-12), still under the user's critique:
`videos/zombie-supermarket-30-days/`, `videos/broughton-bridge-1831/`, `videos/lie-counter/`.
