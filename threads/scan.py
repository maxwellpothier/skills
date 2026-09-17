#!/usr/bin/env python3
"""Digest Claude Code activity under the configured roots into one JSON file.

Reads only local files: session transcripts and memory directories under
~/.claude/projects, git branches of repos under the roots, and the threads
state directory. Prints nothing but a one-line summary; writes JSON to --out.
"""

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

HOME = Path.home()
PROJECTS_DIR = HOME / ".claude" / "projects"
STATE_DIR = HOME / ".claude" / "threads"

DEFAULTS = {
    "roots": [],
    "lookback_days": 14,
    "stale_branch_days": 45,
    "ignore_commands": ["threads", "dump"],
    "noise_commands": ["clear", "compact", "context", "cost", "effort", "mcp", "model", "version-up", "status"],
    "artifact_url": None,
}

PROMPT_CHARS = 320
TAIL_CHARS = 700
MEMORY_BODY_CHARS = 1400


def load_json(path, fallback):
    try:
        return json.loads(Path(path).read_text())
    except (OSError, ValueError):
        return fallback


def expand(p):
    return str(Path(os.path.expandvars(os.path.expanduser(p))).resolve())


def encode_path(path):
    return path.replace("/", "-")


def text_of(content):
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(block.get("text", ""))
        return "\n".join(parts)
    return ""


def is_tool_result(content):
    return isinstance(content, list) and any(
        isinstance(b, dict) and b.get("type") == "tool_result" for b in content
    )


COMMAND_RE = re.compile(r"<command-name>/?([\w:-]+)</command-name>")
STRIP_TAGS_RE = re.compile(r"<(?:local-command-caveat|local-command-stdout|command-[\w-]+|system-reminder)[^>]*>.*?</(?:local-command-caveat|local-command-stdout|command-[\w-]+|system-reminder)>", re.S)


def clean_prompt(text):
    cmd = COMMAND_RE.search(text)
    stripped = STRIP_TAGS_RE.sub("", text).strip()
    if cmd:
        args = re.search(r"<command-args>(.*?)</command-args>", text, re.S)
        arg_text = (args.group(1).strip() if args else "")
        return f"/{cmd.group(1)} {arg_text}".strip(), cmd.group(1)
    return stripped, None


def squash(text, limit):
    text = re.sub(r"\s+", " ", text).strip()
    return text if len(text) <= limit else text[: limit - 1] + "…"


def digest_session(path, roots, ignore_commands, noise_commands, known_last_at):
    session = {
        "sessionId": path.stem,
        "file": str(path),
        "cwd": None,
        "gitBranch": None,
        "title": None,
        "firstPrompt": None,
        "firstCommand": None,
        "recentPrompts": [],
        "lastAssistant": None,
        "startedAt": None,
        "lastAt": None,
        "humanTurns": 0,
        "endedWith": None,
        "resumedFromLocalCommand": False,
    }
    prompts = []
    last_assistant_text = None
    ended = None
    with open(path, encoding="utf-8", errors="replace") as fh:
        for line in fh:
            try:
                row = json.loads(line)
            except ValueError:
                continue
            kind = row.get("type")
            if kind == "ai-title":
                session["title"] = row.get("aiTitle") or session["title"]
                continue
            if kind not in ("user", "assistant"):
                continue
            if row.get("isSidechain"):
                continue
            msg = row.get("message") or {}
            content = msg.get("content")
            ts = row.get("timestamp")
            if ts:
                session["startedAt"] = session["startedAt"] or ts
                session["lastAt"] = ts
            if row.get("cwd") and not session["cwd"]:
                session["cwd"] = row["cwd"]
            if row.get("gitBranch"):
                session["gitBranch"] = row["gitBranch"]
            if kind == "user":
                if is_tool_result(content):
                    ended = "tool_result"
                    continue
                text = text_of(content)
                if not text.strip():
                    continue
                if text.lstrip().startswith("<local-command-caveat>"):
                    session["resumedFromLocalCommand"] = True
                cleaned, command = clean_prompt(text)
                if not cleaned:
                    continue
                if command == "clear":
                    prompts, last_assistant_text = [], None
                    session["firstPrompt"], session["firstCommand"], session["humanTurns"] = None, None, 0
                    continue
                if command in noise_commands:
                    continue
                session["humanTurns"] += 1
                prompts.append(cleaned)
                if session["firstPrompt"] is None:
                    session["firstPrompt"] = squash(cleaned, PROMPT_CHARS)
                    session["firstCommand"] = command
                ended = "user"
            else:
                text = text_of(content)
                if text.strip():
                    last_assistant_text = text
                    ended = "assistant"
                else:
                    ended = "tool_use"
    if not session["cwd"]:
        return None
    if not any(session["cwd"].startswith(r) for r in roots):
        return None
    if session["firstCommand"] in ignore_commands:
        return None
    if session["humanTurns"] == 0:
        return None
    session["endedWith"] = ended
    session["sizeKB"] = round(path.stat().st_size / 1024)
    if known_last_at.get(session["sessionId"]) == session["lastAt"]:
        session["unchanged"] = True
        return session
    session["unchanged"] = False
    session["recentPrompts"] = [squash(p, PROMPT_CHARS) for p in prompts[-3:]]
    session["lastAssistant"] = squash(last_assistant_text or "", TAIL_CHARS) or None
    return session


FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n(.*)$", re.S)


def digest_memory(memory_dir, known_memory):
    out = {"dir": str(memory_dir), "index": None, "files": []}
    index = memory_dir / "MEMORY.md"
    if index.exists():
        out["index"] = index.read_text(errors="replace")
    for f in sorted(memory_dir.glob("*.md")):
        if f.name == "MEMORY.md":
            continue
        raw = f.read_text(errors="replace")
        m = FRONTMATTER_RE.match(raw)
        meta, body = {}, raw
        if m:
            body = m.group(2)
            for line in m.group(1).splitlines():
                if ":" in line and not line.startswith(" "):
                    k, v = line.split(":", 1)
                    meta[k.strip()] = v.strip().strip('"')
                elif line.strip().startswith("type:"):
                    meta["type"] = line.split(":", 1)[1].strip()
        modified = datetime.fromtimestamp(f.stat().st_mtime, timezone.utc).isoformat(timespec="seconds")
        entry = {
            "file": f.name,
            "name": meta.get("name", f.stem),
            "type": meta.get("type"),
            "description": meta.get("description"),
            "modified": modified,
            "unchanged": known_memory.get(str(f)) == modified,
        }
        if meta.get("type") == "project" and not entry["unchanged"]:
            entry["body"] = squash(body, MEMORY_BODY_CHARS)
        out["files"].append(entry)
    return out


def git(repo, *args):
    try:
        return subprocess.run(
            ["git", "-C", repo, *args], capture_output=True, text=True, timeout=20, check=False
        ).stdout
    except (OSError, subprocess.TimeoutExpired):
        return ""


def default_branch(repo):
    head = git(repo, "symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD").strip()
    if head.startswith("origin/"):
        return head.split("/", 1)[1]
    for candidate in ("main", "master"):
        if git(repo, "rev-parse", "--verify", "--quiet", candidate).strip():
            return candidate
    return None


def digest_repo(repo, stale_days):
    base = default_branch(repo)
    if not base:
        return None
    merged = set(
        b.strip().lstrip("* +") for b in git(repo, "branch", "--merged", base).splitlines()
    )
    branches = []
    fmt = "%(refname:short)%09%(committerdate:iso8601-strict)%09%(authorname)%09%(subject)"
    for line in git(repo, "for-each-ref", "--sort=-committerdate", f"--format={fmt}", "refs/heads").splitlines():
        name, date, author, subject = (line.split("\t") + ["", "", "", ""])[:4]
        if name in merged or name == base:
            continue
        try:
            age = (datetime.now(timezone.utc) - datetime.fromisoformat(date)).days
        except ValueError:
            age = None
        branches.append(
            {"name": name, "lastCommit": date, "author": author, "subject": subject,
             "ageDays": age, "stale": age is not None and age > stale_days}
        )
    worktrees = []
    for block in git(repo, "worktree", "list", "--porcelain").split("\n\n"):
        wt = {}
        for line in block.splitlines():
            if line.startswith("worktree "):
                wt["path"] = line[9:]
            elif line.startswith("branch "):
                wt["branch"] = line[7:].replace("refs/heads/", "")
        if wt.get("path") and wt["path"] != repo:
            worktrees.append(wt)
    return {"repo": repo, "defaultBranch": base, "unmergedBranches": branches, "worktrees": worktrees}


