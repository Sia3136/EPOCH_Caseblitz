"""Reusable video-to-segment indexing pipeline."""
import hashlib
from pathlib import Path

import numpy as np

from ml.embedding import encode_images
from ml.segment_builder import build_segments
from ml.storage import save_library
from ml.video_processor import (
    extract_video_frames,
    extract_videos_parallel,
    save_thumbnail,
)


def unique_video_paths(video_paths):
    """Remove exact duplicate files while preserving input order."""
    unique = []
    fingerprints = set()

    for video_path in video_paths:
        digest = hashlib.sha256()
        with Path(video_path).open("rb") as video_file:
            for chunk in iter(lambda: video_file.read(1024 * 1024), b""):
                digest.update(chunk)
        fingerprint = digest.digest()
        if fingerprint not in fingerprints:
            fingerprints.add(fingerprint)
            unique.append(video_path)

    return unique


def _cache_path(path, frame_interval, frames_per_segment, segment_stride, cache_dir):
    cache_key = hashlib.sha256()
    with path.open("rb") as video_file:
        for chunk in iter(lambda: video_file.read(1024 * 1024), b""):
            cache_key.update(chunk)
    cache_key.update(
        f"|{frame_interval}|{frames_per_segment}|{segment_stride}|clip-v1".encode()
    )
    return Path(cache_dir) / f"{cache_key.hexdigest()}.npz"


def load_cached_frame_embeddings(
    video_path,
    frame_interval=2.0,
    frames_per_segment=2,
    segment_stride=None,
    cache_dir="data/index/cache",
):
    """Load cached frame embeddings for optional frame-level reranking."""
    cache_path = _cache_path(
        Path(video_path),
        frame_interval,
        frames_per_segment,
        segment_stride,
        cache_dir,
    )
    if not cache_path.exists():
        return []
    with np.load(cache_path) as cached:
        return list(zip(
            cached["timestamps"].tolist(),
            cached["embeddings"].tolist(),
        ))


def _index_extracted_video(
    path,
    extracted,
    model=None,
    frame_interval=2.0,
    frames_per_segment=2,
    segment_stride=None,
    thumbnail_dir="data/thumbnails",
    cache_dir="data/index/cache",
):
    frames = extracted["frames"]
    timestamps = extracted["timestamps"]
    if not frames:
        return []

    cache_path = _cache_path(
        path, frame_interval, frames_per_segment, segment_stride, cache_dir
    )
    if cache_path.exists():
        with np.load(cache_path) as cached:
            embeddings = cached["embeddings"]
            timestamps = cached["timestamps"].tolist()
            extracted["duration"] = float(cached["duration"])
    else:
        embeddings = np.asarray(encode_images(frames, model=model), dtype=np.float32)
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(
            cache_path,
            embeddings=embeddings,
            timestamps=np.asarray(timestamps, dtype=np.float32),
            duration=extracted["duration"],
        )

    frame_items = [
        {
            "timestamp": timestamp,
            "embedding": embedding,
            "quality": quality,
        }
        for timestamp, embedding, quality in zip(
            timestamps,
            embeddings,
            extracted.get("quality", [{} for _ in timestamps]),
        )
    ]
    segments = build_segments(
        frame_items,
        group_size=frames_per_segment,
        frame_interval=frame_interval,
        duration=extracted["duration"],
        stride=segment_stride,
    )
    output = []
    for index, segment in enumerate(segments):
        thumbnail_path = save_thumbnail(
            path,
            (segment["start_time"] + segment["end_time"]) / 2,
            thumbnail_dir,
            f"{path.stem}_{index}",
        )
        output.append({
            "video_id": path.stem,
            "video_path": str(path),
            "duration": extracted["duration"],
            "start": segment["start_time"],
            "end": segment["end_time"],
            "thumbnail_path": thumbnail_path,
            "quality_score": segment.get("quality_score"),
            "quality_issues": segment.get("quality_issues", []),
            "embedding": np.asarray(segment["embedding"], dtype=np.float32),
        })
    return output


def index_video(
    video_path,
    model=None,
    frame_interval=2.0,
    frames_per_segment=2,
    segment_stride=None,
    thumbnail_dir="data/thumbnails",
    cache_dir="data/index/cache",
):
    """Extract, embed, segment, and describe one video for indexing."""
    path = Path(video_path)
    extracted = extract_video_frames(path, frame_interval)
    return _index_extracted_video(
        path,
        extracted,
        model=model,
        frame_interval=frame_interval,
        frames_per_segment=frames_per_segment,
        segment_stride=segment_stride,
        thumbnail_dir=thumbnail_dir,
        cache_dir=cache_dir,
    )


def index_videos_parallel(video_paths, model=None, workers=4, **kwargs):
    """Decode videos concurrently, then embed and segment each result."""
    paths = unique_video_paths(video_paths)
    extracted = extract_videos_parallel(paths, workers=workers)
    batches = [
        _index_extracted_video(path, item, model=model, **kwargs)
        for path, item in zip(paths, extracted)
    ]
    all_segments = [segment for batch in batches for segment in batch]
    if not all_segments:
        raise ValueError("No readable video segments were created")
    save_library(all_segments)
    return all_segments


def rebuild_library(video_paths, model=None, **kwargs):
    """Rebuild the complete saved library from readable video paths."""
    all_segments = []
    for video_path in unique_video_paths(video_paths):
        all_segments.extend(index_video(video_path, model=model, **kwargs))

    if not all_segments:
        raise ValueError("No readable video segments were created")

    save_library(all_segments)
    return all_segments