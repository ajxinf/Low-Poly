"""Measure a 9:16 short the way the reference study did (see docs/style/REFERENCE_NOTES.md).

Usage: python scripts/measure.py video.mp4 [more.mp4 ...]
Needs: pip install opencv-python numpy
Prints: camera drift (px/frame at 1080 wide), zoom %/frame, push-in share, still frames, longest still run,
luma median/p5, chroma C* p90, saturation, vignette (corner/centre luma), caption changes per second.
"""
import sys
import cv2
import numpy as np


def measure(path):
    cap = cv2.VideoCapture(path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    prevg = None; prevm = None
    sp, zz, ro, ok_list = [], [], [], []
    lum, p5, c90, sat, vig = [], [], [], [], []
    cap_changes = 0; n = 0
    while True:
        ok, f = cap.read()
        if not ok:
            break
        s = cv2.resize(f, (360, 640), interpolation=cv2.INTER_AREA)
        g = cv2.cvtColor(s, cv2.COLOR_BGR2GRAY)
        lab = cv2.cvtColor(s, cv2.COLOR_BGR2LAB).astype(np.float32)
        L = lab[..., 0] / 255; C = np.hypot(lab[..., 1] - 128, lab[..., 2] - 128)
        lum.append(np.median(L)); p5.append(np.percentile(L, 5)); c90.append(np.percentile(C, 90))
        sat.append(np.median(cv2.cvtColor(s, cv2.COLOR_BGR2HSV)[..., 1]) / 255)
        gf = g.astype(float)
        centre = gf[220:420, 100:260].mean()
        corners = np.mean([gf[:80, :60].mean(), gf[:80, -60:].mean(), gf[-80:, :60].mean(), gf[-80:, -60:].mean()])
        vig.append(corners / max(centre, 1))
        h, w = f.shape[:2]
        band = f[int(h * .66):int(h * .75), int(w * .1):int(w * .9)]
        m = (band.min(2) > 235).astype(np.uint8)
        if prevm is not None:
            uni = (m | prevm).sum()
            if uni > 50 and (m & prevm).sum() / uni < 0.5:
                cap_changes += 1
        prevm = m
        if prevg is not None:
            p0 = cv2.goodFeaturesToTrack(prevg, 400, 0.01, 8)
            good = False
            if p0 is not None and len(p0) >= 12:
                p1, st, _ = cv2.calcOpticalFlowPyrLK(prevg, g, p0, None, winSize=(21, 21), maxLevel=3)
                k = st.ravel() == 1
                if k.sum() >= 60:
                    M, inl = cv2.estimateAffinePartial2D(p0[k], p1[k], method=cv2.RANSAC, ransacReprojThreshold=2)
                    if M is not None and inl is not None and inl.sum() > 60:
                        scale = np.hypot(M[0, 0], M[1, 0]); c2 = M @ np.array([180, 320, 1])
                        z = (scale - 1) * 100
                        if abs(z) < 5:
                            sp.append(np.hypot(c2[0] - 180, c2[1] - 320) * 3); zz.append(z)
                            ro.append(abs(np.degrees(np.arctan2(M[1, 0], M[0, 0])))); good = True
            ok_list.append(good)
        prevg = g; n += 1
    sp = np.array(sp); zz = np.array(zz)
    still = (sp < 0.8) & (np.abs(zz) < 0.05)
    run = longest = 0
    for x in still:
        run = run + 1 if x else 0; longest = max(longest, run)
    print(f"== {path}  ({n} frames, {n / fps:.1f} s)")
    print(f"  drift px/f p50/p75/p90/p99: {np.percentile(sp, [50, 75, 90, 99]).round(1)}   (ref 2.9/11/26/59)")
    print(f"  |zoom| %/f p50/p90: {np.percentile(np.abs(zz), [50, 90]).round(2)}   push-in {(zz > .05).mean():.0%}  pull-out {(zz < -.05).mean():.0%}   (ref .5/2.6, 65%/26%)")
    print(f"  roll deg/f p95: {np.percentile(ro, 95):.2f}   (ref .25-1.2)")
    print(f"  still frames {still.mean():.0%}, longest still run {longest} f   (ref 3-8%, <=14 f)")
    print(f"  luma median {np.median(lum):.2f}, p5 {np.median(p5):.2f}, C* p90 {np.median(c90):.0f}, sat {np.median(sat):.2f}   (ref .39-.51, .08-.17, 57-68, .50-.58)")
    print(f"  vignette corner/centre {np.median(vig):.2f}   (ref .54-.93)")
    print(f"  caption changes per s {cap_changes / (n / fps):.2f}   (ref 2.2-3.0)")


for p in sys.argv[1:]:
    measure(p)
