"""Metadata models and persistence helpers."""
import sqlite3

class MetadataStore:
    def __init__(self, db_path="data/broll.db"):
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row

        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS segments (
                segment_id TEXT PRIMARY KEY,
                clip_id TEXT NOT NULL,
                filename TEXT,
                video_path TEXT NOT NULL,
                duration REAL,
                start_time REAL,
                end_time REAL,
                faiss_id INTEGER
            )
        """)
        self.conn.commit()

    def add_segment(self, data):
        self.conn.execute("""
            INSERT OR REPLACE INTO segments
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data["segment_id"],
            data["clip_id"],
            data["filename"],
            data["video_path"],
            data["duration"],
            data["start_time"],
            data["end_time"],
            data["faiss_id"]
        ))
        self.conn.commit()

    def get_segment(self, segment_id):
        return self.conn.execute(
            "SELECT * FROM segments WHERE segment_id = ?",
            (segment_id,)
        ).fetchone()