"""FAISS index persistence and lookup helpers."""
import os

import faiss
import numpy as np


class VectorStore:
    def __init__(self, dimension=512):
        self.index = faiss.IndexFlatIP(dimension)
        self.metadata = []

    def add(self, embedding, metadata):
        vector = np.asarray(embedding, dtype=np.float32).reshape(1, -1)
        self.index.add(vector)
        self.metadata.append(metadata)

    def search(self, query_embedding, top_k=10):
        query = np.asarray(query_embedding, dtype=np.float32).reshape(1, -1)
        if self.index.ntotal == 0:
            return []
        scores, indices = self.index.search(query, min(top_k, self.index.ntotal))
        return [
            {"faiss_id": int(index), "similarity": float(score)}
            for score, index in zip(scores[0], indices[0])
            if index >= 0
        ]

    def save(self, directory="data/index"):
        os.makedirs(directory, exist_ok=True)
        faiss.write_index(self.index, f"{directory}/broll.index")
        np.save(
            f"{directory}/metadata.npy",
            np.asarray(self.metadata, dtype=object),
            allow_pickle=True,
        )

    def load(self, directory="data/index"):
        self.index = faiss.read_index(f"{directory}/broll.index")
        self.metadata = np.load(
            f"{directory}/metadata.npy",
            allow_pickle=True,
        ).tolist()
