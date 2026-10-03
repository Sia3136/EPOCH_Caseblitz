"""H5: FastAPI app. Run: uvicorn backend.main:app --reload"""
import shutil
import tempfile
import uuid
import urllib.parse
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from .schemas import ScriptResponse, SearchResponse, UploadResponse, SearchResult, SceneResult

# Import directly from the new ML packages that Krups wrote!
from ml.indexing import index_video, unique_video_paths
from ml.search import search_videos
from ml.script_processor import search_script
from ml.storage import save_library

import app as streamlit_app

app = FastAPI(title="B-roll Search API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

JOB_STATUS = {"job_id": None, "status": "none", "total": 0, "processed": 0}
SEARCH_FN = search_videos
CLIP_FILES = {}
THUMB_FILES = {}

class SearchRequest(BaseModel):
    query: str

class ScriptRequest(BaseModel):
    text: str

@app.get("/health")
def health():
    return {"ok": True, "model_connected": True}

@app.post("/upload", response_model=UploadResponse)
def upload(file: UploadFile = File(...)):
    global JOB_STATUS
    job_id = uuid.uuid4().hex[:8]
    
    with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = Path(tmp.name)
        
    try:
        paths = streamlit_app.extract_video_zip(tmp_path)
        valid, skipped = streamlit_app.validate_videos(paths)
        unique = unique_video_paths(valid)
        
        if not unique:
            raise ValueError("The ZIP contains no readable videos")
            
        JOB_STATUS = {"job_id": job_id, "status": "processing", "total": len(unique), "processed": 0}
        
        segments = []
        for index, path in enumerate(unique, start=1):
            clip_id = f"{job_id}_{index:03d}"
            indexed = index_video(path)
            CLIP_FILES[clip_id] = path
            if indexed and indexed[0].get("thumbnail_path"):
                THUMB_FILES[f"{clip_id}_1.jpg"] = Path(indexed[0]["thumbnail_path"])
            segments.extend(indexed)
            JOB_STATUS["processed"] = index
            
        save_library(segments)
        JOB_STATUS["status"] = "done"
        
        return UploadResponse(
            job_id=job_id,
            clips_indexed=len(unique),
            segments_indexed=len(segments),
            skipped=[str(Path(p).name) for p in skipped]
        )
    except Exception as e:
        JOB_STATUS["status"] = "error"
        raise HTTPException(400, str(e))
    finally:
        tmp_path.unlink(missing_ok=True)

@app.get("/status")
def status():
    return JOB_STATUS

def format_result(r):
    # Check if explanation contains caption (app.py does: f"Context: {result['caption']}")
    caption = r.get("caption") or r.get("explanation", "")
    
    return SearchResult(
        clip_id=r["segment_id"],
        start=float(r["start_time"]),
        end=float(r["end_time"]),
        percent=int(r["similarity"] * 100) if "similarity" in r else int(r.get("confidence_score", 0)),
        caption=caption,
        thumbnail_url=f"/serve_file?path={urllib.parse.quote(r.get('thumbnail_path', ''))}" if r.get('thumbnail_path') else "",
        video_url=f"/serve_file?path={urllib.parse.quote(r['video_path'])}"
    )

@app.post("/search", response_model=SearchResponse)
def search(req: SearchRequest):
    if not req.query.strip():
        raise HTTPException(400, "Please enter a search query.")
    if SEARCH_FN is None:
        raise HTTPException(503, "Search model is not connected yet.")
        
    try:
        raw_results = SEARCH_FN(req.query.strip(), 20) if SEARCH_FN is not search_videos else search_videos(req.query.strip())
        if raw_results and isinstance(raw_results[0], tuple):
            clip_id = next(iter(CLIP_FILES), "unknown")
            raw_results = [{"segment_id": clip_id, "start_time": 0.0, "end_time": 2.0, "similarity": raw_results[0][1], "video_path": str(CLIP_FILES.get(clip_id, ""))}]
        results = [format_result(r) for r in raw_results]
        return SearchResponse(
            query=req.query,
            results=results,
            message=None if results else "No strong match found for this query"
        )
    except Exception as e:
        raise HTTPException(500, f"Search failed: {e}")

@app.post("/script", response_model=ScriptResponse)
def script(req: ScriptRequest):
    if not req.text.strip():
        raise HTTPException(400, "Please paste a script.")
        
    try:
        def script_search(sentence):
            if SEARCH_FN is search_videos:
                return search_videos(sentence)
            hits = SEARCH_FN(sentence, 20)
            if hits and isinstance(hits[0], tuple):
                clip_id = next(iter(CLIP_FILES), "unknown")
                return [{"segment_id": clip_id, "start_time": 0.0, "end_time": 2.0, "similarity": hits[0][1], "video_path": str(CLIP_FILES.get(clip_id, ""))}]
            return hits
        ml_res = search_script(req.text.strip(), script_search)
        scenes = []
        for scene in ml_res["scenes"]:
            scenes.append(SceneResult(
                scene_index=scene["scene_index"],
                sentence=scene["sentence"],
                results=[format_result(r) for r in scene["results"]]
            ))
        return ScriptResponse(
            scenes=scenes,
            truncated=ml_res.get("truncated", False)
        )
    except Exception as e:
        raise HTTPException(500, f"Script search failed: {e}")

@app.get("/serve_file")
def serve_file(path: str):
    p = Path(path)
    if not p.exists():
        raise HTTPException(404, "File not found")
    media_type = "video/mp4" if p.suffix.lower() in [".mp4", ".mov", ".mkv"] else "image/jpeg"
    return FileResponse(p, media_type=media_type)


@app.get("/videos/{clip_id}")
def video(clip_id: str):
    path = CLIP_FILES.get(clip_id)
    if not path or not Path(path).exists():
        raise HTTPException(404, "Video not found")
    return FileResponse(path, media_type="video/mp4")


@app.get("/thumbnails/{name}")
def thumbnail(name: str):
    path = THUMB_FILES.get(name)
    if not path or not path.exists():
        raise HTTPException(404, "Thumbnail not found")
    return FileResponse(path, media_type="image/jpeg")