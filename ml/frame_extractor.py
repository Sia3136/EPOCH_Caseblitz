"""Video frame extraction utilities."""
import cv2

def extract_frames(video_path):
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        return []

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)

    if fps <= 0 or total_frames <= 0:
        cap.release()
        return []

    duration = total_frames / fps

    interval = 2 if duration < 30 else 4
    timestamps = list(range(0, int(duration), interval))[:15]

    frames = []

    for timestamp in timestamps:
        cap.set(cv2.CAP_PROP_POS_MSEC, timestamp * 1000)
        success, frame = cap.read()

        if success:
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frames.append({
                "timestamp": timestamp,
                "frame": frame
            })

    cap.release()
    return frames

if __name__ == "__main__":
    from pathlib import Path

    video_path = (
        Path(__file__).resolve().parent.parent
        / "data" / "videos" / "video1.mp4"
    )

    print("Testing video:", video_path)
    print("File exists:", video_path.exists())

    frames = extract_frames(video_path)

    print("Extracted frames:", len(frames))

