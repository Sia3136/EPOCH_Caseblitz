# AI-Powered B-roll Search & Retrieval System — Project Context

This document is the single source of truth for this project. It explains what we are building, why, how, and exactly what each person owns. Anyone reading this with zero prior context should be able to start working from it.

---

## 1. The Problem We Are Solving

Video editors and creators spend a huge amount of time manually scrubbing through footage libraries to find the right B-roll (supplementary footage that plays under narration/voiceover/primary footage). Traditional search only works if someone has manually tagged every clip with the right keywords — which almost never matches how an editor actually describes what they need.

**Example of the failure:** An editor needs footage of "a busy marketplace in the evening" but the library has files named `clip_0047.mp4`, `shoot_day3.mp4`. Keyword search returns nothing useful.

We are building a system that understands the **meaning** of what's in a video (objects, actions, scenes, people, context) and the **meaning** of what the editor is asking for, and matches the two — not by filename or tags, but by semantic/visual understanding.

---

## 2. Our USP (Unique Selling Proposition)

> **A narrative-aware B-roll retrieval system — paste a script, not just a keyword, and get scene-by-scene ranked clip suggestions with timestamps, explainable match context, and confidence-based filtering, so editors don't waste time on irrelevant footage.**

### Why this is our differentiator
Most teams at this hackathon will build: *type a keyword → get a list of clips*. That is the baseline, and we build it too — but it is not our headline feature.

Our headline feature is: **paste an entire script or paragraph of narration, and the system automatically breaks it into scenes/sentences, searches for each one, and returns a scene-by-scene breakdown of matching footage** — with a percentage match score, a timestamp of where in the clip the match occurs, and a short explanation of why it matched.

### Honesty about prior art
Semantic video search using CLIP-style embeddings is an established technique, and transcript-driven B-roll tools exist in research and open source. We are not claiming to invent semantic search. Our claim is that **the specific combination** — script segmentation + scene-level ranked retrieval + timestamp localization + confidence-based "no match" handling + explainability — executed well in a working demo, is what differentiates us. Say this plainly if judges ask about novelty. Honesty here builds more credibility than overclaiming.

---

## 3. Feature Scope

### 3.1 Must-Have (Core — the system does not work without these)

1. **Zip upload of video library** — no login, no auth, open access for everyone.
2. **Automatic indexing on upload** — extract frames, generate embeddings, store in a searchable index, store metadata.
3. **Single-query search** — editor types a plain text query (e.g. "person walking alone at night"), system returns ranked clips with a **percentage match score**, not a raw decimal.
4. **Script mode (our USP)** — editor pastes a full script/paragraph, system splits it into scenes/sentences, runs search for each one, and returns a **scene-by-scene breakdown** of matching clips.
5. **Timestamp localization** — for clips longer than a few seconds, show the editor *where in the clip* the match occurs (not just "this clip matches somewhere").
6. **Confidence-based no-match handling** — if nothing in the library scores above a minimum threshold, say so clearly instead of returning garbage low-relevance results.
7. **Deduplication** — don't let the same clip dominate every top-5 result list.
8. **Results UI** — each result shows: thumbnail, percentage match score, timestamp, play-from-that-point button.

### 3.2 Should-Have (build only after everything in 3.1 works end-to-end)

9. **Explainability caption** — a short auto-generated one-line caption per top result explaining what's visually in that clip/segment ("a person walking alone under streetlights") so the editor understands *why* it matched.
10. **Visual quality flag** — flag clips that are blurry or too dark, so a bad-quality match doesn't look like our best result.

### 3.3 Explicitly Out of Scope (do not attempt — state this clearly in the README and to judges if asked)

