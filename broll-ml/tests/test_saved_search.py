
from pathlib import Path

import faiss
import numpy as np
import open_clip
import torch

from ml.storage import load_index, get_segment_metadata

# Load saved FAISS index
index = load_index()
print("Loaded vectors:", index.ntotal)

if index.ntotal == 0:
    raise RuntimeError("FAISS index is empty. Run the indexing test first.")

# Load CLIP
model, _, _ = open_clip.create_model_and_transforms(
    "ViT-B-32",
    pretrained="laion2b_s34b_b79k"
)
tokenizer = open_clip.get_tokenizer("ViT-B-32")
model = model.to("cpu").eval()

# Search query
query = "A cat is smiling"

with torch.inference_mode():
    tokens = tokenizer([query])
    query_embedding = model.encode_text(tokens)
    query_embedding = query_embedding / query_embedding.norm(
        dim=-1, keepdim=True
    )

query_vector = query_embedding.cpu().numpy().astype("float32")

# Search saved index
scores, ids = index.search(query_vector, min(5, index.ntotal))

print(f"\nQuery: {query}")
print("\nSaved-index search results:")

for rank, (score, faiss_id) in enumerate(
    zip(scores[0], ids[0]), start=1
):
    if faiss_id < 0:
        continue

    metadata = get_segment_metadata(int(faiss_id))

    if metadata is None:
        print(f"Missing metadata for vector {faiss_id}")
        continue

    print(
        f"{rank}. {metadata['filename']} | "
        f"{metadata['start_time']:.1f}s - "
        f"{metadata['end_time']:.1f}s | "
        f"Cosine similarity: {score:.4f}"
    )

print("\nSaved-index search test completed!")