# EPOCH CaseBlitz — AI-Powered B-Roll Search Engine

EPOCH CaseBlitz is an AI-powered B-roll search system that helps users quickly find relevant video footage using natural-language queries.

Instead of manually going through a large collection of videos, users can upload multiple B-roll clips and search for the footage they need using descriptions such as:

- "a woman walking outdoors"
- "a cat resting on a couch"
- "water near a beach"
- "a person painting"

The system processes the uploaded videos, creates visual embeddings, indexes them using FAISS, and returns the most relevant video segments along with timestamps, similarity scores, thumbnails, captions, and video links.

---

## Team

| Name | Role |
|------|------|
| **Siya Rozani** | Frontend & UI Integration |
| **Krupa Mehta** | Machine Learning & Video Retrieval |
| **Kavya Chauhan** | Backend & API Integration |

---

## Key Features

- Upload multiple video clips through a ZIP file
- Automatic video validation and processing
- Video frame extraction
- AI-based visual embeddings using CLIP
- FAISS-based similarity search
- Natural-language B-roll search
- Ranked search results
- Similarity percentage for each result
- Automatic video segmentation
- Automatic thumbnail generation
- Video retrieval using clip IDs
- AI-generated captions for retrieved footage
- Script-based B-roll search
- Upload progress tracking
- SQLite-based metadata and segment storage
- REST API built using FastAPI
- Interactive API documentation through Swagger/OpenAPI

---

## How It Works

The system follows the pipeline below:

```text
                         USER
                           │
                           ▼
                  ┌─────────────────┐
                  │ Upload B-roll   │
                  │   ZIP File      │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ FastAPI Backend │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ Video Processing│
                  │ & Frame         │
                  │ Extraction      │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ CLIP Image      │
                  │ Embeddings      │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ FAISS Vector    │
                  │ Index           │
                  └────────┬────────┘
                           │
                           │
              ┌────────────┴────────────┐
              │                         │
              │      SEARCH QUERY       │
              │                         │
              ▼                         ▼
       ┌───────────────┐       ┌────────────────┐
       │ User enters   │       │ CLIP Text      │
       │ natural       │──────▶│ Embedding      │
       │ language      │       └───────┬────────┘
       └───────────────┘               │
                                       ▼
                              ┌────────────────┐
                              │ FAISS Similarity│
                              │ Search         │
                              └───────┬────────┘
                                      │
                                      ▼
                              ┌────────────────┐
                              │ Ranked B-roll  │
                              │ Results        │
                              └───────┬────────┘
                                      │
                                      ▼
                              ┌────────────────┐
                              │ Thumbnail +    │
                              │ Video +        │
                              │ Timestamp +    │
                              │ Caption        │
                              └────────────────┘
```

---

# Backend

The backend is responsible for handling uploads, processing requests, managing metadata, performing search orchestration, and serving videos and thumbnails.

## Backend Structure

```text
backend/
│
├── main.py
├── db.py
├── config.py
├── schemas.py
├── search.py
├── upload.py
├── thumbnails.py
└── zip_utils.py
```

### `main.py`

The main FastAPI application.

It provides endpoints for:

* Health checks
* Video ZIP uploads
* Upload progress
* B-roll search
* Script search
* Video retrieval
* Thumbnail retrieval

### `upload.py`

Handles the complete upload pipeline:

```text
ZIP Validation
      ↓
Safe Extraction
      ↓
Video Detection
      ↓
Video Validation
      ↓
ML Processing
      ↓
Segment Storage
      ↓
Upload Status Update
```

### `db.py`

Manages the SQLite database containing:

* Upload jobs
* Video clips
* Video segments
* FAISS positions
* Processing status
* Error information

### `search.py`

Acts as the backend search orchestration layer.

It:

1. Receives the search query.
2. Sends it to the ML search function.
3. Retrieves FAISS results.
4. Maps FAISS positions to video segments.
5. Applies post-processing.
6. Converts results into the API response format.

### `thumbnails.py`

