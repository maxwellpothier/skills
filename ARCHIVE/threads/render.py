#!/usr/bin/env python3
"""Inject the threads data JSON into template.html and write the page to publish."""

import argparse
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True, help="JSON file: today, threads, inbox, liveSessions")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    data = json.loads(Path(args.data).read_text())
    for key in ("today", "threads"):
        if key not in data:
            raise SystemExit(f"data is missing '{key}'")
    slugs = [t["slug"] for t in data["threads"]] + [i["slug"] for i in data.get("inbox", [])]
    dupes = sorted({s for s in slugs if slugs.count(s) > 1})
    if dupes:
        raise SystemExit(f"duplicate slugs: {dupes}")

    blob = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    page = (HERE / "template.html").read_text().replace("__THREADS_DATA__", blob, 1)
    Path(args.out).write_text(page)
    print(f"{len(data['threads'])} threads, {len(data.get('inbox', []))} inbox items -> {args.out}")


if __name__ == "__main__":
    main()
