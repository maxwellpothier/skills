---
name: visual-diff
description: Screenshot a running page with headless Chromium and compare it against a Figma frame, pulling exact colors, type styles and geometry from the Figma REST API. Use when asked to check a page against a design, match a Figma mockup, screenshot a local dev server, or verify how a page actually renders.
---

# visual-diff

Capture what a page really renders, and — when there's a design to match — put it
next to the source of truth.

Two independent halves; use either alone.

- **`scripts/shoot.mjs`** — headless Chromium screenshots of any URL. No browser
  extension, no Google Chrome install, deterministic viewport.
- **`scripts/figma.mjs`** — Figma REST API. Free on every plan, including
  Starter, and **not** subject to the Figma MCP server's tool-call cap
  (Starter is only 20 calls/*month*). Returns the full node tree, so you read
  exact hex values and type metrics rather than eyeballing a screenshot.

## Setup

Run once per machine; it's a no-op afterwards.

```bash
bash ~/.claude/skills/visual-diff/scripts/setup.sh
```

Work from a scratch directory, not the user's repo — these scripts write image
files and JSON.

## Screenshotting a page

```bash
cd <scratch-dir>
node ~/.claude/skills/visual-diff/scripts/shoot.mjs http://localhost:3000 --out shots
```

Writes `full.png` plus `slice-00.png`, `slice-01.png`, … Read the **slices**,
not `full.png` — a 10,000px-tall full-page image is unreadable when downscaled
to fit an image-read, whereas each slice is one viewport at true scale.

| Flag | Default | Use |
|---|---|---|
| `--width` / `--height` | 1440 / 900 | Match the design's artboard width. |
| `--scale` | 1 | `2` for retina detail on fine type. |
| `--selector "footer"` | — | Capture one element instead of the page. |
| `--full-only` | — | Skip slices. |
| `--wait` | 1500 | Extra settle time in ms for animation. |
| `--dark` | — | Render with `prefers-color-scheme: dark`. |

It auto-scrolls the page before capturing so lazy-loaded images resolve, and
reports any console errors it saw — often the real reason something looks wrong.

## Pulling a Figma frame

Needs a Figma personal access token with **`file_content:read`**. The script
reads `FIGMA_TOKEN` from the environment, or from the nearest `.env.local`
walking up from the working directory. It never logs the value.

If no token is configured, tell the user to create one at
**Figma → Settings → Security → Personal access tokens** and add it to
`.env.local` themselves — do not ask them to paste a token into the chat.

```bash
node ~/.claude/skills/visual-diff/scripts/figma.mjs \
  "https://figma.com/design/<key>/<name>?node-id=68-80" --out figma --specs --outline
```

Accepts a Figma URL (must contain `node-id`) or `<fileKey> <nodeId>`.

| Flag | Use |
|---|---|
| `--specs` | **Start here.** Every distinct text style — family, weight, size, line-height, tracking, color — and every fill and corner radius, with occurrence counts. This is what makes the comparison exact. |
| `--outline` | Layer tree with `y` offsets and sizes relative to the frame top. Add `--depth N`. |
| `--children` | Render each top-level child as its own PNG. Prefer this for tall pages. |
| `--scale` | Default 2. Auto-capped to stay under Figma's 16384px limit. |
| `--no-render` | Metadata only, skip PNGs. |

Always writes `tree.json` — query it directly for anything the flags don't
surface:

```bash
node -e 'const n=require("./figma/tree.json").nodes["68:80"].document; /* ... */'
```

## Comparing

1. Pull the design: `--specs --outline --children`.
2. Screenshot the page at the **artboard width** (`--width 1440` for a 1440
   frame), so spacing is comparable without mental arithmetic.
3. Read the design render and the corresponding page slice, section by section.
4. For anything that looks off, resolve it against `--specs` / `tree.json`
   numbers rather than by eye — "the heading is 62px/1.16 with -2% tracking"
   beats "the heading looks slightly big".

Report findings as a concrete list: what differs, the design value, the current
value, and the file and line to change.

## Judgment

- **Verify before claiming a match.** Re-screenshot after edits. Never report a
  section as matching without having looked at it post-change.
- **Separate what can be fixed from what can't.** Unlicensed fonts, missing
  photography, and placeholder copy in the design itself are not code defects —
  call them out as blockers rather than silently approximating them.
- **Placeholders in Figma stay placeholders.** If a design has grey boxes where
  images go, the build should not invent images to fill them.
- **Don't chase sub-pixel differences.** Font rasterization and hinting differ
  between Figma and a browser; a 1px discrepancy in text height is not a bug.
- Clean up scratch images when finished.
