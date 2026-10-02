import numpy as np
from ml.clip_model import CLIPModel

clip = CLIPModel()

text_embedding = clip.encode_text(
    "A person walking in a busy street"
)

print("Embedding shape:", text_embedding.shape)
print("Embedding norm:", np.linalg.norm(text_embedding))

assert text_embedding.shape[-1] == 512
assert np.isclose(np.linalg.norm(text_embedding), 1.0, atol=1e-3)

print("CLIP test passed!")