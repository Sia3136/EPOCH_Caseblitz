from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
VIDEO_DIR = DATA_DIR / "videos"          # /data/videos/{job_id}/
DB_PATH = DATA_DIR / "broll.db"
INDEX_PATH = DATA_DIR / "segments.index"  # Krups's FAISS file

MAX_ZIP_BYTES = 500 * 1024 * 1024   # 500 MB
MAX_CLIPS = 50
MAX_CLIP_SECONDS = 60
VIDEO_EXTS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}

# Search post-processing (recalibrate in H4/H7 with Krups)
MIN_SCORE, MAX_SCORE = 0.15, 0.35
PERCENT_THRESHOLD = 35
MAX_SEGMENTS_PER_CLIP = 2
MIN_WORDS = 3
MAX_SENTENCES = 20
