"""Colour numbers for a still or a video (frames sampled evenly), compared against the dusk look targets.

usage: python scripts/measure.py <image-or-video> [more ...] [--frames N]

luma     median Rec.709 luma of the sRGB frame (0-1)
std      tonal spread: standard deviation of luma
p5       5th percentile luma of non-ink pixels (ink = luma < .08)
C*p90    90th percentile CIELAB chroma
sat      mean HSV saturation
vignette mean luma of the outer corners (ellipse r > .9) / centre (r < .3); content-dependent, read as a trend
dark L*  2nd percentile CIELAB L* outside the ink (ink = luma < .15, grown by 1 px): darks stay >= 19 (LOOK_SPEC)
dark C*  median chroma of the darkest 10 % outside the ink: coloured darks, never grey (>= 10)
dark hue hue of those darks (deg): brown (40-80) is out

Videos also get camera motion (every frame, block phase correlation on a 4x7 grid, px per frame at 1080 wide):
drift p50   median per-frame motion over textured blocks (flat sky is skipped) (target >= 2.5)
drift p95   95th percentile (moves: <= 25)
still %     frames moving < 0.5 px/f (target <= 5 %)
still run   longest run of still frames (target < 12)
"""
import os
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image

TARGETS = {"luma": (0.43, 0.57), "std": (0.21, 0.29), "sat": (0.38, 0.65), "C*p90": (55, 68), "vignette": (0.8, 0.9),
           "dark L*": (19, 100), "dark C*": (10, 200)}


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
    for a, b in zip(grey, grey[1:]):
        # Flat blocks (clear sky, blank walls) have nothing to track: they would read as "still", so skip them.
        blocks = [(y, x) for y in ys for x in xs if a[y:y + bs, x:x + bs].std() > 4]
        per.append(float(np.median([shift(a[y:y + bs, x:x + bs], b[y:y + bs, x:x + bs]) for y, x in blocks] or [0])) * scale)
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
    print("  still frames " + (", ".join(f"{a}-{b}" if b > a else str(a) for a, b in runs) or "none"))
    return {"drift p50": float(np.median(per)), "drift p95": float(np.percentile(per, 95)), "still %": float(still.mean() * 100), "still run": best}


MOTION_TARGETS = {"drift p50": (2.5, None), "drift p95": (None, 25), "still %": (None, 5), "still run": (None, 11)}


def main():
    args = sys.argv[1:]
    n = 5
    if "--frames" in args:
        i = args.index("--frames")
        n = int(args[i + 1])
        del args[i : i + 2]
    for path in args:
        ms = [measure(im) for im in frames(path, n)]
        print(path)
        for k, (lo, hi) in TARGETS.items():
            v = float(np.mean([m[k] for m in ms]))
            ok = "ok" if (lo - 0.02 * max(hi, 1) <= v <= hi + 0.02 * max(hi, 1) if lo == hi else lo <= v <= hi) else "OFF"
            tgt = f"{lo}" if lo == hi else f"{lo}-{hi}"
            print(f"  {k:9s} {v:7.3f}   target {tgt:10s} {ok}")
        hue = float(np.mean([m["dark hue"] for m in ms]))
        print(f"  dark hue  {hue:7.1f}   target not 40-80 {'OFF (brown)' if 40 <= hue <= 80 else 'ok'}")
        if not path.lower().endswith((".png", ".jpg", ".jpeg")):
            for k, v in motion(path).items():
                lo, hi = MOTION_TARGETS[k]
                ok = "ok" if (lo is None or v >= lo) and (hi is None or v <= hi) else "OFF"
                tgt = f">= {lo}" if lo is not None else f"<= {hi}"
                print(f"  {k:9s} {v:7.2f}   target {tgt:10s} {ok}")


if __name__ == "__main__":
    main()
