---
name: blueprint
description: Interviews a person or team about the work they are on, finds the repeating unit worth automating, and proposes a Claude Code layer around it with human gates. Writes the proposal, stops for approval, builds it on a branch, then rehearses it in dry-run.
argument-hint: [what you're working on]
disable-model-invocation: true
---

Interview the person relentlessly about what they are working on until you both
understand it well enough to say what Claude should own, what stays human, and
where a human approves. One free-response question per message. No option
lists. Recommend an answer only when you feel
strongly. If the repo can answer a question, read the repo instead of asking.

The user's opening words are: $ARGUMENTS

## 1. Ground yourself before the first question

Read `${CLAUDE_SKILL_DIR}/inventory.md` (every Claude Code mechanism, when to
reach for it) and `${CLAUDE_SKILL_DIR}/lessons.md` (what earlier layers taught).

Explore the repo with read-only tools:
`CLAUDE.md`, `.claude/`, CI config, package scripts, recent `git log`, and any
ticket or monitoring MCP that is connected. Note what already exists so the
proposal extends it instead of duplicating it.

## 2. Interview

If they gave no opening words, ask what they are working on.

Start from whatever they said, a problem or a whole project; do not ask them
to classify it. Steer toward the thing that repeats. Useful threads: what
they did by hand this week that they also did last week; which step they
dread; where mistakes come from; what touches a system other people see.

Stop asking when you can state all of these in one sentence each:

- the repeating unit of work (one file, one page, one ticket, one release)
- the steps each unit goes through today, and who does each
- which steps are mechanical and which need judgment or taste
- every action that is outward-facing or hard to reverse
- the systems involved and how Claude can reach them

If nothing repeats, say so plainly and stop. Not every problem wants a layer.

## 3. Write the proposal

Write it to `notes/blueprint-<slug>.md` if the repo has a `notes/` directory,
otherwise to the scratchpad. Choose the layout per team; there is no
template. The proposal must answer:

- **What Claude owns, what stays human, and why.** Reasons for keeping a step
  human are things like volume control, a quality ceiling Claude has not
  cleared, or pacing so people keep a mental model of what is happening.
- **The pieces.** Pieces, not files: a piece may be a saved settings entry, a
  hosted routine, a connector, or a ticket template as easily as a file under
  `.claude/`. For each piece, first say what it does in the team's own words,
  then name the mechanism with a one-line comparison to something they know.
  Then state which other mechanisms could have done the job and why they
  lost, and the tradeoff you accepted. Walk all five groups of the inventory
  for every piece; do not pick from the ones you thought of first.
- **The gates.** One human approval before every outward-facing or
  hard-to-reverse action, each with its reason. Err toward more gates and
  let the user strike them; never propose one that is obviously pointless.
  No gate carries a removal condition; teams take gates down as trust grows.
- **Now, later, stays human.** "Now" is the smallest set of pieces that
  removes the pain. Everything else the
  interview surfaced goes under "later" so it is not lost.
- **A dry-run switch**, required in "now" whenever any piece touches an
  external system. With it on, the layer prints what it would have done and
  stops.

Write for engineers who have used Claude Code only for chat.

## 4. STOP

Present the proposal path and a short summary. Wait for explicit approval.
The user may strike gates, move pieces between now and later, or send you
back to the interview. Do not create branches or files until they say go.

## 5. Build

Branch off the default branch as `<user>/<slug>`; use a worktree if the
working tree is dirty. Write the "now" pieces only. Ids, thresholds, status
names, and scope lists go in a JSON config the pieces read, never in prose.
Keep each skill as concise as possible. Commit with a message that names the
proposal. Do not push unless asked.

## 6. STOP again

Report what was built and where. Wait for the user to start the rehearsal.

## 7. Rehearse

Run the built layer once, in this session, dry-run on, with the team
watching. Nothing outward-facing executes: no tickets, comments, pushes,
messages, or deploys. Read the would-have-done output together, fix rough
edges, commit again, and report what changed against the proposal. The run
is done when the team says the dry-run output is what they would have
approved.
