# QA layer 3: fresh reviewer (Opus, max effort), on the first 2K final

The reviewer saw the contact sheets plus stills f30, f176, f206, f212, f341, f372 and f440. "Fix" marks what changed
before the second final.

**Verdict:** not ready to ship. There are no technical faults: no broken materials, z-fighting or shadow acne. Feet
are planted, lighting is consistent, and the captions are correct and never cover a face. The gags don't read.

| # | Frames | Severity | Finding | Fix |
|---|---|---|---|---|
| 1 | 212-235 | blocker | The "½" stick runs into the friend's forehead, and no hand holds it | **Fixed.** The friend raises the left arm on the beat and the card sits beside the head |
| 2 | 290-330 | blocker | The S3 toast is hidden behind the friend, small, and lands under a rung | **Partial.** It now falls off the other side onto open ground, but it is still small |
| 3 | all | major | The toast has the same colour on both faces, so the buttered side doesn't show | **Fixed.** Dark crust, pale crumb, thick yellow butter pat on one face |
| 4 | 204-235 | major | The splat toast is cut by the right edge | **Fixed.** It starts nearer the table centre and lands in frame |
| 5 | 236-369 | major | S3 shows the ladder, stool and table from the start, which gives away the punchline | **Not fixed.** Needs restaging (listed in TEST-REPORT) |
| 6 | 340-449 | major | The 10-foot table reads as a navy box on stilts | **Fixed.** Round teal café-style top and a red stool |
| 7 | 20-60 | major | At the hook you seem to stand on the table edge | **Fixed.** Your walk path moved so your feet clear the table |
| 8 | 70-119 | minor | The toast is cut by the left edge in S1 | **Partial.** Visible from f0, cut again at the end of the push-in |
| 9 | 305-306 | minor | The falling toast clips a ladder rung | **Fixed.** It now falls on the side away from the ladder |
| 10 | 120-235 | minor | The S2 facade is in grey shade next to the sunlit S1 and S3 | **Not fixed.** A light-rig question (listed) |

---

# Round 2: a new reviewer (Opus, max effort), on the follow-up 2K final (six shots)

The reviewer saw the contact sheets plus stills f30, f176, f206, f212, f280, f300, f312, f372, f398, f406 and f440,
and pulled extra frames from the final. The stills from this round are kept in this folder.

**Verdict:** not ready to ship, with three major issues, all in S2. There is no clipping, no broken material, no
z-fighting and no shadow acne. Lighting matches between shots and no caption covers a face. The S3 restage works:
the insert lands butter-up on "up" at f312 (butter first visible at f309). The ladder and friend stay hidden
through f402 and the dissolve only reads from about f403. S3c sells the 10-foot table.

| # | Frames | Severity | Finding | Status |
|---|---|---|---|---|
| 1 | 176-190 | major | The nudge doesn't read: you stand ~250 px from the toast with your hand by your head, and the toast slides off by itself | open (outside this round's scope) |
| 2 | 206-235 | major | The butter-down toast lands at the right frame edge, partly cut, and reads as a brown tile | open |
| 3 | 212-235 | major | The "½" card floats: the hand is ~105 px from the stick and the card overlaps the cap | open |
| 4 | 403-426 | minor | The caption "needs a ladder." showed "ladder." from f418, before it was spoken (f428); the ladder reads from ~f406 | **Fixed.** A key word now always starts its own caption group (`kit/toon/Captions.tsx`), so "ladder." appears on its own word |
| 5 | 250-291 | minor | S3a doesn't show "10 feet up": you could be on a box | open |
| 6 | 336-449 | minor | The S3c sky is #1165fe with the blue channel clipped (S3a #4fa0fe, spec #5e93d9), and dust reads as stars against it | open |
| 7 | various | minor | f20-40 your feet line up with the table rim; f85-110 the table base is a dark blob in the corner; f292-330 a leg sliver on the left edge; f404-409 two of "you" during the dissolve; f435-449 the friend's hands hover outside the rails; S2 has stray ink specks and a faceted table rim | open |
