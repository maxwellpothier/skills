---
name: pr-review
description: Hostile senior-dev review of a branch's diff vs the repo's default branch, with every finding verified before reporting. Manual only. Takes a branch name and optional ClickUp task ID.
disable-model-invocation: true
---

# PR Review

Arguments: `$ARGUMENTS` — `<branch> [clickup-task-id]`.

Resolve the base branch (`git symbolic-ref --short refs/remotes/origin/HEAD`, else probe `origin/main` then `origin/master`). Run `git fetch origin <base>`, then `git diff origin/<base>...<branch>` and read the full diff, pulling each changed file in full where context is needed. If a task ID was given, fetch it with `mcp__claude_ai_ClickUp__clickup_get_task` for intended scope. Read any relevant `CLAUDE.md` for conventions and gotchas.

Review the diff as a hostile reviewer who hates this implementation. Look for logic bugs, edge cases, regressions, security issues, silent negative behavioral changes, and violations of any `CLAUDE.md` rules. Call out conspicuous absences: schema changes without migrations, logic without tests, security-sensitive changes without updated guards.

Verify every concern before reporting: re-read the actual code (not just the hunk), trace the call path, check whether it's handled elsewhere, web-search if it hinges on framework/library/platform behavior. Drop anything you can't confirm or misread, and drop pure style nits. For each surviving finding, propose 1–2 fixes (or describe the approach and tradeoffs if complex).

Report findings grouped by severity (**Blocker** / **Should-fix** / **Nice-to-have**) with `file:line` citations. End with open questions for the author, and a one-line task-fit note if a task was provided. If nothing survives, say so briefly with a note on what you checked.
