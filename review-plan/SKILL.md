---
name: review-plan
description: Review the most recent plan file in ~/.claude/plans/ against a rigorous critique checklist. Slash command only — invoke with `/review-plan`.
disable-model-invocation: true
---

# review-plan

Review the latest plan Claude produced (stored in `~/.claude/plans/`) against the criteria below.

## Step 1 — resolve the latest plan and current branch

Find the most recently modified plan file and the current git branch:

```bash
ls -t ~/.claude/plans/*.md | head -1
git branch --show-current
```

Read the first line of the plan file with the Read tool (it will be the `# Title`). Do NOT read the whole file yet — only the title is needed for the confirmation step.

## Step 2 — confirm with the user

Echo the plan title AND the current branch back, then ask for confirmation. Use exactly this format:

> About to review:
> - **Plan:** <title> (`<basename>.md`)
> - **Branch:** `<branch>` (diff vs `master`)
>
> Proceed? (yes / pick another)

- `<title>` is the first line of the file with the leading `# ` stripped.
- `<basename>` is the plan filename without the `.md` extension.
- `<branch>` is the output of `git branch --show-current`.

If the user declines or names a different plan/branch, re-resolve and re-confirm. Do NOT proceed to Step 3 until they confirm.

## Step 3 — load the plan

Once confirmed, read the full plan file with the Read tool. Hold the contents in context for the review.

## Step 4 — review against the criteria below

<!-- BEGIN USER REVIEW INSTRUCTIONS -->

claude made this plan to fix things up on this branch, make the code more clean.

Do an Unrelenting review of the plan and it's associated code (and the code diff on this branch generally) and provide concise and specific feedback on the plan.

<!-- END USER REVIEW INSTRUCTIONS -->

## Step 5 — output

Deliver the review directly in the conversation. Do not write any files unless the user's instructions above explicitly ask for one.
