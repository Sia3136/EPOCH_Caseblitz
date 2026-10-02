import torch
import open_clip
import time
from PIL import Image
import cv2

print("Loading CLIP...")
start = time.time()

model, _, preprocess = open_clip.create_model_and_transforms(
    "ViT-B-32",
    pretrained="laion2b_s34b_b79k"
)

tokenizer = open_clip.get_tokenizer("ViT-B-32")
model = model.to("cpu")
model.eval()

print(f"CLIP loaded in {time.time() - start:.2f}s")

# Test text embedding
text = "A cat is sleeping"
tokens = tokenizer([text])

with torch.inference_mode():
    text_embedding = model.encode_text(tokens)
    text_embedding = text_embedding / text_embedding.norm(
        dim=-1, keepdim=True
    )

print("Text embedding shape:", text_embedding.shape)
print("Text embedding norm:", text_embedding.norm().item())

# Test image embedding using your video
cap = cv2.VideoCapture("data/videos/video1.mp4")
success, frame = cap.read()
cap.release()

if not success:
    raise RuntimeError("Could not read the video frame")

image = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
image_tensor = preprocess(image).unsqueeze(0)

with torch.inference_mode():
    image_embedding = model.encode_image(image_tensor)
    image_embedding = image_embedding / image_embedding.norm(
        dim=-1, keepdim=True
    )

print("Image embedding shape:", image_embedding.shape)
print("Image embedding norm:", image_embedding.norm().item())

similarity = (text_embedding @ image_embedding.T).item()
print("Text-image similarity:", similarity)

print("CLIP test completed!")