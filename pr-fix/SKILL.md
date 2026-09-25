---
name: pr-fix
description: Loop a hostile, verified pr-review over your own branch, fixing each confirmed Blocker and Should-fix as its own commit until a fresh reviewer finds none. Manual only. Takes a branch name and optional ClickUp task ID.
disable-model-invocation: true
---

# PR Fix

Arguments: `$ARGUMENTS` — `<branch> [clickup-task-id]`.

Only run on a branch the user owns. Stop and ask if it is the default branch, someone else's branch, or the working tree is dirty. Check it out, commit locally, never push.

## Loop

Keep a ledger of every finding handled so far: fixed (with commit sha), parked, skipped, or dismissed, each with a one-line reason. Before round 1, run the repo's lint, type check, and tests once and note what already fails.

1. **Review.** Spawn a fresh Opus subagent each round so no reviewer grades its own fixes. It reads `~/.claude/skills/pr-review/SKILL.md` and follows only the review and verify paragraphs (everything before "Open with the verdict") against the branch diff and the task, if given. It is read-only: no edits, and no `git stash`, `checkout`, `reset`, `commit`, or anything else that changes repo state. Pass it the ledger as "already decided — do not re-raise unless a later fix broke it". It replies in under 300 words with a list: severity, `file:line`, the problem in one line, the proposed fix, and whether the fix is a judgment call (product behavior, API shape, a real tradeoff).
2. **Check.** Re-verify each Blocker and Should-fix at the cited code before touching it. Log anything that doesn't hold up as dismissed.
3. **Fix.** Fix mechanical Blockers and Should-fixes one at a time with the smallest change that resolves each, one commit per finding naming it. Park judgment calls for the user. Skip Nice-to-haves.
4. **Gate.** After each fix, run the repo's lint, type check, and tests for the touched scope. If a gate newly fails and the fix can't be repaired within the finding's scope, revert that commit and park the finding.

Stop when a round returns no verified Blocker or Should-fix, when a round only re-raises ledger items that no later fix broke, or after 4 rounds.

## Fixes must not

- Add casts, non-null assertions, or fallback defaults (`?? 0`, `?? ""`) to make a finding go away.
- Remove a runtime guard because the declared type says it can't fire. Check the runtime state instead.
- Change behavior beyond what the finding describes, or widen the branch's scope.
- Commit review notes or reports.

## Report

Say why the loop stopped and how many rounds ran. Then a table: finding, severity, outcome (fixed with sha, parked, skipped, dismissed, or open if still unresolved when the loop stopped), one-line reason. Give each parked judgment call enough context to decide on. The shas let the user read each fix with `git show`; suggest `/pr-review <branch>` for a fresh full review.
