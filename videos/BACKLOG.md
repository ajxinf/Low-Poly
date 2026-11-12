# Backlog

Topics for videos go here (the skill asks for 20+). Kit work that blocks a skill rule is listed too.

## Kit
- [ ] **Back-view character card** (protagonist first). Needed for over-the-shoulder "you" shots: cards always face
  the camera, so until this exists the skill allows POV shots only. Found by `_pipeline-test` (2026-11-12).

From the R5-R7 study ("Visual storytelling" in the toon-world-short skill; 2026-11-12). None built yet:
- [ ] **Big crowds**: 100-400 extras as instanced billboards (one costume family, per-instance seed, idle bob),
  within 4 GB VRAM. `extras.ts` makes individuals only. Needed by all three drafts (zombie horde, column of 74,
  restaurant diners).
- [ ] **Costume pieces** in `extras.ts`: shop vest + name tag + braces (Dave), beanie (barista), tall rifle cap
  (1831 soldiers), bowl cut with one strand (boss), zombie skin/head tint, monocle and top hat (1831 townsfolk).
- [ ] **In-world sign helper**: Canvas2D hand-painted text on an unlit plane or box face (signs, labels, box
  prints, name tags), inked edge, readable at phone size.
- [ ] **Glow streak**: additive ribbon along a curve, length and head driven by `useCurrentFrame()` (sound trail,
  bridge wave, swing arc), bloom on the head.
- [ ] **Rolling number counter**: scoreboard digits that roll on a cue (lie counter 4,000 -> 4,001).

From the R1-R12 pass (2026-11-12):
- [ ] **Circular device-POV mask** (binoculars, slot, telescope) as a post effect with a soft ink ring.
- [ ] **Cross-section cut-away** helper: clip a set with a plane and paint the cut face (soil layers, wall).
- [ ] **Costumes for the new drafts**: Chad (tank top, backwards cap, sunglasses, megaphone), Brad (slick hair,
  shiny suit, chimney-tall top hat with a painted number), pyjamas variant.

From _pipeline-test-2 round 2 (2026-11-13):
- [ ] **Day colour targets on dressed frames**: luma 0.601 (max 0.57) and vignette 0.91 (day range 1.1-1.4) after clouds, hills, trees and shafts filled the corners. Re-measure the day range on dressed frames or darken the day grade.
- [ ] **Protagonist wardrobe pass** (only if the user wants it): his rust jacket is the identity; candidates are sneaker soles and a readable pin badge.
- [ ] **Background check in the guard**: share of the 7x4 probe rays that hit only sky or bare ground in wides (today only the frames.py checklist catches it).
