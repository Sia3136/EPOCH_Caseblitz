"""Safe OpenCV video reading and representative thumbnail generation."""
from pathlib import Path

import cv2


SUPPORTED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}


def extract_video_frames(video_path, interval=2.0, max_frames=15):
    """Return RGB frames, timestamps, and duration for a readable video."""
    path = Path(video_path)
    capture = cv2.VideoCapture(str(path))

    if not capture.isOpened():
        return {"frames": [], "timestamps": [], "duration": 0.0}

    fps = capture.get(cv2.CAP_PROP_FPS)
    frame_count = capture.get(cv2.CAP_PROP_FRAME_COUNT)
    duration = frame_count / fps if fps > 0 else 0.0
    frames = []
    timestamps = []
    timestamp = 0.0

    try:
        while timestamp < duration and len(frames) < max_frames:
            capture.set(cv2.CAP_PROP_POS_MSEC, timestamp * 1000)
            success, frame = capture.read()
            if success:
                frames.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                timestamps.append(timestamp)
            timestamp += interval
    finally:
        capture.release()

    return {
        "frames": frames,
        "timestamps": timestamps,
        "duration": duration,
    }


def save_thumbnail(video_path, timestamp, output_dir, name):
    """Save a BGR frame at ``timestamp`` and return its path, or None."""
    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        return None

    success = False
    try:
        capture.set(cv2.CAP_PROP_POS_MSEC, max(0.0, timestamp) * 1000)
        success, frame = capture.read()
    finally:
        capture.release()

    if not success:
        return None

    output_path = Path(output_dir) / f"{name}.jpg"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if not cv2.imwrite(str(output_path), frame):
        return None
    return str(output_path)