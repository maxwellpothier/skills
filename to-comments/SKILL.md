---
name: to-comments
description: Turn the findings from a /pr-review run earlier in this conversation into paste-ready Bitbucket PR comments — one per finding, each with a verified file/line anchor and the concrete fix. Manual only.
disable-model-invocation: true
---

# To Comments

Arguments: `$ARGUMENTS` — optional filter: `blockers`, `blockers+should-fix`, or specific findings by number/description. Default: all findings.

Convert the findings from the most recent /pr-review in this conversation (or findings the user pasted) into inline PR comments to paste into Bitbucket. If there's no review in this conversation and nothing pasted, say so and stop — don't run a review yourself.

## Anchors

Each comment needs the exact line the user will attach it to in the Bitbucket diff view:

- Re-read the current file on the reviewed branch to confirm the line number — the review may cite numbers that have since drifted, and a wrong anchor wastes the user's time hunting.
- Anchor to the changed line that best represents the problem, not nearby context. If the problem is deleted code, anchor to the removed line and mark it `(removed line)`.
- If a finding spans several locations, anchor where the fix starts and name the other spots in the comment body.

## Comment voice

These get posted under the user's name, so write them the way a human reviewer writes:

- Direct and collegial. No severity labels inside the body, no "Finding 3", no references to the review process, no AI-isms.
- State the problem concretely — what breaks and when — then the fix. Short fixes go in as a code snippet; larger ones as an approach precise enough to act on without a follow-up question.
- One comment per finding, each under ~120 words plus code.

## Output format

Order: blockers, then should-fix, then nice-to-have. For each comment:

**`path/to/file.ts:123`** — Blocker

````
Comment body in Bitbucket markdown, ready to paste verbatim.
````

Use four-backtick fences so triple-backtick code snippets inside the body survive copying. The anchor line and severity tag sit outside the fence — they're for the user's sifting, not part of the comment.

If the review ended with open questions for the author, offer them last as one optional top-level (non-inline) PR comment in the same fenced format.

## When Bitbucket access exists

If a Bitbucket tool that can post PR comments is available in the session, ask whether to post directly instead of printing; reuse the same anchors and bodies. Until then, print only.
