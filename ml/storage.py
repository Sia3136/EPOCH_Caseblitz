
import sqlite3
from pathlib import Path

import faiss
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
INDEX_DIR = ROOT / "data" / "index"
DB_PATH = INDEX_DIR / "metadata.db"
INDEX_PATH = INDEX_DIR / "broll.index"


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

    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS segments (
                segment_id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                video_path TEXT NOT NULL,
                duration REAL NOT NULL,
                start_time REAL NOT NULL,
                end_time REAL NOT NULL,
                faiss_id INTEGER NOT NULL UNIQUE
            )
        """)

        conn.execute("DELETE FROM segments")

        for faiss_id, segment in enumerate(all_segments):
            video_path = Path(segment["video_path"])

            conn.execute("""
                INSERT INTO segments (
                    segment_id, filename, video_path,
                    duration, start_time, end_time, faiss_id
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                f"segment_{faiss_id}",
                video_path.name,
                str(video_path),
                segment["duration"],
                segment["start"],
                segment["end"],
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
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT * FROM segments WHERE faiss_id = ?",
            (int(faiss_id),)
        ).fetchone()

    return dict(row) if row else None