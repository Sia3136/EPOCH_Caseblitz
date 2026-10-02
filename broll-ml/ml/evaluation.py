"""Retrieval metrics for labeled query-to-segment evaluation."""
import csv


def temporal_iou(left_start, left_end, right_start, right_end):
    intersection = max(
        0.0,
        min(float(left_end), float(right_end))
        - max(float(left_start), float(right_start)),
    )
    union = max(float(left_end), float(right_end)) - min(
        float(left_start), float(right_start)
    )
    return intersection / union if union > 0 else 0.0


def evaluate_query(query, expected, search_function, k=5, threshold=0.0):
    results = search_function(query, top_k=k, threshold=threshold)
    expected_video = expected["video_id"]
    expected_start = float(expected.get("start_time", 0))
    expected_end = float(expected.get("end_time", 0))
    relevant = []
    for result in results[:k]:
        same_video = (
            result.get("video_id") == expected_video
            or result.get("filename", "").startswith(expected_video)
            or expected_video in result.get("video_path", "")
        )
        overlap = temporal_iou(
            result.get("start_time", 0),
            result.get("end_time", 0),
            expected_start,
            expected_end,
        )
        relevant.append(same_video and overlap > 0)

    first_relevant = next(
        (index for index, is_relevant in enumerate(relevant, start=1) if is_relevant),
        None,
    )
    return {
        "recall_at_k": float(any(relevant)),
        "precision_at_k": sum(relevant) / k,
        "mrr": 1 / first_relevant if first_relevant else 0.0,
        "temporal_iou": max(
            (
                temporal_iou(
                    result.get("start_time", 0),
                    result.get("end_time", 0),
                    expected_start,
                    expected_end,
                )
                for result, is_relevant in zip(results[:k], relevant)
                if is_relevant
            ),
            default=0.0,
        ),
    }


def evaluate_csv(path, search_function, k=5):
    with open(path, newline="", encoding="utf-8") as source:
        rows = list(csv.DictReader(source))
    if not rows:
        return {"count": 0, "recall_at_k": 0.0, "precision_at_k": 0.0, "mrr": 0.0, "temporal_iou": 0.0}

    metrics = [
        evaluate_query(row["query"], row, search_function, k=k)
        for row in rows
    ]
    return {
        "count": len(metrics),
        "recall_at_k": sum(item["recall_at_k"] for item in metrics) / len(metrics),
        "precision_at_k": sum(item["precision_at_k"] for item in metrics) / len(metrics),
        "mrr": sum(item["mrr"] for item in metrics) / len(metrics),
        "temporal_iou": sum(item["temporal_iou"] for item in metrics) / len(metrics),
    }


def calibrate_threshold(rows, search_function, thresholds=None, k=5):
    """Select the threshold with the highest labeled Recall@k."""
    candidates = thresholds or [round(index / 100, 2) for index in range(0, 101, 5)]
    if not rows:
        return {"threshold": 0.0, "recall_at_k": 0.0}

    scored = []
    for threshold in candidates:
        metrics = []
        for row in rows:
            def search(query, top_k=k, current_threshold=threshold):
                return search_function(
                    query, top_k=top_k, threshold=current_threshold
                )

            metrics.append(
                evaluate_query(
                    row["query"], row, search_function, k=k, threshold=threshold
                )
            )
        scored.append((sum(item["recall_at_k"] for item in metrics) / len(metrics), threshold))

    recall, threshold = max(scored, key=lambda item: (item[0], -item[1]))
    return {"threshold": threshold, "recall_at_k": recall}
