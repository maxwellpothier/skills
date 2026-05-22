---
name: htmlify
description: Render a response as a self-contained HTML file (light/dark themed, syntax-highlighted code, auto TOC) and open it in the default browser. Slash command only — use `/htmlify <prompt>` upfront for long answers, or `/htmlify` alone to re-render the prior assistant turn.
---

# htmlify

Arguments: `$ARGUMENTS`

## Mode selection

- **Upfront** (args present): treat `$ARGUMENTS` as the user's prompt. Answer it by writing the response directly into the HTML file. Do NOT also print the response to the terminal — only the two-line status block at the end.
- **Retroactive** (no args): re-render the most recent assistant turn as HTML. Preserve all wording; add semantic structure where it was implicit (headings, lists, tables) but do not change content or wording.

### Retroactive refusal cases

If retroactive mode is invoked and either of these is true, reply with the message below and STOP. Do not write a file.

- No prior assistant turn exists in the conversation.
- The prior assistant turn was a clarifying question (e.g., "Which approach do you want?", "A or B?").

> No suitable previous response to convert. Use `/htmlify <prompt>` for upfront mode instead.

In retroactive mode, the "prompt" recorded in the HTML metadata header is the **user message that triggered the prior response** — the most recent user message before this `/htmlify` invocation.

## Output path

Resolve the output directory in this order:

1. Run `git rev-parse --show-toplevel`. If it succeeds AND `<git_root>/notes/` exists as a directory → use `<git_root>/notes/`.
2. Otherwise → use `~/Desktop/Records/htmlify/`. Create it with `mkdir -p` if missing.

Never auto-create `notes/` inside a repo.

## Filename

`<slug>_<YYYY-MM-DD>_<HHMMSS>.html`

- `slug`: 3-5 word, lowercase, kebab-case summary of the topic. Derive from the prompt (upfront) or the prior response's topic (retroactive). No leading/trailing dashes.
- Timestamp: local time, zero-padded.
- Example: `oauth-refresh-token-flow_2026-05-19_143022.html`

## Title

The `<h1>` in the document is a clean noun-phrase (3-7 words) derived from the topic — NOT the verbatim user prompt. Examples:

- Prompt: "can you walk me through how oauth works with refresh tokens" → Title: "OAuth Refresh Token Flow"
- Prompt: "explain why this query is slow" → Title: "Query Performance Analysis"

The verbatim original prompt is preserved in the collapsible `<details>` block in the header.

## HTML template

Use this template verbatim. Substitute the `{{...}}` placeholders. The `<details>` element MUST NOT have an `open` attribute — the prompt is collapsed by default.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{TITLE}}</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css" media="(prefers-color-scheme: light)">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css" media="(prefers-color-scheme: dark)">
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
<style>
  :root {
    --bg: #ffffff;
    --fg: #1f2328;
    --muted: #6e7781;
    --border: #d0d7de;
    --code-bg: #f6f8fa;
    --accent: #0969da;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0d1117;
      --fg: #e6edf3;
      --muted: #8d96a0;
      --border: #30363d;
      --code-bg: #161b22;
      --accent: #58a6ff;
    }
  }
  * { box-sizing: border-box; }
  html { background: var(--bg); color: var(--fg); }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 17px;
    line-height: 1.65;
    max-width: 70ch;
    margin: 0 auto;
    padding: 3rem 1.5rem 6rem;
  }
  h1 { font-size: 2rem; line-height: 1.25; margin: 0 0 0.5rem; }
  h2 { font-size: 1.4rem; line-height: 1.3; margin: 2.5rem 0 0.75rem; border-bottom: 1px solid var(--border); padding-bottom: 0.25rem; scroll-margin-top: 1rem; }
  h3 { font-size: 1.15rem; line-height: 1.35; margin: 1.75rem 0 0.5rem; scroll-margin-top: 1rem; }
  p { margin: 0 0 1rem; }
  a { color: var(--accent); }
  ul, ol { padding-left: 1.5rem; }
  li { margin: 0.25rem 0; }
  blockquote {
    border-left: 4px solid var(--border);
    margin: 1rem 0;
    padding: 0.5rem 1rem;
    background: var(--code-bg);
    border-radius: 0 6px 6px 0;
  }
  blockquote > :first-child { margin-top: 0; }
  blockquote > :last-child { margin-bottom: 0; }
  code {
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
    font-size: 0.92em;
    background: var(--code-bg);
    padding: 0.1em 0.35em;
    border-radius: 4px;
  }
  pre {
    background: var(--code-bg);
    padding: 1rem;
    border-radius: 8px;
    overflow-x: auto;
    line-height: 1.5;
    font-size: 0.92em;
  }
  pre code { background: none; padding: 0; border-radius: 0; font-size: 1em; }
  table { border-collapse: collapse; width: 100%; margin: 1rem 0; font-size: 0.95em; }
  th, td { border: 1px solid var(--border); padding: 0.5rem 0.75rem; text-align: left; vertical-align: top; }
  th { background: var(--code-bg); }
  hr { border: none; border-top: 1px solid var(--border); margin: 2.5rem 0; }
  header.doc-meta {
    border-bottom: 1px solid var(--border);
    padding-bottom: 1.5rem;
    margin-bottom: 2rem;
    color: var(--muted);
    font-size: 0.9rem;
  }
  header.doc-meta h1 { color: var(--fg); }
  header.doc-meta time { font-variant-numeric: tabular-nums; }
  header.doc-meta details { margin-top: 0.75rem; }
  header.doc-meta summary { cursor: pointer; color: var(--accent); user-select: none; }
  header.doc-meta .prompt-body {
    margin-top: 0.5rem;
    padding: 0.75rem 1rem;
    background: var(--code-bg);
    border-radius: 6px;
    color: var(--fg);
    white-space: pre-wrap;
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
    font-size: 0.9em;
  }
  nav.toc {
    background: var(--code-bg);
    border-radius: 8px;
    padding: 1rem 1.5rem;
    margin-bottom: 2.5rem;
    font-size: 0.95rem;
  }
  nav.toc strong {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
  }
  nav.toc ul { list-style: none; padding: 0; margin: 0; }
  nav.toc li { margin: 0.25rem 0; }
  nav.toc li.h3 { padding-left: 1.25rem; }
  nav.toc a { text-decoration: none; color: var(--accent); }
  nav.toc a:hover { text-decoration: underline; }
