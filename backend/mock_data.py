"""Hand this to Siya so she can build the UI before the backend exists."""
MOCK_RESULT = {
    "clip_id": "clip_001", "start": 12.0, "end": 18.0, "percent": 81,
    "caption": "a person walking alone under streetlights",
    "thumbnail_url": "https://placehold.co/320x180", "video_url": "",
    "quality_flag": None,
}
MOCK_SEARCH = {"query": "person walking at night", "results": [MOCK_RESULT], "message": None}
MOCK_SCRIPT = {
    "truncated": False,
    "scenes": [
        {"scene_index": 0, "sentence": "Starting my own business was the biggest risk I took.",
         "results": [MOCK_RESULT]},
        {"scene_index": 1, "sentence": "Every morning I opened the shop at dawn.", "results": []},
    ],
}
