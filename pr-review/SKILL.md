---
name: pr-review
description: Hostile senior-dev review of a branch's diff vs the repo's default branch, with every finding verified before reporting. Opens with what the branch is trying to do and a net-effect score, then walks through findings one at a time in plain language. Manual only. Takes a branch name and optional ClickUp task ID.
disable-model-invocation: true
---

# PR Review

Arguments: `$ARGUMENTS` — `<branch> [clickup-task-id]`.

Resolve the base branch (`git symbolic-ref --short refs/remotes/origin/HEAD`, else probe `origin/main` then `origin/master`). Run `git fetch origin <base>`, then `git diff origin/<base>...<branch>` and read the full diff, pulling each changed file in full where context is needed. If a task ID was given, fetch it with `mcp__claude_ai_ClickUp__clickup_get_task` for intended scope. Read any relevant `CLAUDE.md` for conventions and gotchas. If the repo has a `CONTEXT.md` (follow `CONTEXT-MAP.md` to the right one if there is more than one), read it: its names are the names you will use when you explain things.

Review the diff as a hostile reviewer who hates this implementation. Look for logic bugs, edge cases, regressions, security issues, silent negative behavioral changes, and violations of any `CLAUDE.md` rules. Call out conspicuous absences: schema changes without migrations, logic without tests, security-sensitive changes without updated guards.

Verify every concern before reporting: re-read the actual code (not just the hunk), trace the call path, check whether it's handled elsewhere, web-search if it hinges on framework/library/platform behavior. Drop anything you can't confirm or misread, and drop pure style nits. For each surviving finding, propose 1–2 fixes (or describe the approach and tradeoffs if complex).

Report the results as a conversation, not a dump.

## 1. Open with the verdict

Keep the whole opening short enough to read without scrolling.

- **What the branch is trying to do.** Two or three sentences in the reader's terms: what is different for the user or the codebase after this merges, and why someone wanted that. Not a file-by-file tour. If a task was provided, add one line on whether the branch fits the task's scope (does more, does less, does something else).
- **Net effect on the codebase.** A score from −5 (leaves the codebase worse) to +5 (clearly better), with one line of evidence for each of the two things the score weighs:
  - _Industry practice_ — does the change do what good engineers would do here today: correct, safe, tested where it matters, no reinvented wheels, sensible boundaries.
  - _Fit with the existing code_ — does it use the repo's own patterns, names and layers, or does it add a second way of doing something the repo already does.

  The score judges the merged result, not the finding count: a branch with three small findings that replaces a hairy module can still be a +4. Say the score first, then the evidence. Never give the score without the evidence.

- **Findings, in one breath.** A numbered list, one line each, with severity (**Blocker** / **Should-fix** / **Nice-to-have**), most severe first. Titles only, no detail yet.
- **Offer the walkthrough.** If any finding is a Blocker or Should-fix, end with "Ready to get into these?" and stop. If there are only Nice-to-haves, or nothing survived verification, say so in one line with a note on what you checked, and finish here. No walkthrough.

## 2. Walk through findings one at a time

Wait for the user before each finding. Present one finding in full, then stop.

Explain each finding as if the reader has just asked "wait, what?": give a little context first (where this code sits in the flow, what it is supposed to do), then what is actually wrong, then why it matters. Write in ASD-STE100 Simplified Technical English: short sentences, one idea each, active voice, common words, no jargon the repo itself does not use. Name things the way `CONTEXT.md` names them, or failing that the way the codebase itself does. Cite `file:line` so they can look. Then give the proposed fix(es).

The user may ask questions, push back, or dismiss the finding as not actually important. Engage honestly: if their reasoning holds, agree and note why it was dismissed; if it doesn't, say so — don't fold just because they pushed. Only move to the next finding when they're ready.

## 3. Close with what stands

After the last finding, give a short wrap-up: which findings survived the discussion and which were dismissed (with the user's reasoning), and whether the net-effect score moved as a result. Keep it in a shape that can be acted on or pasted into the PR.
