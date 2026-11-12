"""Mix voice + SFX + music, duck the music under the voice, master to -14 LUFS / -1 dBTP, report loudness.

Usage: python scripts/audio/mix.py videos/<slug>
Reads  voice/voice.wav, audio/sfx.wav, audio/music.wav (48 kHz)
Writes audio/mix.wav (48 kHz, exact video length), audio/loudness.json, stems are the inputs.
Levels (SKILL "Mix"): voice unchanged, music +3 dB, SFX -6 dB, relative to the stems' nominal levels
(music RMS -20 dBFS, SFX peaks -3 dBFS, voice as delivered). Ducking: music -10 dB while the voice speaks
(30 ms attack, 250 ms release). Mastering: ffmpeg loudnorm two-pass, linear, I -14, TP -1.
"""
import json
import os
import re
import subprocess
import sys

import numpy as np
from scipy.io import wavfile

SR = 48000
FFMPEG = os.path.abspath("node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe")  # bundled with Remotion
db = lambda x: 10 ** (x / 20)


def read(p):
    sr, x = wavfile.read(p)
    assert sr == SR, f"{p}: {sr} Hz"
    x = x / float(np.iinfo(x.dtype).max + 1) if x.dtype.kind == "i" else x.astype(np.float64)
    return x if x.ndim == 1 else x.mean(axis=1)


def envelope(x, attack, release):
    a, r = np.exp(-1 / (attack * SR)), np.exp(-1 / (release * SR))
    out, e = np.zeros_like(x), 0.0
    for i, v in enumerate(np.abs(x)):
        c = a if v > e else r
        e = c * e + (1 - c) * v
        out[i] = e
    return out


def loudness(path):
    """EBU R128 integrated loudness (LUFS) and true peak (dBTP) via loudnorm's measuring pass (the ffmpeg bundled
    with Remotion has no ebur128 filter)."""
    log = subprocess.run([FFMPEG, "-hide_banner", "-nostats", "-i", path, "-af", "loudnorm=print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
    m = json.loads(log[log.rfind("{"):log.rfind("}") + 1])
    return m


def main(d):
    voice, sfx, music = read(f"{d}/voice/voice.wav"), read(f"{d}/audio/sfx.wav"), read(f"{d}/audio/music.wav")
    n = len(sfx)  # sfx/music are written at the exact video length
    voice = np.pad(voice, (0, max(0, n - len(voice))))[:n]
    music = music[:n]
    # Duck: gain falls 10 dB where the voice envelope is above -40 dBFS.
    ev = envelope(voice, 0.03, 0.25)
    duck = db(-10 * np.clip((20 * np.log10(ev + 1e-9) + 40) / 6, 0, 1))
    mix = voice + db(3) * music * duck + db(-6) * sfx
    pre = f"{d}/audio/premaster.wav"
    wavfile.write(pre, SR, mix.astype(np.float32))

    # Master: gain to -14 LUFS, then a look-ahead true-peak limiter (ceiling -1.3 dBTP); two rounds converge.
    out = f"{d}/audio/mix.wav"
    m = loudness(pre)
    os.remove(pre)  # intermediate: only metered
    x = mix
    for _ in range(3):
        x = limit(x * db(-14 - float(loudness_of(x)["input_i"])), -1.3)
    wavfile.write(out, SR, x.astype(np.float32))
    fin = loudness(out)
    i, tp = float(fin["input_i"]), float(fin["input_tp"])
    rep = {"integrated_lufs": i, "true_peak_dbtp": tp, "samples": n, "seconds": n / SR, "premaster": {"lufs": float(m["input_i"]), "dbtp": float(m["input_tp"])}}
    json.dump(rep, open(f"{d}/audio/loudness.json", "w"), indent=1)
    print(f"mix.wav: {n / SR:.3f} s, {i:.1f} LUFS integrated, true peak {tp:.1f} dBTP (premaster {m['input_i']} LUFS, {m['input_tp']} dBTP)")
    assert abs(i + 14) <= 0.5 and tp <= -1.0, "master outside -14 +-0.5 LUFS / -1 dBTP"


def loudness_of(x):
    tmp = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_meter.wav")
    wavfile.write(tmp, SR, x.astype(np.float32))
    try:
        return loudness(tmp)
    finally:
        os.remove(tmp)


def limit(x, ceiling_db, look=0.002, release=0.06):
    """Look-ahead peak limiter on 4x-oversampled peaks (true-peak estimate). Gain reaches its floor `look` s
    before each peak and recovers with a `release` s one-pole."""
    from scipy.ndimage import minimum_filter1d, uniform_filter1d
    from scipy.signal import resample_poly
    peak = np.abs(resample_poly(x, 4, 1))[: len(x) * 4].reshape(-1, 4).max(axis=1)
    need = np.minimum(1, db(ceiling_db) / np.maximum(peak, 1e-9))
    L = int(look * SR)
    need = uniform_filter1d(minimum_filter1d(need, 2 * L + 1), L)
    need = minimum_filter1d(need, L)  # the smoothing never lifts the gain above a peak's need
    r = np.exp(-1 / (release * SR))
    g, cur = np.empty_like(need), 1.0
    for k, v in enumerate(need):
        cur = v if v < cur else r * cur + (1 - r) * v
        g[k] = cur
    return x * g


if __name__ == "__main__":
    main(sys.argv[1])
