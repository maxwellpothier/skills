# Lessons from earlier layers

Two layers built at Smarty in 2026: a codebase-wide language migration and a
recurring per-sprint performance check. Written in process language on
purpose. Nothing here says which mechanism was used, so nothing here is a
shape to copy. Use it to calibrate where the repeating unit hides, why steps
stayed human, and how layers break.

## Finding the unit

- The migration looked like one huge project. It only became automatable
  once the unit was named: one file, taken through convert, review, ship.
  Everything else was scheduling around that unit.
- The performance check looked like a chore card. Its unit was one page
  failing one metric, taken through measure, classify, find the cause,
  decide whether it deserves a fix ticket.
- In both, the person had been doing the unit by hand for weeks before
  anyone asked which parts of it needed them.

## Why steps stayed human

- **Plan approval before fan-out.** Once many parallel workers start, the
  cost of a wrong plan multiplies. One person reading the plan first was the
  cheapest gate in the whole system.
- **Review after branches exist.** Slowing down after Claude had built
  something, and before it merged, was where most real defects were caught.
  The team kept saying they could remove this gate later; they have not yet.
- **Approval before tickets are created.** Claude can create tickets faster
  than a team can absorb them, and its titles and descriptions read poorly to
  newer developers. Reading the findings first keeps the backlog legible and
  keeps the humans' mental model of the sprint intact.
- **Judging which findings deserve work.** Deciding a slow page is
  acceptable, or that a warning is noise, needs context Claude does not have.
  Accepted exceptions were written down with a reason so re-runs do not
  re-raise them.

## How the layers broke

- A parallel worker tidied its own checkout in the middle of a merge and
  destroyed shared state. Telling workers to be read-only was not enough;
  the specific forbidden commands had to be listed.
- A cleanup that trusted a type assertion instead of the runtime data took a
  production page down. Keeping a defensive check that looked redundant would
  have prevented it. The most dangerous defect class was quiet behavior
  change, not compile errors.
- A local guardrail silently stopped firing for weeks because its wiring
  lived in an ignored local file. Guardrails need to be triggered on purpose
  now and then to prove they still work.
- The first rehearsal of the performance check surfaced eight problems in a
  design that had been reviewed three times on paper. Nothing is done until
  it has run once with the dry-run switch on and someone watching.

## What landed with other teams

- When the layers were presented to engineers new to Claude Code, the only
  mechanism they walked away understanding was the saved, slash-invoked
  playbook. Everything else needs a comparison to something they already use.
- A ledger of what earlier runs already handled made the recurring check
  cheap on the second run and cheaper on the third. Recurring layers should
  remember their own history.
