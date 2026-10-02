# Demo and Integration Checklist

## Run the demo

```powershell
.\.venv\Scripts\Activate.ps1
streamlit run app.py
```

Upload a ZIP containing supported video files. The application rejects unsafe archive paths, corrupt videos, duplicate files, and videos longer than 60 seconds. Indexing reports progress while thumbnails, cached embeddings, FAISS vectors, and SQLite metadata are created.

## Search modes

- Use Text Search for a natural-language visual description.
- Use Script Search for narration. Each sentence becomes an independent scene query.
- Results include the matching video, timestamp range, thumbnail, similarity score, and native video preview starting at the match.

## Evaluation

Create a labeled CSV with `query,video_id,start_time,end_time`, then run:

```powershell
python tools/evaluate_search.py data/evaluation_queries.csv --calibrate
python tools/evaluate_configurations.py data/videos data/evaluation_queries.csv --overlap
python tools/benchmark_ingestion.py data/videos --query "a person walking" --runs 5
```

The evaluation requires a real labeled library. Do not report CLIP quality metrics until the 20-video dataset has been prepared and indexed.