# Vendored: cartoon-3d-short (MIT)

Source: https://github.com/mromidev/claude-animated-shorts (commit e3b817b), MIT License, Copyright (c) 2026 Mr omi.
See `LICENSE` in this folder.

What is here, unchanged:
- `references/reports/`: seven measured look reports (characters, motion, depth, lighting, outlines, textures, grade) from 20
  reference shorts, with implementation recipes for a three.js + Remotion stack. The "ours" columns describe THEIR
  bridge short, not Stickrified.
- `STYLE_BIBLE.md`: their script and picture formula.
- `SKILL.upstream.md`: their original skill (our adapted version is `.claude/skills/toon-world-short/SKILL.md`).
- `templates/`: their bridge short source (`bridge/`), synthesized audio (`audio/`) and helper scripts (`scripts/`).

`references/frames/` (38 stills) and `references/sheets/` (20 contact sheets) are copied locally for look study but git-ignored:
they are screenshots of another creator's videos, so they are not ours to commit or redistribute. Re-fetch them from the source repo.

How Stickrified uses this: as numbers and code recipes only. Read `docs/style/LOOK_SPEC.md` first; it says which values
we adopt, which we change, and what stays ours. Never copy their characters, stories or shots.
