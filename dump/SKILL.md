---
name: dump
description: Save a passing thought to the /threads inbox from any session so it shows up on the next open-threads page. Slash command only.
argument-hint: "<thought>"
disable-model-invocation: true
---

# /dump

Append the thought to `~/.claude/threads/inbox.jsonl` and confirm in one line.

The thought is: $ARGUMENTS

If it is empty, ask what to save and stop.

Write the line with one command (the directory may not exist yet):

```bash
mkdir -p ~/.claude/threads && python3 - "$PWD" "$THOUGHT" <<'EOF'
import json, os, sys, datetime, subprocess
cwd, text = sys.argv[1], sys.argv[2]
top = subprocess.run(["git", "-C", cwd, "rev-parse", "--show-toplevel"], capture_output=True, text=True).stdout.strip()
now = datetime.datetime.now().astimezone()
row = {
    "id": now.strftime("d-%Y%m%d-%H%M%S"),
    "at": now.isoformat(timespec="seconds"),
    "cwd": cwd,
    "project": os.path.basename(top or cwd),
    "text": text.strip(),
}
with open(os.path.expanduser("~/.claude/threads/inbox.jsonl"), "a") as fh:
    fh.write(json.dumps(row, ensure_ascii=False) + "\n")
print(row["id"])
EOF
```

Pass the thought verbatim as `$THOUGHT`; do not rephrase, expand, or act on it.
Reply with one line: "Saved to threads inbox." followed by the thought in quotes.
