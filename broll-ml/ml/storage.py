
import json
import sqlite3
from threading import RLock
from pathlib import Path

import faiss
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
INDEX_DIR = ROOT / "data" / "index"
DB_PATH = INDEX_DIR / "metadata.db"
INDEX_PATH = INDEX_DIR / "broll.index"
_SAVE_LOCK = RLock()


def _ensure_schema(conn):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS segments (
            segment_id TEXT PRIMARY KEY,
            video_id TEXT NOT NULL,
            filename TEXT NOT NULL,
            video_path TEXT NOT NULL,
            duration REAL NOT NULL,
            start_time REAL NOT NULL,
            end_time REAL NOT NULL,
            thumbnail_path TEXT,
            faiss_id INTEGER NOT NULL UNIQUE
        )
    """)

    columns = {
        row[1]
        for row in conn.execute("PRAGMA table_info(segments)")
    }
    if "thumbnail_path" not in columns:
        conn.execute("ALTER TABLE segments ADD COLUMN thumbnail_path TEXT")
    if "video_id" not in columns:
        conn.execute("ALTER TABLE segments ADD COLUMN video_id TEXT")
        conn.execute(
            "UPDATE segments SET video_id = "
            "substr(filename, 1, instr(filename, '.') - 1) "
            "WHERE video_id IS NULL"
        )
    if "quality_score" not in columns:
        conn.execute("ALTER TABLE segments ADD COLUMN quality_score REAL")
    if "quality_issues" not in columns:
        conn.execute("ALTER TABLE segments ADD COLUMN quality_issues TEXT")


def save_library(all_segments):
    if not all_segments:
        raise ValueError("No segments to index")

    INDEX_DIR.mkdir(parents=True, exist_ok=True)

    vectors = np.stack([
        segment["embedding"] for segment in all_segments
    ]).astype("float32")

    dimension = vectors.shape[1]
    index = faiss.IndexFlatIP(dimension)
    index.add(vectors)

    with _SAVE_LOCK:
        with sqlite3.connect(DB_PATH) as conn:
            _ensure_schema(conn)
            conn.execute("DELETE FROM segments")

            for faiss_id, segment in enumerate(all_segments):
                video_path = Path(segment["video_path"])

                conn.execute("""
                    INSERT INTO segments (
                        segment_id, video_id, filename, video_path,
                        duration, start_time, end_time,
                        thumbnail_path, quality_score, quality_issues, faiss_id
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    f"segment_{faiss_id}",
                    segment.get("video_id", video_path.stem),
                    video_path.name,
                    str(video_path),
                    segment["duration"],
                    segment["start"],
                    segment["end"],
                    segment.get("thumbnail_path"),
                    segment.get("quality_score"),
                    json.dumps(segment.get("quality_issues", [])),
                    faiss_id
                ))

        faiss.write_index(index, str(INDEX_PATH))
    print(f"Saved {index.ntotal} vectors and metadata rows.")

    return index


def load_index():
    if not INDEX_PATH.exists():
        raise FileNotFoundError(f"Index not found: {INDEX_PATH}")

    return faiss.read_index(str(INDEX_PATH))


def get_segment_metadata(faiss_id):
    with sqlite3.connect(DB_PATH) as conn:
        _ensure_schema(conn)
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT * FROM segments WHERE faiss_id = ?",
            (int(faiss_id),)
        ).fetchone()

    return _decode_metadata(row) if row else None


def get_all_segment_metadata():
    with sqlite3.connect(DB_PATH) as conn:
        _ensure_schema(conn)
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT * FROM segments ORDER BY faiss_id"
        ).fetchall()
    return [_decode_metadata(row) for row in rows]


def _decode_metadata(row):
    metadata = dict(row)
    try:
        metadata["quality_issues"] = json.loads(metadata.get("quality_issues") or "[]")
    except json.JSONDecodeError:
        metadata["quality_issues"] = []
    return metadata


def validate_saved_library():
    """Return basic FAISS/SQLite consistency information after reload."""
    index = load_index()
    rows = get_all_segment_metadata()
    faiss_ids = [row["faiss_id"] for row in rows]
    return {
        "vectors": index.ntotal,
        "metadata_rows": len(rows),
        "ids_contiguous": sorted(faiss_ids) == list(range(index.ntotal)),
        "consistent": index.ntotal == len(rows)
        and sorted(faiss_ids) == list(range(index.ntotal)),
    }