# B-roll AI Search

A small CLIP and FAISS prototype for finding timestamped b-roll with natural-language queries.

## Setup

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Put short, visually different clips in `data/videos/`. The current evaluation set contains `video1.mp4` and `video2.mp4`; add three to five genuinely different scenes before judging retrieval quality.

## Index and search

```powershell
python main.py index
python main.py search "A person using a laptop" --threshold 0.25
```

The same reusable functions are available from `ml.indexing` and `ml.search`. The index is rebuilt as a complete library and stored as FAISS vectors plus SQLite metadata under `data/index/`. Thumbnail paths are stored with each segment.

## Streamlit UI

```powershell
streamlit run app.py
```

The UI accepts a ZIP up to 500 MB, extracts at most 50 supported videos, rejects unsafe archive paths, indexes readable clips, and supports text and script search. Search results are limited to two segments per video and five total results.

## Threshold evaluation

`0.25` is a provisional cosine-similarity cutoff, not a probability. Record scores for matching queries and absent-scene queries, then validate a selected threshold on a separate set. When distributions overlap, present low-confidence suggestions rather than claiming a definitive no-match.

Suggested evaluation queries:

- A cat sitting
- A person running
- A car on a road
- A person using a laptop
- An underwater shark

## Architecture

```text
ZIP upload -> safe extraction -> OpenCV frame sampling -> CLIP embeddings
           -> segment grouping -> FAISS search + SQLite metadata -> Streamlit results
```

Known limitations: the current segmenter uses fixed-interval sampling, CLIP and optional captioning models are expensive to load, and the demo needs visually different source clips for meaningful quality evaluation.
