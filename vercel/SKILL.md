---
name: vercel
description: Snapshot the latest 15 Vercel builds for the configured project — table with branch link, status, who pushed, how long it ran, and footnote markers for any failures. Use when the user invokes /vercel or asks to check Vercel builds/deployments.
---

# Vercel build snapshot

Report the 15 most recent deployments of the configured Vercel project as a point-in-time table.

## Configuration

Company-specific values (team, project names) are intentionally NOT in this file. Resolve them in this order:

1. An argument passed to the skill (`/vercel <project>`) overrides the project name.
2. `config.local.json` next to this SKILL.md: `{ "scope": "<team-slug>", "project": "<project-name>" }`
3. `.vercel/project.json` in the current repo, if linked.
4. Otherwise ask the user for team and project.

## Steps

1. **Fetch** (one call, save to the scratchpad):

   ```bash
   CFG=~/.claude/skills/vercel/config.local.json
   SCOPE=$(jq -r .scope "$CFG"); PROJECT=$(jq -r .project "$CFG")
   vercel ls "$PROJECT" --scope "$SCOPE" -F json 2>/dev/null > "$SCRATCHPAD/vercel-ls.json"
   ```

2. **Extract + compute in one pass** with the bundled jq filter (`format.jq`, next to this SKILL.md) — it does field extraction, merge-commit branch parsing, the production-badge row, and all duration/ago formatting in a single invocation, so there's no intermediate raw JSON to hand-walk or re-derive dates from:

   ```bash
   NOW_MS=$(( $(date +%s) * 1000 ))
   jq -c -f ~/.claude/skills/vercel/format.jq --argjson now "$NOW_MS" "$SCRATCHPAD/vercel-ls.json"
   ```

   Each output line is one JSON object, already render-ready:
   - `branchRaw` — raw git ref
   - `branchDisplay` — `master (source-branch)` for default-branch merge commits (parsed from `Merged in <branch> (pull request #N)` / `Merge pull request #N from <branch>`), else same as `branchRaw`
   - `isDefaultBranch` — true for `master`/`main` rows (Deployment column stays blank for these)
   - `state` — `QUEUED` / `BUILDING` / `READY` / `ERROR` / `CANCELED` — map to the emoji in the render step
   - `isProd` — true on the single newest `READY` row with `target == "production"` — prefix that row's branch with 🚀
   - `author` — first name only
   - `ran` — pre-formatted duration (`2m 49s` / `1h 16m` / `3d` / `21s`)
   - `started` — pre-formatted "ago" string (largest unit only: `4m ago` / `1h ago` / `3d ago` / `<1m ago`), or `null` for `BUILDING`/`QUEUED` rows
   - `url`, `branchAlias` — link targets

   Do not re-derive any of these by hand (no separate date math, no re-parsing commit messages) — if a value looks wrong, fix `format.jq`, don't patch around it inline.

3. **Render** the answer as just this — no extra narration:
   - Header line: project + `Snapshot at <local time>`.
   - Table, newest first, built directly from the jq output rows:

     | Branch | Status | By | Ran | Deployment | Started |
     |---|---|---|---|---|---|
     | [branch](https://<branchAlias>) | ✅ Ready / 🔨 Building / ❌ Failed¹ / ⛔ Canceled | Taylor | 5m 3s | [link](https://<branchAlias>) | 4m ago |

     Use `branchDisplay` for the Branch column text, linking to `https://<branchAlias>`. Leave the Deployment column blank when `isDefaultBranch` is true (the production URL is already known); otherwise link `branchAlias` as `[link](…)`. Prefix the branch name with 🚀 when `isProd` is true — the equivalent of the Vercel dashboard's blue "Production" badge (at most one row; none if no production build is in the list). Caveat: `vercel ls` has no current-production flag, so after an instant rollback/promotion this heuristic can mark the wrong row. No other production/preview marking. If the same branch appears more than once, still list every row. Leave Started blank when it's `null`.
   - Failures use footnote notation: number each `state == "ERROR"` row's status with a unicode superscript (`❌ Failed¹`, `❌ Failed²`, …, in table order). Use the unicode characters (¹ ² ³ ⁴), not `[^1]` markdown footnotes — the latter don't render in the terminal. Do not fetch logs or explain the cause up front — just the marker. No footnotes section when nothing failed.

4. **On request** — if the user asks why a build failed (e.g. "why did 3 fail", "what happened to the failed one"), fetch that deployment's logs and summarize the cause in one line (the first genuine error — failed test, lint error, module not found — not the generic "Build failed" trailer):

   ```bash
   vercel inspect --logs "https://<url>" --scope "$SCOPE" 2>&1 | tail -100
   ```

   Multiple failures asked about at once can be fetched in parallel.
