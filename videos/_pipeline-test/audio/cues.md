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
| 237 | 7.90 s | whoosh (centred) | S2 -> S3 dissolve, mid-point |
| 312 | 10.40 s | pat | second toast lands butter-up on "up" (10.40 s) |
| 428 | 14.27 s | sting (UI pop) | punchline "ladder" (14.28 s) |

Music (`music.py`): 120 bpm plucked loop (C - Am - F - G), comic drop-out frames 205-228 around "Splat", button
(C major stab + low thump) on "ladder" at 14.27 s, decays below -57 dBFS before the last frame; no hard cut.

Mix (`mix.py`): voice 0 dB, music +3 dB (nominal RMS -20 dBFS), SFX -6 dB (nominal peaks -3 dBFS), music ducked
-10 dB under the voice; master: gain to -14 LUFS + look-ahead true-peak limiter (ceiling -1.3 dBTP).
Result: `loudness.json`.
