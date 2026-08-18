---
name: htmlify
description: Answer as a purpose-designed, self-contained HTML page (light/dark, opened in the default browser) — the page's structure and visuals are designed per-topic to explain the content, not filled into a template. Slash command only — use `/htmlify <prompt>` upfront for long answers, or `/htmlify` alone to re-render the prior assistant turn.
---

# htmlify

Arguments: `$ARGUMENTS`

## Mode selection

- **Upfront** (args present): treat `$ARGUMENTS` as the user's prompt. Answer it by writing the response directly into the HTML file. Do NOT also print the response to the terminal — only the two-line status block at the end.
- **Retroactive** (no args): re-render the most recent assistant turn as HTML. Preserve the substance and claims of the original response — but you may (and should) restructure it and add explanatory visuals. Don't alter what was said; change how it's shown.

### Retroactive refusal cases

If retroactive mode is invoked and either of these is true, reply with the message below and STOP. Do not write a file.

- No prior assistant turn exists in the conversation.
- The prior assistant turn was a clarifying question (e.g., "Which approach do you want?", "A or B?").

> No suitable previous response to convert. Use `/htmlify <prompt>` for upfront mode instead.

In retroactive mode, the "prompt" recorded in the HTML header is the user message that triggered the prior response.

## Design the page for the content — there is no template

This is the heart of the skill — and your place to shine. Show what you can really do with HTML and how good a teacher you can be; take pride in every page you produce here. Before writing a single line of HTML, reason explicitly about two questions:

1. **What here is hardest to grasp?** Identify the 1–4 load-bearing ideas: the sequence with hidden steps, the trade-off, the invisible mechanism, the thing two similar-looking options actually differ on, the scale difference words undersell.
2. **For each one, what is the best possible visual form?** Not "how do I mark this up" — how would a great explainer *show* it. Design the page around those answers; prose is the connective tissue between them, not the whole document.

Forms to reach for (illustrative, not a menu — invent what the content needs):

- **Process / flow / lifecycle** → hand-drawn inline SVG: boxes, arrows, swimlanes, numbered steps with annotations at the exact point they apply.
- **Comparison / trade-off** → side-by-side panels with the differing lines highlighted, or a verdict-first comparison strip — not a wall-of-text table.
- **Architecture / moving parts** → boxes-and-arrows SVG showing what talks to what, labeled with the actual names from the answer.
- **Before/after or code change** → two-column diff with callout annotations pointing at the lines that matter.
- **Anatomy of a config/command/response** → the real text with numbered callouts explaining each significant piece in place.
- **Sequence over time** → timeline or sequence diagram, not a numbered list.
- **Decision guidance** → flowchart of the actual decision points.
- **Quantities** → a real chart. Load the `dataviz` skill first if you chart anything.
- **Layered detail** → progressive disclosure: the main flow visible, edge cases in `<details>`; or tabs/toggles via small inline vanilla JS. The file opens in a real browser with no CSP — interactivity is fair game when it aids comprehension.

Budget is unlimited — reasoning and implementation. A page that takes 10× the tokens and makes the concept land is the goal. The only thing not worth tokens is decoration that explains nothing: no hero banners, no icon garnish, no restyling for its own sake. Every visual must carry explanatory weight; if a section is genuinely best served by plain prose, leave it as plain prose.

## Page contract (fixed; the design above is yours, this is not)

- Single self-contained file: all CSS and JS inline. The only permitted external resource is highlight.js from cdnjs (stylesheet pair + script) when there are code blocks — it fails silently offline.
- Light and dark via `prefers-color-scheme`, colors defined as CSS variables on `:root`. SVG diagrams must use those same variables (`fill="var(--fg)"` etc.) so they survive both themes.
- Header block: `<h1>` with a clean noun-phrase title (3–7 words, derived from the topic — never the verbatim prompt), a `<time>` timestamp, and the verbatim prompt in a collapsed `<details>` (never `open`).
- HTML-escape `<`, `>`, `&`, `"` in text and attributes. Real `<table>` markup, never ASCII tables. Code in `<pre><code class="language-XX">`.
- Comfortable reading: prose in a readable measure (~70ch); diagrams and side-by-sides may break out wider, but the page must never scroll horizontally — wide elements scroll inside their own container.
- Headings get slugified `id`s. Add a TOC only if the page is long enough that navigation genuinely helps.

## Output path

1. Run `git rev-parse --show-toplevel`. If it succeeds AND `<git_root>/notes/` exists as a directory → use `<git_root>/notes/`.
2. Otherwise → use `~/Desktop/Records/htmlify/`. Create it with `mkdir -p` if missing.

Never auto-create `notes/` inside a repo.

## Filename

`<slug>_<YYYY-MM-DD>_<HHMMSS>.html` — slug is a 3–5 word lowercase kebab-case topic summary; timestamp is local time, zero-padded. Example: `oauth-refresh-token-flow_2026-05-19_143022.html`

## Writing and opening the file

1. Write the HTML to the resolved output path.
2. Run `open <absolute-path>` to launch the default browser.

## Terminal output

After writing and opening, output exactly two lines and nothing else:

```
Wrote <filename> (<N> words) — opened in browser.
<absolute path>
```

- `<filename>` is the basename only; `<N>` is the approximate prose word count (round to nearest 10 if over 200); the absolute path on its own line so it's clickable.

Do NOT print a summary, TL;DR, preview, or "here's what I covered." The file is the deliverable.

## Error handling

- **Write fails**: report the error verbatim. Do not retry alternative paths or silently fall back.
- **`open` fails**: the file was still written — print the standard two-line output anyway so the user has the path.
