"""CLIP model loading and embedding helpers."""
import numpy as np
import open_clip
import torch
from PIL import Image


class CLIPModel:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model, _, self.preprocess = open_clip.create_model_and_transforms(
            "ViT-B-32",
            pretrained="laion2b_s34b_b79k",
        )
        self.tokenizer = open_clip.get_tokenizer("ViT-B-32")
        self.model = self.model.to(self.device)
        self.model.eval()

    @torch.inference_mode()
    def encode_image(self, image):
        if not isinstance(image, Image.Image):
            image = Image.fromarray(image)
        image = self.preprocess(image).unsqueeze(0).to(self.device)
        embedding = self.model.encode_image(image)
        embedding = embedding / embedding.norm(dim=-1, keepdim=True)
        return embedding.cpu().numpy().astype("float32")[0]

    @torch.inference_mode()
    def encode_text(self, text):
        tokens = self.tokenizer([text]).to(self.device)
        embedding = self.model.encode_text(tokens)
        embedding = embedding / embedding.norm(dim=-1, keepdim=True)
        return embedding.cpu().numpy().astype("float32")[0]
