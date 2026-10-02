from backend.postprocess import (split_script, similarity_to_percentage, add_percent,
                                 filter_by_threshold, dedup_by_clip, postprocess)


# ---- splitter ----
def test_split_basic():
    s, t = split_script("I opened the shop at dawn. The street was empty! Was it worth it?")
    assert len(s) == 3 and not t


def test_split_skips_short_fragments():
    s, _ = split_script("He smiled. The crowd filled the busy market square.")
    assert s == ["The crowd filled the busy market square."]


def test_split_caps_at_20():
    text = " ".join(f"This is test sentence number {i}." for i in range(25))
    s, t = split_script(text)
    assert len(s) == 20 and t


def test_split_empty():
    assert split_script("") == ([], False)
    assert split_script("   \n ") == ([], False)


def test_split_newlines():
    s, _ = split_script("First line of the script here\nSecond line of the script here")
    assert len(s) == 2


# ---- percent ----
def test_percent_bounds():
    assert similarity_to_percentage(0.15) == 0
    assert similarity_to_percentage(0.35) == 100
    assert similarity_to_percentage(0.25) == 50


def test_percent_clamps():
    assert similarity_to_percentage(0.05) == 0
    assert similarity_to_percentage(0.9) == 100


# ---- threshold ----
def test_threshold():
    hits = add_percent([{"clip_id": "a", "start": 0, "end": 4, "score": 0.30},
                        {"clip_id": "b", "start": 0, "end": 4, "score": 0.16}])
    kept = filter_by_threshold(hits)
    assert [h["clip_id"] for h in kept] == ["a"]


def test_threshold_all_below_gives_empty():
    hits = add_percent([{"clip_id": "a", "start": 0, "end": 4, "score": 0.15}])
    assert filter_by_threshold(hits) == []


# ---- dedup ----
def test_dedup_max_two_per_clip():
    hits = [{"clip_id": "a", "start": i, "end": i + 4, "percent": 90 - i} for i in range(5)]
    hits.append({"clip_id": "b", "start": 0, "end": 4, "percent": 40})
    out = dedup_by_clip(hits)
    assert [h["clip_id"] for h in out].count("a") == 2
    assert any(h["clip_id"] == "b" for h in out)


def test_dedup_keeps_best_first():
    hits = [{"clip_id": "a", "start": 0, "end": 4, "percent": 50},
            {"clip_id": "a", "start": 4, "end": 8, "percent": 80},
            {"clip_id": "a", "start": 8, "end": 12, "percent": 60}]
    out = dedup_by_clip(hits)
    assert [h["percent"] for h in out] == [80, 60]


# ---- full chain ----
def test_postprocess_chain():
    hits = [{"clip_id": "a", "start": i, "end": i + 4, "score": 0.34 - i * 0.01} for i in range(4)]
    hits.append({"clip_id": "b", "start": 0, "end": 4, "score": 0.20})   # ~25%, filtered out
    out = postprocess(hits, k=5)
    assert len(out) == 2 and all(h["clip_id"] == "a" for h in out)
    assert out[0]["percent"] >= out[1]["percent"]
