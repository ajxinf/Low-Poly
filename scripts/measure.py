"""Colour numbers for a still or a video (frames sampled evenly), compared against the dusk look targets.

usage: python scripts/measure.py <image-or-video> [more ...] [--frames N]

luma     median Rec.709 luma of the sRGB frame (0-1)
p5       5th percentile luma of non-ink pixels (ink = luma < .08)
C*p90    90th percentile CIELAB chroma
sat      mean HSV saturation
vignette mean luma of the outer corners (ellipse r > .9) / centre (r < .3); content-dependent, read as a trend
"""
import os
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image

TARGETS = {"luma": (0.39, 0.51), "p5": (0.08, 0.17), "C*p90": (57, 68), "sat": (0.50, 0.58), "vignette": (0.85, 0.85)}


def lab_chroma(rgb):
    c = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
    m = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ m.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.hypot(500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2]))


def measure(img):
    x = np.asarray(img.convert("RGB").resize((540, 960)), float) / 255
    y = x @ [0.2126, 0.7152, 0.0722]
    mx, mn = x.max(-1), x.min(-1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    h, w = y.shape
    cy, cx = np.mgrid[0:h, 0:w]
    r = np.hypot((cx - w / 2) / (w / 2), (cy - h / 2) / (h / 2))
    return {
        "luma": float(np.median(y)),
        "p5": float(np.percentile(y[y >= 0.08], 5)),
        "C*p90": float(np.percentile(lab_chroma(x), 90)),
        "sat": float(sat.mean()),
        "vignette": float(y[r > 0.9].mean() / y[r < 0.3].mean()),
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


if __name__ == "__main__":
    main()
