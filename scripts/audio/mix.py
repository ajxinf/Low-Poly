"""Mix voice + SFX + music, duck the music under the voice, master to -14 LUFS / -1 dBTP, report loudness.

Usage: python scripts/audio/mix.py videos/<slug>
Reads  voice/voice.wav + voice/words.json, audio/sfx.wav, audio/music.wav (bed), audio/button.wav (48 kHz)
Writes audio/mix.wav (48 kHz, exact video length), audio/loudness.json, public/<slug>/mix.wav (Studio preview).
Levels (toon-world-short SKILL "Mix"), relative to the stems' reference levels (music bed RMS -20 dBFS, SFX peaks
-3 dBFS each, voice as delivered by ElevenLabs): voice 0 dB, music bed -3 dB, button -3 dB (not ducked), SFX -6 dB.
Ducking: bed -16 dB while the voice speaks (30 ms attack, 250 ms release).
Check: voice vs music in the speech band (200-4000 Hz) during the words of words.json must be >= 15 dB (FAIL
otherwise), and the button must stay below the voice on the last word.
Mastering: gain to -14 LUFS + look-ahead true-peak limiter (ceiling -1.3 dBTP), metered with ffmpeg loudnorm.
"""
import json
import os
import re
import subprocess
import sys

import numpy as np
from scipy.io import wavfile

SR = 48000
MUSIC_DB, BUTTON_DB, SFX_DB, DUCK_DB = -3, -3, -6, 16
MIN_GAP_DB = 15
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
    button = read(f"{d}/audio/button.wav")[:n]
    # Duck the bed: gain falls DUCK_DB where the voice envelope is above -40 dBFS (full depth 6 dB above that).
    ev = envelope(voice, 0.03, 0.25)
    duck = db(-DUCK_DB * np.clip((20 * np.log10(ev + 1e-9) + 40) / 6, 0, 1))
    # Per video: "music": {"button_db": -12} when the last word is quiet (a deadpan line) and the button would bury it.
    button_db = json.load(open(f"{d}/audio/events.json"))["music"].get("button_db", BUTTON_DB)
    mus = db(MUSIC_DB) * music[:n] * duck + db(button_db) * button
    mix = voice + mus + db(SFX_DB) * sfx
    gap = voice_gap(voice, mus, json.load(open(f"{d}/voice/words.json")))
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
    rep = {"integrated_lufs": i, "true_peak_dbtp": tp, "samples": n, "seconds": n / SR,
           "premaster": {"lufs": float(m["input_i"]), "dbtp": float(m["input_tp"])},
           "levels_db": {"voice": 0, "music_bed": MUSIC_DB, "button": button_db, "sfx": SFX_DB, "duck": -DUCK_DB}, **gap}
    json.dump(rep, open(f"{d}/audio/loudness.json", "w"), indent=1)
    slug = os.path.basename(os.path.normpath(d))
    os.makedirs(f"public/{slug}", exist_ok=True)  # Studio preview: Video.tsx mounts it (16-bit keeps public/ small)
    wavfile.write(f"public/{slug}/mix.wav", SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))
    print(f"mix.wav: {n / SR:.3f} s, {i:.1f} LUFS integrated, true peak {tp:.1f} dBTP (premaster {m['input_i']} LUFS, {m['input_tp']} dBTP)")
    print(f"voice vs music in speech: {gap['voice_music_gap_db']:.1f} dB (lowest word {gap['voice_music_gap_min_word_db']:.1f} dB on {gap['worst_word']}); "
          f"voice vs button on the last word: {gap['voice_button_gap_db']:.1f} dB")
    assert abs(i + 14) <= 0.5 and tp <= -1.0, "master outside -14 +-0.5 LUFS / -1 dBTP"
    assert gap["voice_music_gap_db"] >= MIN_GAP_DB, f"FAIL: voice only {gap['voice_music_gap_db']:.1f} dB over the music (needs >= {MIN_GAP_DB})"
    # The toon skill's rule (15 dB); this only checked > 0, so the pilot shipped at 3.3 dB (review H4).
    assert gap["voice_button_gap_db"] >= MIN_GAP_DB, f"FAIL: button only {gap['voice_button_gap_db']:.1f} dB under the last word (needs >= {MIN_GAP_DB}): lower music.button_db"


def voice_gap(voice, mus, words):
    """Speech-band (200-4000 Hz) RMS of the voice vs the music (bed + button, as mixed) during the spoken words."""
    from scipy.signal import butter, sosfilt
    sos = butter(4, [200, 4000], "bandpass", fs=SR, output="sos")
    v, m = sosfilt(sos, voice), sosfilt(sos, mus)
    rms = lambda z: np.sqrt(np.mean(z ** 2) + 1e-20)
    spans = [(int(w["start"] * SR), int(w["end"] * SR)) for w in words]
    idx = np.concatenate([np.arange(a, b) for a, b in spans])
    per = [(20 * np.log10(rms(v[a:b]) / rms(m[a:b])), w["text"]) for (a, b), w in zip(spans, words)]
    a, b = spans[-1]
    return {"voice_music_gap_db": round(float(20 * np.log10(rms(v[idx]) / rms(m[idx]))), 1),
            "voice_music_gap_min_word_db": round(float(min(per)[0]), 1), "worst_word": min(per)[1],
            "voice_button_gap_db": round(float(20 * np.log10(rms(v[a:b]) / rms(m[a:b]))), 1)}


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
