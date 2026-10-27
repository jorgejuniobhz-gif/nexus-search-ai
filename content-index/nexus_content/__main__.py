import argparse
import contextlib
import json
import os
import sys
from pathlib import Path
from .store import connect, scan, sync, search, key, within
from .extract import Extractor


def main():
    parser = argparse.ArgumentParser(description="Local content index; synthetic-file mode by default")
    sub = parser.add_subparsers(dest="command", required=True)
    query = sub.add_parser("search")
    query.add_argument("--db", required=True)
    index = sub.add_parser("index")
    index.add_argument("--db", required=True)
    index.add_argument("--root", required=True)
    index.add_argument("--file", action="append", default=[])
    index.add_argument("--scan", action="store_true")
    index.add_argument("--production", action="store_true")
    index.add_argument("--force", action="store_true", help="Re-extract even when bytes are unchanged")
    index.add_argument("--lang", default="pt")
    index.add_argument("--model-options", help="Local JSON file of PaddleOCR model directory options")
    remove = sub.add_parser("remove")
    remove.add_argument("--db", required=True)
    remove.add_argument("--root", required=True)
    remove.add_argument("--file", required=True)
    args = parser.parse_args()
    if args.command == "search":
        request = json.loads(sys.stdin.read(32769))
        result = search(args.db, request)
    elif args.command == "index":
        if args.scan and (not args.production or args.file):
            parser.error("--scan requires --production and no --file")
        if not args.scan and not args.file:
            parser.error("supply --file teste_nexus.pdf")
        if not args.production and any(Path(p).name != "teste_nexus.pdf" for p in args.file):
            parser.error("synthetic mode accepts only teste_nexus.pdf")
        files = scan(args.root) if args.scan else args.file
        options = json.loads(Path(args.model_options).read_text(encoding="utf-8")) if args.model_options else None
        db = connect(args.db)
        try:
            # Third-party OCR logs must never enter the JSON protocol/stdout.
            with open(os.devnull, 'w') as quiet, contextlib.redirect_stdout(quiet), contextlib.redirect_stderr(quiet):
                result = sync(db, args.root, files, Extractor(lang=args.lang, model_options=options), prune=args.scan, force=args.force)
        finally:
            db.close()
    else:
        if not within(args.root, args.file):
            raise ValueError("outside_scope")
        db = connect(args.db)
        try:
            with db:
                result = {"removed": db.execute("DELETE FROM documents WHERE path_key=? AND root_key=?", (key(args.file), key(args.root))).rowcount}
        finally:
            db.close()
    print(json.dumps(result, ensure_ascii=True))
    return int(bool(result.get("errors")))


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:
        # Do not expose document paths, extracted text, or library exceptions.
        print('{"error":"content_operation_failed"}', file=sys.stderr)
        sys.exit(1)
