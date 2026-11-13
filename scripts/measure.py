"""Colour numbers for a still or a video (frames sampled evenly), compared against the dusk look targets.

usage: python scripts/measure.py <image-or-video> [more ...] [--frames N] [--light dusk|day|golden|night|interior]

luma     median Rec.709 luma of the sRGB frame (0-1)
std      tonal spread: standard deviation of luma
p5       5th percentile luma of non-ink pixels (ink = luma < .08)
C*p90    90th percentile CIELAB chroma
sat      mean HSV saturation
vignette mean luma of the outer corners (ellipse r > .9) / centre (r < .3); content-dependent, read as a trend.
         Target by --light: dusk, golden, night, interior 0.75-0.88; day exteriors DAY_VIGNETTE (sky and sunlit
         ground fill the corners, so the ratio sits above 1 whatever the vignette does)
dark L*  2nd percentile CIELAB L* outside the ink (ink = luma < .15, grown by 1 px): darks stay >= 14 (LOOK_SPEC)
dark C*  median chroma of the darkest 10 % outside the ink: coloured darks, never grey (>= 10)
dark hue hue of those darks (deg): brown (40-80) is out

Videos also get camera motion (every frame, block phase correlation on a 4x7 grid, px per frame at 1080 wide).
REFERENCE ONLY: whether the camera moves is decided by QA layer 1 ("Camera curve" in kit/toon/guard.tsx, from the
scene geometry). Optical flow under-reads flat sky, blurred backgrounds and far objects during push-ins.
Blocks without texture (mean gradient < 1 grey level/px at 540 wide: flat sky, blank walls) are skipped; frames with
fewer than 8 of 28 textured blocks are "untracked" and left out of the numbers below.
drift p50   median per-frame motion over textured blocks (reference >= 2.5)
drift p95   95th percentile (moves: <= 50)
still %     tracked frames moving < 0.5 px/f (reference <= 20 %: holds on beats)
still run   longest run of still tracked frames (reference <= 60)
"""
import os
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image

# 2026-11-13 (R11/R13/R14 measured): refs are darker (luma .29-.46), calmer (C*p90 27-49) and keep real darks (L* 16).
TARGETS = {"luma": (0.32, 0.50), "std": (0.18, 0.29), "sat": (0.3, 0.55), "C*p90": (40, 55), "vignette": (0.75, 0.88),
           "dark L*": (14, 100), "dark C*": (10, 200)}
# Day exteriors (mean over the sampled frames): _pipeline-test, day street, grade vig .14, measured 1.26 (single
# frames 0.92-1.75). See videos/_pipeline-test/TEST-REPORT.md.
DAY_VIGNETTE = (1.1, 1.4)
MIN_TRACKED, TEXTURE = 8, 1.0


def lab(rgb):
    c = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
    m = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ m.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return 116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])


def lab_chroma(rgb):
    _, a, b = lab(rgb)
    return np.hypot(a, b)


