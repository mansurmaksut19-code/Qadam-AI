"""Repository contracts independent from the storage engine."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Protocol
from uuid import UUID, uuid4

from qadam_api.documents.types import DocumentEvidenceBlock
from qadam_api.domain import AnalysisReport


@dataclass(frozen=True, slots=True)
class AnalysisRecord:
    """Persisted report plus a one-way access-token digest."""

    report: AnalysisReport
    access_token_hash: str
    document_checksum: str
    created_at: datetime
    evidence: tuple[DocumentEvidenceBlock, ...] = ()


@dataclass(frozen=True, slots=True)
class QuestionRecord:
    id: UUID
    analysis_id: UUID
    question: str
    supported: bool
    created_at: datetime

    @classmethod
    def create(cls, *, analysis_id: UUID, question: str, supported: bool) -> QuestionRecord:
        return cls(
            id=uuid4(),
            analysis_id=analysis_id,
            question=question,
            supported=supported,
            created_at=datetime.now(UTC),
        )


@dataclass(frozen=True, slots=True)
class FeedbackRecord:
    id: UUID
    analysis_id: UUID
    rating: int
    comment: str | None
    created_at: datetime

    @classmethod
    def create(cls, *, analysis_id: UUID, rating: int, comment: str | None) -> FeedbackRecord:
        return cls(
            id=uuid4(),
            analysis_id=analysis_id,
            rating=rating,
            comment=comment,
            created_at=datetime.now(UTC),
        )


class AnalysisRepository(Protocol):
    """Minimum persistence surface required by the HTTP application."""

    def save_analysis(self, record: AnalysisRecord) -> None: ...

    def get_analysis(self, analysis_id: UUID) -> AnalysisRecord | None: ...

    def save_question(self, record: QuestionRecord) -> None: ...

    def save_feedback(self, record: FeedbackRecord) -> None: ...