def discover_repos(roots, session_cwds):
    candidates = set()
    for cwd in session_cwds:
        top = git(cwd, "rev-parse", "--show-toplevel").strip()
        if top:
            candidates.add(top)
    for root in roots:
        rp = Path(root)
        if (rp / ".git").exists():
            candidates.add(str(rp))
        if rp.is_dir():
            for child in rp.iterdir():
                if child.is_dir() and (child / ".git").exists():
                    candidates.add(str(child.resolve()))
    repos = {}
    for c in sorted(candidates):
        common = git(c, "rev-parse", "--path-format=absolute", "--git-common-dir").strip()
        main_worktree = str(Path(common).parent) if common else c
        if (Path(c) / ".git").is_dir():
            repos.setdefault(common or c, c)
        else:
            repos.setdefault(common or c, main_worktree)
    return sorted(set(repos.values()))


def read_inbox(path):
    items = []
    if not path.exists():
        return items
    for line in path.read_text(errors="replace").splitlines():
        try:
            items.append(json.loads(line))
        except ValueError:
            continue
    return items


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default=str(STATE_DIR / "config.json"))
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    cfg = {**DEFAULTS, **load_json(args.config, {})}
    roots = [expand(r) for r in cfg["roots"]]
    if not roots:
        sys.exit("config has no roots; write ~/.claude/threads/config.json first")
    cutoff = datetime.now(timezone.utc) - timedelta(days=int(cfg["lookback_days"]))

    state = load_json(STATE_DIR / "state.json", {"threads": {}})
    known_last_at = {
        s["id"]: s.get("lastAt")
        for t in state.get("threads", {}).values()
        for s in t.get("sessions", [])
        if isinstance(s, dict) and "id" in s
    }
    known_memory = state.get("memorySeen", {})

    sessions, memories, cwds = [], [], set()
    prefixes = tuple(encode_path(r) for r in roots)
    for proj in sorted(PROJECTS_DIR.iterdir()) if PROJECTS_DIR.exists() else []:
        if not proj.is_dir() or not proj.name.startswith(prefixes):
            continue
        for f in proj.glob("*.jsonl"):
            if datetime.fromtimestamp(f.stat().st_mtime, timezone.utc) < cutoff:
                continue
            s = digest_session(f, roots, set(cfg["ignore_commands"]), set(cfg["noise_commands"]), known_last_at)
            if s:
                sessions.append(s)
                cwds.add(s["cwd"])
        mem = proj / "memory"
        if mem.is_dir() and any(mem.glob("*.md")):
            memories.append(digest_memory(mem, known_memory))

    sessions.sort(key=lambda s: s["lastAt"] or "", reverse=True)
    repos = [r for r in (digest_repo(p, int(cfg["stale_branch_days"])) for p in discover_repos(roots, cwds)) if r]

    out = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "today": datetime.now().date().isoformat(),
        "config": {**cfg, "roots": roots},
        "sessions": sessions,
        "memories": memories,
        "repos": repos,
        "state": state,
        "inbox": read_inbox(STATE_DIR / "inbox.jsonl"),
    }
    Path(args.out).write_text(json.dumps(out, indent=1))
    changed = sum(1 for s in sessions if not s["unchanged"])
    print(
        f"{len(sessions)} sessions ({changed} new or changed), {len(memories)} memory dirs, "
        f"{sum(len(r['unmergedBranches']) for r in repos)} unmerged branches across {len(repos)} repos, "
        f"{len(out['inbox'])} inbox items -> {args.out}"
    )


if __name__ == "__main__":
    main()
