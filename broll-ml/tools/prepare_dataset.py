"""Prepare a small, validated video dataset for b-roll evaluation."""
import argparse
import csv
import hashlib
import random
import shutil
import subprocess
import sys
from pathlib import Path

import cv2

SUPPORTED_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}


def download_kaggle_dataset(dataset_slug, download_dir):
    download_dir = Path(download_dir)
    download_dir.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "kaggle",
            "datasets",
            "download",
            "-d",
            dataset_slug,
            "-p",
            str(download_dir),
            "--unzip",
        ],
        check=True,
    )
    return download_dir


def video_duration(path):
    capture = cv2.VideoCapture(str(path))
    if not capture.isOpened():
        return None
    try:
        fps = capture.get(cv2.CAP_PROP_FPS)
        frame_count = capture.get(cv2.CAP_PROP_FRAME_COUNT)
        return frame_count / fps if fps > 0 else None
    finally:
        capture.release()


def file_digest(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_annotations(path):
    if not path:
        return {}
    with Path(path).open(newline="", encoding="utf-8") as source:
        return {row["filename"]: row for row in csv.DictReader(source)}


def prepare_dataset(source_dir, output_dir, limit=20, annotations=None, seed=42):
    source_dir = Path(source_dir)
    output_dir = Path(output_dir)
    video_dir = output_dir / "videos"
    video_dir.mkdir(parents=True, exist_ok=True)
    annotation_rows = load_annotations(annotations)
    candidates = sorted(
        path for path in source_dir.rglob("*")
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS
    )

    selected = []
    seen_digests = set()
    skipped = []
    for path in candidates:
        if len(selected) >= limit:
            break
        duration = video_duration(path)
        if duration is None or duration > 60:
            skipped.append((path.name, "unreadable or longer than 60 seconds"))
            continue
        digest = file_digest(path)
        if digest in seen_digests:
            skipped.append((path.name, "duplicate file"))
            continue
        seen_digests.add(digest)
        selected.append((path, duration))

    if len(selected) < limit:
        raise ValueError(
            f"Only {len(selected)} valid unique videos found; {limit} required"
        )

    rows = []
    for index, (source, duration) in enumerate(selected, start=1):
        video_id = f"video_{index:03d}"
        destination = video_dir / f"{video_id}{source.suffix.lower()}"
        shutil.copy2(source, destination)
        annotation = annotation_rows.get(source.name, {})
        rows.append({
            "video_id": video_id,
            "filename": destination.name,
            "source_filename": source.name,
            "description": annotation.get("description", ""),
            "start_time": annotation.get("start_time", "0"),
            "end_time": annotation.get("end_time", f"{duration:.3f}"),
            "duration": f"{duration:.3f}",
        })

    rng = random.Random(seed)
    shuffled = rows[:]
    rng.shuffle(shuffled)
    split_at = int(len(shuffled) * 0.8)
    validation_at = int(len(shuffled) * 0.9)
    split_map = {
        row["video_id"]: "train" for row in shuffled[:split_at]
    }
    split_map.update({
        row["video_id"]: "validation"
        for row in shuffled[split_at:validation_at]
    })
    split_map.update({
        row["video_id"]: "test"
        for row in shuffled[validation_at:]
    })
    for row in rows:
        row["split"] = split_map[row["video_id"]]

    metadata_path = output_dir / "metadata.csv"
    with metadata_path.open("w", newline="", encoding="utf-8") as target:
        writer = csv.DictWriter(target, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)

    skipped_path = output_dir / "skipped.csv"
    with skipped_path.open("w", newline="", encoding="utf-8") as target:
        writer = csv.writer(target)
        writer.writerow(["filename", "reason"])
        writer.writerows(skipped)

    return metadata_path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", default="data/raw")
    parser.add_argument("--output-dir", default="data/dataset")
    parser.add_argument("--kaggle-dataset", help="Kaggle dataset slug, e.g. owner/name")
    parser.add_argument("--annotations")
    parser.add_argument("--limit", type=int, default=20)
    args = parser.parse_args()

    source_dir = Path(args.source_dir)
    if args.kaggle_dataset:
        source_dir = download_kaggle_dataset(
            args.kaggle_dataset,
            source_dir,
        )
    metadata = prepare_dataset(
        source_dir,
        args.output_dir,
        limit=args.limit,
        annotations=args.annotations,
    )
    print(f"Prepared dataset metadata: {metadata}")


if __name__ == "__main__":
    main()
