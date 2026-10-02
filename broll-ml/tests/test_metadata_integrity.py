
import sqlite3

from ml.storage import load_index, DB_PATH

index = load_index()

with sqlite3.connect(DB_PATH) as conn:
    rows = conn.execute("""
        SELECT faiss_id, filename, start_time, end_time
        FROM segments
        ORDER BY faiss_id
    """).fetchall()

print("FAISS vectors:", index.ntotal)
print("Metadata rows:", len(rows))

assert index.ntotal == len(rows), "Vector and metadata counts do not match!"

faiss_ids = [row[0] for row in rows]

assert len(set(faiss_ids)) == len(faiss_ids), "Duplicate FAISS IDs found!"
assert sorted(faiss_ids) == list(range(index.ntotal)), "FAISS IDs are missing or out of sequence!"

for faiss_id, filename, start, end in rows:
    print(
        f"ID {faiss_id} | {filename} | "
        f"{start:.1f}s - {end:.1f}s"
    )

print("\nMetadata integrity test passed!")