"""Reusable video-to-segment indexing pipeline."""
import hashlib
from pathlib import Path

import numpy as np

from ml.embedding import encode_images
from ml.segment_builder import build_segments
from ml.storage import save_library
from ml.video_processor import extract_video_frames, save_thumbnail


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


def index_video(
    video_path,
    model=None,
    frame_interval=2.0,
    frames_per_segment=2,
    thumbnail_dir="data/thumbnails",
    cache_dir="data/index/cache",
):
    """Extract, embed, segment, and describe one video for indexing."""
    path = Path(video_path)
    extracted = extract_video_frames(path, frame_interval)
    frames = extracted["frames"]
    timestamps = extracted["timestamps"]

    if not frames:
        return []

    cache_key = hashlib.sha256()
    with path.open("rb") as video_file:
        for chunk in iter(lambda: video_file.read(1024 * 1024), b""):
            cache_key.update(chunk)
    cache_key.update(f"|{frame_interval}|{frames_per_segment}|clip-v1".encode())
    cache_path = Path(cache_dir) / f"{cache_key.hexdigest()}.npz"

    if cache_path.exists():
        cached = np.load(cache_path)
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
        {"timestamp": timestamp, "embedding": embedding}
        for timestamp, embedding in zip(timestamps, embeddings)
    ]
    segments = build_segments(frame_items, group_size=frames_per_segment)
    output = []

    for index, segment in enumerate(segments):
        thumbnail_path = save_thumbnail(
            path,
            (segment["start_time"] + segment["end_time"]) / 2,
            thumbnail_dir,
            f"{path.stem}_{index}",
        )
        output.append({
            "video_path": str(path),
            "duration": extracted["duration"],
            "start": segment["start_time"],
            "end": segment["end_time"],
            "thumbnail_path": thumbnail_path,
            "embedding": np.asarray(
                segment["embedding"], dtype=np.float32
            ),
        })

    return output


def rebuild_library(video_paths, model=None, **kwargs):
    """Rebuild the complete saved library from readable video paths."""
    all_segments = []
    for video_path in unique_video_paths(video_paths):
        all_segments.extend(index_video(video_path, model=model, **kwargs))

    if not all_segments:
        raise ValueError("No readable video segments were created")

    save_library(all_segments)
    return all_segments