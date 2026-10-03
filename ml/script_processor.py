"""Script parsing and query preparation utilities."""
import re

from ml.ranking import rank_results
<<<<<<< HEAD:ml/script_processor.py
=======
from ml.search import MAX_QUERY_WORDS
>>>>>>> ad90036975843f7a0a0227c7eac73665014d470b:broll-ml/ml/script_processor.py

def split_script(script, max_sentences=20):
    if len((script or "").split()) > MAX_QUERY_WORDS:
        raise ValueError("Narration input cannot exceed 500 words")
    sentences = re.split(r'(?<=[.!?])\s+', script.strip())

    sentences = [
        sentence.strip()
        for sentence in sentences
        if len(sentence.split()) >= 3
    ]

    truncated = len(sentences) > max_sentences

    return sentences[:max_sentences], truncated


def search_script(script, search_engine):
    sentences, truncated = split_script(script)
    search = search_engine if callable(search_engine) else search_engine.search

    output = []

    for index, sentence in enumerate(sentences, start=1):
        results = search(sentence)
        ranked = rank_results(results)

        output.append({
            "scene_index": index,
            "sentence": sentence,
            "results": ranked
        })

    return {
        "scenes": output,
        "truncated": truncated
    }
