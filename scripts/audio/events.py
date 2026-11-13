"""Load videos/<slug>/audio/events.json with word-anchored cues resolved to frames.

A cue can give its frame directly ("f": 206) or name the word it syncs to, so a new voice take moves every cue with
it instead of leaving hand-typed frames behind:
  {"word": "laughs", "n": 0, "lead": 2, "sfx": "pop"}     -> start frame of the 1st caption word "laughs",
                                                             2 frames early (reactions land 0-3 f before the word)
  "music": {"button": {"word": "laughing"}, "stop": [{"word": "His", "lead": 4}, {"word": "His", "lead": -10}]}
"frames" may be "auto": the last word's end + 6 frames (the composition length rule in story.ts).
Words match exactly (case, "*" and punctuation ignored): "you" never matches "your".
"""
import json, os, re

def load(d):
    cfg = json.load(open(os.path.join(d, "audio", "events.json"), encoding="utf-8"))
    words = json.load(open(os.path.join(d, "voice", "words.json"), encoding="utf-8"))
    fps = cfg.get("fps", 30)
    norm = lambda s: re.sub(r"[^a-z0-9']", "", s.lower())

    def frame(x):
        if isinstance(x, (int, float)): return int(x)
        w = x["word"].lower()
        hits = [v for v in words if norm(v["text"]) == norm(w)]  # exact word: "you" must not match "your"
        if len(hits) <= x.get("n", 0): raise SystemExit(f"events.json: word {x['word']!r} #{x.get('n', 0)} not in words.json")
        return round(hits[x.get("n", 0)]["start"] * fps) - x.get("lead", 0)

    if cfg.get("frames") == "auto": cfg["frames"] = round(words[-1]["end"] * fps) + 6
    for e in cfg["events"]:
        if "f" not in e: e["f"] = frame(e)
    m = cfg.get("music")
    if m:
        m.setdefault("frames", cfg["frames"])
        if m.get("frames") == "auto": m["frames"] = cfg["frames"]
        m["button"] = frame(m["button"])
        if m.get("stop"): m["stop"] = [frame(x) for x in m["stop"]]
        if m.get("build") is not None: m["build"] = frame(m["build"])
    return cfg

if __name__ == "__main__":
    import sys
    c = load(sys.argv[1])
    for e in c["events"]: print(f"f{e['f']:4d}  {e['sfx']:7s} {e.get('note', '')}")
    print("music", c.get("music"))
