"""Regression tests for the reusable indexing and search pipeline."""
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase
from zipfile import ZipFile

from app import extract_video_zip
from ml.indexing import index_video
from ml.evaluation import calibrate_threshold, evaluate_query
from ml.ranking import rank_results
from ml.script_processor import search_script
from ml.segment_builder import build_segments


class PipelineTests(TestCase):
    def test_segment_end_covers_sampled_frame_window(self):
        segments = build_segments(
            [
                {"timestamp": 0.0, "embedding": [1.0, 0.0]},
                {"timestamp": 2.0, "embedding": [1.0, 0.0]},
            ],
            group_size=2,
            frame_interval=2.0,
            duration=3.5,
        )
        self.assertEqual(segments[0]["start_time"], 0.0)
        self.assertEqual(segments[0]["end_time"], 3.5)

    def test_overlapping_segments_use_configured_stride(self):
        segments = build_segments(
            [
                {"timestamp": 0.0, "embedding": [1.0, 0.0]},
                {"timestamp": 2.0, "embedding": [1.0, 0.0]},
                {"timestamp": 4.0, "embedding": [0.0, 1.0]},
            ],
            group_size=2,
            frame_interval=2.0,
            duration=6.0,
            stride=1,
        )
        self.assertEqual(len(segments), 3)
        self.assertEqual(segments[1]["start_time"], 2.0)

    def test_zip_extracts_only_supported_videos(self):
        archive = BytesIO()
        with ZipFile(archive, "w") as zip_file:
            zip_file.writestr("nested/readme.txt", "ignored")
            zip_file.writestr("nested/clip.mp4", b"video")
        archive.seek(0)

        with TemporaryDirectory() as directory:
            paths = extract_video_zip(archive, directory)
            self.assertEqual(len(paths), 1)
            self.assertEqual(paths[0].suffix, ".mp4")
            self.assertTrue(paths[0].is_relative_to(Path(directory).resolve()))

    def test_unreadable_video_is_skipped(self):
        with TemporaryDirectory() as directory:
            path = Path(directory) / "broken.mp4"
            path.write_bytes(b"not a video")
            self.assertEqual(index_video(path), [])

    def test_ranking_supports_saved_metadata(self):
        results = rank_results([
            {"video_path": "one.mp4", "similarity": 0.3},
            {"video_path": "one.mp4", "similarity": 0.29},
            {"video_path": "two.mp4", "similarity": 0.28},
        ], threshold=0, max_results=5)
        self.assertEqual(len(results), 3)
        self.assertEqual(results[0]["video_path"], "one.mp4")

    def test_script_search_uses_search_callback(self):
        calls = []

        def search(sentence):
            calls.append(sentence)
            return []

        result = search_script(
            "A person runs outside. A car drives quickly.",
            search,
        )
        self.assertEqual(len(result["scenes"]), 2)
        self.assertEqual(len(calls), 2)

    def test_evaluation_uses_video_id_and_temporal_overlap(self):
        def search(query, top_k=5, threshold=0.0):
            return [{
                "video_id": "video_001",
                "start_time": 2.0,
                "end_time": 6.0,
                "similarity": 0.8,
            }]

        metrics = evaluate_query(
            "person walking",
            {
                "video_id": "video_001",
                "start_time": "3",
                "end_time": "5",
            },
            search,
        )
        self.assertEqual(metrics["recall_at_k"], 1.0)
        self.assertEqual(metrics["mrr"], 1.0)
        self.assertEqual(metrics["temporal_iou"], 0.5)

    def test_threshold_calibration_prefers_higher_recall(self):
        rows = [{
            "query": "person walking",
            "video_id": "video_001",
            "start_time": "0",
            "end_time": "2",
        }]

        def search(query, top_k=5, threshold=0.0):
            return [] if threshold > 0.5 else [{
                "video_id": "video_001",
                "start_time": 0.0,
                "end_time": 2.0,
            }]

        self.assertEqual(
            calibrate_threshold(rows, search, thresholds=[0.0, 0.75])["threshold"],
            0.0,
        )


if __name__ == "__main__":
    import unittest

    unittest.main()
