"""Benchmark sequential versus parallel OpenCV decoding."""
import argparse
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ml.video_processor import extract_video_frames, extract_videos_parallel


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("video_dir", nargs="?", default="data/videos")
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

    print({
        "videos": len(paths),
        "sequential_seconds": round(sequential_seconds, 3),
        "parallel_seconds": round(parallel_seconds, 3),
        "sequential_frames": sum(len(item["frames"]) for item in sequential),
        "parallel_frames": sum(len(item["frames"]) for item in parallel),
    })


if __name__ == "__main__":
    main()
