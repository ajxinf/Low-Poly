"""Find defects in a rendered short by looking at the pixels (no scene access needed).

Usage: python scripts/video_qa.py video.mp4 [plan.json] [--out out/qa/<name>]
Needs: pip install opencv-python numpy

plan.json (optional, written by the render step) marks things that are intended, so they are not flagged:
  {"cuts": [130, 412], "xfade": [[300, 310]], "flash": [[60, 64]], "kicks": [[220, 228]], "whips": [[500, 515]]}

Checks (frame numbers are 0-based):
  POP       unplanned hard cut / sudden image change
  FROZEN    image identical for >= 12 frames (dead hold)
  SNAP      camera speed > 40 px/f (1080 wide) with no motion blur, outside planned whips
  JERK      camera acceleration spike: speed or zoom changes abruptly, outside cuts, kicks and whips
  SHAKE     camera direction flips sign 3+ times in 6 frames outside planned kicks (jitter / wobble)
  FLICKER   brightness jumps and comes back within 4 frames (light popping, z-fighting, shadow acne)
  LIGHTJUMP brightness or colour cast shifts > threshold between neighbouring frames inside one shot
  CRUSH     > 6 % of the frame is crushed black (L < 0.05) outside flashes/fades
  CLIP      > 4 % of the frame is clipped white (L > 0.98) outside flashes
  WASH      washed-out frame: bright with no darks (L mean > WASH_MEAN and p25 > WASH_P25), e.g. a lens inside a
            light's glow or haze (pilot generator shot, 2026-11-13); 3+ frames in a row
  EDGEPOP   a large object appears/disappears at the frame edge between two frames (culling / near-plane clip)
Writes <out>/report.md, <out>/flags.json and one 3-frame strip per flag (before / flagged / after).
"""
import json
import os
import sys

import cv2
import numpy as np
from scipy.ndimage import median_filter

# Thresholds calibrated on 4 correct reference shorts (3,700 frames): each sits just above the reference p99.5,
# so a correct video should produce (almost) no flags.
JERK_PX = 20.0      # change of 5-frame-smoothed camera velocity, px/f per frame (ref p99.5 = 20)
JERK_ZOOM = 2.2     # change of smoothed zoom rate, %/f per frame (ref p99.5 = 2.2)
FLICKER_DL = 0.025  # brightness jump that comes back within 3 frames (ref max 0.020)
LIGHT_DL = 0.05     # brightness jump that stays, inside a shot
LIGHT_CAST = 4.0    # colour cast jump (Lab a/b) inside a shot

args = [a for a in sys.argv[1:] if not a.startswith("--")]
out_dir = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else None
video = args[0]
plan = json.load(open(args[1])) if len(args) > 1 and args[1].endswith(".json") else {}
if out_dir is None:
    out_dir = os.path.join("out", "qa", os.path.splitext(os.path.basename(video))[0])
os.makedirs(out_dir, exist_ok=True)


def spans(key, pad=1):
    s = set()
    for a, b in plan.get(key, []):
        s.update(range(a - pad, b + pad + 1))
    return s


auto = "cuts" not in plan  # no plan: detect transitions ourselves and report them as info, not defects
cuts = set()
for c in plan.get("cuts", []):
    cuts.update((c - 1, c, c + 1))
xfade, flash, kicks, whips = spans("xfade"), spans("flash"), spans("kicks", 2), spans("whips", 2)
planned_change = cuts | xfade | flash

cap = cv2.VideoCapture(video)
fps = cap.get(cv2.CAP_PROP_FPS) or 30
frames, gray, stats = [], [], []
while True:
    ok, f = cap.read()
    if not ok:
        break
    s = cv2.resize(f, (360, 640), interpolation=cv2.INTER_AREA)
    frames.append(s)
    g = cv2.cvtColor(s, cv2.COLOR_BGR2GRAY)
    gray.append(g)
    lab = cv2.cvtColor(s, cv2.COLOR_BGR2LAB).astype(np.float32)
    L = lab[..., 0] / 255
    stats.append(dict(L=float(L.mean()), a=float(lab[..., 1].mean() - 128), b=float(lab[..., 2].mean() - 128),
                      crush=float((L < 0.05).mean()), clip=float((L > 0.98).mean()),
                      p25=float(np.percentile(L, 25)),
                      sharp=float(cv2.Laplacian(g, cv2.CV_32F).var())))
n = len(frames)

