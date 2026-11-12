#!/usr/bin/env python3
"""Check a Stickrified script.json against the script rules, and optionally write SCRIPT.md.

Usage:
  python check_script.py videos/<slug>/script.json          # check only
  python check_script.py videos/<slug>/script.json --md     # check + write SCRIPT.md next to it
  python check_script.py videos/<slug>/script.json --wps 3.3 # override the measured voice rate

Exit code 1 if any hard rule fails (length, missing fields, banned markup, history without sources.md).
"""
import json, re, sys, os, argparse

WPS_DEFAULT = 3.1          # measured on voice zfc8CJQpe8Kqyl0vvCzo, Eleven v4, stability 0.3 (2026-11-12)
# Non-verbal tags are performed as sounds and take time (measured on _pipeline-test: [gasps] 0.52 s, [laughs] 0.60 s).
NONVERBAL = {"gasps": 0.5, "laughs": 0.6, "sighs": 0.5, "chuckles": 0.5, "giggles": 0.5, "exhales": 0.4, "inhales": 0.4, "clears throat": 0.5}
WORDS_MIN, WORDS_MAX = 200, 270
SEC_MIN, SEC_MAX = 61, 90
MAX_GAG_GAP = 8.0
FIELDS = ["narration", "audioTag", "scene", "camera", "onScreenText", "gag"]
SFX_TAGS = ["footsteps", "thunder", "door", "applause", "gunshot", "explosion", "barking", "clapping",
            "creak", "knock", "rain", "wind", "zipper", "owl", "twig", "siren", "crash", "splash"]

def spoken_of(line):
    return line.get("spoken") or line["narration"].replace("*", "")

def words(text):
    return len(re.sub(r"\[[^\]]*\]", " ", text).split())

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path"); ap.add_argument("--md", action="store_true"); ap.add_argument("--wps", type=float, default=WPS_DEFAULT)
    a = ap.parse_args()
    d = json.load(open(a.path, encoding="utf-8"))
    lines = d["lines"]; errors, warns = [], []
    t = 0.0; starts = []; total = 0; tagged = 0
    for i, ln in enumerate(lines, 1):
        for f in FIELDS:
            if f not in ln: errors.append(f"line {i}: missing field '{f}'")
        sp = spoken_of(ln); n = words(sp); total += n
        starts.append(t); t += n / a.wps
        tags = re.findall(r"\[([^\]]*)\]", sp) + ([ln["audioTag"]] if ln.get("audioTag") else [])
        t += sum(v for tg in tags for k, v in NONVERBAL.items() if k in tg.lower())
        if tags: tagged += 1
        for tg in tags:
            if any(s in tg.lower() for s in SFX_TAGS): errors.append(f"line {i}: sound-effect tag [{tg}] (our SFX are synthesized)")
        if "<break" in sp: errors.append(f"line {i}: <break> tag (Eleven v4 ignores SSML)")
        if "*" not in ln["narration"]: warns.append(f"line {i}: no *key word* for the caption")
        for sent in re.split(r"[.!?]+", re.sub(r"\[[^\]]*\]", "", sp)):
            caps = [w for w in re.findall(r"\b[A-Z]{2,}\b", sent) if w not in ("OK", "TV", "USA", "UK", "DIY")]
            if len(caps) > 1: warns.append(f"line {i}: {len(caps)} CAPS words in one sentence")
        if re.search(r"\d", sp) and "spoken" not in ln: warns.append(f"line {i}: digits in spoken text; add 'spoken' with numbers written out")
        if "[" in ln["narration"]: errors.append(f"line {i}: audio tag inside 'narration' (tags would reach captions)")
    gags = [s for s, ln in zip(starts, lines) if ln.get("gag")]
    gaps = [b - a_ for a_, b in zip([0.0] + gags, gags + [t])]
    if not (WORDS_MIN <= total <= WORDS_MAX): errors.append(f"{total} words (target {WORDS_MIN}-{WORDS_MAX})")
    if not (SEC_MIN <= t <= SEC_MAX): errors.append(f"~{t:.0f} s at {a.wps} w/s (target {SEC_MIN}-{SEC_MAX})")
    if gaps and max(gaps) > MAX_GAG_GAP: warns.append(f"longest gap between visual gags {max(gaps):.1f} s (max {MAX_GAG_GAP})")
    if not lines[0].get("audioTag"): warns.append("line 1 has no audioTag: set the energetic base delivery on the hook")
    if tagged < len(lines) * 0.3: warns.append(f"only {tagged}/{len(lines)} lines tagged: delivery may go flat")
    pillar = d.get("pillar", "").lower()
    if "history" in pillar and not os.path.exists(os.path.join(os.path.dirname(a.path), "sources.md")):
        errors.append("history script without sources.md")

    print(f"{d.get('slug', '?')}: {total} words, ~{t:.0f} s at {a.wps} w/s, {len(gags)} gags, longest gap {max(gaps) if gaps else 0:.1f} s")
    for e in errors: print("ERROR ", e)
    for w in warns: print("warn  ", w)

    if a.md:
        md = [f"# {d.get('title', '')}", "",
              f"**Pillar:** {d.get('pillar', '')}  ",
              f"**Length:** {total} words, ~{t:.0f} s at {a.wps} words/s (target {WORDS_MIN}-{WORDS_MAX} words, {SEC_MIN}-{SEC_MAX} s)  ",
              f"**Voice:** Eleven v4, voice ID `{d.get('voiceId', '')}`  ", ""]
        if d.get("facts"): md += ["## Facts", ""] + [f"- {f}" for f in d["facts"]] + [""]
        md += ["## Script", "", "Narration column = what the voice reads (tags included). `*word*` = rust-orange caption key word.", "",
               "| # | Time | Narration (spoken) | Scene / gag | Camera | On-screen |", "|---|---|---|---|---|---|"]
        for i, (s, ln) in enumerate(zip(starts, lines), 1):
            sp = ln.get("spoken") or ln["narration"]
            sp = (f"[{ln['audioTag']}] " if ln.get("audioTag") else "") + sp
            scene = ln["scene"] + (f" **Gag:** {ln['gag']}" if ln.get("gag") else "")
            md.append("| " + " | ".join(str(x).replace("|", "/") for x in (i, f"{s:.0f}s", sp, scene, ln["camera"], ln["onScreenText"])) + " |")
        out = os.path.join(os.path.dirname(a.path), "SCRIPT.md")
        open(out, "w", encoding="utf-8").write("\n".join(md) + "\n"); print("wrote", out)
    sys.exit(1 if errors else 0)

if __name__ == "__main__":
    main()
