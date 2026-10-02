"""Utilities for building video segments from extracted frames."""
import numpy as np

def build_segments(frames, group_size=3):
    segments = []

    for i in range(0, len(frames), group_size):
        group = frames[i:i + group_size]

        if not group:
            continue

        embeddings = np.array([
            item["embedding"] for item in group
        ], dtype=np.float32)

        average = embeddings.mean(axis=0)
        average /= np.linalg.norm(average) + 1e-12

        segments.append({
            "start_time": group[0]["timestamp"],
            "end_time": group[-1]["timestamp"],
            "embedding": average,
        })

    return segments