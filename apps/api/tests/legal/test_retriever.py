from pathlib import Path

import pytest

from qadam_api.domain import ClauseType
from qadam_api.legal.corpus import load_corpus
from qadam_api.legal.retriever import HybridRetriever, RetrievalQuery
from qadam_api.providers.embeddings import DeterministicHashEmbedding

CORPUS_ROOT = Path(__file__).parents[4] / "corpus/legal"


@pytest.fixture
def retriever() -> HybridRetriever:
    return HybridRetriever(
        chunks=load_corpus(CORPUS_ROOT),
        embeddings=DeterministicHashEmbedding(dimensions=128),
    )


@pytest.mark.parametrize(
    ("query", "expected_ids"),
    [
        (
            RetrievalQuery(
                text="Когда и как должны вернуть залог?",
                clause_type=ClauseType.DEPOSIT,
                language="ru",
            ),
            {"civil-546-rent-payment"},
        ),
        (
            RetrievalQuery(
                text="Кто обязан делать капитальный ремонт?",
                clause_type=ClauseType.REPAIRS,
                language="ru",
            ),
            {"civil-552-capital-repair"},
        ),
        (
            RetrievalQuery(
                text="Что произойдет с договором, если квартиру продадут?",
                clause_type=ClauseType.TERMINATION,
                language="ru",
            ),
            {"civil-559-change-of-owner", "housing-24-change-of-owner"},
        ),
    ],
)
def test_retrieves_relevant_legal_passage(
    retriever: HybridRetriever, query: RetrievalQuery, expected_ids: set[str]
) -> None:
    results = retriever.search(query, limit=5)

    assert expected_ids & {result.chunk.id for result in results}


def test_exposes_normalized_component_scores(retriever: HybridRetriever) -> None:
    results = retriever.search(
        RetrievalQuery(
            text="условия оплаты аренды",
            clause_type=ClauseType.RENT,
            language="ru",
        ),
        limit=5,
    )

    assert results
    assert [result.final_score for result in results] == sorted(
        (result.final_score for result in results), reverse=True
    )
    for result in results:
        assert 0 <= result.lexical_score <= 1
        assert 0 <= result.vector_score <= 1
        assert 0 <= result.metadata_score <= 1
        assert 0 <= result.final_score <= 1


def test_filters_inactive_and_other_language_chunks(retriever: HybridRetriever) -> None:
    results = retriever.search(
        RetrievalQuery(text="договор аренды", clause_type=ClauseType.TERM, language="ru"),
        limit=20,
    )

    assert results
    assert all(result.chunk.status == "active" for result in results)
    assert all(result.chunk.language == "ru" for result in results)


def test_rejects_invalid_limit(retriever: HybridRetriever) -> None:
    with pytest.raises(ValueError, match="limit"):
        retriever.search(RetrievalQuery(text="ремонт", language="ru"), limit=0)
