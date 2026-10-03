"""FastAPI application for B-roll upload, indexing and semantic search."""

import logging
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

logger = logging.getLogger("uvicorn.error")


MODEL_ERROR = None

try:
    from .ml import embed_video, search as ml_search

    EMBED_FN = embed_video
    SEARCH_FN = ml_search

except Exception as e:
    logger.exception("backend/ml.py failed to load; model disabled")

    EMBED_FN = None
    SEARCH_FN = None
    MODEL_ERROR = f"{type(e).__name__}: {e}"


app = FastAPI(
    title="B-roll Search API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()


class SearchRequest(BaseModel):
    query: str


class ScriptRequest(BaseModel):
    text: str


def _require_search():
    if SEARCH_FN is None:
        detail = "Search model is not connected yet."

        if MODEL_ERROR:
            detail += f" {MODEL_ERROR}"

        raise HTTPException(
            status_code=503,
            detail=detail,
        )

    return SEARCH_FN


@app.get("/health")
def health():
    return {
        "ok": True,
        "model_connected": SEARCH_FN is not None,
        "model_error": MODEL_ERROR,
    }


@app.post("/upload", response_model=UploadResponse)
def upload(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file was uploaded.",
        )

    with tempfile.NamedTemporaryFile(
        suffix=".zip",
        delete=False,
    ) as tmp:

        shutil.copyfileobj(file.file, tmp)
        tmp_path = Path(tmp.name)

    try:
        return process_upload(
            tmp_path,
            embed_fn=EMBED_FN,
        )

    except UploadError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )

    except Exception as e:
        logger.exception("Upload failed")

        raise HTTPException(
            status_code=500,
            detail=f"Upload failed: {type(e).__name__}: {e}",
        )

    finally:
        tmp_path.unlink(missing_ok=True)


@app.get("/status")
def status():
    """Return progress of the most recent upload."""

    with get_conn() as c:
        row = c.execute(
            """
            SELECT job_id, status, total, processed
            FROM jobs
            ORDER BY created_at DESC, rowid DESC
            LIMIT 1
            """
        ).fetchone()

    if row:
        return dict(row)

    return {
        "job_id": None,
        "status": "none",
        "total": 0,
        "processed": 0,
    }


@app.post("/search", response_model=SearchResponse)
def search(req: SearchRequest):
    query = (req.query or "").strip()

    if not query:
        raise HTTPException(
            status_code=400,
            detail="Please enter a search query.",
        )

    try:
        return search_clips(
            query,
            _require_search(),
        )

    except HTTPException:
        raise

    except Exception as e:
        logger.exception("Search failed")

        raise HTTPException(
            status_code=500,
            detail=f"Search failed: {type(e).__name__}: {e}",
        )


@app.post("/script", response_model=ScriptResponse)
def script(req: ScriptRequest):
    text = (req.text or "").strip()

    if not text:
        raise HTTPException(
            status_code=400,
            detail="Please paste a script.",
        )

    try:
        return search_script(
            text,
            _require_search(),
        )

    except HTTPException:
        raise

    except Exception as e:
        logger.exception("Script search failed")

        raise HTTPException(
            status_code=500,
            detail=f"Script search failed: {type(e).__name__}: {e}",
        )


@app.get("/videos/{clip_id}")
def video(clip_id: str):
    with get_conn() as c:
        row = c.execute(
            """
            SELECT video_path
            FROM clips
            WHERE clip_id=? AND status='ok'
            """,
            (clip_id,),
        ).fetchone()

    if not row:
        raise HTTPException(
            status_code=404,
            detail="Video not found.",
        )

    video_path = Path(row["video_path"])

    if not video_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Video file no longer exists.",
        )

    return FileResponse(
        str(video_path),
        media_type="video/mp4",
    )


@app.get("/thumbnails/{name}")
def thumbnail(name: str):
    stem = Path(name).stem

    clip_id, _, sec = stem.rpartition("_")

    if not clip_id or not sec.isdigit():
        raise HTTPException(
            status_code=404,
            detail="Bad thumbnail name.",
        )

    path = thumbnails.get_thumbnail(
        clip_id,
        int(sec),
    )

    if not path:
        raise HTTPException(
            status_code=404,
            detail="Thumbnail not available.",
        )

    return FileResponse(
        str(path),
        media_type="image/jpeg",
    )


@app.get("/serve_file")
def serve_file(path: str):
    p = Path(path)
    if not p.exists():
        raise HTTPException(404, "File not found")
    media_type = "video/mp4" if p.suffix.lower() in [".mp4", ".mov", ".mkv"] else "image/jpeg"
    return FileResponse(p, media_type=media_type)
