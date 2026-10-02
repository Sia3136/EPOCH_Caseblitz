"""Optional frame- and caption-level reranking helpers."""
import numpy as np


def frame_level_rerank(results, query_embedding, frames_by_video, weight=0.35):
    """Rerank segment results using the best frame score in each segment."""
    query = np.asarray(query_embedding, dtype=np.float32)
    query /= np.linalg.norm(query) + 1e-12
    reranked = []
    for result in results:
        frames = frames_by_video.get(result.get("video_path"), ())
        scores = []
        for timestamp, embedding in frames:
            if result["start_time"] <= timestamp <= result["end_time"]:
                vector = np.asarray(embedding, dtype=np.float32)
                vector /= np.linalg.norm(vector) + 1e-12
                scores.append(float(np.dot(query, vector)))
        frame_score = max(scores, default=result["similarity"])
        updated = {
            **result,
            "frame_similarity": frame_score,
            "similarity": (
                (1.0 - weight) * result["similarity"]
                + weight * frame_score
            ),
            "explanation": "Matched using segment and frame-level similarity.",
        }
        reranked.append(updated)
    return sorted(reranked, key=lambda item: item["similarity"], reverse=True)


def caption_level_rerank(results, query_embedding, caption_embeddings, weight=0.2):
    """Optionally blend CLIP text similarity for generated result captions."""
    query = np.asarray(query_embedding, dtype=np.float32)
    query /= np.linalg.norm(query) + 1e-12
    reranked = []
    for result in results:
        caption_embedding = caption_embeddings.get(result.get("segment_id"))
        if caption_embedding is None:
            reranked.append(result)
            continue
        caption_vector = np.asarray(caption_embedding, dtype=np.float32)
        caption_vector /= np.linalg.norm(caption_vector) + 1e-12
        caption_score = float(np.dot(query, caption_vector))
        reranked.append({
            **result,
            "caption_similarity": caption_score,
            "similarity": (
                (1.0 - weight) * result["similarity"]
                + weight * caption_score
            ),
            "explanation": "Matched using visual and caption similarity.",
        })
    return sorted(reranked, key=lambda item: item["similarity"], reverse=True)


def generate_caption_rerank(
    results,
    query_embedding,
    captioner,
    image_loader,
    text_encoder,
    weight=0.2,
):
    """Generate captions only for returned results, then blend CLIP scores."""
    caption_embeddings = {}
    for result in results:
        image = image_loader(result)
        caption = captioner.caption(image)
        result["caption"] = caption
        caption_embeddings[result.get("segment_id")] = text_encoder(caption)
    return caption_level_rerank(
        results, query_embedding, caption_embeddings, weight=weight
    )
