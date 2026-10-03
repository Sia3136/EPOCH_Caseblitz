"""Cached CLIP image and text embedding functions."""
from functools import lru_cache

import numpy as np

from ml.clip_model import CLIPModel


@lru_cache(maxsize=1)
def get_clip_model():
    """Load CLIP once per process."""
    return CLIPModel()


def encode_images(images, model=None):
    encoder = model or get_clip_model()
    if hasattr(encoder, "encode_image_batch"):
        return encoder.encode_image_batch(images)
    return [encoder.encode_image(image) for image in images]


def encode_text(text, model=None):
    encoder = model or get_clip_model()
    return encoder.encode_text(text)


def encode_search_text(text, model=None):
    """Use simple image/video prompt variants for more stable text search."""
    prompts = [
        text,
        f"a photo of {text}",
        f"a video of {text}",
    ]
    embeddings = [encode_text(prompt, model=model) for prompt in prompts]
    embedding = np.mean(embeddings, axis=0)
    return embedding / (np.linalg.norm(embedding) + 1e-12)