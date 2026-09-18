---
name: threads
description: Morning list of every open thread with Claude across your projects — recent sessions, memory, unmerged branches, and /dump notes — cross-checked, written up, and published as one artifact with Close / Pin / Snooze controls and a drag-to-reorder pinned lane. Slash command only.
argument-hint: "[--dry-run]"
disable-model-invocation: true
---

# /threads

Rebuild the open-threads page from local evidence and republish it. Nothing here
is project-specific: everything comes from `~/.claude/threads/config.json`.

State directory: `~/.claude/threads/`
- `config.json` — `roots` (directories whose projects count), `lookback_days`, `stale_branch_days`, `ignore_commands`, `noise_commands`, `artifact_url`
- `state.json` — the thread registry (schema below). The only durable record; memory is read-only input.
- `inbox.jsonl` — one `/dump` per line: `{id, at, cwd, project, text}`

## 1. Config

If `config.json` is missing, ask one question: which directories should count
(suggest the parent directory of the current repo). Write the file with the
defaults from `scan.py` and continue.

## 2. Scan

```bash
python3 ~/.claude/skills/threads/scan.py --out "$SCRATCHPAD/digest.json"
```

Read the digest. It holds `sessions` (recent transcripts under the roots),
`memories` (every memory directory under the roots, with `MEMORY.md` and
project-type bodies), `repos` (unmerged branches and worktrees), `state`, and
`inbox`. Sessions and memory files already in `state` with an unchanged
timestamp come back with `unchanged: true` and no body — reuse the previous
run's rundown for those instead of re-deriving it.

## 3. Pull what the person did on the page

Skip when `config.artifact_url` is null.

- `Artifact read_db` with `db_op: list`, `collection: actions`. Each document is
  `{slug, action, at, until?, title}` with `action` in done | pin | unpin |
  snooze | restore (`drop` is a legacy alias for done). Apply any whose `at` is newer than `state.actionsApplied[slug]`.
  Actions accumulate in the database; never delete them.
- `Artifact read_db` with `db_op: get`, `collection: settings`, `doc_id: pinOrder`.
  The document is `{key: "pinOrder", order: [slug...], at}`: the order the person
  gave the pinned lane by dragging sidebar entries. Replace `state.pinOrder` with
  `order`, dropping slugs that no longer exist. A missing document means keep
  the previous order.
- `Artifact comments` on the same URL. A comment left on a thread becomes that
  thread's `note`, prefixed with its date. Do not reply to or resolve threads.

Also call `ListAgents` and record the peer sessions as `liveSessions`.

## 4. Build the thread list

A thread is one piece of ongoing work, not one session. Group by topic:
several sessions, a memory file, and a branch about the same thing are one
thread. Reuse the slug from `state.threads` whenever the topic already exists;
mint a new kebab-case slug only for genuinely new work. Slugs never change.

For each thread write:
- `title` — a noun phrase the person would recognize
- `rundown` — two or three sentences: where it stood when the last session
  ended, from the transcript tail and the memory body. Plain facts, no praise.
- `next` — the next move if the evidence names one, otherwise omit
- `sources` — subset of memory, transcript, branch, card
- `links` — tracker cards and report files named in the evidence
- `sessionId` — the most recent session on the thread, for `claude --resume`
- `project`, `branch`, `lastActive`

Classification, biased toward showing too much:
- `active` — the last session ended mid-work, memory calls something open, or
  a branch has unmerged commits from the last two weeks
- `finished` — the session read as a one-off question that got answered, or
  the branch is older than `stale_branch_days` with no session about it.
  Shown collapsed, never hidden.
- `snoozed` — only from a page action or an earlier state. A snooze whose
  `until` is today or earlier becomes `active` again.

`done` is set only by the Close button on the page and cleared only by a page
`restore`. Within a page view a closed thread stays in place, crossed out with a
green checkmark and an Undo button. The next run leaves it out of the page data
entirely, so a freshly published page never shows a checkmark. It stays in
`state.threads` so its slug is never re-minted and later evidence on the same
topic does not bring it back. Drop it from state once its `lastActive` falls
outside `lookback_days`.

Branches with no session and no memory still get a thread (source: branch)
so nothing unmerged goes unlisted.

Inbox: attach a dump to a thread only when the connection is unmistakable —
it names the thread's branch, card, or title. Otherwise it stays a standalone
inbox item with `slug` equal to its `id`. Dumps checked off on the page keep
the flag.

## 5. Write state, render, publish

Update `state.json`:

```json
{
  "lastRun": "<iso>",
  "pinOrder": ["<slug>"],
  "threads": {
    "<slug>": {
      "title": "", "project": "", "state": "active", "done": false, "pinned": false, "snoozeUntil": null,
      "rundown": "", "next": "", "sources": [], "links": [], "branch": "",
      "sessions": [{"id": "", "lastAt": ""}], "memory": ["<abs path>"], "dumps": ["<inbox id>"],
      "note": "", "firstSeen": "<date>", "lastSeen": "<date>", "closedAt": null
    }
  },
  "inbox": {"<id>": {"state": "inbox", "thread": null}},
  "memorySeen": {"<abs path>": "<modified iso>"},
  "actionsApplied": {"<slug>": "<at iso>"}
}
```

Write the page data to `$SCRATCHPAD/threads-data.json`:
`{today, pinOrder: [...], threads: [...], inbox: [{id, slug, at, project, text, state}], liveSessions: [{name, project, idle}]}`
(threads carry the fields from step 4 plus `state`, `pinned`, `snoozeUntil`, `note`, `dumps`;
closed threads are omitted).
The page shows pinned threads in `pinOrder` first, in that order, then any other
pinned thread in the order given.

```bash
python3 ~/.claude/skills/threads/render.py --data "$SCRATCHPAD/threads-data.json" --out "$SCRATCHPAD/threads.html"
```

With `--dry-run`: stop here, print the counts per section, and do not publish
or write state.

Publish with the Artifact tool: `file_path` the rendered page,
`capabilities: {"db": {}, "user": {}}`, `url` from config when set. On the first
publish pass `favicon: "🧵"` and a one-sentence description, then save the
returned URL into `config.json` as `artifact_url`.

## 6. Reply

Under 120 words: counts per section, the link, and any thread that appeared for
the first time with no memory behind it. No per-thread narration, and never
mention a closed thread, even when new evidence touched it; the page has it.
