"""Second-stage legal candidate reranking with inspectable reasons."""

from __future__ import annotations

import re
from dataclasses import replace

from qadam_api.legal.retriever import RetrievalQuery, RetrievalResult

_ARTICLE = re.compile(r"\bстать\w*\s+(\d+)", re.IGNORECASE)


def rerank_results(query: RetrievalQuery, results: list[RetrievalResult]) -> list[RetrievalResult]:
    """Boost explicit article and clause-family matches, preserving score evidence."""

    article_match = _ARTICLE.search(query.text)
    article_number = article_match.group(1) if article_match else None
    reranked: list[RetrievalResult] = []

    for result in results:
        reasons: list[str] = []
        score = result.final_score * 0.7
        if article_number and re.search(
            rf"\b{re.escape(article_number)}\b", result.chunk.article_ref
        ):
            score += 0.3
            reasons.append("explicit_article_reference")
        if query.clause_type is not None and query.clause_type in result.chunk.clause_types:
            score += 0.15
            reasons.append("clause_family_match")
        reranked.append(
            replace(
                result,
                rerank_score=min(1.0, score),
                rerank_reasons=reasons,
            )
        )

    return sorted(
        reranked,
        key=lambda item: (-(item.rerank_score or 0.0), item.chunk.id),
    )
