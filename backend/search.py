"""H4/H6 semantic B-roll search with BLIP captions and quality flags."""

from typing import Callable, Dict, List, Tuple

import cv2
import numpy as np

from .config import RAW_K, TOP_K
from .db import get_conn
from .postprocess import postprocess, split_script
from .schemas import SceneResult, ScriptResponse, SearchResponse, SearchResult
from .thumbnails import get_thumbnail

try:
    from ml.captioner import BrollCaptioner
    CAPTIONER = BrollCaptioner()
except Exception:
    CAPTIONER = None


SearchFn = Callable[[str, int], List[Tuple[int, float]]]

NO_MATCH_MSG = "No strong match found for this query"
EMPTY_QUERY_MSG = "Please enter a search query"


def _lookup_segments(raw_hits: List[Tuple[int, float]]) -> List[Dict]:
    if not raw_hits:
        return []

    scores = {pos: score for pos, score in raw_hits}
    marks = ",".join("?" * len(scores))

    with get_conn() as c:
        rows = c.execute(
            f"""
            SELECT s.faiss_pos, s.clip_id, s.start_time, s.end_time
            FROM segments s
            JOIN clips c ON c.clip_id = s.clip_id
            WHERE c.status = 'ok'
              AND s.faiss_pos IN ({marks})
            """,
            list(scores),
        ).fetchall()

    return [
        {
            "clip_id": r["clip_id"],
            "start": r["start_time"],
            "end": r["end_time"],
            "score": scores[r["faiss_pos"]],
        }
        for r in rows
    ]


def _get_frame(h: Dict):
    """Get the matched frame from the cached thumbnail."""
    thumbnail = get_thumbnail(
        h["clip_id"],
        int(h["start"])
    )

    if not thumbnail:
        return None

    frame = cv2.imread(str(thumbnail))

    if frame is None:
        return None

    return frame


def _quality_flag(frame) -> str | None:
    """Return 'blurry', 'dark', or None."""
    if frame is None:
        return None

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    brightness = float(np.mean(gray))
    blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    if brightness < 35:
        return "dark"

    if blur_score < 80:
        return "blurry"

    return None


def _caption_result(frame) -> str:
    """Generate a BLIP caption for the matched frame."""
    if CAPTIONER is None or frame is None:
        return ""

    try:
        from PIL import Image

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        image = Image.fromarray(rgb)

        return CAPTIONER.caption(image)

    except Exception:
        return ""


def _to_result(h: Dict) -> SearchResult:
    frame = _get_frame(h)

    caption = _caption_result(frame)
    quality_flag = _quality_flag(frame)

    return SearchResult(
        clip_id=h["clip_id"],
        start=h["start"],
        end=h["end"],
        percent=h["percent"],
        caption=caption,
        thumbnail_url=f"/thumbnails/{h['clip_id']}_{int(h['start'])}.jpg",
        video_url=f"/videos/{h['clip_id']}",
        quality_flag=quality_flag,
    )


def search_clips(
    query: str,
    search_fn: SearchFn,
    k: int = TOP_K
) -> SearchResponse:

    query = (query or "").strip()

    if not query:
        return SearchResponse(
            query=query,
            results=[],
            message=EMPTY_QUERY_MSG
        )

    hits = _lookup_segments(search_fn(query, RAW_K))

    processed = postprocess(hits, k=k)

    results = [
        _to_result(h)
        for h in processed
    ]

    return SearchResponse(
        query=query,
        results=results,
        message=None if results else NO_MATCH_MSG
    )


def search_script(
    text: str,
    search_fn: SearchFn,
    k: int = TOP_K
) -> ScriptResponse:

    sentences, truncated = split_script(text)

    scenes = [
        SceneResult(
            scene_index=i,
            sentence=s,
            results=search_clips(
                s,
                search_fn,
                k
            ).results
        )
        for i, s in enumerate(sentences)
    ]

    return ScriptResponse(
        scenes=scenes,
        truncated=truncated
    )