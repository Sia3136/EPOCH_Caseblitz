"""Saved-index semantic search for text and scripts."""
import re

from ml.embedding import encode_search_text, encode_text
from ml.indexing import load_cached_frame_embeddings
from ml.ranking import rank_results, similarity_to_percentage
from ml.reranking import frame_level_rerank
from ml.storage import get_all_segment_metadata, load_index

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


def search_videos(
    query,
    top_k=5,
    threshold=0.20,
    max_per_video=1,
    model=None,
    rerank_frames=True,
    frame_interval=2.0,
    frames_per_segment=2,
    segment_stride=None,
    use_captions=False,
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

    if not allow_multiple_candidates:
        candidate_scores = {
            int(faiss_id): float(score)
            for score, faiss_id in zip(scores[0], ids[0])
            if faiss_id >= 0 and float(score) >= threshold
        }
    else:
        # Compound queries need candidates from each concept. Filtering only
        # by the combined phrase can discard the less dominant concept.
        component_scores = {}
        candidate_ids = set()
        for concept in concepts:
            vector = encode_search_text(concept, model=model)
            concept_scores, concept_ids = index.search(
                vector.reshape(1, -1), index.ntotal
            )
            component_scores[concept] = {
                int(faiss_id): float(score)
                for score, faiss_id in zip(concept_scores[0], concept_ids[0])
                if faiss_id >= 0
            }
            candidate_ids.update(component_scores[concept])
        candidate_scores = {
            int(faiss_id): float(score)
            for score, faiss_id in zip(scores[0], ids[0])
            if faiss_id >= 0
        }
        candidate_scores.update({
            faiss_id: candidate_scores.get(faiss_id, 0.0)
            for faiss_id in candidate_ids
        })

    for faiss_id, score in candidate_scores.items():
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
        for result in results:
            faiss_id = int(result["faiss_id"])
            scores_for_result = [
                component_scores[concept].get(faiss_id, 0.0)
                for concept in concepts
            ]
            component_threshold = threshold
            matched = sum(
                score >= component_threshold for score in scores_for_result
            )
            result["concept_coverage"] = matched / len(concepts)
            result["coverage_status"] = (
                "complete" if matched == len(concepts) else "partial"
            )
            result["similarity"] = 0.5 * result["similarity"] + 0.5 * min(
                scores_for_result
            )
            result["confidence_score"] = similarity_to_percentage(
                result["similarity"]
            )
            result["explanation"] = (
                f"Matched {matched} of {len(concepts)} requested visual concepts."
            )

        # Preserve the user's concept order: for "girl and cat", return the
        # strongest girl match first, then the strongest cat match.
        groups = []
        for concept in concepts:
            ranked = sorted(
                results,
                key=lambda item: component_scores[concept].get(
                    int(item["faiss_id"]), 0.0
                ),
                reverse=True,
            )
            groups.append(ranked)

        ordered = []
        used_segments = set()
        used_videos = set()
        for group_index in range(max((len(group) for group in groups), default=0)):
            for concept, group in zip(concepts, groups):
                for candidate in group:
                    segment_key = int(candidate["faiss_id"])
                    video_key = candidate["video_path"]
                    if segment_key in used_segments or video_key in used_videos:
                        continue
                    concept_score = component_scores[concept].get(segment_key, 0.0)
                    selected = {**candidate}
                    selected["matched_concept"] = concept
                    selected["_query_order"] = len(ordered)
                    selected["similarity"] = concept_score
                    selected["confidence_score"] = similarity_to_percentage(
                        concept_score
                    )
                    selected["coverage_status"] = (
                        "matched" if concept_score >= threshold else "flagged"
                    )
                    selected["explanation"] = (
                        f"Ranked for the requested concept: {concept}."
                        if concept_score >= threshold
                        else f"Flagged as a weak match for: {concept}."
                    )
                    ordered.append(selected)
                    used_segments.add(segment_key)
                    used_videos.add(video_key)
                    break
                if len(ordered) >= top_k:
                    break
            if len(ordered) >= top_k:
                break
        results = ordered

    if rerank_frames and results and not allow_multiple_candidates:
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

    if use_captions and results and not allow_multiple_candidates:
        try:
            from PIL import Image
            from ml.captioner import get_captioner
            from ml.reranking import generate_caption_rerank

            def load_thumbnail(result):
                thumbnail_path = result.get("thumbnail_path")
                if not thumbnail_path:
                    return None
                try:
                    return Image.open(thumbnail_path).convert("RGB")
                except (OSError, ValueError):
                    return None

            results = generate_caption_rerank(
                results,
                query_vector,
                get_captioner(),
                load_thumbnail,
                lambda caption: encode_text(caption, model=model),
            )
        except Exception:
            # Captioning is an enhancement; visual CLIP search remains usable.
            pass

    ranked_results = rank_results(results, threshold=0, max_results=top_k)
    if len(concepts) > 1:
        ranked_results.sort(
            key=lambda item: item.get("_query_order", top_k)
        )
        for item in ranked_results:
            item.pop("_query_order", None)
    return ranked_results


class BrollSearch:
    def __init__(self, model=None):
        self.model = model

    def search(self, query, top_k=20):
        return search_videos(query, top_k=top_k, model=self.model)
