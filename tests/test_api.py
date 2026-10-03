import zipfile
import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from backend import db, main, thumbnails, upload


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "t.db")
    monkeypatch.setattr(upload, "VIDEO_DIR", tmp_path / "videos")
    monkeypatch.setattr(thumbnails, "THUMB_DIR", tmp_path / "thumbs")
    db.init_db()
    return TestClient(main.app)


def make_zip(tmp_path):
    vp = tmp_path / "good.mp4"
    w = cv2.VideoWriter(str(vp), cv2.VideoWriter_fourcc(*"mp4v"), 10, (64, 64))
    for _ in range(30):
        w.write(np.random.randint(0, 255, (64, 64, 3), dtype=np.uint8))
    w.release()
    zp = tmp_path / "lib.zip"
    with zipfile.ZipFile(zp, "w") as z:
        z.write(vp, "good.mp4")
    return zp


def test_health(client):
    assert client.get("/health").status_code == 200


def test_search_503_when_model_missing(client, monkeypatch):
    monkeypatch.setattr(main, "SEARCH_FN", None)
    assert client.post("/search", json={"query": "a dog"}).status_code == 503


def test_upload_bad_zip_is_400(client, tmp_path):
    r = client.post("/upload", files={"file": ("x.zip", b"nope")})
    assert r.status_code == 400 and "zip" in r.json()["detail"].lower()


def test_upload_search_video_thumbnail(client, tmp_path, monkeypatch):
    with open(make_zip(tmp_path), "rb") as f:
        r = client.post("/upload", files={"file": ("lib.zip", f)})
    assert r.status_code == 200 and r.json()["clips_indexed"] == 1
    clip_id = f"{r.json()['job_id']}_001"

    assert client.get("/status").json()["status"] == "done"
    assert client.get(f"/videos/{clip_id}").status_code == 200
    assert client.get(f"/thumbnails/{clip_id}_1.jpg").headers["content-type"] == "image/jpeg"
    assert client.get("/videos/nope").status_code == 404

    # fake model: give the stub segments faiss positions, then search
    with db.get_conn() as c:
        c.execute("UPDATE segments SET faiss_pos = segment_id")
    monkeypatch.setattr(main, "SEARCH_FN", lambda q, k: [(1, 0.33)])
    res = client.post("/search", json={"query": "anything here"}).json()
    assert res["results"][0]["clip_id"] == clip_id

    sc = client.post("/script", json={"text": "A person walks down the street."}).json()
    assert len(sc["scenes"]) == 1
    assert client.post("/script", json={"text": "  "}).status_code == 400
