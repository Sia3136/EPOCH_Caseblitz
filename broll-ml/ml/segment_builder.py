"""Utilities for building video segments from extracted frames."""
import numpy as np


def build_segments(
    frames,
    group_size=3,
    frame_interval=2.0,
    duration=None,
    stride=None,
):
    """Group frame embeddings into timestamped windows."""
    segments = []
    step = stride or group_size
    if step < 1:
        raise ValueError("stride must be at least 1")

    for i in range(0, len(frames), step):
        group = frames[i:i + group_size]

        if not group:
            continue

        embeddings = np.array([
            item["embedding"] for item in group
        ], dtype=np.float32)

        average = embeddings.mean(axis=0)
        average /= np.linalg.norm(average) + 1e-12
        quality = [item.get("quality", {}) for item in group]
        issues = sorted({
            issue
            for item in quality
            for issue in item.get("issues", [])
        })
        blur_scores = [item["blur_score"] for item in quality if "blur_score" in item]

        segments.append({
            "start_time": group[0]["timestamp"],
            "end_time": min(
                group[-1]["timestamp"] + frame_interval,
                duration if duration is not None else float("inf"),
            ),
            "embedding": average,
            "quality_score": (
                float(np.mean(blur_scores)) if blur_scores else None
            ),
            "quality_issues": issues,
        })

    return segments