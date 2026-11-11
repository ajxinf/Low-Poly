# Vendored: cartoon-3d-short (MIT)

Source: https://github.com/mromidev/claude-animated-shorts (commit e3b817b), MIT License, Copyright (c) 2026 Mr omi.
See `LICENSE` in this folder.

What is here, unchanged:
- `reports/`: seven measured look reports (characters, motion, depth, lighting, outlines, textures, grade) from 20
  reference shorts, with implementation recipes for a three.js + Remotion stack. The "ours" columns describe THEIR
  bridge short, not Stickrified.
- `STYLE_BIBLE.md`: their script and picture formula.
- `SKILL.upstream.md`: their original skill (our adapted version is `.claude/skills/toon-world-short/SKILL.md`).
- `templates/`: their bridge short source (`bridge/`), synthesized audio (`audio/`) and helper scripts (`scripts/`).

Not included on purpose: their `references/frames` and `references/sheets` (screenshots of another creator's videos).

How Stickrified uses this: as numbers and code recipes only. Read `docs/style/LOOK_SPEC.md` first; it says which values
we adopt, which we change, and what stays ours. Never copy their characters, stories or shots.
