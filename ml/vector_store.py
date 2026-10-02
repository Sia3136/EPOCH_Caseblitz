"""Vector index persistence and lookup helpers."""
import faiss
import numpy as np
import os

class VectorStore:
    def __init__(self, dimension=512):
        self.index = faiss.IndexFlatIP(dimension)
        self.metadata = []

    def add(self, embedding, metadata):
        vector = np.asarray(
            embedding, dtype=np.float32
        ).reshape(1, -1)

        self.index.add(vector)
        self.metadata.append(metadata)

    def search(self, query_embedding, top_k=10):
        if self.index.ntotal == 0:
            return []

        query = np.asarray(
            query_embedding, dtype=np.float32
        ).reshape(1, -1)

        scores, indices = self.index.search(
            query, min(top_k, self.index.ntotal)
        )

        results = []

        for score, idx in zip(scores[0], indices[0]):
            if idx < 0:
                continue

            results.append({
                **self.metadata[idx],
                "similarity": float(score)
            })

        return results

    def save(self, directory="data/index"):
        os.makedirs(directory, exist_ok=True)
        faiss.write_index(
            self.index,
            f"{directory}/broll.index"
        )
        np.save(
            f"{directory}/metadata.npy",
            np.array(self.metadata, dtype=object),
            allow_pickle=True
        )

    def load(self, directory="data/index"):
        self.index = faiss.read_index(
            f"{directory}/broll.index"
        )
        self.metadata = np.load(
            f"{directory}/metadata.npy",
            allow_pickle=True
        ).tolist()
