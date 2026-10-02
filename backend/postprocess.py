"""H3: pure functions (no models, no DB). Everything here works on plain dicts/strings.

A "hit" is a dict: {"clip_id": str, "start": float, "end": float, "score": float}
where score is the raw CLIP cosine similarity from FAISS.
"""
import re
from typing import Dict, List, Tuple

from .config import (MIN_SCORE, MAX_SCORE, PERCENT_THRESHOLD,
                     MAX_SEGMENTS_PER_CLIP, MIN_WORDS, MAX_SENTENCES)

_SENT_SPLIT = re.compile(r"(?<=[.!?])\s+|\n+")


def split_script(text: str) -> Tuple[List[str], bool]:
    """Split a script into sentences.
    Skips fragments under MIN_WORDS words, caps at MAX_SENTENCES.
    Returns (sentences, truncated)."""
    if not text or not text.strip():
        return [], False
    parts = [p.strip() for p in _SENT_SPLIT.split(text.strip()) if p and p.strip()]
    kept = [p for p in parts if len(p.split()) >= MIN_WORDS]
    truncated = len(kept) > MAX_SENTENCES
    return kept[:MAX_SENTENCES], truncated


def similarity_to_percentage(raw_score: float,
                             min_score: float = MIN_SCORE,
                             max_score: float = MAX_SCORE) -> int:
    """Rescale raw CLIP similarity (practical range ~0.15-0.35) to 0-100."""
    clamped = max(min_score, min(raw_score, max_score))
    return round((clamped - min_score) / (max_score - min_score) * 100)


def add_percent(hits: List[Dict]) -> List[Dict]:
    """Return copies of hits with a 'percent' field added."""
    return [{**h, "percent": similarity_to_percentage(h["score"])} for h in hits]


def filter_by_threshold(hits: List[Dict], threshold: int = PERCENT_THRESHOLD) -> List[Dict]:
    """Drop hits whose percent is below the threshold. Hits need a 'percent' field."""
    return [h for h in hits if h["percent"] >= threshold]


def dedup_by_clip(hits: List[Dict], max_per_clip: int = MAX_SEGMENTS_PER_CLIP) -> List[Dict]:
    """Keep at most max_per_clip segments per clip, preserving best-first order."""
    ordered = sorted(hits, key=lambda h: h["percent"], reverse=True)
    counts: Dict[str, int] = {}
    out = []
    for h in ordered:
        n = counts.get(h["clip_id"], 0)
        if n < max_per_clip:
            out.append(h)
            counts[h["clip_id"]] = n + 1
    return out


def postprocess(hits: List[Dict], k: int = 5) -> List[Dict]:
    """Full chain from the spec: percent -> threshold -> dedup -> top k.
    Empty list means 'No strong match found'."""
    return dedup_by_clip(filter_by_threshold(add_percent(hits)))[:k]
