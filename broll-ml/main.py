"""Command-line entry point for the b-roll ML pipeline."""
from ml.clip_model import CLIPModel
from ml.frame_extractor import extract_frames

clip = CLIPModel()

frames = extract_frames("data/videos/sample.mp4")

embeddings = []

for item in frames:
    embedding = clip.encode_image(item["frame"])
    embeddings.append({
        "timestamp": item["timestamp"],
        "embedding": embedding
    })

print("Generated embeddings:", len(embeddings))