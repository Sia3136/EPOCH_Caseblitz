"""Checks that Krups's backend/ml.py and your SQLite DB agree. Run from the project root
AFTER uploading a zip through /upload (so the index and DB are both filled):

    python -m scripts.check_integration
"""
import time
import traceback

import numpy as np

from backend.db import get_conn

QUERY = "a person walking"
problems = []


def check(ok, good, bad):
    print(("  OK   " if ok else "  FAIL ") + (good if ok else bad))
    if not ok:
        problems.append(bad)


print("1. Loading backend/ml.py")
try:
    from backend.ml import _get_models, search
    clip, store = _get_models()
    print("  OK   model and index loaded")
except Exception:
    traceback.print_exc()
    raise SystemExit("\nFAIL: ml.py could not load. Fix the error above first.")

print("2. Index vs database")
n = store.index.ntotal
with get_conn() as c:
    pos = sorted(r[0] for r in c.execute("SELECT faiss_pos FROM segments WHERE faiss_pos IS NOT NULL"))
print(f"       FAISS vectors: {n}   DB segments with faiss_pos: {len(pos)}")
check(n > 0, "index has vectors", "index is EMPTY: upload a zip first")
check(len(pos) == n, "counts match",
      "counts differ: delete data/broll.db AND data/index/ together, then re-upload")
check(pos == list(range(len(pos))), "faiss_pos values are 0..N-1 with no gaps",
      "faiss_pos has gaps or duplicates: DB and index are out of sync")

print("3. Search result format")
raw = store.search(clip.encode_text(QUERY), top_k=3)
keys = sorted(raw[0].keys()) if raw else []
print(f"       keys in a raw VectorStore result: {keys}")
check("faiss_id" in keys, "results carry 'faiss_id'",
      "results have NO 'faiss_id': ml.search() falls back to the rank (0,1,2..) which maps to the WRONG "
      "segments. Make VectorStore.search return the real FAISS id.")

print("4. Scores")
t = time.time()
hits = search(QUERY, 20)
print(f"       search took {time.time() - t:.2f}s, returned {len(hits)} hits")
scores = [s for _, s in hits]
check(scores == sorted(scores, reverse=True), "scores sorted high to low", "scores are not sorted")
check(all(-1.01 <= s <= 1.01 for s in scores), "scores look like cosine similarity (-1..1)",
      "scores outside -1..1: embeddings are probably not normalised")
norm = float(np.linalg.norm(np.asarray(clip.encode_text(QUERY)).ravel()))
check(abs(norm - 1) < 0.01, "text embedding is unit length", f"text embedding norm is {norm:.2f}, not 1")
if scores:
    print(f"       raw score range: {min(scores):.3f} to {max(scores):.3f}  <- use this to set MIN/MAX_SCORE")

print("5. Every hit maps back to a clip")
with get_conn() as c:
    for p, s in hits[:5]:
        row = c.execute("SELECT clip_id, start_time, end_time FROM segments WHERE faiss_pos=?", (p,)).fetchone()
        print(f"       pos {p:>4}  score {s:.3f}  ->  " + (f"{row['clip_id']} {row['start_time']:.0f}-{row['end_time']:.0f}s" if row else "NOT IN DB"))
        if not row:
            problems.append(f"faiss_pos {p} not in database")

print("\n" + ("ALL GOOD" if not problems else f"{len(problems)} PROBLEM(S) FOUND, see FAIL lines above"))