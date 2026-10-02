"""The API contract agreed in hour 1. Do not change without telling Krups and Siya."""
from typing import List, Optional
from pydantic import BaseModel


class SearchResult(BaseModel):
    clip_id: str
    start: float
    end: float
    percent: int
    caption: str = ""
    thumbnail_url: str = ""
    video_url: str = ""
    quality_flag: Optional[str] = None   # None | "blurry" | "dark"


class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]
    message: Optional[str] = None        # e.g. "No strong match found"


class SceneResult(BaseModel):
    scene_index: int
    sentence: str
    results: List[SearchResult]


class ScriptResponse(BaseModel):
    scenes: List[SceneResult]
    truncated: bool = False              # True if script had >20 sentences


class UploadResponse(BaseModel):
    job_id: str
    clips_indexed: int
    segments_indexed: int
    skipped: List[str] = []              # corrupt/unreadable files
