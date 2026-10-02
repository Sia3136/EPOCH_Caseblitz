from pathlib import Path

from ml.clip_model import CLIPModel
from ml.frame_extractor import extract_frames
from ml.segment_builder import build_segments
from ml.vector_store import VectorStore


BASE_DIR = Path(__file__).resolve().parent.parent
INDEX_DIR = BASE_DIR / "data" / "index"

_clip = None
_store = None


def _get_models():
    global _clip, _store

    if _clip is None:
        _clip = CLIPModel()

    if _store is None:
        _store = VectorStore()

        index_file = INDEX_DIR / "broll.index"
        metadata_file = INDEX_DIR / "metadata.npy"

        if index_file.exists() and metadata_file.exists():
            _store.load(str(INDEX_DIR))

    return _clip, _store


def embed_video(path: Path, clip_id: str):
    clip, store = _get_models()

    frames = extract_frames(str(path))

    if not frames:
        raise ValueError("No frames could be extracted from video")

    for frame in frames:
        frame["embedding"] = clip.encode_image(frame["frame"])

    segments = build_segments(frames)

    result = []

    for segment in segments:
        faiss_pos = store.index.ntotal

        metadata = {
            "clip_id": clip_id,
            "start": float(segment["start_time"]),
            "end": float(segment["end_time"]),
        }

        store.add(segment["embedding"], metadata)

        result.append({
            "start": float(segment["start_time"]),
            "end": float(segment["end_time"]),
            "faiss_pos": faiss_pos,
        })

    INDEX_DIR.mkdir(parents=True, exist_ok=True)
    store.save(str(INDEX_DIR))

    return result


def search(query: str, k: int):
    clip, store = _get_models()

    results = store.search(
        clip.encode_text(query),
        top_k=k
    )

    return [
        (
            int(result["faiss_id"]) if "faiss_id" in result else i,
            float(result["similarity"])
        )
        for i, result in enumerate(results)
    ]