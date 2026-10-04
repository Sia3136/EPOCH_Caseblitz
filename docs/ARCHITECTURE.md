# Canonical Project Structure

The repository root is the single runnable application. Do not run files from the legacy `broll-ml/` folder.

```text
app.py                 Streamlit UI and upload/search workflow
backend/               Optional FastAPI API layer
ml/                    Canonical ingestion, CLIP, FAISS, SQLite, and search code
data/                  Canonical videos, thumbnails, and saved indexes
frontend/              Optional frontend client
run.py                 FastAPI launcher
requirements.txt       Root environment dependencies
```

## Run the demo

From the repository root, using the project virtual environment:

```powershell
.\.venv\Scripts\Activate.ps1
python -m streamlit run app.py
```

The Streamlit UI calls the root `ml` package directly. Upload a ZIP, index the videos, then search or paste a script.

## Run the API

```powershell
python run.py --no-reload
```

The API is optional; it shares the root `ml` package and the root `data` storage.

The nested `broll-ml/` directory is retained only as legacy source/data history. Its duplicate app entry points were removed so there is one canonical application path.
