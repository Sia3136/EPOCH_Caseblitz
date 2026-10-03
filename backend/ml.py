"""Adapter connecting the FastAPI upload/search flow to CLIP and FAISS."""
from pathlib import Path
from typing import List, Tuple

from ml.clip_model import CLIPModel
from ml.frame_extractor import extract_frames
from ml.segment_builder import build_segments
from ml.vector_store import VectorStore

from .config import INDEX_PATH


_clip = None
_store = None


def _get_models():
    global _clip, _store
    if _clip is None:
        _clip = CLIPModel()
    if _store is None:
        _store = VectorStore()
        index_dir = INDEX_PATH.parent
        metadata_path = index_dir / "metadata.npy"
        if INDEX_PATH.exists() and metadata_path.exists():
            _store.load(str(index_dir))
    return _clip, _store


def embed_video(path: Path, clip_id: str) -> List[dict]:
    """Embed sampled frames, add averaged segments to FAISS, and save the index."""
    clip, store = _get_models()
    frames = extract_frames(path)
    if not frames:
        raise ValueError("No frames could be extracted from video.")

    for frame in frames:
        frame["embedding"] = clip.encode_image(frame["frame"])

    segments = build_segments(frames)
    if not segments:
        raise ValueError("No video segments could be generated.")

    output = []
    for segment in segments:
        faiss_pos = store.index.ntotal
        store.add(segment["embedding"], {"clip_id": clip_id})
        output.append({
            "start": float(segment["start_time"]),
            "end": float(segment["end_time"]),
            "faiss_pos": int(faiss_pos),
        })

    INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    store.save(str(INDEX_PATH.parent))
    return output


def search(query: str, k: int) -> List[Tuple[int, float]]:
    """Return FAISS positions and cosine scores for the backend postprocessor."""
    clip, store = _get_models()
    if store.index.ntotal == 0:
        return []
    hits = store.search(clip.encode_text(query), top_k=k)
    return [(int(hit["faiss_id"]), float(hit["similarity"])) for hit in hits]
