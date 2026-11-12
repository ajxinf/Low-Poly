"""Synthesized SFX stem from an event table (no samples, no licences).

Usage: python scripts/audio/sfx_gen.py videos/<slug>
Reads  videos/<slug>/audio/events.json  {"fps", "frames", "events": [{"f", "sfx", "note"}]}
Writes videos/<slug>/audio/sfx.wav (48 kHz mono float, exact video length; peaks around -3 dBFS before the mix).
Sounds: step, whoosh, swish, splat, pat, pop, sting. Each event starts on its frame (the transient lands there;
whooshes are centred on it).
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


SOUNDS = {"step": step, "whoosh": whoosh, "swish": swish, "splat": splat, "pat": pat, "pop": pop, "sting": sting}
CENTRED = {"whoosh"}


def main(d):
    cfg = events.load(d)  # word-anchored cues resolved (scripts/audio/events.py)
    n = round(cfg["frames"] / cfg["fps"] * SR)
    out = np.zeros(n)
    for e in cfg["events"]:
        s = SOUNDS[e["sfx"]]()
        s = s / np.max(np.abs(s)) * 10 ** (-3 / 20)  # every sound peaks at -3 dBFS; the mix sets the stem level
        at = round(e["f"] / cfg["fps"] * SR) - (len(s) // 2 if e["sfx"] in CENTRED else 0)
        a, b = max(at, 0), min(at + len(s), n)
        out[a:b] += s[a - at:b - at]
    wavfile.write(f"{d}/audio/sfx.wav", SR, out.astype(np.float32))
    print(f"sfx.wav: {len(cfg['events'])} events, {n / SR:.3f} s")


if __name__ == "__main__":
    main(sys.argv[1])
