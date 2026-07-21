from pathlib import Path

from qadam_api.domain import ClauseType
from qadam_api.legal.corpus import load_corpus
from qadam_api.legal.reranker import rerank_results
from qadam_api.legal.retriever import HybridRetriever, RetrievalQuery
from qadam_api.providers.embeddings import DeterministicHashEmbedding

CORPUS_ROOT = Path(__file__).parents[4] / "corpus/legal"


def make_results(query: RetrievalQuery):  # type: ignore[no-untyped-def]
    retriever = HybridRetriever(
        chunks=load_corpus(CORPUS_ROOT),
        embeddings=DeterministicHashEmbedding(dimensions=64),
    )
    return retriever.search(query, limit=20)


def test_reranker_prioritizes_explicit_article_reference() -> None:
    query = RetrievalQuery(text="Что сказано в статье 552?", language="ru")

    reranked = rerank_results(query, make_results(query))

    assert reranked[0].chunk.id == "civil-552-capital-repair"
    assert reranked[0].rerank_reasons == ["explicit_article_reference"]


def test_reranker_boosts_matching_clause_family() -> None:
    query = RetrievalQuery(
        text="кто отвечает за поломки",
        clause_type=ClauseType.REPAIRS,
        language="ru",
    )

    reranked = rerank_results(query, make_results(query))

    assert ClauseType.REPAIRS in reranked[0].chunk.clause_types
    assert "clause_family_match" in reranked[0].rerank_reasons


def test_reranker_is_stable_for_equal_inputs() -> None:
    query = RetrievalQuery(text="условия договора", language="ru")
    results = make_results(query)

    first = rerank_results(query, results)
    second = rerank_results(query, list(reversed(results)))

    assert [item.chunk.id for item in first] == [item.chunk.id for item in second]
