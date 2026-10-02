"""CLIP model loading and embedding helpers."""
import torch
import open_clip
import numpy as np
from PIL import Image

class CLIPModel:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

        self.model, _, self.preprocess = open_clip.create_model_and_transforms(
            "ViT-B-32",
            pretrained="laion2b_s34b_b79k"
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
    def encode_image_batch(self, images, batch_size=32):
        processed = []
        for image in images:
            if not isinstance(image, Image.Image):
                image = Image.fromarray(image)
            processed.append(self.preprocess(image))

        if not processed:
            return []

        batches = []
        for start in range(0, len(processed), batch_size):
            batch = torch.stack(processed[start:start + batch_size]).to(self.device)
            embeddings = self.model.encode_image(batch)
            embeddings = embeddings / embeddings.norm(dim=-1, keepdim=True)
            batches.append(embeddings.cpu().numpy().astype("float32"))
        return np.concatenate(batches, axis=0)

    @torch.inference_mode()
    def encode_text(self, text):
        tokens = self.tokenizer([text]).to(self.device)
        embedding = self.model.encode_text(tokens)
        embedding = embedding / embedding.norm(dim=-1, keepdim=True)

        return embedding.cpu().numpy().astype("float32")[0]



   