Generates thumbnails dynamically from the requested video timestamp and caches them for later requests.

### `schemas.py`

Defines the API response structures using Pydantic.

---

# Machine Learning Pipeline

The ML pipeline is responsible for understanding the visual content of B-roll videos and matching it with natural-language queries.

## ML Structure

```text
ml/
│
├── __init__.py
├── clip_model.py
├── captioner.py
├── frame_extractor.py
├── metadata.py
├── ranking.py
├── script_processor.py
├── search.py
├── segment_builder.py
├── storage.py
└── vector_store.py
```

### CLIP Embeddings

The system uses CLIP to create embeddings for both:

* Video frames
* User search queries

This allows a natural-language query to be compared against the visual content of the available B-roll.

Example:

```text
Query:
"a woman walking outdoors"

        ↓

CLIP Text Embedding

        ↓

FAISS Similarity Search

        ↓

Relevant Video Segments
```

### Frame Extraction

Video frames are sampled at intervals and converted into a format suitable for CLIP processing.

### Segment Building

Extracted frame embeddings are grouped together to form representative video segments.

### Vector Store

FAISS is used to efficiently perform similarity searches over the generated embeddings.

### Captioning

The system uses the BLIP image-captioning model to generate descriptions for selected frames.

Example:

```text
Input:
Video frame showing a cat on a couch

Output:
"a cat is laying on a pink couch"
```

### Ranking

Search results are ranked according to their similarity to the user's query before being returned to the backend.

---

# API Endpoints

| Method | Endpoint             | Description                                  |
| ------ | -------------------- | -------------------------------------------- |
| `GET`  | `/health`            | Check API and ML model status                |
| `POST` | `/upload`            | Upload and process a ZIP containing videos   |
| `GET`  | `/status`            | Check the latest upload progress             |
| `POST` | `/search`            | Search B-roll using a natural-language query |
| `POST` | `/script`            | Search B-roll for sentences from a script    |
| `GET`  | `/videos/{clip_id}`  | Retrieve a video using its clip ID           |
| `GET`  | `/thumbnails/{name}` | Retrieve a generated thumbnail               |

---

# Search API

The `/search` endpoint accepts a natural-language query.

### Request

```json
{
  "query": "a woman walking outdoors"
}
```

### Response

```json
{
  "query": "a woman walking outdoors",
  "results": [
    {
      "clip_id": "example_clip",
      "start": 0,
      "end": 4,
      "percent": 72,
      "caption": "a woman walking outdoors",
      "thumbnail_url": "/thumbnails/example_clip_0.jpg",
      "video_url": "/videos/example_clip",
      "quality_flag": null
    }
  ],
  "message": null
}
```

The response contains:

* `clip_id` — identifies the source video
* `start` — beginning timestamp of the matching segment
* `end` — ending timestamp
* `percent` — similarity score represented as a percentage
* `caption` — generated description of the footage
* `thumbnail_url` — thumbnail endpoint
* `video_url` — video endpoint
* `quality_flag` — optional quality information

---

# Script Search

The `/script` endpoint allows users to search for B-roll based on an entire script.

The script is divided into individual sentences and each sentence is searched independently.

### Request

```json
{
  "text": "A woman walks through the city. Water flows across the lake."
}
```

The system returns results for each scene:

```text
Scene 1
"A woman walks through the city."

        ↓

Relevant B-roll


Scene 2
"Water flows across the lake."

        ↓

Relevant B-roll
```

This allows a longer script to be converted into a sequence of relevant B-roll suggestions.

---

# Upload Pipeline

Users upload their B-roll videos as a ZIP file.

Example:

```text
broll_test.zip
│
├── video1.mp4
├── video2.mp4
├── video3.mp4
├── video4.mp4
└── video5.mp4
```

The backend validates the ZIP file before extracting it.

Each video is then:

```text
Validated
   ↓
Decoded
   ↓
Processed by ML pipeline
   ↓
Split into segments
   ↓
Embedded
   ↓
Stored in FAISS
   ↓
Mapped to SQLite metadata
```

