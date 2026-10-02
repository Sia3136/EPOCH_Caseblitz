import cv2
import torch
import open_clip
import numpy as np
from PIL import Image

VIDEO_PATH = "data/videos/video1.mp4"
QUERY = "A cat is smiling"

# Load CLIP
model, _, preprocess = open_clip.create_model_and_transforms(
    "ViT-B-32",
    pretrained="laion2b_s34b_b79k"
)
tokenizer = open_clip.get_tokenizer("ViT-B-32")
model = model.to("cpu").eval()

# Embed text query
with torch.inference_mode():
    tokens = tokenizer([QUERY])
    text_embedding = model.encode_text(tokens)
    text_embedding = text_embedding / text_embedding.norm(
        dim=-1, keepdim=True
    )

# Extract frames every 2 seconds
cap = cv2.VideoCapture(VIDEO_PATH)
if not cap.isOpened():
    raise RuntimeError(f"Cannot open video: {VIDEO_PATH}")

fps = cap.get(cv2.CAP_PROP_FPS)
frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
duration = frame_count / fps if fps else 0

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

    timestamp += 2

cap.release()

if not frames:
    raise RuntimeError("No frames extracted from video")

# Embed frames in one batch
image_batch = torch.stack(frames)

with torch.inference_mode():
    image_embeddings = model.encode_image(image_batch)
    image_embeddings = image_embeddings / image_embeddings.norm(
        dim=-1, keepdim=True
    )

# Compare text and image embeddings
similarities = (
    image_embeddings @ text_embedding.T
).squeeze(1).cpu().numpy()

ranked = sorted(
    zip(timestamps, similarities),
    key=lambda item: item[1],
    reverse=True
)

print(f"\nQuery: {QUERY}")
print("\nRanked frames:")
for rank, (time_sec, score) in enumerate(ranked, start=1):
    print(f"{rank}. Timestamp: {time_sec}s | Cosine similarity: {score:.4f}")

print("\nVideo CLIP search test completed!")