"""Regression tests for the reusable indexing and search pipeline."""
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase
from unittest.mock import patch

import numpy as np
from zipfile import ZipFile

from app import extract_video_zip, validate_videos
from ml.indexing import index_video
from ml.evaluation import (
    calibrate_threshold,
    evaluate_configurations,
    evaluate_query,
)
from ml.ranking import rank_results
from ml.script_processor import search_script
from ml.segment_builder import build_segments
from ml.reranking import frame_level_rerank
from ml.search import validate_query
from ml.search import _extract_activity, search_videos


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

    def test_zip_rejects_unsafe_paths(self):
        archive = BytesIO()
        with ZipFile(archive, "w") as zip_file:
            zip_file.writestr("../escape.mp4", b"video")
        archive.seek(0)

        with TemporaryDirectory() as directory:
            with self.assertRaises(ValueError):
                extract_video_zip(archive, directory)

    def test_validation_skips_long_and_corrupt_videos(self):
        paths = [Path("short.mp4"), Path("long.mp4"), Path("broken.mp4")]

        def extract(path, max_frames=1):
            if path.name == "short.mp4":
                return {"frames": [object()], "duration": 10.0}
            if path.name == "long.mp4":
                return {"frames": [object()], "duration": 61.0}
            raise OSError("corrupt")

        with patch("ml.video_processor.extract_video_frames", side_effect=extract):
            valid, skipped = validate_videos(paths)
        self.assertEqual(valid, [paths[0]])
        self.assertEqual(skipped, paths[1:])

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

    def test_text_input_is_limited_to_500_words(self):
        with self.assertRaises(ValueError):
            validate_query("word " * 501)

    def test_script_input_is_limited_to_500_words(self):
        with self.assertRaises(ValueError):
            search_script("word " * 501, lambda sentence: [])

    def test_activity_query_prefers_action_over_shared_subject(self):
        class FakeIndex:
            ntotal = 2

            def search(self, vector, count):
                if vector[0][0] > 0.9:
                    return (
                        np.array([[0.42, 0.08]], dtype=np.float32),
                        np.array([[1, 0]], dtype=np.int64),
                    )
                return (
                    np.array([[0.80, 0.78]], dtype=np.float32),
                    np.array([[0, 1]], dtype=np.int64),
                )

        metadata = [
            {
                "faiss_id": 0,
                "video_path": "walking.mp4",
                "filename": "walking.mp4",
                "start_time": 0.0,
                "end_time": 2.0,
            },
            {
                "faiss_id": 1,
                "video_path": "painting.mp4",
                "filename": "painting.mp4",
                "start_time": 0.0,
                "end_time": 2.0,
            },
        ]

        def encode(text, model=None):
            return np.array([1.0, 0.0] if text == "painting" else [0.8, 0.2])

        self.assertEqual(_extract_activity("a girl is doing painting"), "painting")
        with patch("ml.search.load_index", return_value=FakeIndex()), patch(
            "ml.search.get_all_segment_metadata", return_value=metadata
        ), patch("ml.search.encode_search_text", side_effect=encode):
            results = search_videos(
                "a girl is doing painting",
                top_k=2,
                rerank_frames=False,
                use_captions=False,
            )
        self.assertEqual(results[0]["filename"], "painting.mp4")

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

    def test_frame_reranking_prefers_best_frame(self):
        results = frame_level_rerank(
            [
                {
                    "video_path": "one.mp4",
                    "start_time": 0.0,
                    "end_time": 2.0,
                    "similarity": 0.4,
                },
                {
                    "video_path": "two.mp4",
                    "start_time": 0.0,
                    "end_time": 2.0,
                    "similarity": 0.5,
                },
            ],
            [1.0, 0.0],
            {
                "one.mp4": [(1.0, [1.0, 0.0])],
                "two.mp4": [(1.0, [0.0, 1.0])],
            },
            weight=0.5,
        )
        self.assertEqual(results[0]["video_path"], "one.mp4")

    def test_configuration_evaluation_rebuilds_each_configuration(self):
        built = []
        rows = [{
            "query": "person walking",
            "video_id": "video_001",
            "start_time": "0",
            "end_time": "2",
        }]

        def build_index(**configuration):
            built.append(configuration)

        def search(query, top_k=5, threshold=0.0):
            return [{
                "video_id": "video_001",
                "start_time": 0.0,
                "end_time": 2.0,
            }]

        reports = evaluate_configurations(
            rows,
            build_index,
            search,
            [{"frame_interval": 1.0}, {"frame_interval": 2.0}],
        )
        self.assertEqual(len(reports), 2)
        self.assertEqual(built[1]["frame_interval"], 2.0)


if __name__ == "__main__":
    import unittest

    unittest.main()
