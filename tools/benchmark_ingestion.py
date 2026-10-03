"""Benchmark sequential versus parallel OpenCV decoding."""
import argparse
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ml.video_processor import extract_video_frames, extract_videos_parallel
from ml.search import search_videos


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("video_dir", nargs="?", default="data/videos")
    parser.add_argument("--query", help="Also measure saved-index query latency")
    parser.add_argument("--runs", type=int, default=3)
    args = parser.parse_args()
    paths = sorted(Path(args.video_dir).glob("*"))
    paths = [path for path in paths if path.is_file()]
    if not paths:
        raise SystemExit("No video files found")

    start = time.perf_counter()
    sequential = [extract_video_frames(path) for path in paths]
    sequential_seconds = time.perf_counter() - start

    start = time.perf_counter()
    parallel = extract_videos_parallel(paths)
    parallel_seconds = time.perf_counter() - start

    report = {
        "videos": len(paths),
        "sequential_seconds": round(sequential_seconds, 3),
        "parallel_seconds": round(parallel_seconds, 3),
        "sequential_frames": sum(len(item["frames"]) for item in sequential),
        "parallel_frames": sum(len(item["frames"]) for item in parallel),
    }
    if args.query:
        timings = []
        for _ in range(max(1, args.runs)):
            start = time.perf_counter()
            search_videos(args.query)
            timings.append(time.perf_counter() - start)
        report["search_latency_seconds"] = round(sum(timings) / len(timings), 4)
    print(report)


if __name__ == "__main__":
    main()
