"""Synthesized SFX stem from an event table (no samples, no licences).

Usage: python scripts/audio/sfx_gen.py videos/<slug>
Reads  videos/<slug>/audio/events.json  {"fps", "frames", "events": [{"f", "sfx", "note"}]}
Writes videos/<slug>/audio/sfx.wav (48 kHz mono float, exact video length; peaks around -3 dBFS before the mix).
Sounds: step, whoosh, swish, splat, pat, pop, sting, groan (a crowd of zombies moaning, 3 s bed), crash (a big
impact: a cart through a shop). Each event starts on its frame (the transient lands there;
whooshes are centred on it).

Air sounds (whoosh, swish) are the ones that get annoying (pilot feedback, 2026-11-13): they play quieter than the
hits (LEVEL_DB) and the table is refused when it overuses them (check_air): at most one whoosh per 20 s, one swish
per 10 s, and any two air sounds at least 3 s apart. Dissolves get NO sound by default; a whoosh is for a real fast
camera move (a whip, a fly-through) or an object flying past the lens.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import events
import json
import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 48000
rng = np.random.default_rng(7)


def env(n, attack, decay):
    t = np.arange(n) / SR
    return np.minimum(t / max(attack, 1e-4), 1) * np.exp(-t / decay)


def band(x, lo, hi):
    return sosfilt(butter(2, [lo, hi], "bandpass", fs=SR, output="sos"), x)


def low(x, hz):
    return sosfilt(butter(2, hz, "lowpass", fs=SR, output="sos"), x)


def sweep_sine(f0, f1, n):
    f = np.geomspace(f0, f1, n)
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def step():
    n = int(0.09 * SR)
    thump = sweep_sine(140, 60, n) * env(n, 0.002, 0.025)
    scuff = band(rng.standard_normal(n), 300, 2500) * env(n, 0.001, 0.015)
    return 0.8 * thump + 0.35 * scuff


def whoosh():
    n = int(0.55 * SR)
    noise = rng.standard_normal(n)
    # Sweep a band up then down across the dissolve (two halves, cross-faded by the hann envelope).
    a = band(noise, 300, 1200)
    b = band(noise, 1200, 4000)
    k = np.linspace(0, 1, n)
    return (a * (1 - k) + b * k) * np.hanning(n) * 0.9


def swish():
    n = int(0.18 * SR)
    return band(rng.standard_normal(n), 1500, 6000) * np.hanning(n) * 0.35


def splat():
    n = int(0.45 * SR)
    thump = sweep_sine(160, 45, n) * env(n, 0.001, 0.09)
    wet = low(rng.standard_normal(n), 1400) * env(n, 0.001, 0.05)
    slap = band(rng.standard_normal(n), 2000, 7000) * env(n, 0.0005, 0.008)
    return 1.0 * thump + 0.9 * wet + 0.5 * slap


def pat():
    n = int(0.2 * SR)
    return 0.6 * sweep_sine(220, 110, n) * env(n, 0.001, 0.03) + 0.25 * low(rng.standard_normal(n), 900) * env(n, 0.001, 0.02)


def pop():
    n = int(0.12 * SR)
    return sweep_sine(500, 1400, n) * env(n, 0.001, 0.03) * 0.6


def sting():
    """UI pop sting: two quick rising blips with a bright tail."""
    out = np.zeros(int(0.5 * SR))
    for i, (f0, f1) in enumerate([(700, 1050), (1050, 1575)]):
        n = int(0.22 * SR)
        s = int(i * 0.07 * SR)
        tone = sweep_sine(f0, f1, n) + 0.3 * sweep_sine(2 * f0, 2 * f1, n)
        out[s:s + n] += tone * env(n, 0.001, 0.07) * 0.5
    return out


def groan():
    """Crowd of moaning zombies: several detuned low vowel-ish formant voices with slow wobble, 3 s, soft ends."""
    n = int(3.0 * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for k in range(7):
        f0 = 85 + 22 * rng.random()
        wob = 1 + 0.06 * np.sin(2 * np.pi * (0.4 + 0.5 * rng.random()) * t + 6 * rng.random())
        saw = 2 * ((np.cumsum(f0 * wob) / SR) % 1) - 1
        voice = band(saw, 250 + 100 * rng.random(), 900 + 300 * rng.random())  # an "uhhh" formant
        out += voice * (0.6 + 0.4 * np.sin(2 * np.pi * (0.2 + 0.3 * rng.random()) * t + k)) ** 2
    out += 0.3 * band(rng.standard_normal(n), 150, 600)
    return out * np.minimum(t / 0.6, 1) * np.minimum((n - np.arange(n)) / (0.8 * SR), 1)


def crash():
    """Big impact: a low boom, a burst of debris noise and rattling bits over 1.2 s."""
    n = int(1.2 * SR)
    boom = sweep_sine(110, 35, n) * env(n, 0.001, 0.25)
    debris = band(rng.standard_normal(n), 400, 6000) * env(n, 0.001, 0.18)
    bits = np.zeros(n)
    for i in range(14):
        a = int((0.05 + 0.9 * rng.random()) * SR * 0.9)
        m = int(0.04 * SR)
        bits[a:a + m] += band(rng.standard_normal(m), 2000, 8000)[: n - a] * env(m, 0.0005, 0.01)[: n - a] * 0.5
    return 1.0 * boom + 0.8 * debris + bits


# Peak level per sound relative to the -3 dBFS hits (air sounds sit under the voice and the hits; the groan is a bed).
LEVEL_DB = {"whoosh": -10, "swish": -8, "groan": -12}
AIR = {"whoosh": 20.0, "swish": 10.0}  # max one per this many seconds
AIR_GAP = 3.0  # s between any two air sounds


def check_air(evs, fps, dur):
    """Refuse an event table that overuses whooshes/swishes (they turn into noise)."""
    errs = []
    for k, per in AIR.items():
        n = sum(e["sfx"] == k for e in evs)
        if n > max(1, int(dur / per)):
            errs.append(f"{n} x {k} in {dur:.0f} s (max {max(1, int(dur / per))}: one per {per:.0f} s)")
    air = sorted(e["f"] for e in evs if e["sfx"] in AIR)
    for a, b in zip(air, air[1:]):
        if (b - a) / fps < AIR_GAP:
            errs.append(f"air sounds at frames {a} and {b} are {(b - a) / fps:.1f} s apart (min {AIR_GAP:.0f} s)")
    if errs:
        raise SystemExit("sfx_gen: too many air sounds (whoosh/swish):\n  " + "\n  ".join(errs))


SOUNDS = {"groan": groan, "crash": crash, "step": step, "whoosh": whoosh, "swish": swish, "splat": splat, "pat": pat, "pop": pop, "sting": sting}
CENTRED = {"whoosh"}


def main(d):
    cfg = events.load(d)  # word-anchored cues resolved (scripts/audio/events.py)
    n = round(cfg["frames"] / cfg["fps"] * SR)
    out = np.zeros(n)
    check_air(cfg["events"], cfg["fps"], cfg["frames"] / cfg["fps"])
    for e in cfg["events"]:
        s = SOUNDS[e["sfx"]]()
        s = s / np.max(np.abs(s)) * 10 ** ((-3 + LEVEL_DB.get(e["sfx"], 0)) / 20)  # hits peak at -3 dBFS; air sounds lower
        at = round(e["f"] / cfg["fps"] * SR) - (len(s) // 2 if e["sfx"] in CENTRED else 0)
        a, b = max(at, 0), min(at + len(s), n)
        out[a:b] += s[a - at:b - at]
    wavfile.write(f"{d}/audio/sfx.wav", SR, out.astype(np.float32))
    print(f"sfx.wav: {len(cfg['events'])} events, {n / SR:.3f} s")


if __name__ == "__main__":
    main(sys.argv[1])
