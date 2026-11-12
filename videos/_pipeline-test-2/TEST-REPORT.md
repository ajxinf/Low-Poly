# _pipeline-test-2: second pipeline smoke test (2026-11-13, round 2)

**Final (2K):** `out/_pipeline-test-2/final.mp4` (1440x2560, 457 frames, 15.23 s). Not for posting.
**Story:** "You paint your shed roof white, and your neighbour laughs." Day 90 heatwave; white bounces sunlight,
black soaks it up; his ice cream melts; he paints his roof white, "and you're the one laughing" (loop to line 1).

## Round 2: what the user found, why QA missed it, what changed

| User found | Why QA missed it | Fix in the pipeline (all videos) | Fix in this video |
|---|---|---|---|
| No laugh (not spoken, no sound) | Nothing checked that a tag was performed; the ear check was left to the user | `tts.ts` fails when a non-verbal tag leaves < 0.3 s between its words, and cuts each tag to `voice/tag_*.wav`. Script skill: tags after a full stop | `[laughs]` moved after a full stop; 2 takes: **0.40 s, performed** |
| Clipping | The guard checked props only at frame 0 and only tagged colliders; story props (roller pole, rays, cone) were invisible to it | Guard check **"Moving props"**: every frame, every `Shot.moving` prop vs the world and the cards (holder's head included). One `props.ts` feeds render and guard | Ladders for the painters, poles clear the eaves, steeper rays, cone and lemonade lowered |
| Neighbour too tall for the shed | No size check at all | Guard check **"Scale"**: people vs tagged doors (`userData.door`) | Real shed: 2.0 m door, 2.3 / 2.75 m walls |
| Background empty | No check; reviews watched playback | `scripts/frames.py`: exact-frame sheets + key frames + checklist (layer 3 reads frames, not video). Day clouds, side hills behind both house rows (kit) | Trees, flower bed, gnome, hose reel, ladders; clouds, hills |
| Characters bland | No design rule | `kit/toon/wardrobe.ts` (patterns, signature accessories, shorts/socks) + skill rule "Signature design" | Gary: visor, sunglasses up, walrus moustache, turquoise flower shirt, socks and sandals |
| Lighting: volumetric | Did not exist | `kit/toon/shafts.tsx` (additive soft cones, dust bands, NaN-proof, not raycast) | Three heatwave shafts down the shaded facades |

Also: sound cues now sync to words (`scripts/audio/events.py`), so the new voice take moved every cue; a draft mode
for stills (`--draft`) to keep look work going while the guard still fails.

## Results (final render)

| Layer | Check | Result |
|---|---|---|
| Voice | `tts.ts` tag check | PASS: `[laughs]` 0.40 s |
| 1 (guard, every frame, 5 shots) | 13 checks incl. Moving props + Scale | **PASS** (2 intended: closing row of buildings) |
| Sound | mix | -14.1 LUFS, -1.3 dBTP, voice over music 18.4 dB (min 15) |
| Render | 2K, concurrency 1 | 194 s |
| 2 | `video_qa.py` | no flags |
| 2 | `short_qa.py` | -14.2 LUFS, no black/white/frozen frames, no pops |
| 2 | `measure.py --light day` | std, sat, C*p90 ok. **luma 0.601 (max 0.57), vignette 0.91 (day range 1.1-1.4): OFF** |
| 3 | `frames.py` sheets, read tile by tile | no clipping, scale right, every reaction on its word, backgrounds dressed |

## Open
1. **Luma 0.601 / vignette 0.91.** Clouds, shafts and white roofs lift the luma; trees, hills and houses now fill the
   corners that used to be bright sky, so the day vignette rule (corners brighter than the centre) no longer holds.
   Decide whether to darken the day grade a touch or re-measure the day range on dressed frames (BACKLOG).
2. The protagonist did not get a wardrobe pass (his look is the channel identity): say if you want one.
3. Layer 3 was read by me on the exact-frame sheets; a fresh reviewer agent runs only when you ask for sub-agents.
