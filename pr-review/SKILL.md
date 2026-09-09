---
name: pr-review
description: Hostile senior-dev review of a branch's diff vs the repo's default branch, with every finding verified before reporting, then an interactive walkthrough of findings one at a time. Manual only. Takes a branch name and optional ClickUp task ID.
disable-model-invocation: true
---

# PR Review

Arguments: `$ARGUMENTS` — `<branch> [clickup-task-id]`.

Resolve the base branch (`git symbolic-ref --short refs/remotes/origin/HEAD`, else probe `origin/main` then `origin/master`). Run `git fetch origin <base>`, then `git diff origin/<base>...<branch>` and read the full diff, pulling each changed file in full where context is needed. If a task ID was given, fetch it with `mcp__claude_ai_ClickUp__clickup_get_task` for intended scope. Read any relevant `CLAUDE.md` for conventions and gotchas.

Review the diff as a hostile reviewer who hates this implementation. Look for logic bugs, edge cases, regressions, security issues, silent negative behavioral changes, and violations of any `CLAUDE.md` rules. Call out conspicuous absences: schema changes without migrations, logic without tests, security-sensitive changes without updated guards.

Verify every concern before reporting: re-read the actual code (not just the hunk), trace the call path, check whether it's handled elsewhere, web-search if it hinges on framework/library/platform behavior. Drop anything you can't confirm or misread, and drop pure style nits. For each surviving finding, propose 1–2 fixes (or describe the approach and tradeoffs if complex).

Report the results as a conversation, not a dump:

1. **Open with a summary.** A sentence or two on the overall shape of the change, then a numbered one-line list of the findings with severity labels (**Blocker** / **Should-fix** / **Nice-to-have**), most severe first. Include the one-line task-fit note here if a task was provided. No detail yet — this is the table of contents.
2. **Walk through findings one at a time.** Present the first finding in full — what's wrong, why it matters, `file:line` citations, and the proposed fix(es) — then stop and wait for the user. They may ask questions, push back, or dismiss it as not actually important. Engage honestly: if their reasoning holds, agree and note why it was dismissed; if it doesn't, say so — don't fold just because they pushed. Only move to the next finding when they're ready.
3. **Close with what stands.** After the last finding, give a short wrap-up: which findings survived the discussion and which were dismissed (with the user's reasoning), so it can be acted on or pasted into the PR.

If nothing survives verification, say so briefly with a note on what you checked — no walkthrough needed.
