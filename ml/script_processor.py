"""Script parsing and query preparation utilities."""
import re

def split_script(script, max_sentences=20):
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

    output = []

    for index, sentence in enumerate(sentences, start=1):
        results = search_engine.search(sentence)
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