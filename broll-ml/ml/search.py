"""Saved-index semantic search for text and scripts."""
import re

from ml.embedding import encode_search_text
from ml.indexing import load_cached_frame_embeddings
from ml.ranking import rank_results, similarity_to_percentage
from ml.reranking import frame_level_rerank

MAX_QUERY_WORDS = 500


def validate_query(query):
    """Validate user-entered natural-language query length."""
    cleaned = (query or "").strip()
    if len(cleaned.split()) > MAX_QUERY_WORDS:
        raise ValueError("Search input cannot exceed 500 words")
    return cleaned


def _query_concepts(query):
    return [
        part.strip()
        for part in re.split(r"\s+(?:and|with|plus)\s+", query, flags=re.IGNORECASE)
        if part.strip()
    ]
from ml.storage import get_all_segment_metadata, load_index


def search_videos(
    query,
    top_k=5,
    threshold=0.20,
    max_per_video=1,
    model=None,
    rerank_frames=False,
    frame_interval=2.0,
    frames_per_segment=2,
    segment_stride=None,
):
    """Search the saved FAISS index and return ranked timestamped results."""
    query = validate_query(query)
    if not query:
        return []

    try:
        index = load_index()
    except FileNotFoundError:
        return []
    if index.ntotal == 0:
        return []

    query_vector = encode_search_text(query.strip(), model=model)
    scores, ids = index.search(query_vector.reshape(1, -1), index.ntotal)
    metadata = {
        row["faiss_id"]: row for row in get_all_segment_metadata()
    }
    results = []
    counts = {}
    concepts = _query_concepts(query)
    allow_multiple_candidates = len(concepts) > 1

    for score, faiss_id in zip(scores[0], ids[0]):
        if faiss_id < 0 or float(score) < threshold:
            break
        row = metadata.get(int(faiss_id))
        if row is None:
            continue
        video_key = row["video_path"]
        if not allow_multiple_candidates and counts.get(video_key, 0) >= max_per_video:
            continue
        results.append({
            **row,
            "similarity": float(score),
            "confidence_score": similarity_to_percentage(float(score)),
            "requested_concepts": query,
            "explanation": (
                f"Matched the requested visual concepts: {query}."
            ),
        })
        counts[video_key] = counts.get(video_key, 0) + 1
        if len(results) >= top_k and not allow_multiple_candidates:
            break

    if allow_multiple_candidates and results:
        component_scores = {}
        for concept in concepts:
            vector = encode_search_text(concept, model=model)
            scores_for_concept, ids_for_concept = index.search(
                vector.reshape(1, -1), index.ntotal
            )
            component_scores[concept] = {
                int(faiss_id): float(score)
                for score, faiss_id in zip(
                    scores_for_concept[0], ids_for_concept[0]
                )
                if faiss_id >= 0
            }
        for result in results:
            faiss_id = int(result["faiss_id"])
            scores_for_result = [
                component_scores[concept].get(faiss_id, 0.0)
                for concept in concepts
            ]
            matched = sum(score >= threshold for score in scores_for_result)
            result["concept_coverage"] = matched / len(concepts)
            result["coverage_status"] = (
                "complete" if matched == len(concepts) else "partial"
            )
            result["similarity"] = (
                0.6 * result["similarity"]
                + 0.4 * min(scores_for_result)
            )
            result["confidence_score"] = similarity_to_percentage(
                result["similarity"]
            )
            result["explanation"] = (
                f"Matched {matched} of {len(concepts)} requested visual concepts."
            )

        results.sort(key=lambda item: item["similarity"], reverse=True)
        deduplicated = []
        counts = {}
        for result in results:
            video_key = result["video_path"]
            if counts.get(video_key, 0) >= max_per_video:
                continue
            deduplicated.append(result)
            counts[video_key] = counts.get(video_key, 0) + 1
            if len(deduplicated) >= top_k:
                break
        results = deduplicated

    if rerank_frames and results:
        frames_by_video = {
            result["video_path"]: load_cached_frame_embeddings(
                result["video_path"],
                frame_interval=frame_interval,
                frames_per_segment=frames_per_segment,
                segment_stride=segment_stride,
            )
            for result in results
        }
        results = frame_level_rerank(results, query_vector, frames_by_video)

    return rank_results(results, threshold=0, max_results=top_k)


class BrollSearch:
    def __init__(self, model=None):
        self.model = model

    def search(self, query, top_k=20):
        return search_videos(query, top_k=top_k, model=self.model)
