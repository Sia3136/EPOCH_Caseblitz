import sqlite3
from contextlib import contextmanager
from .config import DB_PATH

SCHEMA = """
CREATE TABLE IF NOT EXISTS jobs (
    job_id     TEXT PRIMARY KEY,
    status     TEXT NOT NULL DEFAULT 'processing',  -- processing | done | failed
    total      INTEGER DEFAULT 0,
    processed  INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS clips (
    clip_id    TEXT PRIMARY KEY,
    job_id     TEXT NOT NULL REFERENCES jobs(job_id),
    filename   TEXT NOT NULL,
    video_path TEXT NOT NULL,
    duration   REAL,
    status     TEXT NOT NULL DEFAULT 'ok',          -- ok | skipped
    error      TEXT
);
CREATE TABLE IF NOT EXISTS segments (
    segment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    clip_id    TEXT NOT NULL REFERENCES clips(clip_id),
    start_time REAL NOT NULL,
    end_time   REAL NOT NULL,
    faiss_pos  INTEGER                              -- row in the FAISS index
);
CREATE INDEX IF NOT EXISTS idx_seg_clip ON segments(clip_id);
CREATE INDEX IF NOT EXISTS idx_seg_faiss ON segments(faiss_pos);
"""


@contextmanager
def get_conn():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_conn() as c:
        c.executescript(SCHEMA)
