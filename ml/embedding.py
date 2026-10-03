<<<<<<< HEAD:ml/embedding.py
﻿"""Cached CLIP image and text embedding functions."""
=======
"""Cached CLIP image and text embedding functions."""
>>>>>>> ad90036975843f7a0a0227c7eac73665014d470b:broll-ml/ml/embedding.py
from functools import lru_cache

import numpy as np

from ml.clip_model import CLIPModel


@lru_cache(maxsize=1)
def get_clip_model():
    """Load CLIP once per process."""
    return CLIPModel()


def encode_images(images, model=None):
    encoder = model or get_clip_model()
<<<<<<< HEAD:ml/embedding.py
=======
    if hasattr(encoder, "encode_image_batch"):
        return encoder.encode_image_batch(images)
>>>>>>> ad90036975843f7a0a0227c7eac73665014d470b:broll-ml/ml/embedding.py
    return [encoder.encode_image(image) for image in images]


def encode_text(text, model=None):
    encoder = model or get_clip_model()
    return encoder.encode_text(text)


def encode_search_text(text, model=None):
<<<<<<< HEAD:ml/embedding.py
    """Use simple image/video prompt variants for more stable text search."""
=======
    """Encode a visual prompt ensemble for more context-aware retrieval."""
>>>>>>> ad90036975843f7a0a0227c7eac73665014d470b:broll-ml/ml/embedding.py
    prompts = [
        text,
        f"a photo of {text}",
        f"a video of {text}",
<<<<<<< HEAD:ml/embedding.py
    ]
    embeddings = [encode_text(prompt, model=model) for prompt in prompts]
    embedding = np.mean(embeddings, axis=0)
    return embedding / (np.linalg.norm(embedding) + 1e-12)
=======
        f"a video frame showing {text}",
        f"footage of {text}",
        f"a scene with {text}",
    ]
    embeddings = [encode_text(prompt, model=model) for prompt in prompts]
    embedding = np.mean(embeddings, axis=0)
    return embedding / (np.linalg.norm(embedding) + 1e-12)
>>>>>>> ad90036975843f7a0a0227c7eac73665014d470b:broll-ml/ml/embedding.py
