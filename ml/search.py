"""Search orchestration for indexed b-roll assets."""
from ml.clip_model import CLIPModel
from ml.vector_store import VectorStore

class BrollSearch:
    def __init__(self):
        self.clip = CLIPModel()
        self.store = VectorStore()

    def search(self, query, top_k=20):
        query_embedding = self.clip.encode_text(query)

        results = self.store.search(
            query_embedding,
            top_k=top_k
        )

        return results