---
name: hallogallo
description: End-to-end guided task workflow — research, plan, annotate, implement — with Max in the driver's seat.
disable-model-invocation: true
---

# Hallogallo

Max drives; you ride shotgun. Never write implementation code until he has approved a written plan. Every phase produces a document he reviews — the document, not the chat, is the shared state between you.

Write everything — artifacts and messages alike — in the plainest language you can manage: short sentences, ordinary words over jargon, one idea at a time. Simple means all the same facts with fewer barriers, not less information (the wtf skill's principle). These docs exist to be reviewed quickly; if Max has to reread something — or invoke wtf on it — that's a defect.

## How every doc is delivered and reviewed

Each phase doc exists twice:

1. **Markdown in `notes/<task-slug>/`** — the source of truth.
2. **A published Artifact** of the same content — Max's review surface. Load the `artifact-design` skill before writing the HTML, put the file next to the markdown (`research.html`, `plan.html`, `walkthrough.html`), publish it, and hand Max the URL. Keep one visual identity across a task's docs so they read as a set, and link each doc to the previous one.

Never edit only the HTML. Change the markdown, regenerate the page, republish to the same URL — after every round, so the page never lags.

Max leaves comments on the artifact. Two kinds arrive:

- **Plain comments.** The moment Max mentions he left comments, read the artifact's comment threads without waiting to be asked again. Answer each one here in chat, directly: name what the comment was anchored to, then give the answer in full — the chat is where he reads the response, so "see the updated doc" is not an answer. Then fold the answer into the doc. You cannot reply to or resolve these threads; say which stay open so he can resolve them himself.
- **"Send to Claude" threads.** These reach you directly. Reply in-thread with anything still unanswered, make the change if one is asked for, then resolve the thread.

## 0. Kickoff

Ask what we're working on — a description, or a ClickUp card to fetch. Then run a mini grill session (invoke the grill-me skill) to reach shared understanding of the goal, not the design — that scrutiny belongs to the annotation loop, after the research exists. Close by restating the sharpened goal and proposing a short task slug — it names the `notes/` directory and later the working branch (`max/<slug>`) — and get both confirmed before burning tokens on research.


## 1. Research → `notes/<task-slug>/research.md`

Back up from the problem before diving in. The stated task is often a symptom — chase the root cause, and look for how the codebase already solves similar problems before treating this one as new. Then deep-read the relevant system: not at the signature level, but through the actual flows, the callers, the data shapes, the existing conventions the change must respect. Keep digging until nothing in that system would surprise you — the most expensive failure mode is code that works in isolation but breaks or duplicates its surroundings.

The codebase isn't the only source. When the task touches a library, API, or established pattern, read the current documentation and best practices online rather than trusting recollection — libraries drift, and the doc beats the memory of the doc. External findings belong in the research doc alongside the codebase findings, cited.

Each task gets its own directory under the git-ignored `notes/`, named by the slug confirmed at kickoff; this doc and the later plan live together there. Write the findings, publish the artifact, then stop for Max's review. The research is his surface for catching your misunderstandings — if it's wrong, the plan and the implementation will be wrong. When a comment reveals a concept the doc assumed, add a plain-language section to the doc rather than answering only in chat.

## 2. Plan → `notes/<task-slug>/plan.md`

Once the research is blessed, write a detailed plan: the approach and its trade-offs, real code snippets, the files that change. Ground it in the research and the actual codebase, not in how such things usually work. If Max supplies a reference implementation, adapt from it rather than designing from scratch.

Keep a status line at the top of the file:

```
STATUS: awaiting annotations — do not implement
```

That line is the gate. Obey whatever it currently says, at any point in the session, however long ago the plan was written.

## 3. Annotate (loop)

Max reviews the plan on its artifact and leaves comments — or asks to be grilled on it instead (grill-me). When he sends you back to the document: address every comment, update the markdown, republish, do not implement. His notes overrule the plan, but if a note conflicts with evidence you have, push back in the doc rather than silently complying.

This repeats until Max says the plan is right — expect multiple rounds. It is not good enough until he says it is.

## 4. Todo

Append a granular phase/task checklist to `plan.md` and flip the status line to `STATUS: approved — implementing`. The plan is now the source of truth for progress.

## 5. Implement

Implement it all: no cherry-picking, no pausing for confirmation mid-flow, tasks marked complete in the plan as you go. Run the project's typecheck and relevant tests continuously so problems surface early, not at the end. Keep the diff clean — no commentary comments, no `any`/`unknown` escapes. Implementation should be boring; the creative work already happened in the annotation rounds.

What long runs get wrong without being told:

- **Never deviate silently.** When the code contradicts the plan, don't improvise around it. A trivial mismatch gets fixed and recorded in the plan; a design-level one stops the run and comes back to Max. The plan gets amended, never quietly ignored.
- **No drive-by fixes.** Adjacent problems become follow-up notes in the plan, not fixes. The diff should map to the plan.
- **Commit at task boundaries.** Reverting and re-scoping is the recovery move for a wrong direction — it beats patching a bad approach, and it's only cheap when there's a checkpoint to revert to.
- **Trust the artifact over memory.** After compaction, or whenever unsure of state, re-read the plan.
- **Don't weaken the gate to pass it.** A failing test or type error means fix the code. If the test itself is wrong, that's a plan deviation — flag it, don't delete the assertion.
- **Audit before declaring done.** Re-read the plan top to bottom and check every item against the actual diff. Checkbox marks are claims, not evidence.

Max's corrections during this phase will be terse ("wider", "you missed X") — he has full context, so act on them directly.

## 6. Walkthrough → `notes/<task-slug>/walkthrough.md`

After the done-audit passes, write a walkthrough of how the implementation went, told as a story: what changed and why, in the order the diff is best read, where the plan was deviated from and what surprised you, and anything worth verifying by hand before this ships. Short beats complete — link to the plan for detail rather than restating it. Publish it like the others.
