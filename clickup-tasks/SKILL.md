---
name: clickup-tasks
description: Break brainstorming or planning conversations into ClickUp subtasks. Use when the user asks to create subtasks, ClickUp cards, or tickets from the current discussion.
disable-model-invocation: true
---

# ClickUp Task Creation

After brainstorming or planning with the user, break the conversation into ClickUp subtasks.

## Backlog location

All tasks live in the **"Dev - Frontend/Backlog"** folder in ClickUp. Use the ClickUp MCP tools to find the folder and create tasks there.

## Structure

- **Epic** = parent task. Name is ALL CAPS. Usually already exists. The user is typically discussing subtasks within an existing epic.
- **Subtask** = child of an epic. Name is normal sentence casing. Represents a single deliverable unit of work.
- If the conversation scope drifts significantly beyond the current epic, suggest creating a new epic — but this is rare.

## Fields per subtask

| Field         | Required | Notes                                                                                                                                                    |
| ------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name          | Yes      | Sentence case. Clear, specific, action-oriented.                                                                                                         |
| Description   | Yes      | See format below.                                                                                                                                        |
| Sprint points | No       | Only if user requests. Modified Fibonacci: 0.5, 1, 2, 3, 5, 8, 13.                                                                                       |
| Stakeholders  | Ask      | Always ask the user who should be stakeholder before creating.                                                                                           |
| Areas         | Yes      | Pick the best fit: `Website`, `Admin Dashboard`, `Account Dashboard`, `Operations`, or `All`. Do not default — choose based on what the subtask affects. |

## Sprint point guide (when requested)

- **0.5** — Most trivial. A single-line change, copy tweak, config toggle.
- **1** — Near-trivial. Very small change, minimal thought required.
- **2** — Small. Single file, straightforward logic, <1hr.
- **3** — Medium. A few files, some decisions, half a day.
- **5** — Large. Multiple files/components, needs thought, ~1 day.
- **8** — Very large. Cross-cutting, multi-day, some unknowns.
- **13** — Epic-sized. If you're assigning 13, consider splitting further.

## Subtask description format

Write descriptions as Claude-readable plans using this structure:

```
## Goal
What this subtask accomplishes and why. Be concise, but use as many sentences as needed to capture the intent clearly.

## Implementation approach

[If confidence is 10/10 — one clear approach:]
Steps to implement:
1. ...
2. ...
3. ...

[If confidence is < 10/10 — multiple approaches with a recommendation:]
### Option A: [Name] (recommended)
Brief description of approach and why it's preferred.

### Option B: [Name]
Brief description of alternative and tradeoffs vs Option A.

## Files / code areas
- `path/to/relevant/file.ts` — what changes here
- `path/to/other/file.ts` — what changes here

## Acceptance criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Constraints / gotchas
- Anything that could trip up implementation: edge cases, API quirks, dependencies, performance concerns, etc.
```

### Description rules

- **Do** include enough context that Claude (or a developer) can pick up this task cold without re-reading the brainstorm conversation.
- **Do** reference specific file paths, function names, component names when known.
- **Do** mention dependencies on other subtasks explicitly (e.g., "Depends on: [subtask name]").
- **Don't** over-specify implementation steps when the approach isn't certain. Give options with a preference instead.
- **Don't** pad with filler. Every sentence should carry information.

## Workflow

The skill works in two modes depending on how the user invokes it.

### Mode A — Single task (user describes one specific task)

If the user passes arguments directly (e.g. `/clickup-tasks convert these three files`) or clearly describes a single task to create, skip the proposal list. Go straight to drafting the full task and presenting it for review:

```
---
**Name:** Subtask name in sentence case

**Areas:** Website

**Stakeholders:** none

**Description:**
## Goal
...full description content...
[etc.]
---

Any changes before I create it?
```

Only ask about stakeholders if there's a reason to think someone specific should be listed. If the user has already said "no stakeholder" earlier in the session, default to none without asking.

### Mode B — Batch (user wants to break a brainstorm into multiple tasks)

If the user has been discussing a broader project and wants to extract multiple subtasks:

1. Propose a numbered list of subtasks with one-line summaries and ask for confirmation:

   ```
   Here's the subtasks I'm thinking of creating under [EPIC NAME]:

   1. Subtask name — One-line summary.
   2. Subtask name — One-line summary.

   Any you'd like to add, remove, or change? Who should be listed as stakeholder (if anyone)?
   ```

2. After the user confirms, present each subtask as a full block (same format as Mode A) before creating. You can present all blocks at once for batch review.

### Both modes — before creating

Always show the **full value of every field you intend to populate** before calling any MCP tool. Do not summarize or abbreviate — the user is reviewing the exact content that will be submitted. Wait for explicit confirmation ("yes", "create it", "looks good", etc.) before creating.

After approval, create tasks via the ClickUp MCP tools in the **Dev - Frontend/Backlog** folder using the exact content shown in the preview.
