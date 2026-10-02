"""H2: upload handler. Synchronous, with a progress callback for the UI."""
import logging
import uuid
from pathlib import Path
from typing import Callable, Dict, List, Optional

import cv2

from .config import VIDEO_DIR, VIDEO_EXTS, MAX_CLIP_SECONDS
from .db import get_conn, init_db
from .schemas import UploadResponse
from .zip_utils import validate_zip, safe_extract

log = logging.getLogger(__name__)

# embed_fn(video_path, clip_id) -> [{"start": float, "end": float, "faiss_pos": int|None}, ...]
# This is Krups's function. Until it exists, we use the stub below.
EmbedFn = Callable[[Path, str], List[Dict]]


def probe_video(path: Path) -> float:
    """Return duration in seconds, or raise ValueError if the file can't be decoded."""
    cap = cv2.VideoCapture(str(path))
    try:
        if not cap.isOpened():
            raise ValueError("cannot open file")
        fps = cap.get(cv2.CAP_PROP_FPS)
        frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        ok, _ = cap.read()
        if not ok or not fps or fps <= 0 or frames <= 0:
            raise ValueError("cannot decode frames")
        return frames / fps
    finally:
        cap.release()


def stub_embed(path: Path, clip_id: str, duration: float = 0.0) -> List[Dict]:
    """Placeholder: fixed ~6s windows, no embeddings. Replace with Krups's embed_video."""
    end = min(duration, MAX_CLIP_SECONDS)
    segs, t = [], 0.0
    while t < end:
        segs.append({"start": t, "end": min(t + 6.0, end), "faiss_pos": None})
        t += 6.0
    return segs


def process_upload(
    zip_path: Path,
    embed_fn: Optional[EmbedFn] = None,
    progress_cb: Optional[Callable[[int, int, str], None]] = None,
) -> UploadResponse:
    """Validate -> extract -> per-video try/except -> SQLite. Raises UploadError on bad zip."""
    init_db()
    zip_path = Path(zip_path)
    validate_zip(zip_path)                       # raises UploadError with a UI-safe message

    job_id = uuid.uuid4().hex[:8]
    dest = VIDEO_DIR / job_id
    safe_extract(zip_path, dest)

    videos = sorted(
        p for p in dest.rglob("*")
        if p.is_file() and p.suffix.lower() in VIDEO_EXTS and "__MACOSX" not in p.parts
    )
    with get_conn() as c:
        c.execute("INSERT INTO jobs (job_id, total) VALUES (?, ?)", (job_id, len(videos)))

    skipped: List[str] = []
    clips_done = segs_done = 0

    for i, video in enumerate(videos, 1):
        clip_id = f"{job_id}_{i:03d}"
        try:
            duration = probe_video(video)
            if embed_fn:
                segments = embed_fn(video, clip_id)
            else:
                segments = stub_embed(video, clip_id, duration)
            with get_conn() as c:
                c.execute(
                    "INSERT INTO clips (clip_id, job_id, filename, video_path, duration) "
                    "VALUES (?,?,?,?,?)",
                    (clip_id, job_id, video.name, str(video), duration),
                )
                c.executemany(
                    "INSERT INTO segments (clip_id, start_time, end_time, faiss_pos) VALUES (?,?,?,?)",
                    [(clip_id, s["start"], s["end"], s.get("faiss_pos")) for s in segments],
                )
            clips_done += 1
            segs_done += len(segments)
        except Exception as e:                   # corrupt file: skip, log, keep going
            log.warning("Skipping %s: %s", video.name, e)
            skipped.append(video.name)
            with get_conn() as c:
                c.execute(
                    "INSERT INTO clips (clip_id, job_id, filename, video_path, status, error) "
                    "VALUES (?,?,?,?,?,?)",
                    (clip_id, job_id, video.name, str(video), "skipped", str(e)),
                )
        with get_conn() as c:
            c.execute("UPDATE jobs SET processed=? WHERE job_id=?", (i, job_id))
        if progress_cb:
            progress_cb(i, len(videos), video.name)

    with get_conn() as c:
        c.execute("UPDATE jobs SET status='done' WHERE job_id=?", (job_id,))
    return UploadResponse(job_id=job_id, clips_indexed=clips_done,
                          segments_indexed=segs_done, skipped=skipped)
