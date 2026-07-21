"""Reject findings that exceed retrieved contract and legal evidence."""

from __future__ import annotations

import re

from qadam_api.domain import Citation, ClauseType, Finding
from qadam_api.legal.corpus import LegalChunk


class GroundingError(ValueError):
    """Stable reason why a candidate finding cannot be shown to a user."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


def citation_from_chunk(chunk: LegalChunk) -> Citation:
    """Convert an allow-listed retrieved chunk to a public citation."""

    return Citation(
        source_id=chunk.id,
        source_title=chunk.act_title,
        reference=chunk.article_ref,
        url=str(chunk.canonical_url),
        excerpt=chunk.text,
    )


def validate_grounded_finding(finding: Finding, *, retrieved_chunks: list[LegalChunk]) -> Finding:
    """Return the finding only when its contract and legal evidence is usable."""

    retrieved = {chunk.id: chunk for chunk in retrieved_chunks}
    for citation in finding.citations:
        chunk = retrieved.get(citation.source_id)
        if chunk is None:
            raise GroundingError(
                "ungrounded_citation", "Finding references a source that retrieval did not select."
            )
        if finding.category is not ClauseType.OTHER and finding.category not in chunk.clause_types:
            raise GroundingError(
                "unrelated_citation", "Retrieved source is unrelated to the finding clause family."
            )

    if finding.category is not ClauseType.OTHER and finding.clause is None:
        raise GroundingError(
            "missing_contract_span", "Document-specific finding has no source clause span."
        )
    if re.search(r"\bнезакон\w*|\bнедействител\w*", finding.explanation, re.IGNORECASE):
        raise GroundingError(
            "unsupported_illegal_claim", "Categorical illegality claims require manual review."
        )
    return finding
