---
name: sprint-assess
description: Assess unassigned tasks in the current sprint for Claude subagent feasibility. Reads ClickUp tasks, researches the codebase in parallel, and produces a scored report. Use when the user wants to know which sprint tasks Claude could handle autonomously, or says "assess the sprint".
---

# Sprint Task Assessor

Evaluate every unassigned task in the current sprint and score how confidently a Claude subagent could one-shot it (push a merge-ready branch on the first try, with human review before merge).

---

## Step 1 — Find the current sprint

Fetch the workspace hierarchy for the **Dev - Frontend** space (`90144316847`), filtered to the **Sprints - 2026** folder (`90147472224`). Parse the date ranges from the sprint list names (format: `Sprint N (M/D - M/D)`). The current sprint is the one whose date range contains today's date.

If no sprint matches today (e.g. between sprints), use the next upcoming sprint. If ambiguous, ask the user.

---

## Step 2 — Fetch unassigned tasks

**Important**: Tasks are not always primarily listed in the sprint list. They often live in the Backlog but are *added to* the sprint as a secondary location (visible in the task's `locations` array). The `clickup_filter_tasks` tool only finds tasks whose primary list matches, so it will miss most sprint tasks.

Instead, use `clickup_search` with the sprint list as a location filter:

```
clickup_search({
  filters: {
    location: { subcategories: ["<sprint_list_id>"] },
    task_statuses: ["unstarted", "active"]
  }
})
```

Paginate using `next_cursor` until all results are collected.

From the results, separate tasks into two groups:

**Scoreable**: tasks with no assignees.

**Skipped**: tasks that have assignees, OR match any of these patterns:
- Status is `done` or `closed`
- Tagged `blocked`
- Name is ALL CAPS (epic container, not an actionable task)

For each scoreable task, fetch its full details using `clickup_get_task` to get the description, and `clickup_get_task_comments` to get comment history. Collect all available context before starting research.

---

## Step 3 — Research (parallel)

Spawn one **Explore subagent per task**, all in parallel. Each subagent receives:

- Task name
- Task description (full text)
- Task comments (full text)
- Any tags or priority info

Each subagent's job:

### Deep mode (default)

1. **Identify target files** — From the task context, search the codebase for relevant files. Use glob patterns, grep for component/function names, page routes, etc.
2. **Read the files** — Read each identified file. Understand what it does, how complex it is, what it imports.
3. **Find existing patterns** — Search for analogous work already done in the codebase. If the task is "Add h1 to /legal pages", look for pages that already have h1s added. If the task mentions a component, look for similar components.
4. **Trace dependencies** — Check what the target files import and what imports them. Identify if changes would cascade.
5. **Check test coverage** — Look for existing tests for the target files. Note if tests exist, if they'd need updating, or if new tests would be needed.
6. **Assess external dependencies** — Determine if the task requires things the agent can't access: design mockups, backend API changes, CMS admin configuration, third-party service setup, stakeholder decisions.

### Shallow mode (user must explicitly request)

1. **Identify target files** — Same as deep.
2. **Glob and count** — Check file existence and line counts. Do not read file contents.
3. **Skip** steps 3-6 from deep mode.

Each subagent returns a structured assessment:

```
Files found: [list with line counts]
Pattern exists: [yes/no — where]
Complexity: [low/medium/high — why]
External dependencies: [none / list]
Ambiguity: [none/low/medium/high — what's unclear]
Recommended approach: [1-2 sentences]
Blockers for automation: [list, or "none"]
```

---

## Step 4 — Score

Using each subagent's research, assign a confidence score:

| Score | Meaning |
|-------|---------|
| 9-10  | Mechanical / pattern-following. Files identified, pattern exists elsewhere in codebase, no ambiguous decisions. |
| 7-8   | Clear scope, files identified, but requires some judgment calls — choosing between approaches, handling edge cases. |
| 5-6   | Scope is understandable but touches complex areas (auth, checkout, payment), or requires coordinating changes across many files with side effects. |
| 3-4   | Vague spec, requires design/UX decisions, or depends on external systems the agent can't access (CMS admin, backend API changes). |
| 1-2   | Essentially requires a human. Spikes, research tasks, cross-team coordination, discussions. |

A 10/10 means: "I'm confident a subagent could push a branch that gets merged as-is after human review."

**Important**: The score must reflect what the research *actually found*, not what *might* exist. If the subagent looked for a pattern and didn't find one, that's a lower score. If it found the exact files and a clear pattern, that's a higher score. No hedging with "if X exists" — the research already checked.

---

## Step 5 — Generate report

Write the report to `.claude/sprint/sprint-N-assessment.md` (create the directory if needed). Use the sprint number from the list name.

### Report format

```markdown
# Sprint [N] Assessment

**Sprint**: [Sprint name with dates]
**Assessed**: [today's date]
**Mode**: [deep / shallow]
**Tasks scored**: [count] | **Skipped**: [count]

---

## Summary

| Score | Task | Key Reason |
|-------|------|------------|
| 9/10  | Task name | Brief reason |
| 7/10  | Task name | Brief reason |
| ...   | ...       | ...          |

Sorted highest score first.

---

## Detailed Assessments

### [Task name] — [score]/10
**ClickUp**: [task URL]
**Status**: [status]

[1-2 paragraph assessment explaining the score. What files are involved, what pattern exists or doesn't, what complexity was found, what's ambiguous.]

**Recommended approach**: [How a subagent should tackle this — which files to start with, which pattern to follow, what to watch out for.]

[For low scores: **What's missing**: what information or changes would need to exist before this could be automated.]

---

### [Next task...] — [score]/10
...

---

## Skipped Tasks

| Task | Reason |
|------|--------|
| EPIC NAME | Epic container |
| Some task | Assigned to [person] |
| Some task | Status: done |
| Some task | Tagged: blocked |
```

---

## Step 6 — Present results

After writing the file, display the summary table in the conversation and tell the user where the full report is saved. Then ask:

> **[N] tasks scored [X]/10 or higher look like strong candidates for subagent work. Want me to start working on any of these?**

Do not execute any tasks — this skill is report-only. If the user says yes, inform them that a separate execution workflow would be needed (or they can start a new conversation and reference the report).
