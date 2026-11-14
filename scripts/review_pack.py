#!/usr/bin/env python3
"""Evidence pack for the video-review skill: what exists for a video, a line-by-line timeline, pacing numbers and
the channel catalogue, so every critic works from the same facts and never claims to have seen a missing asset.

Usage: python scripts/review_pack.py <slug> [--out out/<slug>/review]
Reads (each optional except script.json): videos/<slug>/script.json, voice/words.json, audio/events.json,
out/<slug>/shots.json, out/<slug>/final.mp4, out/<slug>/QA.md, videos/<slug>/analytics.* and every other
videos/*/script.json. Writes <out>/pack.md.
"""
import glob, json, os, re, sys

FPS = 30


def spoken(line):
    return re.sub(r"\[[^\]]*\]", " ", line.get("spoken") or line["narration"].replace("*", ""))


def line_times(lines, words):
    """Start/end seconds of each script line, by walking words.json in order (tags are not in words.json)."""
    out, i = [], 0
    for ln in lines:
        n = len(spoken(ln).split())
        seg = words[i:i + n]
        out.append((seg[0]["start"], seg[-1]["end"]) if seg else (None, None))
        i += n
    return out, i == len(words)


def first_sentence(text):
    return re.split(r"(?<=[.!?])\s", text.replace("*", "").strip())[0]


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    slug = args[0]
    out = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else f"out/{slug}/review"
    vdir, odir = f"videos/{slug}", f"out/{slug}"
    script = json.load(open(f"{vdir}/script.json", encoding="utf-8"))
    lines = script["lines"]

    paths = {
        "script.json": f"{vdir}/script.json", "SCRIPT.md": f"{vdir}/SCRIPT.md", "sources.md": f"{vdir}/sources.md",
        "words.json": f"{vdir}/voice/words.json", "voice.wav": f"{vdir}/voice/voice.wav",
        "events.json": f"{vdir}/audio/events.json", "cues.md": f"{vdir}/audio/cues.md",
        "loudness.json": f"{vdir}/audio/loudness.json", "mix.wav": f"{vdir}/audio/mix.wav",
        "story.ts": f"src/videos/{slug}/story.ts", "shots.json": f"{odir}/shots.json",
        "plan.json": f"{odir}/plan.json", "layer1.md": f"{odir}/layer1.md", "final.mp4": f"{odir}/final.mp4",
        "QA.md": f"{odir}/QA.md", "qa frames INDEX.md": f"{odir}/qa/frames/INDEX.md", "PUBLISH.md": f"{vdir}/PUBLISH.md",
    }
    have = {k: os.path.exists(p) for k, p in paths.items()}
    analytics = glob.glob(f"{vdir}/analytics*")

    words = json.load(open(paths["words.json"], encoding="utf-8")) if have["words.json"] else []
    shots = json.load(open(paths["shots.json"], encoding="utf-8"))["shots"] if have["shots.json"] else []
    events = json.load(open(paths["events.json"], encoding="utf-8"))["events"] if have["events.json"] else []

    md = [f"# Review pack: {slug}", "", f"Title: {script.get('title', '')}  ", f"Pillar: {script.get('pillar', '')}  ",
          f"Loop: {script.get('loop', '')}", "", "## Assets (a critic may only cite what is marked present)", ""]
    md += [f"- [{'x' if have[k] else ' '}] {k}: `{p}`" for k, p in paths.items()]
    md += [f"- [{'x' if analytics else ' '}] analytics: {', '.join(analytics) or 'none: performance claims are predictions only'}"]
    stage = ("rendered" if have["final.mp4"] else "voiced, not rendered" if have["words.json"] else "script only")
    md += ["", f"Review stage: **{stage}**", ""]

    # Timeline per line: time, shots on screen, gag, text, sound cues near it.
    if words:
        times, aligned = line_times(lines, words)
    else:  # no voice yet: estimate at the script skill's measured 3.1 words/s
        times, t = [], 0.0
        for ln in lines:
            d = len(spoken(ln).split()) / 3.1
            times.append((t, t + d))
            t += d
    if words and not aligned:
        md += ["WARNING: words.json does not match the script's spoken words: the voice is stale, re-run tts.ts.", ""]
    total = words[-1]["end"] if words else sum(len(spoken(l).split()) for l in lines) / 3.1
    md += ["## Timeline", "", f"Length: {total:.1f} s{' (estimated at 3.1 words/s)' if not words else ''}", "",
           "| # | time | shots | narration | gag | text | sfx |", "|---|---|---|---|---|---|---|"]
    word_frame = {}
    for k, w in enumerate(words):
        word_frame.setdefault(w["text"].strip(".,!?\"'").lower(), []).append(round(w["start"] * FPS))
    for i, (ln, (a, b)) in enumerate(zip(lines, times)):
        t = f"{a:.1f}-{b:.1f}" if a is not None else "?"
        on = [s["id"].split("/")[-1] for s in shots if a is not None and s["a"] <= b * FPS and s["b"] >= a * FPS]
        sfx = []
        for e in events:
            f = e.get("f")
            if f is None and "word" in e:
                fr = word_frame.get(e["word"].lower(), [])
                f = fr[e.get("n", 0)] - e.get("lead", 0) if len(fr) > e.get("n", 0) else None
            if f is not None and a is not None and a * FPS <= f <= b * FPS + 6:
                sfx.append(e.get("sfx", "?"))
        md.append(f"| {i + 1} | {t} | {' '.join(on)} | {ln['narration']} | {ln.get('gag', '')} | "
                  f"{ln.get('onScreenText', '')} | {' '.join(sfx)} |")

    # Pacing numbers the critics and the skill's thresholds use.
    md += ["", "## Pacing", ""]
    if words:
        hook = [w["text"] for w in words if w["start"] < 3.0]
        md.append(f"- Words heard in the first 3 s: {' '.join(hook)}")
        gaps = [(words[k]["end"], words[k + 1]["start"]) for k in range(len(words) - 1)
                if words[k + 1]["start"] - words[k]["end"] >= 0.6]
        md.append(f"- Voice silences >= 0.6 s: {', '.join(f'{x:.1f}-{y:.1f}' for x, y in gaps) or 'none'}")
    if shots:
        lens = [(s["b"] - s["a"] + 1) / FPS for s in shots]
        long_ = [f"{s['id'].split('/')[-1]} {(s['b'] - s['a'] + 1) / FPS:.1f}s" for s, l in zip(shots, lens) if l > 4]
        md.append(f"- Shots: {len(shots)}, mean {sum(lens) / len(lens):.1f} s, longest {max(lens):.1f} s; over 4 s: "
                  f"{', '.join(long_) or 'none'}")
    gag_t = [a for ln, (a, _) in zip(lines, times) if ln.get("gag") and a is not None]
    if len(gag_t) > 1:
        gg = max(y - x for x, y in zip(gag_t, gag_t[1:] + [total]))
        md.append(f"- Longest stretch without a scripted gag: {gg:.1f} s (skill limit 8 s)")
    md.append(f"- Words: {sum(len(spoken(l).split()) for l in lines)} (skill window 200-270)")

    # Channel catalogue: every other video, so "repetitive" is checked, never assumed.
    md += ["", "## Channel catalogue (other videos in this repo)", "",
           "| slug | stage | pillar | opener | last line |", "|---|---|---|---|---|"]
    for p in sorted(glob.glob("videos/*/script.json")):
        s = p.replace("\\", "/").split("/")[1]
        if s == slug or s.startswith("_"):
            continue
        o = json.load(open(p, encoding="utf-8"))
        st = "rendered" if os.path.exists(f"out/{s}/final.mp4") else "script"
        md.append(f"| {s} | {st} | {o.get('pillar', '')} | {first_sentence(o['lines'][0]['narration'])} | "
                  f"{o['lines'][-1]['narration'].replace('*', '')} |")

    os.makedirs(out, exist_ok=True)
    with open(f"{out}/pack.md", "w", encoding="utf-8") as fh:
        fh.write("\n".join(md) + "\n")
    print(f"wrote {out}/pack.md ({stage})")


if __name__ == "__main__":
    main()
