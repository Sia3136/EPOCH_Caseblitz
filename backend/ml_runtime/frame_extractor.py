import cv2


def extract_frames(video_path):
    capture = cv2.VideoCapture(video_path)
    if not capture.isOpened():
        return []
    fps = capture.get(cv2.CAP_PROP_FPS)
    total_frames = capture.get(cv2.CAP_PROP_FRAME_COUNT)
    if fps <= 0 or total_frames <= 0:
        capture.release()
        return []
    duration = total_frames / fps
    interval = 2 if duration < 30 else 4
    timestamps = list(range(0, int(duration), interval))[:15]
    frames = []
    for timestamp in timestamps:
        capture.set(cv2.CAP_PROP_POS_MSEC, timestamp * 1000)
        success, frame = capture.read()
        if success:
            frames.append({'timestamp': timestamp, 'frame': cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)})
    capture.release()
    return frames
