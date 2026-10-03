"""Evaluate the saved index against a labeled query CSV."""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ml.evaluation import calibrate_threshold, evaluate_csv
from ml.search import search_videos


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("queries", help="CSV with query, video_id, start_time, end_time")
    parser.add_argument("--k", type=int, default=5)
    parser.add_argument("--calibrate", action="store_true")
    args = parser.parse_args()
    metrics = evaluate_csv(args.queries, search_videos, k=args.k)
    if args.calibrate:
        import csv

        with open(args.queries, newline="", encoding="utf-8") as source:
            rows = list(csv.DictReader(source))
        metrics["calibration"] = calibrate_threshold(
            rows, search_videos, k=args.k
        )
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