---

# Project Structure

```text
EPOCH_Caseblitz/
│
├── backend/
│   ├── main.py
│   ├── db.py
│   ├── config.py
│   ├── schemas.py
│   ├── search.py
│   ├── upload.py
│   ├── thumbnails.py
│   └── zip_utils.py
│
├── ml/
│   ├── __init__.py
│   ├── captioner.py
│   ├── clip_model.py
│   ├── frame_extractor.py
│   ├── metadata.py
│   ├── ranking.py
│   ├── script_processor.py
│   ├── search.py
│   ├── segment_builder.py
│   ├── storage.py
│   └── vector_store.py
│
├── tests/
│   ├── test_api.py
│   ├── test_postprocess.py
│   ├── test_search.py
│   ├── test_upload.py
│   └── test_zip_utils.py
│
├── requirements.txt
└── README.md
```

---

# Technology Stack

### Backend

* Python
* FastAPI
* Pydantic
* SQLite
* OpenCV

### Machine Learning

* PyTorch
* OpenCLIP
* CLIP
* BLIP
* Hugging Face Transformers
* NumPy
* FAISS

### Testing

* Pytest
* FastAPI TestClient

### Development

* Git
* GitHub
* VS Code
* Swagger / OpenAPI

---

# Installation

Clone the repository:

```bash
git clone <repository-url>
cd EPOCH_Caseblitz
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate the virtual environment on Windows:

```powershell
venv\Scripts\activate
```

Install the dependencies:

```bash
pip install -r requirements.txt
```

---

# Running the Backend

Start the FastAPI server:

```bash
uvicorn backend.main:app --reload
```

The API will be available at:

```text
http://127.0.0.1:8000
```

Interactive API documentation:

```text
http://127.0.0.1:8000/docs
```

The Swagger interface can be used to test all available API endpoints.

---

# Testing

Run the backend test suite using:

```bash
python -m pytest tests
```

The current backend test suite contains:

```text
27 tests
```

All backend tests currently pass.

---

# Example Search Queries

The system supports natural-language queries such as:

```text
a woman walking outdoors
```

```text
a person painting
```

```text
a cat resting on a couch
```

```text
water near a beach
```

```text
a car driving through a tunnel
```

```text
a woman talking to the camera
```

The search engine converts the query into a CLIP text embedding and compares it against the indexed B-roll embeddings.

---

# Team Responsibilities

## Siya Rozani — Frontend & Integration

Responsible for:

* Frontend interface
* Search interface
* Upload interface
* Displaying search results
* Video and thumbnail integration
* Connecting frontend components with backend APIs

## Krupa Mehta — Machine Learning

Responsible for:

* CLIP model integration
* Video frame processing
* Video segmentation
* Embedding generation
* FAISS vector search
* Search ranking
* ML-based caption generation
* Machine-learning pipeline and retrieval

## Kavya Chauhan — Backend

Responsible for:

* FastAPI backend
* Upload pipeline
* ZIP validation
* SQLite database integration
* Search API
* Script search API
* Video serving
* Thumbnail serving
* Backend/ML integration
* API schemas and validation
* Backend testing

---

# Current Status

The project currently supports the core B-roll retrieval workflow:

```text
Video Upload
     ↓
Video Processing
     ↓
Embedding Generation
     ↓
FAISS Indexing
     ↓
Natural Language Search
     ↓
Ranked Results
     ↓
Video / Thumbnail Retrieval
```

The backend API and automated backend test suite are functional, with the current test suite passing successfully.

---

# Future Improvements

Potential future improvements include:

* Improved temporal segment detection
* More accurate video-level metadata
* Improved search ranking
* Better caption generation
* More detailed result metadata
* Frontend improvements
* Search history
* Saved searches
* Larger B-roll libraries
* Improved model optimization for faster inference
* GPU acceleration for large-scale indexing

---

## Team

**Siya Rozani · Krupa Mehta · Kavya Chauhan**

**EPOCH CaseBlitz**
