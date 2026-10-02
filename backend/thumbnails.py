"""Simple on-demand thumbnail grab at a timestamp (OpenCV). Krups can replace this in H5 if he wants."""
from pathlib import Path
from typing import Optional

import cv2

from .config import THUMB_DIR
from .db import get_conn


def get_thumbnail(clip_id: str, second: int) -> Optional[Path]:
    """Return path to a cached JPG of the frame at `second`, creating it if needed."""
    out = THUMB_DIR / f"{clip_id}_{second}.jpg"
    if out.exists():
        return out
    with get_conn() as c:
        row = c.execute("SELECT video_path FROM clips WHERE clip_id=? AND status='ok'",
                        (clip_id,)).fetchone()
    if not row:
        return None
    cap = cv2.VideoCapture(row["video_path"])
    try:
        cap.set(cv2.CAP_PROP_POS_MSEC, second * 1000)
        ok, frame = cap.read()
        if not ok:                       # timestamp past the end: fall back to first frame
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ok, frame = cap.read()
        if not ok:
            return None
    finally:
        cap.release()
    THUMB_DIR.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out), frame)
    return out
