"""Adapter between the FastAPI backend and the B-roll ML pipeline."""

import logging
from pathlib import Path
from typing import Any

from .db import get_conn

from ml.clip_model import CLIPModel
from ml.frame_extractor import extract_frames
from ml.segment_builder import build_segments
from ml.vector_store import VectorStore


logger = logging.getLogger(__name__)


BASE_DIR = Path(__file__).resolve().parent.parent
INDEX_DIR = BASE_DIR / "data" / "index"


_clip = None
_store = None


def _get_models():
    global _clip
    global _store

    if _clip is None:
        logger.info("Loading CLIP model...")
        _clip = CLIPModel()

    if _store is None:
        logger.info("Loading vector store...")

        _store = VectorStore()

        index_file = INDEX_DIR / "broll.index"
        metadata_file = INDEX_DIR / "metadata.npy"

        if index_file.exists() and metadata_file.exists():
            logger.info("Loading existing B-roll index...")
            _store.load(str(INDEX_DIR))
        else:
            logger.info("No existing B-roll index found.")

    return _clip, _store


def embed_video(path: Path, clip_id: str):
    """
    Extract frames from a video, generate CLIP embeddings,
    create segments and add them to the vector store.
    """

    clip, store = _get_models()

    frames = extract_frames(str(path))

    if not frames:
        raise ValueError(
            "No frames could be extracted from video."
        )

    for frame in frames:
        frame["embedding"] = clip.encode_image(
            frame["frame"]
        )

    segments = build_segments(frames)

    if not segments:
        raise ValueError(
            "No video segments could be generated."
        )

    result = []

    for segment in segments:

        faiss_pos = store.index.ntotal

        metadata = {
            "clip_id": clip_id,
            "start": float(segment["start_time"]),
            "end": float(segment["end_time"]),
        }

        store.add(
            segment["embedding"],
            metadata,
        )

        result.append(
            {
                "start": float(segment["start_time"]),
                "end": float(segment["end_time"]),
                "faiss_pos": faiss_pos,
            }
        )

    INDEX_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    store.save(str(INDEX_DIR))

    return result


def _extract_faiss_id(result: Any, fallback: int):
    """
    Extract FAISS position from different possible VectorStore
    result formats.
    """

    if isinstance(result, dict):

        for key in (
            "faiss_id",
            "faiss_pos",
            "index",
            "id",
        ):
            if key in result:
                try:
                    return int(result[key])
                except (TypeError, ValueError):
                    pass

    if isinstance(result, (tuple, list)):

        if len(result) >= 1:
            try:
                return int(result[0])
            except (TypeError, ValueError):
                pass

    try:
        return int(result)
    except (TypeError, ValueError):
        return fallback


def _extract_similarity(result: Any):
    """
    Extract similarity score from different possible VectorStore
    result formats.
    """

    if isinstance(result, dict):

        for key in (
            "similarity",
            "score",
            "distance",
        ):
            if key in result:
                try:
                    return float(result[key])
                except (TypeError, ValueError):
                    pass

    if isinstance(result, (tuple, list)):

        if len(result) >= 2:
            try:
                return float(result[1])
            except (TypeError, ValueError):
                pass

    return 0.0


def _lookup_segment(faiss_pos: int):
    """
    Resolve a FAISS position to the corresponding database
    segment and video.
    """

    with get_conn() as c:

        row = c.execute(
            """
            SELECT
                s.clip_id,
                s.start_time,
                s.end_time,
                c.filename,
                c.video_path
            FROM segments s
            JOIN clips c
                ON c.clip_id = s.clip_id
            WHERE s.faiss_pos=?
              AND c.status='ok'
            LIMIT 1
            """,
            (faiss_pos,),
        ).fetchone()

    if not row:
        return None

    return dict(row)


def search(query: str, k: int):
    """
    Search the CLIP/FAISS index and return enriched results
    containing the metadata required by the FastAPI layer.
    """

    clip, store = _get_models()

    if store.index is None:
        return []

    if store.index.ntotal == 0:
        return []

    query_embedding = clip.encode_text(query)

    raw_results = store.search(
        query_embedding,
        top_k=k,
    )

    results = []

    for i, raw_result in enumerate(raw_results):

        faiss_id = _extract_faiss_id(
            raw_result,
            fallback=i,
        )

        similarity = _extract_similarity(
            raw_result
        )

        metadata = _lookup_segment(
            faiss_id
        )

        if not metadata:
            logger.warning(
                "No database metadata found for FAISS position %s",
                faiss_id,
            )
            continue

        results.append(
            {
                "faiss_id": faiss_id,
                "video_id": metadata["clip_id"],
                "clip_id": metadata["clip_id"],
                "filename": metadata["filename"],
                "video_path": metadata["video_path"],
                "start_time": float(
                    metadata["start_time"]
                ),
                "end_time": float(
                    metadata["end_time"]
                ),
                "similarity": float(similarity),
            }
        )

    return results