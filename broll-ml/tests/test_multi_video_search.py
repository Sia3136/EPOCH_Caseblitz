
import open_clip
import torch

from ml.storage import load_index, get_segment_metadata

# Configuration
QUERY = "A cat is smiling"
TOP_K = 5
MAX_PER_VIDEO = 2
MIN_SIMILARITY = 0.25  # Provisional threshold; calibrate later

# 1. Load CLIP
print("Loading CLIP...")
model, _, _ = open_clip.create_model_and_transforms(
    "ViT-B-32",
    pretrained="laion2b_s34b_b79k"
)
tokenizer = open_clip.get_tokenizer("ViT-B-32")
model = model.to("cpu").eval()

# 2. Load saved FAISS index
print("Loading saved FAISS index...")
index = load_index()

if index.ntotal == 0:
    raise RuntimeError("FAISS index is empty")

print("Loaded vectors:", index.ntotal)

# 3. Generate text embedding
with torch.inference_mode():
    tokens = tokenizer([QUERY])
    text_embedding = model.encode_text(tokens)
    text_embedding = text_embedding / text_embedding.norm(
        dim=-1, keepdim=True
    )

query_vector = text_embedding.cpu().numpy().astype("float32")

# 4. Search all indexed segments
scores, indices = index.search(
    query_vector,
    index.ntotal
)

# 5. Apply threshold, deduplication and top-k limit
results = []
video_counts = {}

for score, faiss_id in zip(scores[0], indices[0]):
    if faiss_id < 0:
        continue

    # FAISS returns scores in descending order
    if score < MIN_SIMILARITY:
        break

    metadata = get_segment_metadata(int(faiss_id))

    if metadata is None:
        print(f"Warning: Missing metadata for FAISS ID {faiss_id}")
        continue

    video_key = metadata["video_path"]
    count = video_counts.get(video_key, 0)

    # Limit segments from each video
    if count >= MAX_PER_VIDEO:
        continue

    results.append((float(score), int(faiss_id), metadata))
    video_counts[video_key] = count + 1

    if len(results) >= TOP_K:
        break

# 6. Display results
print(f"\nQuery: {QUERY}")
print(f"Minimum similarity: {MIN_SIMILARITY}")
print("\nSearch results:")

if not results:
    print("No relevant matches found.")
else:
    for rank, (score, faiss_id, metadata) in enumerate(results, start=1):
        print(f"\n{rank}. {metadata['filename']}")
        print(
            f"   Timestamp: {metadata['start_time']:.1f}s - "
            f"{metadata['end_time']:.1f}s"
        )
        print(f"   Similarity: {score:.4f}")
        print(f"   FAISS ID: {faiss_id}")

print("\nSearch completed!")