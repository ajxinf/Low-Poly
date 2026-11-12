"""Original score stem: a bouncy plucked loop (bass + marimba-ish melody + soft shaker) ending on a button chord.

Usage: python scripts/audio/music.py videos/<slug>
Reads  videos/<slug>/audio/events.json  "music": {"bpm", "frames", "button" (frame of the final hit), "stop": [f0, f1]
       (optional comic drop-out, e.g. on an impact)}
Writes videos/<slug>/audio/music.wav (48 kHz mono float, exact length, RMS ~ -20 dBFS before the mix).
Everything after the button is the chord's natural decay: no hard cut.
"""
import json
import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 48000
rng = np.random.default_rng(3)
mtof = lambda m: 440 * 2 ** ((m - 69) / 12)


def pluck(midi, dur, bright=1.0, decay=0.35):
    """Additive pluck: harmonics with faster decay up the series (marimba/pizz flavour)."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = mtof(midi)
    out = np.zeros(n)
    for h, a in [(1, 1.0), (2, 0.35 * bright), (3, 0.12 * bright), (4, 0.18 * bright)]:
        if f * h < SR / 2.2:
            out += a * np.sin(2 * np.pi * f * h * t) * np.exp(-t * h / decay)
    return out * np.minimum(t / 0.004, 1) * np.minimum(1, (n - np.arange(n)) / (0.01 * SR))  # 10 ms release: no clicks


def main(d):
    cfg = json.load(open(f"{d}/audio/events.json"))["music"]
    fps = 30
    n = round(cfg["frames"] / fps * SR)
    beat = 60 / cfg["bpm"]
    button = cfg["button"] / fps
    out = np.zeros(n + SR)
    # C - Am - F - G, two beats each; bass on beats, melody on eighths from a C-major pentatonic pattern.
    roots = [48, 45, 41, 43]
    chord_tones = {48: [60, 64, 67], 45: [57, 60, 64], 41: [57, 60, 65], 43: [59, 62, 67]}
    pent = [60, 62, 64, 67, 69, 72]
    pattern = [0, 2, 4, 2, 3, 1, 2, 5]
    t, i = 0.0, 0
    while t < button - 0.05:
        bar = int(t / (2 * beat)) % 4
        root = roots[bar]
        if abs(t / beat - round(t / beat)) < 1e-6:
            s = pluck(root, beat * 1.2, bright=0.6, decay=0.45) * 0.55
            a = int(t * SR)
            out[a:a + len(s)] += s
        m = pent[pattern[i % len(pattern)]] if i % 4 != 3 else chord_tones[root][(i // 4) % 3] + 12
        s = pluck(m, beat * 0.9, decay=0.22) * 0.32
        a = int(t * SR)
        out[a:a + len(s)] += s
        # shaker on the off-eighths
        if i % 2:
            k = int(0.05 * SR)
            sh = sosfilt(butter(2, 5000, "highpass", fs=SR, output="sos"), rng.standard_normal(k)) * np.hanning(k) * 0.05
            out[a:a + k] += sh
        t += beat / 2
        i += 1
    # Comic drop-out (the impact gets silence), 20 ms ramps.
    if cfg.get("stop"):
        a, b = (int(x / fps * SR) for x in cfg["stop"])
        g = np.ones(len(out))
        r = int(0.02 * SR)
        g[a:b] = 0
        g[a - r:a] = np.linspace(1, 0, r)
        g[b:b + r] = np.linspace(0, 1, r)
        out *= g
    # Button: C major stab + low thump on the punchline word, decays to silence inside the video.
    a = int(button * SR)
    # decay 0.12 s: below -45 dB 0.65 s later, so the button rings out before the last frame (no cut).
    stab = sum(pluck(m, 1.0, bright=1.2, decay=0.12) for m in [48, 60, 64, 67, 72]) * 0.38
    stab += np.sin(2 * np.pi * np.cumsum(np.geomspace(120, 50, SR)) / SR) * np.exp(-np.arange(SR) / SR / 0.08) * 0.5
    out[a:a + len(stab)] += stab
    out = out[:n]
    out *= np.minimum(1, (n - np.arange(n)) / (0.05 * SR))  # 50 ms safety fade on the last samples
    out *= 10 ** (-20 / 20) / np.sqrt(np.mean(out[: a] ** 2))
    wavfile.write(f"{d}/audio/music.wav", SR, out.astype(np.float32))
    print(f"music.wav: {n / SR:.3f} s, button at {button:.2f} s, tail level {20 * np.log10(np.abs(out[-int(0.06 * SR):-int(0.05 * SR)]).max() + 1e-9):.1f} dBFS before the fade")


if __name__ == "__main__":
    main(sys.argv[1])
