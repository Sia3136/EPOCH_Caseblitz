import cv2
from pathlib import Path

video_path = Path("data/videos/video1.mp4").resolve()

print("Video path:", video_path)
print("File exists:", video_path.exists())

cap = cv2.VideoCapture(str(video_path))

print("Video opened:", cap.isOpened())

if cap.isOpened():
    print("Frame count:", int(cap.get(cv2.CAP_PROP_FRAME_COUNT)))
    print("FPS:", cap.get(cv2.CAP_PROP_FPS))

    success, frame = cap.read()
    print("First frame read:", success)

    if success:
        print("Frame shape:", frame.shape)

cap.release()

import numpy as np
from ml.clip_model import CLIPModel

clip = CLIPModel()

text_embedding = clip.encode_text(
    "A person walking in a busy street"
)

print("Embedding shape:", text_embedding.shape)
print("Embedding norm:", np.linalg.norm(text_embedding))

assert text_embedding.shape[-1] == 512
assert np.isclose(np.linalg.norm(text_embedding), 1.0, atol=1e-3)

print("CLIP test passed!")