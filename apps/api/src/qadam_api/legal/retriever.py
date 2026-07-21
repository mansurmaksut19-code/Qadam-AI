"""Explainable hybrid retrieval over the curated legal corpus."""

from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from typing import Literal

from qadam_api.documents.language import normalize_search_terms
from qadam_api.domain import ClauseType
from qadam_api.legal.corpus import LegalChunk
from qadam_api.providers.embeddings import EmbeddingProvider

_TOKEN = re.compile(r"[\wәіңғүұқөһ]+", re.IGNORECASE)
_STOP_WORDS = {
    "и",
    "в",
    "на",
    "по",
    "за",
    "как",
    "что",
    "если",
    "кто",
    "или",
    "при",
    "для",
    "the",
}


@dataclass(frozen=True, slots=True)
class RetrievalQuery:
    """Text plus filters known from the contract-analysis stage."""

    text: str
    language: Literal["ru", "kz"]
    clause_type: ClauseType | None = None


@dataclass(frozen=True, slots=True)
class RetrievalWeights:
    """Auditable hybrid score weights."""

    lexical: float = 0.45
    vector: float = 0.35
    metadata: float = 0.20

    def __post_init__(self) -> None:
        if not math.isclose(self.lexical + self.vector + self.metadata, 1.0):
            raise ValueError("retrieval weights must sum to one")


@dataclass(frozen=True, slots=True)
class RetrievalResult:
    """A legal candidate with decomposed ranking evidence."""

    chunk: LegalChunk
    lexical_score: float
    vector_score: float
    metadata_score: float
    final_score: float
    rerank_score: float | None = None
    rerank_reasons: list[str] = field(default_factory=list)


def _tokens(text: str) -> set[str]:
    values = {
        token.casefold()
        for token in _TOKEN.findall(text)
        if len(token) > 1 and token.casefold() not in _STOP_WORDS
    }
    return values | {term.casefold() for term in normalize_search_terms(text).canonical_terms}


def _cosine(left: list[float], right: list[float]) -> float:
    if len(left) != len(right):
        raise ValueError("embedding dimensions do not match")
    return max(0.0, min(1.0, sum(a * b for a, b in zip(left, right, strict=True))))


class HybridRetriever:
    """Combine lexical, vector, and clause-family relevance."""

    def __init__(
        self,
        *,
        chunks: list[LegalChunk],
        embeddings: EmbeddingProvider,
        weights: RetrievalWeights | None = None,
    ) -> None:
        self._chunks = list(chunks)
        self._embeddings = embeddings
        self._weights = weights or RetrievalWeights()
        self._chunk_embeddings = {
            chunk.id: embeddings.embed(self._index_text(chunk)) for chunk in self._chunks
        }

    @staticmethod
    def _index_text(chunk: LegalChunk) -> str:
        families = " ".join(clause_type.value for clause_type in chunk.clause_types)
        return f"{chunk.article_ref} {families} {chunk.text}"

    def search(self, query: RetrievalQuery, *, limit: int = 5) -> list[RetrievalResult]:
        if limit < 1:
            raise ValueError("limit must be at least one")

        query_text = query.text
        if query.clause_type is not None:
            query_text = f"{query_text} {query.clause_type.value}"
        query_tokens = _tokens(query_text)
        query_embedding = self._embeddings.embed(query_text)
        results: list[RetrievalResult] = []

        for chunk in self._chunks:
            if chunk.status != "active" or chunk.language != query.language:
                continue
            chunk_tokens = _tokens(self._index_text(chunk))
            overlap = query_tokens & chunk_tokens
            lexical = len(overlap) / max(1, len(query_tokens))
            vector = _cosine(query_embedding, self._chunk_embeddings[chunk.id])
            metadata = float(query.clause_type in chunk.clause_types) if query.clause_type else 0.0
            final = (
                self._weights.lexical * lexical
                + self._weights.vector * vector
                + self._weights.metadata * metadata
            )
            results.append(
                RetrievalResult(
                    chunk=chunk,
                    lexical_score=min(1.0, lexical),
                    vector_score=vector,
                    metadata_score=metadata,
                    final_score=min(1.0, final),
                )
            )

        return sorted(results, key=lambda item: (-item.final_score, item.chunk.id))[:limit]
