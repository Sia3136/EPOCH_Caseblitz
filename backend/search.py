"""H4: the one search function. Script mode is this function in a loop.

search_fn is Krups's FAISS search: search_fn(query, k) -> [(faiss_pos, raw_score), ...]
Swap in his real function where search_fn is passed; nothing else changes.
"""
from typing import Callable, Dict, List, Tuple

from .config import RAW_K, TOP_K
from .db import get_conn
from .postprocess import postprocess, split_script
from .schemas import SceneResult, ScriptResponse, SearchResponse, SearchResult

SearchFn = Callable[[str, int], List[Tuple[int, float]]]

NO_MATCH_MSG = "No strong match found for this query"
EMPTY_QUERY_MSG = "Please enter a search query"


def _lookup_segments(raw_hits: List[Tuple[int, float]]) -> List[Dict]:
    """Map FAISS positions to clip_id / timestamps via SQLite."""
    if not raw_hits:
        return []
    scores = {pos: score for pos, score in raw_hits}
    marks = ",".join("?" * len(scores))
    with get_conn() as c:
        rows = c.execute(
            f"SELECT s.faiss_pos, s.clip_id, s.start_time, s.end_time "
            f"FROM segments s JOIN clips c ON c.clip_id = s.clip_id "
            f"WHERE c.status = 'ok' AND s.faiss_pos IN ({marks})",
            list(scores),
        ).fetchall()
    return [{"clip_id": r["clip_id"], "start": r["start_time"], "end": r["end_time"],
             "score": scores[r["faiss_pos"]]} for r in rows]


def _to_result(h: Dict) -> SearchResult:
    # URLs are placeholders until the H5 endpoints serve thumbnails/videos.
    return SearchResult(
        clip_id=h["clip_id"], start=h["start"], end=h["end"], percent=h["percent"],
        caption="", thumbnail_url=f"/thumbnails/{h['clip_id']}_{int(h['start'])}.jpg",
        video_url=f"/videos/{h['clip_id']}", quality_flag=None,
    )


def search_clips(query: str, search_fn: SearchFn, k: int = TOP_K) -> SearchResponse:
    query = (query or "").strip()
    if not query:
        return SearchResponse(query=query, results=[], message=EMPTY_QUERY_MSG)
    hits = _lookup_segments(search_fn(query, RAW_K))
    results = [_to_result(h) for h in postprocess(hits, k=k)]
    return SearchResponse(query=query, results=results,
                          message=None if results else NO_MATCH_MSG)


def search_script(text: str, search_fn: SearchFn, k: int = TOP_K) -> ScriptResponse:
    sentences, truncated = split_script(text)
    scenes = [SceneResult(scene_index=i, sentence=s,
                          results=search_clips(s, search_fn, k).results)
              for i, s in enumerate(sentences)]
    return ScriptResponse(scenes=scenes, truncated=truncated)
