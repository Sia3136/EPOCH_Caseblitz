<<<<<<< HEAD:ml/captioner.py
﻿"""Video captioning helpers."""
=======
"""Video captioning helpers."""
from functools import lru_cache

>>>>>>> ad90036975843f7a0a0227c7eac73665014d470b:broll-ml/ml/captioner.py
import torch
from transformers import BlipProcessor, BlipForConditionalGeneration
from PIL import Image

class BrollCaptioner:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

        self.processor = BlipProcessor.from_pretrained(
            "Salesforce/blip-image-captioning-base"
        )

        self.model = BlipForConditionalGeneration.from_pretrained(
            "Salesforce/blip-image-captioning-base"
        ).to(self.device)

    @torch.inference_mode()
    def caption(self, image):
        if not isinstance(image, Image.Image):
            image = Image.fromarray(image)

        inputs = self.processor(
            images=image,
            return_tensors="pt"
        ).to(self.device)

        output = self.model.generate(
            **inputs,
            max_new_tokens=30
        )

        return self.processor.decode(
            output[0],
            skip_special_tokens=True
        )
<<<<<<< HEAD:ml/captioner.py
=======


@lru_cache(maxsize=1)
def get_captioner():
    """Load the caption model once, only when contextual reranking is used."""
    return BrollCaptioner()
>>>>>>> ad90036975843f7a0a0227c7eac73665014d470b:broll-ml/ml/captioner.py
