# _pipeline-test sound cues

Event table: `events.json` (frames at 30 fps; every cue derived from `voice/words.json` or the walk formula in
`src/videos/_pipeline-test/roles.ts`). Rebuild: `python scripts/audio/sfx_gen.py videos/_pipeline-test`,
`python scripts/audio/music.py videos/_pipeline-test`, `python scripts/audio/mix.py videos/_pipeline-test`.

| Frame | Time | Sound | Synced to |
|---|---|---|---|
| 21, 42, 63, 83 | 0.70, 1.40, 2.10, 2.77 s | step | your footfalls (walk distance crosses each 0.8 m stride) |
| 115 | 3.83 s | whoosh (centred) | S1 -> S2 dissolve, mid-point |
| 188 | 6.27 s | swish | toast tips off the café table |
| 206 | 6.87 s | splat (impact) | toast lands butter-down on "Splat" (6.88 s), camera kick 206-213 |
| 212 | 7.07 s | pop | friend raises the "½" card |
| 237 | 7.90 s | whoosh (centred) | S2 -> S3a dissolve, mid-point |
| 262 | 8.73 s | swish | the second toast slides off the 10-foot tabletop (S3a) |
| 292 | 9.73 s | swish | hard cut into the insert (S3b): the toast falls into frame |
| 312 | 10.40 s | pat | second toast lands butter-up on "up" (10.40 s) |
| 335 | 11.17 s | whoosh (centred) | S3b -> S3c dissolve, mid-point |
| 406 | 13.53 s | whoosh (centred) | S3c -> S3d reveal dissolve, "Your friend" (13.44 s) |
| 428 | 14.27 s | sting (UI pop) | punchline "ladder" (14.28 s) |

Music (`music.py`): 120 bpm plucked loop (C - Am - F - G), comic drop-out frames 205-228 around "Splat", button
(C major stab + low thump) on "ladder" at 14.27 s, decays below -57 dBFS before the last frame; no hard cut.

Mix (`mix.py`): voice 0 dB; music bed -3 dB (reference RMS -20 dBFS), ducked a further 16 dB under the voice;
button (`button.wav`) -3 dB, not ducked; SFX -6 dB (reference peaks -3 dBFS); master: gain to -14 LUFS + look-ahead
true-peak limiter (ceiling -1.3 dBTP). Voice vs music during speech (speech band) must be >= 15 dB.
Result: `loudness.json`.
