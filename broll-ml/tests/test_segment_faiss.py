
from pathlib import Path
from ml.storage import save_index_and_metadata
import cv2
import faiss
import numpy as np
import open_clip
import torch
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
VIDEO_PATH = ROOT / "data" / "videos" / "video1.mp4"
QUERY = "A cat is smiling"
FRAME_INTERVAL = 2
FRAMES_PER_SEGMENT = 2

# 1. Load CLIP
print("Loading CLIP...")
model, _, preprocess = open_clip.create_model_and_transforms(
    "ViT-B-32",
    pretrained="laion2b_s34b_b79k"
)
tokenizer = open_clip.get_tokenizer("ViT-B-32")
model = model.to("cpu").eval()

# 2. Extract frames
cap = cv2.VideoCapture(str(VIDEO_PATH))
if not cap.isOpened():
    raise RuntimeError(f"Cannot open video: {VIDEO_PATH}")

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
    raise RuntimeError("No frames extracted")

print("Frames extracted:", len(frames))

# 3. Generate image embeddings
image_batch = torch.stack(frames)

with torch.inference_mode():
    image_embeddings = model.encode_image(image_batch)
    image_embeddings = image_embeddings / image_embeddings.norm(
        dim=-1, keepdim=True
    )

image_embeddings = image_embeddings.cpu().numpy().astype("float32")

# 4. Group frames into segments
segments = []

for i in range(0, len(frames), FRAMES_PER_SEGMENT):
    group_embeddings = image_embeddings[
        i:i + FRAMES_PER_SEGMENT
    ]

    segment_embedding = group_embeddings.mean(axis=0)
    norm = np.linalg.norm(segment_embedding)

    if norm == 0:
        continue

    segment_embedding = segment_embedding / norm

    start_time = timestamps[i]
    last_index = min(i + FRAMES_PER_SEGMENT - 1, len(timestamps) - 1)
    end_time = min(
        timestamps[last_index] + FRAME_INTERVAL,
        duration
    )

    segments.append({
        "start": start_time,
        "end": end_time,
        "embedding": segment_embedding.astype("float32")
    })

print("Segments created:", len(segments))

# 5. Build FAISS index
dimension = 512
index = faiss.IndexFlatIP(dimension)

vectors = np.stack([s["embedding"] for s in segments])
index.add(vectors)

print("FAISS vectors:", index.ntotal)
save_index_and_metadata(
    index=index,
    segments=segments,
    video_path=VIDEO_PATH,
    duration=duration
)

# 6. Embed the text query
with torch.inference_mode():
    tokens = tokenizer([QUERY])
    text_embedding = model.encode_text(tokens)
    text_embedding = text_embedding / text_embedding.norm(
        dim=-1, keepdim=True
    )

query_vector = text_embedding.cpu().numpy().astype("float32")

# 7. Search FAISS
scores, indices = index.search(query_vector, min(5, index.ntotal))

print(f"\nQuery: {QUERY}")
print("\nSearch results:")

for rank, (score, idx) in enumerate(
    zip(scores[0], indices[0]), start=1
):
    if idx < 0:
        continue

    segment = segments[idx]
    print(
        f"{rank}. {VIDEO_PATH.name} | "
        f"{segment['start']:.1f}s - {segment['end']:.1f}s | "
        f"Cosine similarity: {score:.4f}"
    )

print("\nSegment + FAISS test completed!")