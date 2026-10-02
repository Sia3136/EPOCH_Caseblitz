import pytest
from backend import db
from backend.search import search_clips, search_script, NO_MATCH_MSG, EMPTY_QUERY_MSG


@pytest.fixture(autouse=True)
def fake_db(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "t.db")
    db.init_db()
    with db.get_conn() as c:
        c.execute("INSERT INTO jobs (job_id) VALUES ('j')")
        for clip in ("A", "B"):
            c.execute("INSERT INTO clips (clip_id, job_id, filename, video_path) VALUES (?,?,?,?)",
                      (clip, "j", f"{clip}.mp4", f"/x/{clip}.mp4"))
        # faiss_pos 0-3 -> clip A (4 segments), 4 -> clip B
        for pos in range(5):
            clip = "A" if pos < 4 else "B"
            c.execute("INSERT INTO segments (clip_id, start_time, end_time, faiss_pos) VALUES (?,?,?,?)",
                      (clip, pos * 6.0, pos * 6.0 + 6.0, pos))


def good_search(query, k):
    # A dominates with 4 strong hits, B has one decent hit (raw CLIP-like scores)
    return [(0, 0.34), (1, 0.33), (2, 0.32), (3, 0.31), (4, 0.28)]


def weak_search(query, k):
    return [(0, 0.16), (4, 0.15)]


def test_dedup_and_order():
    r = search_clips("a person walking", good_search)
    assert r.message is None
    assert [x.clip_id for x in r.results] == ["A", "A", "B"]   # max 2 of A, then B
    assert r.results[0].percent >= r.results[1].percent >= r.results[2].percent
    assert r.results[0].start == 0.0 and r.results[0].end == 6.0


def test_no_match_message():
    r = search_clips("something absurd", weak_search)
    assert r.results == [] and r.message == NO_MATCH_MSG


def test_empty_query():
    r = search_clips("   ", good_search)
    assert r.results == [] and r.message == EMPTY_QUERY_MSG


def test_script_mode():
    text = "He smiled. A person walks down the empty street. The market was full of people."
    r = search_script(text, good_search)
    assert [s.scene_index for s in r.scenes] == [0, 1]        # "He smiled." skipped
    assert all(len(s.results) == 3 for s in r.scenes)
    assert r.truncated is False


def test_script_truncation_flag():
    text = " ".join(f"This is test sentence number {i}." for i in range(25))
    r = search_script(text, good_search)
    assert len(r.scenes) == 20 and r.truncated is True
