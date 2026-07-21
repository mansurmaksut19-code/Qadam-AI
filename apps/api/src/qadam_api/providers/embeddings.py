"""Embedding provider contracts with a reproducible offline implementation."""

from __future__ import annotations

import math
import re
from hashlib import sha256
from typing import Protocol

_TOKEN = re.compile(r"[\wәіңғүұқөһ]+", re.IGNORECASE)


class EmbeddingProvider(Protocol):
    """Minimal provider interface used by retrieval adapters."""

    def embed(self, text: str) -> list[float]:
        """Return a normalized embedding vector."""
        ...


class DeterministicHashEmbedding:
    """Network-free feature hashing for tests and the resilient demo fallback."""

    def __init__(self, *, dimensions: int = 128) -> None:
        if dimensions < 8:
            raise ValueError("dimensions must be at least 8")
        self.dimensions = dimensions

    def embed(self, text: str) -> list[float]:
        vector = [0.0] * self.dimensions
        for token in _TOKEN.findall(text.casefold()):
            digest = sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], byteorder="big") % self.dimensions
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vector[index] += sign

        magnitude = math.sqrt(sum(value * value for value in vector))
        if magnitude == 0:
            return vector
        return [value / magnitude for value in vector]
