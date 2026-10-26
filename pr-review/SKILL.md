---
name: pr-review
description: Hostile senior-dev review of a branch against the repo's default branch, with every finding verified before reporting. Opens with what the branch is trying to do and a net-effect label, then walks through findings one at a time. Takes a branch name and optional ClickUp task ID.
disable-model-invocation: true
---

# PR Review

Arguments: `$ARGUMENTS` — `<branch> [clickup-task-id]`. Compare the branch to the repo's default branch, both as they are on origin now.

Review the diff as a hostile reviewer who hates this implementation. Look for logic bugs, edge cases, regressions, security issues, silent negative behavioral changes, and violations of any `CLAUDE.md` rules.

Run that review as parallel fresh-context subagents on Opus. Give each the diff range, the task scope, the paragraph above verbatim, and one lens: logic and edge cases; regressions and behavior changes traced through callers; completeness against the intent (the same bug or pattern left elsewhere, half-done migrations, task requirements dropped); security, `CLAUDE.md` and `CODING_STANDARDS.md` rules, and conspicuous absences (schema changes without migrations, logic without tests, security-sensitive changes without updated guards); simplifications to the code this branch touches, including trades that give up a little for much simpler code; or no lens. On a large diff, also split by file group; when it touches auth, payments, user input, or secrets, give security its own reviewer. Reviewers hunt, they don't verify: each returns every finding, one line each, with `file:line` and a concrete failure scenario (for a simplification: what gets simpler and what, if anything, is given up).

Every subagent only reads: it never changes the working tree, the index, the stash, or which branch is checked out.

Dedupe the merged findings, then give each one its own fresh subagent told to disprove it against the real code and its callers, not just the hunk: check whether it's handled elsewhere, and look up framework or library behavior when the finding hinges on it (if it can't, it returns the finding unresolved with the open question). A simplification is disproved if it breaks behavior something relies on beyond what it admits giving up. Each returns confirmed or refuted with evidence, under 100 words. Drop refuted findings and pure style nits, then read the cited code yourself for each survivor, and settle any open questions, before reporting it.

Report the results as a conversation, not a dump.

## 1. Open with the verdict

Keep the whole opening short enough to read without scrolling.

- **What the branch is trying to do.** Two or three sentences in the reader's terms: what is different for the user or the codebase after this merges, and why someone wanted that. Not a file-by-file tour. If a task was provided, add one line on whether the branch fits the task's scope (does more, does less, does something else).
- **Net effect on the codebase.** Harmful, Neutral, Helpful, or Fundamental: does the core change make future work here harder or easier? Most changes, bug fixes included, are Neutral. Judge the change, not the findings. One line of evidence.
- **Findings, in one breath.** A numbered list, one line each, with severity (**Blocker** / **Should-fix** / **Nice-to-have**), most severe first. Titles only, no detail yet.
- **Offer the walkthrough.** If any finding is a Blocker or Should-fix, end with "Ready to get into these?" and stop. If there are only Nice-to-haves, or nothing survived verification, say so in one line with a note on what you checked, and finish here. No walkthrough.

## 2. Walk through findings one at a time

Present one finding in full, then stop and wait for the user.

Explain each finding as if the reader has just asked "wait, what?": give a little context first (where this code sits in the flow, what it is supposed to do), then what is actually wrong, then why it matters. Use short sentences, one idea each, active voice, and the repo's own names for things (its `CONTEXT.md`'s, if it has one), with no jargon beyond them. Cite `file:line` so they can look. Then propose a fix or two, or the approach and tradeoffs if it's complex.

If the user pushes back or dismisses the finding, engage honestly: if their reasoning holds, agree and note why it was dismissed; if it doesn't, say so — don't fold just because they pushed. Move on when they're ready.

## 3. Close with what stands

After the last finding, give a short wrap-up: which findings survived the discussion and which were dismissed (with the user's reasoning), and whether the net-effect label changed. Keep it in a shape that can be acted on or pasted into the PR.
