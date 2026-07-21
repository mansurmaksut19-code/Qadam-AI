import json
from pathlib import Path

import pytest

from qadam_api.domain import ClauseType
from qadam_api.legal.corpus import load_corpus
from qadam_api.legal.reranker import rerank_results
from qadam_api.legal.retriever import HybridRetriever, RetrievalQuery
from qadam_api.providers.embeddings import DeterministicHashEmbedding

CORPUS_ROOT = Path(__file__).parents[4] / "corpus/legal"
RETRIEVAL_FIXTURE = Path(__file__).parents[4] / "evaluation/retrieval_cases.json"

_fixture = json.loads(RETRIEVAL_FIXTURE.read_text(encoding="utf-8"))
CASES: tuple[tuple[str, ClauseType, set[str]], ...] = tuple(
    (case["text"], ClauseType(case["clause_type"]), set(case["expected_ids"]))
    for case in _fixture["cases"]
)


@pytest.mark.parametrize(("text", "clause_type", "expected_ids"), CASES)
def test_retrieval_hits_expected_source_in_top_five(
    text: str, clause_type: ClauseType, expected_ids: set[str]
) -> None:
    retriever = HybridRetriever(
        chunks=load_corpus(CORPUS_ROOT),
        embeddings=DeterministicHashEmbedding(dimensions=128),
    )
    query = RetrievalQuery(text=text, clause_type=clause_type, language="ru")

    results = rerank_results(query, retriever.search(query, limit=10))[:5]

    assert expected_ids & {result.chunk.id for result in results}


def test_retrieval_hit_at_five_threshold() -> None:
    retriever = HybridRetriever(
        chunks=load_corpus(CORPUS_ROOT),
        embeddings=DeterministicHashEmbedding(dimensions=128),
    )
    hits = 0
    for text, clause_type, expected_ids in CASES:
        query = RetrievalQuery(text=text, clause_type=clause_type, language="ru")
        results = rerank_results(query, retriever.search(query, limit=10))[:5]
        hits += bool(expected_ids & {result.chunk.id for result in results})

    assert hits / len(CASES) >= 0.90