- User authentication / accounts / login — intentionally skipped, system is open access for everyone by design.
- Multi-user sessions, saved searches, history.
- Automatic B-roll sequence building (establishing shot → action shot → close-up → cutaway ordering).
- Action-level understanding, negation handling ("a person NOT using a phone"), sarcasm/figurative language detection.
- Identity tracking across clips (recognizing the same person in different clips).
- Audio/dialogue transcription-based matching.
- Formal evaluation metrics (Recall@K, NDCG, MRR) — we validate by demo, not by benchmark, given the time constraint.
- Any large-scale optimization (Product Quantization, IVF indexes, approximate nearest neighbor at scale) — irrelevant at our library size (under ~100 clips).

---

## 4. Percentage Match — How And Why

A teammate suggested showing **percentage match** instead of a raw similarity score, and we are adopting this. Reasoning: a raw cosine similarity score (e.g., `0.31`) means nothing to a non-technical judge or editor. A percentage ("72% match") is immediately understandable and looks more polished in the demo.

### How to compute it
CLIP cosine similarity between a normalized text embedding and a normalized image/segment embedding typically falls in a **usable range of roughly 0.15 to 0.35** for real matches (not the full -1 to 1 range you'd expect from cosine similarity in theory — CLIP's embedding space is "cone-shaped" and doesn't spread out that wide in practice).

Because of this, **do not do a naive `similarity * 100`** — a real strong match at `0.32` would show as a misleading "32% match" when it's actually your best possible result.

**Recommended approach — min-max rescaling within an observed practical range:**

```python
def similarity_to_percentage(raw_score, min_score=0.15, max_score=0.35):
    """
    Rescales CLIP cosine similarity (practical range ~0.15-0.35)
    into a 0-100% match score for display purposes.
    """
    clamped = max(min_score, min(raw_score, max_score))
    percentage = (clamped - min_score) / (max_score - min_score) * 100
    return round(percentage)
```

**Important:** `min_score` and `max_score` are starting estimates. In the first hour, after you generate your first batch of embeddings, run a handful of test queries against your actual demo library and look at the real score distribution. Adjust `min_score`/`max_score` to match what you actually observe (e.g., if your best real matches cluster around 0.28-0.34, use that as your range). This calibration takes 10 minutes and makes the percentages look meaningful rather than arbitrary.

This percentage is **also what the confidence/no-match threshold should be based on** — e.g., "below 35% match → show 'no strong match found' instead of a result."

---

## 5. Upload & Storage — Exact Specifications

### 5.1 Upload constraints (hard caps — state these explicitly, they are intentional scoping decisions, not bugs)
- Max zip file size: **500 MB**
- Max number of clips per zip: **50**
- Max duration per clip: **60 seconds** (longer clips can be accepted but will only be partially processed within this scope if time allows — default is to cap)
- No authentication required — anyone can upload, anyone can search. This is a deliberate design choice for the hackathon demo, not an oversight.

### 5.2 Where everything is stored

| What | Where | Why |
|---|---|---|
| Raw video files | Local disk, `/data/videos/{job_id}/` | No cloud storage setup needed — saves hours of setup time with zero demo-day benefit |
| Clip + segment metadata (clip_id, filename, duration, timestamps, etc.) | **SQLite** database file | Zero setup, file-based, more than sufficient for under ~500 records |
| Vector embeddings | **FAISS index** saved to disk as a `.index` file, with a parallel mapping (array or JSON) from index position → clip_id/segment_id | FAISS is purpose-built for this, fast even on CPU at our scale |

### 5.3 Upload flow (step by step)
```
1. User uploads a .zip file through the UI
2. Backend validates: file size under 500MB, is a valid zip
3. Extract zip contents to /data/videos/{job_id}/
4. For each video file found:
   a. Validate it can be opened/decoded (skip + log if corrupted, don't crash the whole batch)
   b. Extract frames at fixed intervals (see Section 6)
   c. Generate CLIP embeddings for each frame
   d. Average frames into "segments" (see Section 6)
   e. Add segment embeddings to the FAISS index
   f. Store metadata (clip_id, segment_id, start_time, end_time, video_path, duration) in SQLite
5. Show a progress indicator while this happens (this is synchronous — no background job queue, no async processing — keep it simple)
6. When done, show "Indexing complete — X clips, Y segments indexed, ready to search"
```

We are running this **synchronously with a visible progress bar**, not with background job queues or async task workers. Async processing adds a whole category of bugs (race conditions, job failure states, retry logic) that we do not have time to debug in an 11-hour build. Synchronous and simple is the correct choice here, not a shortcut we're ashamed of.

---

## 6. Frame Sampling, Segmentation, and Models — Exact Numbers

This section answers: *how do we turn a video into something searchable, and how granular is the matching?*

### 6.1 Frame extraction rate
- Clips under 30 seconds: **extract 1 frame every 2 seconds**
- Clips 30–60 seconds: **extract 1 frame every 3–4 seconds**
- Hard cap: **maximum 15 frames per clip**, regardless of length, to keep embedding generation fast

We are **not** doing real scene-boundary detection (e.g., PySceneDetect) — that is a nice-to-have that costs setup and debugging time we don't have. Fixed-interval sampling is a reasonable, explainable tradeoff for this scope.

### 6.2 What is a "segment" (our stand-in for a scene)
- Every **3–4 consecutive extracted frames are grouped into one segment**
- A segment's embedding = the **average of its frames' CLIP embeddings**
- Example: a 60-second clip sampled every 2 seconds = 30 frames = roughly 8–10 segments
- This segment is also our **timestamp granularity** — when we say "this match occurs at 0:14–0:18", that's one segment's time range

**Be upfront about the limitation:** this is a fixed time-window approximation of a "scene," not true scene-cut detection. If a judge asks, say exactly this — it's an honest, reasonable scope decision for an 11-hour build, not something to hide.

### 6.3 Models used

| Task | Model | Why this one |
|---|---|---|
| Image/frame embeddings | **CLIP ViT-B/32** (via `open_clip` or HuggingFace `transformers`) | Fast, well-documented, runs reasonably on CPU if no GPU is available. ViT-L/14 is marginally more accurate but notably slower — not worth it at our scale and time budget. |
| Text query embeddings | **Same CLIP ViT-B/32 model**, text encoder side | Must be the same model as the image encoder — text and image embeddings only live in the same comparable space if generated by the same model |
| Explainability captions (Should-Have feature, top-5 results only) | **BLIP-base** | Small and fast enough to run only on the handful of results we're actually returning to the user. We explicitly do NOT caption every frame in the library at indexing time — that would be far too slow. Captioning happens only at query time, only on the top 5 results. |

### 6.4 Metadata description length
- Auto-generated captions (BLIP, query-time only): **one sentence, roughly 10–15 words**
- We do not pre-generate long descriptions for the whole library — this is generated on-demand, only for what's shown to the user, to keep indexing fast

### 6.5 Video preview behavior
- We are **not** building a scrubbing preview timeline — explicitly out of scope, not worth the frontend time
- Instead: show a **static thumbnail captured at the matched timestamp**
- Provide a **"Play from here" button** that uses the native HTML5 `<video>` element's `currentTime` property to jump playback to the matched timestamp
- This is a small amount of frontend work (roughly 20–30 minutes) and looks impressive in a live demo — prioritize it over any fancier preview mechanism

---

## 7. Search & Ranking — Exact Logic

### 7.1 Single-query search (the base function everything else is built on)
```
1. User types a text query (e.g., "a person walking alone at night")
2. Encode the query text using CLIP's text encoder → query embedding
3. Run FAISS cosine similarity search against all indexed segment embeddings
4. Convert raw similarity scores to percentage match (see Section 4)
5. Filter out any result below the confidence threshold (see 7.2)
6. Deduplicate (see 7.3)
7. For the top 5 surviving results, generate a BLIP caption (Should-Have feature)
8. Return: [{clip_id, timestamp_range, percentage_match, caption, thumbnail}]
```

**Build this ONE function first. Everything else — script mode included — is just this function called in a loop. Do not build two separate search systems.**

### 7.2 Confidence threshold ("no match" handling)
- If a result's percentage match falls below a minimum threshold (starting point: **35%**, calibrate against real data in hour 1 as described in Section 4), do not show it
- If **all** results for a query fall below the threshold, show a clear message: **"No strong match found for this query"** — do not force-return low-relevance results just to have something on screen. This is a deliberate trust-building feature, not a failure state to hide.

### 7.3 Deduplication
- Cap results at **maximum 2 segments per clip_id** in any top-K result list
- Rationale: without this, a single long clip can dominate the entire results list with near-identical adjacent segments, which looks repetitive and unhelpful

### 7.4 Script mode (scene-by-scene search — our USP feature)
```
1. User pastes a script or paragraph
2. Split the text into sentences (simple sentence-splitting is sufficient — don't over-engineer this)
3. Skip any sentence fragment under ~3 words (avoids garbage results on things like "He smiled.")
4. Cap processing at the first 20 sentences — if the script is longer, note in the UI that it was truncated
5. For each remaining sentence, run the exact same single-query search function from 7.1
6. Group results by scene/sentence index
7. Return: scene-by-scene breakdown, e.g.:
   Scene 1 ("Starting my own business was the biggest risk I ever took")
     → Clip A, 0:12–0:18, 81% match, "a person opening a shop door"
     → Clip B, 2:04–2:09, 68% match, "hands preparing products on a table"
   Scene 2 ("...")
     → ...
```

---

## 8. Edge Cases — What We Handle vs. What We Deliberately Defer

Be ready to answer confidently if a judge asks about any of these — "deliberately deferred, here's why" is a strong answer; a blank stare is not.

### 8.1 Must handle (cheap, embarrassing if broken)

| Edge case | How we handle it |
|---|---|
| No relevant clip exists for a query | Confidence threshold → "No strong match found" message (Section 7.2) |
| Corrupted or unreadable video file in the uploaded zip | Try/except during extraction — skip that file, log a warning, do not crash the rest of the batch |
| Same clip dominating every result | Deduplication cap of 2 segments per clip (Section 7.3) |
| Garbage short sentence during script splitting (e.g., "He smiled.") | Skip any sentence fragment under ~3 words |
| Very long script pasted in | Cap at first 20 sentences/scenes, clearly note truncation in the UI |

### 8.2 Nice to handle if time allows

| Edge case | How we handle it |
|---|---|
| Ambiguous query (e.g., "a person at a bank" — financial institution or riverbank) | We don't attempt to resolve ambiguity — just show the percentage score and let the number speak. Do not over-engineer this. |
| Low visual quality match (blurry/dark) is the only option | Should-Have quality flag (Section 3.2, #10) — show it but mark it as lower quality rather than silently hiding or silently presenting it as a confident match |

### 8.3 Explicitly deferred — say this plainly if asked, do not attempt to build

- Negation understanding ("a person NOT holding a phone")
- Sarcasm / figurative language in scripts ("that decision was a disaster")
- Occlusion-aware action detection (hands hidden mid-action)
- Fast-action detection between sampled frames
- Identity tracking/continuity across different clips
- Contradictory narrative context resolution
- Non-English script/query text
- Advanced shot-sequencing / automatic B-roll sequence building

---

## 9. System Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Streamlit   │────▶│   FastAPI     │────▶│  CLIP + FAISS    │
│   Frontend    │◀────│   Backend     │◀────│  Processing Core │
└─────────────┘     └──────────────┘     └─────────────────┘
                             │                       │
                             ▼                       ▼
                      ┌─────────────┐        ┌──────────────┐
                      │   SQLite     │        │  FAISS Index  │
                      │  (metadata)  │        │   (.index)    │
                      └─────────────┘        └──────────────┘
                             │
                             ▼
                      ┌─────────────┐
                      │ /data/videos │
                      │   (disk)     │
                      └─────────────┘
```

### 9.1 Full tech stack and why each piece was chosen

| Layer | Tool | Reasoning |
|---|---|---|
| Frontend | **Streamlit** (not React) | Dramatically faster to build given the time budget; still looks clean enough for a demo |
| Backend | **FastAPI** (optional — only if Streamlit alone can't cleanly handle the processing load) | If the team is more comfortable keeping everything inside Streamlit directly, that's acceptable too — don't add FastAPI just because it's "more proper" if it costs integration time |
| Embedding model | **CLIP ViT-B/32** (`open_clip` or HuggingFace `transformers`) | Fast, CPU-feasible, well-documented, good enough accuracy at our scale |
| Captioning (query-time, top-5 only) | **BLIP-base** | Small and fast enough to only run on final results, not the whole library |
| Vector index | **FAISS `IndexFlatIP`** (exact search, not approximate) | At under ~100 clips / ~1000 segments, exact search and approximate search (HNSW, IVF) perform identically in latency — there is zero reason to add the complexity of approximate indexing at this scale |
| Metadata store | **SQLite** | Zero setup, file-based, more than sufficient |
| Video/frame processing | **OpenCV** or **ffmpeg-python** | Standard, well-supported tools for frame extraction |
| Storage | **Local disk** | No cloud storage integration — saves significant setup time for zero demo-day benefit |

### 9.2 Demo video dataset
- Do not spend time hunting for a specialized dataset
- Pull **50–80 clips from the Pexels Videos API** (free, searchable by keyword, good variety) ahead of time
- **Deliberately include clips that match your planned demo queries.** If you plan to demo an abstract query like "loneliness in a city," make sure your library actually contains relevant clips (empty bench, rain on a window, a single person in a crowd) — don't leave this to chance

---

## 10. End-to-End Flows

### 10.1 User flow
```
1. Land on the app → "Upload B-roll Library" (zip upload, no login required)
2. Upload progresses with a visible status indicator
3. Once indexing completes, two modes are available:
   Tab A — Single Search: type a query → see ranked results (percentage match, timestamp, caption, play-from-timestamp)
   Tab B — Script Mode: paste a script/paragraph → see scene-by-scene breakdown of matched clips
```

### 10.2 ML/processing flow — indexing (runs once per upload)
```
Video file
  → extract frames (1 every 2-4 seconds depending on length, max 15 frames)
  → CLIP image-embed each frame
  → average groups of 3-4 frames into a segment embedding
  → add segment embedding to FAISS index
  → store {clip_id, segment_id, start_time, end_time, video_path, duration} in SQLite
```

### 10.3 ML/processing flow — single query
```
Text query
  → CLIP text-embed
  → FAISS cosine similarity search against all segment embeddings
  → convert raw scores to percentage match (Section 4)
  → filter out results below confidence threshold (Section 7.2)
  → deduplicate, max 2 segments per clip (Section 7.3)
  → BLIP caption the top 5 results only
  → return ranked list: {clip, timestamp, percentage_match, caption, thumbnail}
```

### 10.4 ML/processing flow — script mode
```
Script text
  → split into sentences, skip fragments under ~3 words, cap at 20 sentences
  → for each sentence: run the exact single-query flow from 10.3
  → group all results by scene/sentence index
  → return: scene-by-scene breakdown
```

---

## 11. Known Unsolved Problems (acknowledge these honestly — do not try to fix in the remaining time)

- **CPU vs GPU speed is untested until hour 1.** If no GPU is available, embedding ~50-80 clips × up to 15 frames each (~1000-1200 image embeddings total) on CPU could take meaningfully longer than expected. **This must be tested in the first hour.** If it's too slow, reduce frames-per-clip from 15 down to 8-10 immediately — don't wait until later to discover this.
- **Segments are not real scene cuts** — they are fixed time windows. This is an acknowledged, reasonable approximation for the time budget, not a hidden flaw.
- **Sentence splitting is naive** — it will occasionally produce awkward short scenes. Acceptable for a demo; not claimed to be production-grade.
- **No formal evaluation metrics** (Recall@K, NDCG, MRR) will be computed — there is no time to build a labeled evaluation set. We validate through live demo queries instead, and this is a conscious tradeoff, not an oversight.
- **Percentage match calibration is approximate**, based on observed score ranges from our own demo library in hour 1 — it is a display aid for interpretability, not a scientifically rigorous confidence measure. State this plainly if asked.

---

## 12. Work Division

| Person | Owns | Notes |
|---|---|---|
| **P1 — ML/Backend** | Frame extraction, CLIP embedding pipeline, FAISS indexing, the core single-query search function | This is the critical-path function — everything else depends on it |
| **P2 — ML/Backend** | Script splitting logic, SQLite schema design, timestamp mapping, confidence threshold logic, deduplication filter, BLIP captioning (top-5 only), percentage match conversion | All of these are post-processing layered on top of P1's search output — no separate architecture needed |
| **P3 — Frontend/Integration** | Streamlit UI (upload flow with progress bar, single-search tab, script-mode tab, results cards with thumbnail/percentage/timestamp/caption/play-button, "no match" state), demo library curation (pulling and curating Pexels clips, including clips that match planned demo queries) | Also owns making sure the "wow" demo queries are visually compelling on screen |

---

## 13. Timeline (11 hours, 3 people)

| Time | Milestone |
|---|---|
| 0:00–1:00 | Environment setup. **Test CLIP load + embed one sample video immediately** — this is the single biggest risk in the project and must be caught in hour 1, not hour 6. Also calibrate percentage-match min/max range (Section 4) against first real scores. |
| 1:00–4:00 | P1 builds embedding + FAISS pipeline, testable via command line (no UI needed yet). P2 builds script-splitting logic and SQLite schema. P3 builds the UI shell (upload, two tabs, empty result cards) and pulls 50–80 demo clips from Pexels, deliberately including clips for planned demo queries. |
| 4:00–6:00 | P1 and P2 merge into a single working search function, with percentage conversion, confidence threshold, and deduplication applied. **By the end of this block, you need ONE working search function end-to-end, even if only testable via command line.** |
| 6:00–8:00 | P3 integrates the backend into the Streamlit UI. Everyone tests end-to-end together using the real demo clip library. |
| 8:00–9:30 | Bug fixes. Run through 8 curated "wow queries" explicitly and confirm they produce good results. Confirm script mode demo works cleanly start to finish. |
| 9:30–10:30 | Record a backup demo video in case the live demo fails during judging. Write the README, explicitly listing what's handled vs. deliberately deferred (pull directly from Section 8 of this doc). |
| 10:30–11:00 | Buffer time / final submission |

**Hard rule:** if a single working search function (command-line is fine) isn't done by hour 6, cut script mode entirely and ship single-query search only. A smaller thing that works beats a bigger thing that's half-broken on stage.

---

## 14. Quick Reference — What To Say If Asked

- **"Is this novel?"** → No single technique here is novel; the combination of script-level scene segmentation, timestamp localization, confidence-based filtering, and explainability in one workflow is our contribution.
- **"Why percentage match instead of a raw score?"** → Raw cosine similarity scores aren't interpretable to non-technical users. We rescale observed real similarity ranges into a 0-100% display metric, calibrated against our own demo library.
- **"Why no authentication?"** → Deliberate scope decision — open access for everyone, by design, not an oversight.
- **"Why not true scene-detection?"** → Time budget. We use fixed time-window segments as a reasonable, explainable approximation, and we say so openly.
- **"What doesn't work / isn't handled?"** → Point directly to Section 8.3 — negation, sarcasm, identity tracking, non-English input, automatic sequence building. All consciously deferred.
