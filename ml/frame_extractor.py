"""Fixed-interval video frame extraction for CLIP indexing."""
import cv2


def extract_frames(video_path):
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        return []

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    if fps <= 0 or total_frames <= 0:
        cap.release()
        return []

    duration = total_frames / fps
    interval = 2 if duration < 30 else 4
    timestamps = list(range(0, max(1, int(duration)), interval))[:15]
    frames = []

    for timestamp in timestamps:
        cap.set(cv2.CAP_PROP_POS_MSEC, timestamp * 1000)
        success, frame = cap.read()
        if success:
            frames.append({
                "timestamp": float(timestamp),
                "frame": cv2.cvtColor(frame, cv2.COLOR_BGR2RGB),
            })

    cap.release()
    return frames
