---
name: vercel
description: Snapshot the latest 15 Vercel builds for the configured project — table with branch link, status, who pushed, how long it ran, and a one-line explanation for any failure. Use when the user invokes /vercel or asks to check Vercel builds/deployments.
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

2. **Extract** the first 15 entries of `.deployments[]` with jq. Fields per deployment:
   - `url` — deployment host (link as `https://<url>`)
   - `state` — `QUEUED` / `BUILDING` / `READY` / `ERROR` / `CANCELED`
   - `target` — `production` or null (preview)
   - `createdAt`, `buildingAt`, `ready` — epoch millis
   - `meta.bitbucketCommitRef` (or `meta.githubCommitRef` / `meta.gitlabCommitRef`) — branch
   - `meta.branchAlias` — stable per-branch URL
   - `meta.*CommitAuthorName` (fall back to `creator.username`) — who pushed the build; show first name only
   - first line of `meta.*CommitMessage` — for default-branch (`master`/`main`) rows, parse the source branch out of a merge-commit message (`Merged in <branch> (pull request #N)` or `Merge pull request #N from <branch>`) and show it in parentheses after the branch name: `master (taylor/search-modal-focus)`. Omit the parenthetical if the message isn't a merge commit.

3. **Compute times** (macOS date has no millisecond format; use `NOW_MS=$(( $(date +%s) * 1000 ))`):
   - **Ran**: settled states (`READY`/`ERROR`/`CANCELED`) → `ready - buildingAt`; `BUILDING` → `NOW_MS - buildingAt`, shown like any other duration — the Status column already says it isn't done. Caveat: while a build is in progress, `ready` just mirrors `buildingAt` — only trust it once the state has settled.
   - **Started**: `NOW_MS - createdAt`, largest unit only — `4m ago`, `1h ago`, `3d ago` (`<1m ago` under a minute). Left blank for `BUILDING`/`QUEUED` rows — Ran already shows the elapsed time.
   - Format Ran durations as `2m 49s` / `1h 16m` / `3d` (two largest units, space-separated, no decimals).

4. **Explain failures**: for each `ERROR` row, fetch build logs and summarize the cause in one line (the first genuine error — failed test, lint error, module not found — not the generic "Build failed" trailer):

   ```bash
   vercel inspect --logs "https://<url>" --scope "$SCOPE" 2>&1 | tail -100
   ```

   Multiple failures can be fetched in parallel.

5. **Render** the answer as just this — no extra narration:
   - Header line: project + `Snapshot at <local time>`.
   - Table, newest first:

     | Branch | Status | By | Ran | Deployment | Started |
     |---|---|---|---|---|---|
     | [branch](https://<branchAlias>) | ✅ Ready / 🔨 Building / ❌ Failed¹ / ⛔ Canceled | Taylor | 5m 3s | [link](https://<branchAlias>) | 4m ago |

     The Deployment column links the branch-alias URL (`meta.branchAlias`, falling back to the deployment `url` if absent) as `[link](…)`; leave it blank for default-branch (`master`/`main`) rows — the production URL is already known. Prefix the branch name with 🚀 on the one row currently serving production — the equivalent of the Vercel dashboard's blue "Production" badge: the newest `READY` deployment with `target == "production"` (at most one row; none if no production build is in the list). Caveat: `vercel ls` has no current-production flag, so after an instant rollback/promotion this heuristic can mark the wrong row. No other production/preview marking. If the same branch appears more than once, still list every row.
   - Failures use footnote notation: number each failed row's status with a unicode superscript (`❌ Failed¹`, `❌ Failed²`, …, in table order), then under the table list one line per footnote: `¹ <one-line cause>`. Use the unicode characters (¹ ² ³ ⁴), not `[^1]` markdown footnotes — the latter don't render in the terminal. No footnotes section when nothing failed.
