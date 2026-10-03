"""Reusable, fast tests for the b-roll pipeline components."""
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase

import numpy as np
import cv2

from ml.indexing import unique_video_paths
from ml.segment_builder import build_segments
from ml.video_processor import assess_frame_quality, extract_video_frames


class ComponentTests(TestCase):
    def test_duplicate_video_files_are_removed_by_content(self):
        with TemporaryDirectory() as directory:
            first = Path(directory) / "first.mp4"
            second = Path(directory) / "second.mp4"
            first.write_bytes(b"same")
            second.write_bytes(b"same")
            self.assertEqual(unique_video_paths([first, second]), [first])

    def test_segment_embeddings_are_normalized(self):
        segments = build_segments([
            {"timestamp": 0.0, "embedding": [3.0, 0.0]},
            {"timestamp": 1.0, "embedding": [0.0, 4.0]},
        ], group_size=2, frame_interval=1.0, duration=2.0)
        self.assertTrue(np.isclose(np.linalg.norm(segments[0]["embedding"]), 1.0))

    def test_unreadable_video_returns_empty_extraction(self):
        with TemporaryDirectory() as directory:
            result = extract_video_frames(Path(directory) / "missing.mp4")
            self.assertEqual(result["frames"], [])
            self.assertEqual(result["duration"], 0.0)

    def test_quality_analysis_flags_dark_low_contrast_frame(self):
        frame = np.zeros((32, 32, 3), dtype=np.uint8)
        quality = assess_frame_quality(frame)
        self.assertIn("too_dark", quality["issues"])
        self.assertIn("low_contrast", quality["issues"])

    def test_quality_analysis_flags_blurry_frame(self):
        textured = np.zeros((64, 64), dtype=np.uint8)
        textured[:, 32:] = 255
        blurred = cv2.GaussianBlur(textured, (15, 15), 0)
        frame = np.repeat(blurred[:, :, None], 3, axis=2)
        quality = assess_frame_quality(frame, blur_threshold=35.0)
        self.assertIn("blurry", quality["issues"])