def measure(img):
    x = np.asarray(img.convert("RGB").resize((540, 960)), float) / 255
    y = x @ [0.2126, 0.7152, 0.0722]
    mx, mn = x.max(-1), x.min(-1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    h, w = y.shape
    cy, cx = np.mgrid[0:h, 0:w]
    r = np.hypot((cx - w / 2) / (w / 2), (cy - h / 2) / (h / 2))
    ink = y < 0.15  # world ink #1c1210 and graded character ink #2a1a14 (~.13); L* 19 is luma ~.18
    ink = ink | np.roll(ink, 1, 0) | np.roll(ink, -1, 0) | np.roll(ink, 1, 1) | np.roll(ink, -1, 1)
    L, A, B = lab(x)
    Ln = L[~ink]
    dark = (~ink) & (L <= np.percentile(Ln, 10))
    return {
        "luma": float(np.median(y)),
        "std": float(y.std()),
        "p5": float(np.percentile(y[y >= 0.08], 5)),
        "C*p90": float(np.percentile(lab_chroma(x), 90)),
        "sat": float(sat.mean()),
        "vignette": float(y[r > 0.9].mean() / y[r < 0.3].mean()),
        "dark L*": float(np.percentile(Ln, 2)),
        "dark C*": float(np.median(np.hypot(A[dark], B[dark]))),
        "dark hue": float(np.degrees(np.arctan2(np.median(B[dark]), np.median(A[dark]))) % 360),
    }


def frames(path, n):
    if path.lower().endswith((".png", ".jpg", ".jpeg")):
        return [Image.open(path)]
    out = tempfile.mkdtemp()
    # Remotion's bundled ffmpeg; grab n evenly spaced frames by timestamp.
    probe = subprocess.run(["npx", "remotion", "ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                           capture_output=True, text=True, shell=os.name == "nt").stdout
    dur = float([l for l in probe.split() if l.replace(".", "").isdigit()][-1])
    ims = []
    for i in range(n):
        f = os.path.join(out, f"{i}.png")
        subprocess.run(["npx", "remotion", "ffmpeg", "-loglevel", "error", "-y", "-ss", f"{dur * (i + 0.5) / n:.3f}", "-i", path, "-frames:v", "1", f],
                       capture_output=True, shell=os.name == "nt")
        ims.append(Image.open(f))
    return ims


def all_frames(path, width=540):
    out = tempfile.mkdtemp()
    subprocess.run(["npx", "remotion", "ffmpeg", "-loglevel", "error", "-y", "-i", path, "-vf", f"scale={width}:-2", os.path.join(out, "%05d.png")],
                   capture_output=True, shell=os.name == "nt")
    return [os.path.join(out, f) for f in sorted(os.listdir(out))]


def shift(a, b):
    """Sub-pixel translation between two equal grey blocks (phase correlation + parabola peak fit)."""
    win = np.outer(np.hanning(a.shape[0]), np.hanning(a.shape[1]))
    fa, fb = np.fft.fft2((a - a.mean()) * win), np.fft.fft2((b - b.mean()) * win)
    r = fa * np.conj(fb)
    c = np.real(np.fft.ifft2(r / np.maximum(np.abs(r), 1e-9)))
    py, px = np.unravel_index(np.argmax(c), c.shape)
    def sub(i, n, line):
        l, m, rr = line[(i - 1) % n], line[i], line[(i + 1) % n]
        d = l - 2 * m + rr
        return i + (0.5 * (l - rr) / d if abs(d) > 1e-9 else 0)
    dy, dx = sub(py, c.shape[0], c[:, px]), sub(px, c.shape[1], c[py, :])
    dy = dy - c.shape[0] if dy > c.shape[0] / 2 else dy
    dx = dx - c.shape[1] if dx > c.shape[1] / 2 else dx
    return np.hypot(dx, dy)


def motion(path):
    files = all_frames(path)
    grey = [np.asarray(Image.open(f).convert("L"), float) for f in files]
    h, w = grey[0].shape
    bs = 96
    ys = np.linspace(bs // 2, h - bs - bs // 2, 7).astype(int)
    xs = np.linspace(bs // 4, w - bs - bs // 4, 4).astype(int)
    scale = 1080 / w
    per = []
    untracked = 0
    for a, b in zip(grey, grey[1:]):
        # Flat blocks (clear sky, blank walls) have nothing to track: they would read as "still", so skip them.
        # Mean gradient, not std: a smooth sky gradient has std > 4 but no edges to correlate.
        blocks = [(y, x) for y in ys for x in xs if np.hypot(*np.gradient(a[y:y + bs, x:x + bs])).mean() > TEXTURE]
        if len(blocks) < MIN_TRACKED:
            untracked += 1
            continue
        per.append(float(np.median([shift(a[y:y + bs, x:x + bs], b[y:y + bs, x:x + bs]) for y, x in blocks])) * scale)
    print(f"  tracked frames {len(per)} of {len(grey) - 1} (untracked: fewer than {MIN_TRACKED} textured blocks)")
    if not per:
        return {}
    per = np.array(per)
    still = per < 0.5
    run = best = 0
    for s_ in still:
        run = run + 1 if s_ else 0
        best = max(best, run)
    runs, start = [], None  # frame ranges of still runs (frame i = motion from frame i to i + 1)
    for i, s_ in enumerate(list(still) + [False]):
        if s_ and start is None:
            start = i
        elif not s_ and start is not None:
            runs.append((start, i - 1))
            start = None
    print("  still frames (tracked-frame index) " + (", ".join(f"{a}-{b}" if b > a else str(a) for a, b in runs) or "none"))
    return {"drift p50": float(np.median(per)), "drift p95": float(np.percentile(per, 95)), "still %": float(still.mean() * 100), "still run": best}


# Refs R11/R13: real holds (13-18 % still, runs up to ~50 f) between fast moves (p95 44-49).
MOTION_TARGETS = {"drift p50": (2.5, None), "drift p95": (None, 50), "still %": (None, 20), "still run": (None, 60)}


def main():
    args = sys.argv[1:]
    n = 5
    if "--frames" in args:
        i = args.index("--frames")
        n = int(args[i + 1])
        del args[i : i + 2]
    light = "dusk"
    if "--light" in args:
        i = args.index("--light")
        light = args[i + 1]
        del args[i : i + 2]
    targets = {**TARGETS, "vignette": DAY_VIGNETTE if light == "day" else TARGETS["vignette"]}
    for path in args:
        ms = [measure(im) for im in frames(path, n)]
        print(f"{path} (light: {light})")
        for k, (lo, hi) in targets.items():
            v = float(np.mean([m[k] for m in ms]))
            ok = "ok" if (lo - 0.02 * max(hi, 1) <= v <= hi + 0.02 * max(hi, 1) if lo == hi else lo <= v <= hi) else "OFF"
            tgt = f"{lo}" if lo == hi else f"{lo}-{hi}"
            print(f"  {k:9s} {v:7.3f}   target {tgt:10s} {ok}")
        hue = float(np.mean([m["dark hue"] for m in ms]))
        print(f"  dark hue  {hue:7.1f}   target not 40-80 {'OFF (brown)' if 40 <= hue <= 80 else 'ok'}")
        if not path.lower().endswith((".png", ".jpg", ".jpeg")):
            print("  camera motion (reference only: QA layer 1 'Camera curve' decides)")
            for k, v in motion(path).items():
                lo, hi = MOTION_TARGETS[k]
                ok = "ok" if (lo is None or v >= lo) and (hi is None or v <= hi) else "low (info)"
                tgt = f">= {lo}" if lo is not None else f"<= {hi}"
                print(f"  {k:9s} {v:7.2f}   target {tgt:10s} {ok}")


if __name__ == "__main__":
    main()
