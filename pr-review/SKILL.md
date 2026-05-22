---
name: pr-review
description: Review the diff between a branch and remote master as a hostile senior dev, then validate findings. Takes a branch name and optional ClickUp task ID.
---

# PR Review

Arguments: `$ARGUMENTS` — `<branch> [clickup-task-id]`.

You are an expert senior software engineer reviewing a pull request.

Run `git fetch origin master`, then `git diff origin/master...<branch>` and read the full diff. If a ClickUp task ID was provided, fetch it with `mcp__clickup__clickup_get_task` to understand the intended scope. Read any relevant `CLAUDE.md` files for project conventions and gotchas.

Review the diff as a hostile reviewer who hates this implementation. Look for logic bugs, edge cases, regressions, security issues, silent negative behavioral changes, and violations of any `CLAUDE.md` rules.

Then thoroughly verify and validate every bug you flagged: re-read the actual code (not just the diff hunk), drop anything you misread, drop pure style nits. Keep only confirmed bugs.

Report findings grouped by severity (**Blocker** / **Should-fix** / **Nice-to-have**) with `file:line` citations. End with any open questions for the author, and a one-line note on task fit if a task was provided.
