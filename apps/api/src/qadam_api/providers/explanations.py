"""Structured explanation providers with a deterministic safety fallback."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol
from uuid import uuid4

from pydantic import ValidationError

from qadam_api.analysis.grounding import citation_from_chunk
from qadam_api.analysis.rules import RuleMatch
from qadam_api.domain import Finding
from qadam_api.legal.corpus import LegalChunk


@dataclass(frozen=True, slots=True)
class ExplanationContext:
    """Only evidence an explanation provider is allowed to use."""

    rule: RuleMatch
    legal_chunks: list[LegalChunk]


class ExplanationProvider(Protocol):
    """Generate a schema-validated explanation from allow-listed evidence."""

    def explain(self, context: ExplanationContext) -> Finding:
        """Return a structured user-facing finding."""
        ...


class ProviderValidationError(ValueError):
    """Provider returned content outside the retrieved evidence."""


class DeterministicExplanationProvider:
    """Stable offline formatter used for tests and demo continuity."""

    def explain(self, context: ExplanationContext) -> Finding:
        return Finding(
            id=uuid4(),
            severity=context.rule.severity,
            category=context.rule.category,
            title=context.rule.title,
            explanation=context.rule.reason,
            action=context.rule.action,
            landlord_question=context.rule.landlord_question,
            clause=context.rule.clause,
            citations=[citation_from_chunk(chunk) for chunk in context.legal_chunks],
            confidence=context.rule.confidence,
        )


def _validate_allowed_citations(finding: Finding, context: ExplanationContext) -> Finding:
    allowed_ids = {chunk.id for chunk in context.legal_chunks}
    returned_ids = {citation.source_id for citation in finding.citations}
    if not returned_ids <= allowed_ids:
        raise ProviderValidationError("provider returned a citation outside the allow-list")
    return finding


class ResilientExplanationProvider:
    """Use the safe formatter when a model times out or violates the schema/evidence contract."""

    def __init__(self, *, primary: ExplanationProvider, fallback: ExplanationProvider) -> None:
        self._primary = primary
        self._fallback = fallback

    def explain(self, context: ExplanationContext) -> Finding:
        try:
            finding = self._primary.explain(context)
            return _validate_allowed_citations(finding, context)
        except (TimeoutError, ProviderValidationError, ValidationError, ValueError):
            return self._fallback.explain(context)