# camera motion per frame (translation at frame centre in 1080-wide px, zoom %, roll deg)
mot = [dict(tx=0.0, ty=0.0, z=0.0, r=0.0, ok=False)]
for i in range(1, n):
    m = dict(tx=0.0, ty=0.0, z=0.0, r=0.0, ok=False)
    p0 = cv2.goodFeaturesToTrack(gray[i - 1], 400, 0.01, 8)
    if p0 is not None and len(p0) >= 12:
        p1, st, _ = cv2.calcOpticalFlowPyrLK(gray[i - 1], gray[i], p0, None, winSize=(21, 21), maxLevel=3)
        k = st.ravel() == 1
        if k.sum() >= 30:
            M, inl = cv2.estimateAffinePartial2D(p0[k], p1[k], method=cv2.RANSAC, ransacReprojThreshold=2)
            if M is not None and inl is not None and inl.sum() >= 30:
                c2 = M @ np.array([180, 320, 1])
                m = dict(tx=float((c2[0] - 180) * 3), ty=float((c2[1] - 320) * 3),
                         z=float((np.hypot(M[0, 0], M[1, 0]) - 1) * 100),
                         r=float(np.degrees(np.arctan2(M[1, 0], M[0, 0]))), ok=True)
    mot.append(m)

flags = []
hc = [1.0]
for i in range(1, n):
    h1 = cv2.calcHist([frames[i - 1]], [0, 1, 2], None, [8, 8, 8], [0, 256] * 3)
    h2 = cv2.calcHist([frames[i]], [0, 1, 2], None, [8, 8, 8], [0, 256] * 3)
    hc.append(cv2.compareHist(cv2.normalize(h1, h1), cv2.normalize(h2, h2), cv2.HISTCMP_CORREL))
trans = set()
for i in range(1, n):
    if hc[i] < 0.9 or not mot[i]["ok"]:
        trans.update(range(i - 5, i + 6))
if auto:
    planned_change = planned_change | trans


def flag(kind, f, note):
    flags.append(dict(kind=kind, frame=int(f), time=round(f / fps, 2), note=note))


# POP and FROZEN
run = 0
for i in range(1, n):
    d = float(np.abs(gray[i].astype(np.int16) - gray[i - 1].astype(np.int16)).mean())
    corr = hc[i]
    if not auto and (corr < 0.5 or (d > 30 and not mot[i]["ok"])) and i not in planned_change and i not in whips:
        flag("POP", i, f"image jumps (hist corr {corr:.2f}, diff {d:.0f}); add to plan.cuts if it is a planned cut")
    run = run + 1 if d < 0.25 else 0
    if run == 12:
        flag("FROZEN", i - 11, "no visible change for 12+ frames: add a creeping push-in")

# camera checks (velocity smoothed over 5 frames so tracking noise is not reported)
txs = median_filter(np.array([m["tx"] for m in mot]), 5)
tys = median_filter(np.array([m["ty"] for m in mot]), 5)
zs = median_filter(np.array([m["z"] for m in mot]), 5)
spd = np.hypot(txs, tys)
okm = np.array([m["ok"] for m in mot])
sharp = np.array([s["sharp"] for s in stats])
for i in range(3, n - 3):
    if i in planned_change or i in kicks or i in whips or not okm[i]:
        continue
    local = np.median(sharp[max(0, i - 15):i + 15])
    if spd[i] > 40 and sharp[i] > 0.85 * local:
        flag("SNAP", i, f"camera at {spd[i]:.0f} px/f with no motion blur: slow the move or add blur")
    dv = float(np.hypot(txs[i] - txs[i - 1], tys[i] - tys[i - 1]))
    dz = abs(zs[i] - zs[i - 1])
    if dv > JERK_PX or dz > JERK_ZOOM:
        flag("JERK", i, f"camera velocity changes by {dv:.0f} px/f (zoom {dz:.2f} %/f) in one frame: ease the move")
for i in range(6, n):
    if any(j in kicks or j in planned_change or j in whips for j in range(i - 6, i + 1)):
        continue
    ys = [mot[j]["tx"] if abs(mot[j]["tx"]) > abs(mot[j]["ty"]) else mot[j]["ty"] for j in range(i - 6, i + 1)]
    big = [y for y in ys if abs(y) > 3]
    if len(big) >= 5 and int(np.sum(np.diff(np.sign(big)) != 0)) >= 4:
        flag("SHAKE", i - 6, "camera direction flips back and forth: unplanned wobble or jitter")

