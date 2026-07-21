"""Stable domain schemas shared by QADAM AI analysis components and API routes."""

from __future__ import annotations

from enum import StrEnum
from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field, computed_field, field_validator, model_validator

Confidence = Annotated[float, Field(ge=0.0, le=1.0)]
NonEmptyText = Annotated[str, Field(min_length=1)]


class AnalysisStatus(StrEnum):
    """Lifecycle states exposed to the web application."""

    QUEUED = "queued"
    EXTRACTING = "extracting"
    ANALYZING = "analyzing"
    COMPLETED = "completed"
    FAILED = "failed"


class Severity(StrEnum):
    """User-facing priority without claiming a legal safety verdict."""

    INFO = "info"
    ATTENTION = "attention"
    HIGH = "high"


class ClauseType(StrEnum):
    """Clause families supported by the online-stage MVP."""

    PROPERTY = "property"
    TERM = "term"
    RENT = "rent"
    DEPOSIT = "deposit"
    UTILITIES = "utilities"
    HANDOVER = "handover"
    REPAIRS = "repairs"
    TERMINATION = "termination"
    EVICTION = "eviction"
    OCCUPANCY = "occupancy"
    LANDLORD_ACCESS = "landlord_access"
    PENALTIES = "penalties"
    RENT_CHANGE = "rent_change"
    OTHER = "other"


class ClauseSpan(BaseModel):
    """Location of a clause inside normalized document blocks."""

    block_start: Annotated[int, Field(ge=0)]
    block_end: Annotated[int, Field(ge=0)]
    page_start: Annotated[int, Field(ge=1)] | None = None
    page_end: Annotated[int, Field(ge=1)] | None = None

    @model_validator(mode="after")
    def validate_order(self) -> ClauseSpan:
        if self.block_end < self.block_start:
            raise ValueError("block_end must be greater than or equal to block_start")
        if (
            self.page_start is not None
            and self.page_end is not None
            and self.page_end < self.page_start
        ):
            raise ValueError("page_end must be greater than or equal to page_start")
        return self


class Clause(BaseModel):
    """A source-grounded logical clause extracted from a contract."""

    id: UUID
    type: ClauseType
    title: NonEmptyText
    text: NonEmptyText
    span: ClauseSpan
    confidence: Confidence
    extraction_method: Literal["rules", "model", "hybrid"]
    facts: dict[str, Any] = Field(default_factory=dict)


class Citation(BaseModel):
    """An official legal passage selected by retrieval."""

    source_id: NonEmptyText
    source_title: NonEmptyText
    reference: NonEmptyText
    url: NonEmptyText
    excerpt: NonEmptyText

    @field_validator("url")
    @classmethod
    def require_https(cls, value: str) -> str:
        if not value.startswith("https://"):
            raise ValueError("citation URL must use https")
        return value


class Finding(BaseModel):
    """A contract finding with evidence and a concrete next step."""

    id: UUID
    severity: Severity
    category: ClauseType
    title: NonEmptyText
    explanation: NonEmptyText
    action: NonEmptyText
    landlord_question: NonEmptyText
    clause: Clause | None
    citations: list[Citation] = Field(default_factory=list)
    confidence: Confidence

    @model_validator(mode="after")
    def require_citation_for_high_severity(self) -> Finding:
        if self.severity is Severity.HIGH and not self.citations:
            raise ValueError("a high-severity finding requires at least one citation")
        return self


class AnalysisReport(BaseModel):
    """Completed or in-progress analysis payload returned by the API."""

    id: UUID
    status: AnalysisStatus
    language: Literal["ru", "kz", "mixed"]
    summary: str
    findings: list[Finding] = Field(default_factory=list)
    missing_terms: list[ClauseType] = Field(default_factory=list)
    question_suggestions: list[str] = Field(default_factory=list, max_length=4)
    failure_code: str | None = None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def severity_counts(self) -> dict[str, int]:
        counts = {severity.value: 0 for severity in Severity}
        for finding in self.findings:
            counts[finding.severity.value] += 1
        return counts
