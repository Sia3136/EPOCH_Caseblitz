"""Result ranking utilities."""
def similarity_to_percentage(
    score,
    min_score=0.15,
    max_score=0.35
):
    score = max(min_score, min(score, max_score))

    return round(
        (score - min_score) /
        (max_score - min_score) * 100
    )


def rank_results(results, threshold=35, max_results=5):
    results = sorted(
        results,
        key=lambda x: x["similarity"],
        reverse=True
    )

    selected = []
    clip_counts = {}

    for result in results:
        percentage = similarity_to_percentage(
            result["similarity"]
        )

        if percentage < threshold:
            continue

        clip_id = result["clip_id"]
        count = clip_counts.get(clip_id, 0)

        if count >= 2:
            continue

        result["match_percentage"] = percentage
        selected.append(result)
        clip_counts[clip_id] = count + 1

        if len(selected) >= max_results:
            break

    return selected