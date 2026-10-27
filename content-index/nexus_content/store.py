"""Incremental SQLite FTS5 store. Query access is read-only and scoped before totals."""
from pathlib import Path
from datetime import datetime
import hashlib
import ntpath
import os
import re
import sqlite3
import stat
import time

EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".webp"}
SCHEMA = """
CREATE TABLE IF NOT EXISTS metadata(version INTEGER NOT NULL);
INSERT INTO metadata SELECT 1 WHERE NOT EXISTS(SELECT 1 FROM metadata);
CREATE TABLE IF NOT EXISTS documents(
 id INTEGER PRIMARY KEY, path TEXT UNIQUE NOT NULL, path_key TEXT UNIQUE NOT NULL,
 root_key TEXT NOT NULL, mtime_ns INTEGER NOT NULL, size INTEGER NOT NULL,
 digest TEXT, status TEXT NOT NULL, error TEXT);
CREATE TABLE IF NOT EXISTS pages(
 id INTEGER PRIMARY KEY, document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
 page INTEGER NOT NULL, text TEXT NOT NULL, method TEXT NOT NULL,
 UNIQUE(document_id,page));
CREATE VIRTUAL TABLE IF NOT EXISTS page_fts USING fts5(text, content=pages, content_rowid=id,
 tokenize='unicode61 remove_diacritics 2');
CREATE TRIGGER IF NOT EXISTS pages_ai AFTER INSERT ON pages BEGIN
 INSERT INTO page_fts(rowid,text) VALUES(new.id,new.text); END;
CREATE TRIGGER IF NOT EXISTS pages_ad AFTER DELETE ON pages BEGIN
 INSERT INTO page_fts(page_fts,rowid,text) VALUES('delete',old.id,old.text); END;
"""


def key(p):
    return ntpath.normpath(str(p).replace("/", "\\")).casefold()


def within(root, p):
    root, p = key(root), key(p)
    return p == root or p.startswith(root.rstrip("\\") + "\\")


def no_links(p):
    """Reject symlinks and Windows reparse points, including root ancestors."""
    p = Path(p).absolute()
    for part in [*reversed(p.parents), p]:
        info = part.lstat()
        if stat.S_ISLNK(info.st_mode) or getattr(info, "st_file_attributes", 0) & 0x400:
            raise ValueError("link_not_allowed")
    return p


def connect(filename):
    db = sqlite3.connect(filename, timeout=10)
    db.execute("PRAGMA foreign_keys=ON")
    db.execute("PRAGMA journal_mode=WAL")
    db.executescript(SCHEMA)
    if db.execute("SELECT version FROM metadata").fetchone() != (1,):
        raise ValueError("unsupported_schema")
    return db


def fingerprint(p):
    h = hashlib.sha256()
    with p.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def sync(db, root, files, extractor, prune=False, force=False):
    root = no_links(root)
    if not root.is_dir():
        raise ValueError("invalid_root")
    seen, summary = set(), dict(indexed=0, unchanged=0, errors=0, removed=0)
    # Caller must finish enumerating before prune; inaccessible scans never delete.
    files = list(files)
    for candidate in files:
        p = Path(candidate).absolute()
        if not within(root, p) or p.suffix.lower() not in EXTENSIONS:
            raise ValueError("outside_scope_or_type")
        pk = key(p)
        seen.add(pk)
        try:
            no_links(p)
            before = p.stat()
            digest = fingerprint(p)
            old = db.execute("SELECT digest,status FROM documents WHERE path_key=?", (pk,)).fetchone()
            if old == (digest, "ready") and not force:
                with db:
                    db.execute("UPDATE documents SET mtime_ns=?,size=? WHERE path_key=?",
                               (before.st_mtime_ns, before.st_size, pk))
                summary["unchanged"] += 1
                continue
            pages = list(extractor(p))
            no_links(p)
            after = p.stat()
            if (before.st_mtime_ns, before.st_size) != (after.st_mtime_ns, after.st_size) or fingerprint(p) != digest:
                raise ValueError("changed_during_extraction")
            with db:
                db.execute("DELETE FROM documents WHERE path_key=?", (pk,))
                doc_id = db.execute("INSERT INTO documents(path,path_key,root_key,mtime_ns,size,digest,status) VALUES(?,?,?,?,?,?,'ready')",
                                    (str(p), pk, key(root), after.st_mtime_ns, after.st_size, digest)).lastrowid
                db.executemany("INSERT INTO pages(document_id,page,text,method) VALUES(?,?,?,?)",
                               [(doc_id, page.page, page.text, page.method) for page in pages])
            summary["indexed"] += 1
        except Exception:
            # Never retain stale searchable text or exception messages containing paths/text.
            with db:
                db.execute("DELETE FROM documents WHERE path_key=?", (pk,))
                db.execute("INSERT INTO documents(path,path_key,root_key,mtime_ns,size,status,error) VALUES(?,?,?,0,0,'error','extraction_failed')",
                           (str(p), pk, key(root)))
            summary["errors"] += 1
    if prune:
        with db:
            for doc_id, pk in db.execute("SELECT id,path_key FROM documents WHERE root_key=?", (key(root),)).fetchall():
                if pk not in seen:
                    db.execute("DELETE FROM documents WHERE id=?", (doc_id,))
                    summary["removed"] += 1
    return summary


