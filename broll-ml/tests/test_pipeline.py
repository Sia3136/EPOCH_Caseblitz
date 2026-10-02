"""Regression tests for the reusable indexing and search pipeline."""
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase
from zipfile import ZipFile

from app import extract_video_zip
from ml.indexing import index_video
from ml.ranking import rank_results
from ml.script_processor import search_script


class PipelineTests(TestCase):
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


if __name__ == "__main__":
    import unittest

    unittest.main()