</style>
</head>
<body>
<header class="doc-meta">
  <h1>{{TITLE}}</h1>
  <time datetime="{{ISO_TIMESTAMP}}">{{HUMAN_TIMESTAMP}}</time>
  <details>
    <summary>Original prompt</summary>
    <div class="prompt-body">{{PROMPT}}</div>
  </details>
</header>
{{TOC}}
<main>
{{BODY}}
</main>
<script>hljs.highlightAll();</script>
</body>
</html>
```

### Placeholder rules

- `{{TITLE}}` — clean noun-phrase title (see "Title" section above). HTML-escape any special characters.
- `{{ISO_TIMESTAMP}}` — ISO 8601 with timezone, e.g. `2026-05-19T14:30:22-06:00`.
- `{{HUMAN_TIMESTAMP}}` — readable form, e.g. `May 19, 2026 · 2:30 PM`.
- `{{PROMPT}}` — verbatim original user prompt. HTML-escape; preserve newlines (the `white-space: pre-wrap` style handles them).
- `{{TOC}}` — see "Table of contents" below. If fewer than 3 total `<h2>`+`<h3>` in the body, replace with an empty string (omit the nav entirely).
- `{{BODY}}` — the rendered HTML content.

### Table of contents

If the body contains 3 or more `<h2>` + `<h3>` elements combined, generate:

```html
<nav class="toc">
  <strong>Contents</strong>
  <ul>
    <li class="h2"><a href="#section-id">Section title</a></li>
    <li class="h3"><a href="#subsection-id">Subsection title</a></li>
    ...
  </ul>
</nav>
```

Each heading in the body must have a matching `id` (slugified heading text, lowercase, kebab-case). Example: `<h2 id="oauth-flow">OAuth Flow</h2>`.

## Content rules

| Content type | HTML treatment |
|---|---|
| Document title | `<h1>` (only inside `header.doc-meta`, exactly one per file) |
| Sections | `<h2>` with auto-generated `id` |
| Subsections | `<h3>` with auto-generated `id` |
| Body text | `<p>` |
| Code blocks | `<pre><code class="language-XX">` — infer language from content. Escape `<`, `>`, `&` inside. |
| Inline code | `<code>` |
| File paths | `<code>` |
| Tables | Real `<table>`/`<thead>`/`<tbody>`/`<tr>`/`<th>`/`<td>` — never ASCII tables |
| Unordered lists | `<ul><li>` |
| Ordered lists | `<ol><li>` |
| ASCII diagrams | `<pre>` (no `<code>` child, no language class) |
| Callouts (note/warning/tip) | `<blockquote>` with a leading `<strong>Note:</strong>` (or `Warning:` / `Tip:`) |
| Links | `<a href="...">` — same-tab |
| Bold | `<strong>` |
| Italic | `<em>` |
| Horizontal rule | `<hr>` |

Always HTML-escape `<`, `>`, `&`, `"` in text content and attribute values.

**Skipped for v1** (do not include): Mermaid diagrams, math/LaTeX rendering, print styles, dark-mode toggle button (the media query handles it automatically).

## Writing and opening the file

1. Write the HTML to the resolved output path.
2. Run `open <absolute-path>` to launch the default browser.

## Terminal output

After writing and opening, output exactly two lines and nothing else:

```
Wrote <filename> (<N> words) — opened in browser.
<absolute path>
```

- `<filename>` is the basename only (no directory).
- `<N>` is approximate word count of the rendered prose (exclude HTML tags, headings counted; code block contents excluded). Round to nearest 10 if over 200.
- `<absolute path>` on its own line so it's clickable in iTerm/Terminal.app.

Do NOT print a summary, TL;DR, preview, or "here's what I covered." The file is the deliverable.

## Error handling

- **Write fails** (permissions, disk full, path issue): report the error verbatim in the terminal. Do not retry alternative paths. Do not silently fall back.
- **`open` fails**: the file was still written successfully. Print the standard two-line output anyway so the user has the path to open manually.
- **highlight.js CDN unreachable** when the user opens the file: it fails silently in the browser; code blocks render as plain monospace. No skill-side action needed.
