"""Safe OpenCV video reading and representative thumbnail generation."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

import cv2


SUPPORTED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
MAX_VIDEO_DURATION = 60.0


def assess_frame_quality(frame, blur_threshold=35.0):
    """Return interpretable quality signals without modifying the source frame."""
    gray = cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY)
    blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    brightness = float(gray.mean())
    contrast = float(gray.std())
    issues = []
    if blur_score < blur_threshold:
        issues.append("blurry")
    if brightness < 35:
        issues.append("too_dark")
    elif brightness > 225:
        issues.append("overexposed")
    if contrast < 18:
        issues.append("low_contrast")
    return {
        "blur_score": blur_score,
        "brightness": brightness,
        "contrast": contrast,
        "issues": issues,
    }


def extract_video_frames(video_path, interval=2.0, max_frames=15):
    """Return RGB frames, timestamps, and duration for a readable video."""
    path = Path(video_path)
    capture = cv2.VideoCapture(str(path))

    if not capture.isOpened():
        return {"frames": [], "timestamps": [], "duration": 0.0}

    fps = capture.get(cv2.CAP_PROP_FPS)
    frame_count = capture.get(cv2.CAP_PROP_FRAME_COUNT)
    duration = frame_count / fps if fps > 0 else 0.0
    if duration > MAX_VIDEO_DURATION:
        capture.release()
        return {
            "frames": [],
            "timestamps": [],
            "duration": duration,
            "error": "video_longer_than_60_seconds",
        }
    frames = []
    timestamps = []
    quality = []
    timestamp = 0.0

    try:
        while timestamp < duration and len(frames) < max_frames:
            capture.set(cv2.CAP_PROP_POS_MSEC, timestamp * 1000)
            success, frame = capture.read()
            if success:
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frames.append(rgb_frame)
                timestamps.append(timestamp)
                quality.append(assess_frame_quality(rgb_frame))
            timestamp += interval
    finally:
        capture.release()

    return {
        "frames": frames,
        "timestamps": timestamps,
        "duration": duration,
        "quality": quality,
    }


def extract_videos_parallel(video_paths, interval=2.0, max_frames=15, workers=4):
    """Decode independent videos concurrently for ingestion benchmarks."""
    with ThreadPoolExecutor(max_workers=workers) as executor:
        return list(executor.map(
            lambda path: extract_video_frames(path, interval, max_frames),
            video_paths,
        ))


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