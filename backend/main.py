"""H5: FastAPI app.  Run:  uvicorn backend.main:app --reload   then open /docs"""
import shutil
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from . import thumbnails
from .db import get_conn, init_db
from .schemas import ScriptResponse, SearchResponse, UploadResponse
from .search import search_clips, search_script
from .upload import process_upload
from .zip_utils import UploadError

# Krups's module: backend/ml.py must expose embed_video(path, clip_id) and search(query, k).
MODEL_ERROR = None
try:
    from .ml import embed_video as EMBED_FN, search as SEARCH_FN
except Exception as e:                      # not just ImportError: missing files etc. must be visible
    import logging
    logging.getLogger("uvicorn.error").exception("backend/ml.py failed to load; model disabled")
    EMBED_FN = SEARCH_FN = None
    MODEL_ERROR = f"{type(e).__name__}: {e}"

app = FastAPI(title="B-roll Search API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
init_db()


class SearchRequest(BaseModel):
    query: str


class ScriptRequest(BaseModel):
    text: str


def _require_search():
    if SEARCH_FN is None:
        raise HTTPException(503, "Search model is not connected yet (backend/ml.py missing).")
    return SEARCH_FN


@app.get("/health")
def health():
    return {"ok": True, "model_connected": SEARCH_FN is not None, "model_error": MODEL_ERROR}


@app.post("/upload", response_model=UploadResponse)
def upload(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = Path(tmp.name)
    try:
        return process_upload(tmp_path, embed_fn=EMBED_FN)
    except UploadError as e:
        raise HTTPException(400, str(e))
    finally:
        tmp_path.unlink(missing_ok=True)


@app.get("/status")
def status():
    """Progress of the most recent upload. Frontend polls this while /upload is running."""
    with get_conn() as c:
        row = c.execute("SELECT job_id, status, total, processed FROM jobs "
                        "ORDER BY created_at DESC, rowid DESC LIMIT 1").fetchone()
    return dict(row) if row else {"job_id": None, "status": "none", "total": 0, "processed": 0}


@app.post("/search", response_model=SearchResponse)
def search(req: SearchRequest):
    return search_clips(req.query, _require_search())


@app.post("/script", response_model=ScriptResponse)
def script(req: ScriptRequest):
    if not req.text.strip():
        raise HTTPException(400, "Please paste a script.")
    return search_script(req.text, _require_search())


@app.get("/videos/{clip_id}")
def video(clip_id: str):
    with get_conn() as c:
        row = c.execute("SELECT video_path FROM clips WHERE clip_id=? AND status='ok'",
                        (clip_id,)).fetchone()
    if not row or not Path(row["video_path"]).exists():
        raise HTTPException(404, "Video not found")
    return FileResponse(row["video_path"], media_type="video/mp4")


@app.get("/thumbnails/{name}")
def thumbnail(name: str):
    stem = Path(name).stem                      # "{clip_id}_{second}"
    clip_id, _, sec = stem.rpartition("_")
    if not clip_id or not sec.isdigit():
        raise HTTPException(404, "Bad thumbnail name")
    path = thumbnails.get_thumbnail(clip_id, int(sec))
    if not path:
        raise HTTPException(404, "Thumbnail not available")
    return FileResponse(path, media_type="image/jpeg")