def scan(root):
    def denied(error):
        raise error
    found = []
    no_links(root)
    for directory, dirs, files in os.walk(root, followlinks=False, onerror=denied):
        safe_dirs = []
        for name in dirs:
            p = Path(directory, name)
            try:
                no_links(p)
                safe_dirs.append(name)
            except ValueError:
                pass
        dirs[:] = safe_dirs
        for name in files:
            p = Path(directory, name)
            if p.suffix.lower() in EXTENSIONS:
                found.append(p)
    return found


def search(filename, request):
    roots = request["roots"]
    q = request["q"]
    if not isinstance(roots, list) or len(roots) > 20 or not all(isinstance(r, str) for r in roots):
        raise ValueError("invalid_roots")
    if not isinstance(q, str) or len(q) > 200:
        raise ValueError("invalid_query")
    tokens = re.findall(r"\w+", q, re.UNICODE)
    count, offset = request.get("count", 25), request.get("offset", 0)
    if count not in (25, 50, 100) or not isinstance(offset, int) or not 0 <= offset <= 1_000_000:
        raise ValueError("invalid_page")
    empty = dict(items=[], total=0, count=count, offset=offset)
    if not roots or not tokens or request.get("type") == "folder":
        return empty
    folder = request.get("folder", "")
    if folder and not any(within(r, folder) for r in roots):
        raise ValueError("outside_scope")
    extensions = request.get("ext", "").lower().split(";")
    date_from, date_to = request.get("modifiedFrom", ""), request.get("modifiedTo", "")
    for value in (date_from, date_to):
        if value:
            datetime.strptime(value, "%Y-%m-%d")

    def allowed(p, mtime, size):
        if not any(within(r, p) for r in roots) or (folder and not within(folder, p)):
            return 0
        if request.get("view") == "children" and key(ntpath.dirname(p)) != key(folder):
            return 0
        if extensions != [""] and Path(p).suffix.lower().lstrip(".") not in extensions:
            return 0
        try:
            # Hide deleted, changed or relinked files even before the next scheduled sync.
            info = no_links(p).stat()
            if not stat.S_ISREG(info.st_mode) or (info.st_mtime_ns, info.st_size) != (mtime, size):
                return 0
            day = datetime.fromtimestamp(info.st_mtime).strftime("%Y-%m-%d")
            return int((not date_from or day >= date_from) and (not date_to or day <= date_to))
        except (OSError, ValueError):
            return 0

    uri = Path(filename).resolve().as_uri() + "?mode=ro"
    db = sqlite3.connect(uri, uri=True, timeout=5)
    try:
        if db.execute("SELECT version FROM metadata").fetchone() != (1,):
            raise ValueError("unsupported_schema")
        db.create_function("allowed", 3, allowed)
        deadline = time.monotonic() + 5
        db.set_progress_handler(lambda: int(time.monotonic() > deadline), 1000)
        expression = " AND ".join('"' + t + '"' for t in tokens)
        # Materialize only the authorized matching rows in one snapshot: totals and pages
        # never use global FTS statistics/rank (which could reveal other folders).
        db.execute("CREATE TEMP TABLE hits AS SELECT p.id,d.path,p.page FROM documents d JOIN pages p ON p.document_id=d.id JOIN page_fts f ON f.rowid=p.id WHERE page_fts MATCH ? AND d.status='ready' AND allowed(d.path,d.mtime_ns,d.size)", (expression,))
        total = db.execute("SELECT count(*) FROM hits").fetchone()[0]
        rows = db.execute("SELECT h.path,h.page,snippet(page_fts,0,'','',' … ',32) FROM hits h JOIN page_fts ON page_fts.rowid=h.id WHERE page_fts MATCH ? ORDER BY h.path COLLATE NOCASE,h.page LIMIT ? OFFSET ?", (expression, count, offset)).fetchall()
        return dict(total=total, count=count, offset=offset,
                    items=[dict(fullPath=p, page=n, snippet=s[:2000]) for p, n, s in rows])
    finally:
        db.close()
