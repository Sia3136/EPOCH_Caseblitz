"""Saved-index semantic search for text and scripts."""
from ml.embedding import encode_search_text
from ml.ranking import rank_results
from ml.storage import get_all_segment_metadata, load_index


def search_videos(
    query,
    top_k=5,
    threshold=0.20,
    max_per_video=1,
    model=None,
):
    """Search the saved FAISS index and return ranked timestamped results."""
    if not query or not query.strip():
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

    for score, faiss_id in zip(scores[0], ids[0]):
        if faiss_id < 0 or float(score) < threshold:
            break
        row = metadata.get(int(faiss_id))
        if row is None:
            continue
        video_key = row["video_path"]
        if counts.get(video_key, 0) >= max_per_video:
            continue
        results.append({
            **row,
            "similarity": float(score),
            "explanation": (
                "Matched using text-to-visual embedding similarity."
            ),
        })
        counts[video_key] = counts.get(video_key, 0) + 1
        if len(results) >= top_k:
            break

    return rank_results(results, threshold=0, max_results=top_k)


class BrollSearch:
    def __init__(self, model=None):
        self.model = model

    def search(self, query, top_k=20):
        return search_videos(query, top_k=top_k, model=self.model)