# brightness / colour checks
Ls = np.array([s["L"] for s in stats])
for i in range(2, n - 2):
    if any(j in planned_change for j in range(i - 2, i + 3)):
        continue
    jump = Ls[i] - Ls[i - 1]
    if abs(jump) > FLICKER_DL and abs(Ls[min(i + 3, n - 1)] - Ls[i - 1]) < 0.4 * abs(jump):
        flag("FLICKER", i, f"brightness {Ls[i - 1]:.3f}->{Ls[i]:.3f} and back: popping light, z-fighting or shadow acne")
    elif abs(jump) > LIGHT_DL or np.hypot(stats[i]["a"] - stats[i - 1]["a"], stats[i]["b"] - stats[i - 1]["b"]) > LIGHT_CAST:
        flag("LIGHTJUMP", i, f"brightness/colour cast changes in one frame (dL {jump:+.3f}): lighting not continuous")
    if stats[i]["crush"] > 0.06 and i not in flash:
        flag("CRUSH", i, f"{stats[i]['crush']:.0%} crushed black: lift darks, keep colour in shadows")
    if stats[i]["clip"] > 0.04 and i not in flash:
        flag("CLIP", i, f"{stats[i]['clip']:.0%} clipped white: lower exposure or bloom")

# WASH: a run of frames with no darks and little contrast (outside flashes and dissolves).
# Measured on the pilot: washed generator frames mean .73-.80 / p25 .62-.74; every good frame mean <= .52 / p25 <= .32.
WASH_MEAN, WASH_P25 = 0.65, 0.5
run = []
for i in range(n):
    w = stats[i]["L"] > WASH_MEAN and stats[i]["p25"] > WASH_P25 and i not in flash
    if w:
        run.append(i)
    if (not w or i == n - 1) and len(run) >= 3:
        flag("WASH", run[0], f"washed out for {len(run)} f (L mean {stats[run[0]]['L']:.2f}, p25 {stats[run[0]]['p25']:.2f}): a lens in a glow or haze, or over-exposure")
    if not w:
        run = []

# EDGEPOP: big change concentrated in an edge strip while the centre stays stable
for i in range(1, n):
    if i in planned_change or i in whips or not okm[i]:
        continue
    d = np.abs(gray[i].astype(np.int16) - gray[i - 1].astype(np.int16)) > 40
    centre = d[160:480, 60:300].mean()
    for name, strip in (("left", d[:, :36]), ("right", d[:, -36:]), ("top", d[:48]), ("bottom", d[-48:])):
        if strip.mean() > 0.25 and centre < 0.03 and spd[i] < 25:
            flag("EDGEPOP", i, f"object pops in/out at the {name} edge: culling or near-plane clipping")


# collapse runs of the same kind into one flag
flags.sort(key=lambda f: (f["kind"], f["frame"]))
merged = []
for f in flags:
    if merged and merged[-1]["kind"] == f["kind"] and f["frame"] - merged[-1]["to"] <= 3:
        merged[-1]["to"] = f["frame"]
    else:
        merged.append(dict(f, to=f["frame"]))
merged.sort(key=lambda f: f["frame"])

for k, f in enumerate(merged[:80]):
    i = f["frame"]
    strip = np.hstack([frames[max(0, i - 1)], frames[i], frames[min(n - 1, f["to"] + 1)]])
    cv2.putText(strip, f"{f['kind']} f{i}", (6, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
    f["strip"] = f"flag_{k:02d}_{f['kind']}_{i}.jpg"
    cv2.imwrite(os.path.join(out_dir, f["strip"]), strip, [cv2.IMWRITE_JPEG_QUALITY, 85])

counts = {}
for f in merged:
    counts[f["kind"]] = counts.get(f["kind"], 0) + 1
if auto:
    starts = sorted(i for i in range(1, n) if hc[i] < 0.9 and (i - 1) not in [j for j in range(1, i) if hc[j] < 0.9][-1:])
    lines_info = f"No plan.json: {len(starts)} transitions detected and skipped (cuts/dissolves at frames {starts[:30]}). Pass a plan to check for unplanned pops."
else:
    lines_info = "Plan used: unplanned cuts are reported as POP."
lines = [f"# QA report: {video}", lines_info, f"{n} frames, {n / fps:.1f} s. Flags: " + (", ".join(f"{k} {v}" for k, v in sorted(counts.items())) or "none"), ""]
for f in merged:
    rng = f"f{f['frame']}" + (f"-{f['to']}" if f["to"] != f["frame"] else "")
    lines.append(f"- **{f['kind']}** {rng} ({f['time']} s): {f['note']}" + (f"  `{f['strip']}`" if "strip" in f else ""))
open(os.path.join(out_dir, "report.md"), "w").write("\n".join(lines) + "\n")
json.dump(merged, open(os.path.join(out_dir, "flags.json"), "w"), indent=1)
print("\n".join(lines[:40]))
print(f"\nfull report: {os.path.join(out_dir, 'report.md')}")
