"""Compare frame sampling and segment configurations on labeled queries."""
import argparse
import csv
import json
import sys
from itertools import product
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ml.evaluation import evaluate_configurations
from ml.indexing import rebuild_library
from ml.search import search_videos


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("video_dir")
    parser.add_argument("queries", help="CSV with query, video_id, start_time, end_time")
    parser.add_argument("--intervals", default="1,2,4")
    parser.add_argument("--group-sizes", default="2,3,4")
    parser.add_argument("--overlap", action="store_true")
    parser.add_argument("--k", type=int, default=5)
    args = parser.parse_args()

    paths = sorted(
        path for path in Path(args.video_dir).iterdir()
        if path.is_file()
    )
    intervals = [float(value) for value in args.intervals.split(",")]
    group_sizes = [int(value) for value in args.group_sizes.split(",")]
    configurations = []
    for interval, group_size in product(intervals, group_sizes):
        configurations.append({
            "frame_interval": interval,
            "frames_per_segment": group_size,
            "segment_stride": max(1, group_size - 1) if args.overlap else None,
        })

    with open(args.queries, newline="", encoding="utf-8") as source:
        rows = list(csv.DictReader(source))

    reports = evaluate_configurations(
        rows,
        lambda **configuration: rebuild_library(paths, **configuration),
        search_videos,
        configurations,
        k=args.k,
    )
    print(json.dumps(reports, indent=2))


if __name__ == "__main__":
    main()
