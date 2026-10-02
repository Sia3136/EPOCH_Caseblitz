
from pathlib import Path

import cv2
import faiss
import numpy as np
import open_clip
import torch
from PIL import Image

from ml.storage import save_library, load_index, get_segment_metadata

ROOT = Path(__file__).resolve().parents[1]
VIDEO_DIR = ROOT / "data" / "videos"
FRAME_INTERVAL = 2
FRAMES_PER_SEGMENT = 2

print("Loading CLIP...")
model, _, preprocess = open_clip.create_model_and_transforms(
    "ViT-B-32",
    pretrained="laion2b_s34b_b79k"
)
model = model.to("cpu").eval()

all_segments = []

video_paths = sorted(VIDEO_DIR.glob("*.mp4"))

if not video_paths:
    raise RuntimeError("No MP4 videos found")

for video_path in video_paths:
    print(f"\nProcessing: {video_path.name}")

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        print(f"Skipping unreadable video: {video_path.name}")
        continue

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps if fps > 0 else 0

    frames = []
    timestamps = []

    timestamp = 0
    while timestamp < duration:
        cap.set(cv2.CAP_PROP_POS_MSEC, timestamp * 1000)
        success, frame = cap.read()

        if success:
            image = Image.fromarray(
                cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            )
            frames.append(preprocess(image))
            timestamps.append(timestamp)

        timestamp += FRAME_INTERVAL

    cap.release()

    if not frames:
        print(f"No frames extracted from {video_path.name}")
        continue

    image_batch = torch.stack(frames)

    with torch.inference_mode():
        embeddings = model.encode_image(image_batch)
        embeddings = embeddings / embeddings.norm(
            dim=-1, keepdim=True
        )

    embeddings = embeddings.cpu().numpy().astype("float32")

    for i in range(0, len(frames), FRAMES_PER_SEGMENT):
        group = embeddings[i:i + FRAMES_PER_SEGMENT]
        segment_embedding = group.mean(axis=0)

        norm = np.linalg.norm(segment_embedding)
        if norm == 0:
            continue

        segment_embedding = segment_embedding / norm

        last_index = min(
            i + FRAMES_PER_SEGMENT - 1,
            len(timestamps) - 1
        )

        start_time = timestamps[i]
        end_time = min(
            timestamps[last_index] + FRAME_INTERVAL,
            duration
        )

        all_segments.append({
            "video_path": str(video_path),
            "duration": duration,
            "start": start_time,
            "end": end_time,
            "embedding": segment_embedding.astype("float32")
        })

    print(f"Frames extracted: {len(frames)}")

print(f"\nTotal segments: {len(all_segments)}")

if not all_segments:
    raise RuntimeError("No video segments were created")

save_library(all_segments)

index = load_index()
print(f"Reloaded FAISS vectors: {index.ntotal}")

print("\nVerifying FAISS-to-SQLite mapping:")

for faiss_id in range(index.ntotal):
    metadata = get_segment_metadata(faiss_id)

    if metadata is None:
        raise AssertionError(f"Missing metadata for FAISS ID {faiss_id}")

    print(
        f"ID {faiss_id} | {metadata['filename']} | "
        f"{metadata['start_time']:.1f}s - "
        f"{metadata['end_time']:.1f}s"
    )

print("\nMulti-video indexing test completed!")