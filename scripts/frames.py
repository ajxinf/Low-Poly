#!/usr/bin/env python3
"""Exact-frame inspection (QA layer 3): every frame of a render, labelled, so a reviewer checks frames, not playback.

Usage:
  python scripts/frames.py out/<slug>/final.mp4 out/<slug>/shots.json videos/<slug> [--every 2] [--out out/<slug>/qa/frames]

Writes to --out:
  sheets/<shot>_NN.png   every --every-th frame of each shot, 5 x 4 tiles, each labelled "f123  S3  'word'"
  key/f0123.png          full-resolution exact frames: first/last of each shot, each dissolve's middle, every word
                         start (words.json) and every sound event (audio/events.json): where gags and reactions land
  INDEX.md               the files, frame by frame, and the checklist to tick for each sheet (video-qa skill)
Frames are decoded sequentially (cv2), so frame N is exactly composition frame N: no seek rounding.
"""
import argparse, json, os, sys
import cv2

TILE_W, COLS, ROWS = 288, 5, 4

def label(img, text):
    h = img.shape[0]
    cv2.rectangle(img, (0, 0), (img.shape[1], int(h * 0.055)), (0, 0, 0), -1)
    cv2.putText(img, text, (6, int(h * 0.042)), cv2.FONT_HERSHEY_SIMPLEX, h / 900, (80, 230, 255), 1, cv2.LINE_AA)
    return img

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video"); ap.add_argument("shots"); ap.add_argument("videodir")
    ap.add_argument("--every", type=int, default=2); ap.add_argument("--out")
    a = ap.parse_args()
    out = a.out or os.path.join(os.path.dirname(a.video), "qa", "frames")
    os.makedirs(os.path.join(out, "sheets"), exist_ok=True); os.makedirs(os.path.join(out, "key"), exist_ok=True)
    plan = json.load(open(a.shots, encoding="utf-8"))
    shots = plan["shots"]
    words = json.load(open(os.path.join(a.videodir, "voice", "words.json"), encoding="utf-8"))
    ev_path = os.path.join(a.videodir, "audio", "events.json")
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "audio"))
    import events as ev
    events = ev.load(a.videodir)["events"] if os.path.exists(ev_path) else []
    fps = 30
    word_at = {}
    for w in words:
        for f in range(round(w["start"] * fps), round(w["end"] * fps) + 1): word_at.setdefault(f, w["text"].replace("*", ""))
    keys = {}
    for s in shots:
        keys.setdefault(s["a"], []).append(f"{short(s['id'])} first"); keys.setdefault(s["b"], []).append(f"{short(s['id'])} last")
    for x0, x1 in plan.get("xfade", []): keys.setdefault((x0 + x1) // 2, []).append("dissolve middle")
    for w in words: keys.setdefault(round(w["start"] * fps), []).append(f"word '{w['text']}'")
    for e in events: keys.setdefault(e["f"], []).append(f"sfx {e['sfx']}: {e.get('note', '')}")

    cap = cv2.VideoCapture(a.video)
    frames, f = {}, 0
    while True:
        ok, img = cap.read()
        if not ok: break
        frames[f] = img; f += 1
    if not frames: sys.exit(f"could not decode {a.video}")
    n = f
    tile_h = round(TILE_W * frames[0].shape[0] / frames[0].shape[1])

    index = [f"# Exact frames: {a.video}", "", f"{n} frames. Sheets show every {a.every} frame(s); key frames are full size.", "",
             "## Checklist per sheet (tick every tile, note the frame number of anything wrong)",
             "- Clipping: anything passing through anything (props, poles, rays, hands, hats, walls, roofs, fences)",
             "- Scale: people vs doors, sheds, cars, furniture; nobody taller than a door they stand by",
             "- Contact: feet on the ground, held props in the hand, nothing floating or sunk",
             "- Background: no empty sky-and-grass frames; a story-relevant detail or life in every wide",
             "- Faces and reactions: the right expression on the right word; nothing hidden behind a caption",
             "- Light: no pure-white blowouts, no sudden light jumps inside a shot", "", "## Sheets", ""]
    for s in shots:
        fs = [g for g in range(s["a"], min(s["b"], n - 1) + 1, a.every)]
        per = COLS * ROWS
        for k in range(0, len(fs), per):
            chunk = fs[k:k + per]
            tiles = []
            for g in chunk:
                t = cv2.resize(frames[g], (TILE_W, tile_h), interpolation=cv2.INTER_AREA)
                tiles.append(label(t, f"f{g}  {short(s['id'])}  {word_at.get(g, '')}"))
            while len(tiles) < per: tiles.append(tiles[-1] * 0)
            rows = [cv2.hconcat(tiles[r * COLS:(r + 1) * COLS]) for r in range(ROWS)]
            name = f"{short(s['id'])}_{k // per + 1:02d}.png"
            cv2.imwrite(os.path.join(out, "sheets", name), cv2.vconcat(rows))
            index.append(f"- [ ] `sheets/{name}`: f{chunk[0]}-f{chunk[-1]}")
    index += ["", "## Key frames (full size)", ""]
    for g in sorted(keys):
        if g >= n: continue
        cv2.imwrite(os.path.join(out, "key", f"f{g:04d}.png"), frames[g])
        index.append(f"- [ ] `key/f{g:04d}.png`: " + "; ".join(keys[g]))
    open(os.path.join(out, "INDEX.md"), "w", encoding="utf-8").write("\n".join(index) + "\n")
    print(f"{n} frames -> {out} ({sum(1 for _ in os.scandir(os.path.join(out, 'sheets')))} sheets, {len([g for g in keys if g < n])} key frames)")

def short(shot_id):
    return shot_id.split("/")[-1].split("-")[0]

if __name__ == "__main__":
    main()
