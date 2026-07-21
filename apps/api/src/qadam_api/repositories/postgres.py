"""SQLAlchemy/PostgreSQL repository and normalized audit tables."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
    delete,
    select,
)
from sqlalchemy import (
    text as sql_text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

from qadam_api.documents.types import DocumentEvidenceBlock
from qadam_api.domain import AnalysisReport
from qadam_api.repositories.base import AnalysisRecord, FeedbackRecord, QuestionRecord


class Base(DeclarativeBase):
    pass


class AnalysisRow(Base):
    __tablename__ = "analyses"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    language: Mapped[str] = mapped_column(String(16), nullable=False)
    access_token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    report_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class DocumentRow(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    analysis_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("analyses.id", ondelete="CASCADE"), unique=True
    )
    checksum_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    evidence_json: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
        server_default=sql_text("'[]'::jsonb"),
    )


class ClauseRow(Base):
    __tablename__ = "clauses"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    analysis_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("analyses.id", ondelete="CASCADE"), index=True
    )
    clause_type: Mapped[str] = mapped_column(String(64), nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)


class LegalChunkRow(Base):
    __tablename__ = "legal_chunks"

    id: Mapped[str] = mapped_column(String(160), primary_key=True)
    act_title: Mapped[str] = mapped_column(Text, nullable=False)
    article_ref: Mapped[str] = mapped_column(String(160), nullable=False)
    canonical_url: Mapped[str] = mapped_column(Text, nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)


class FindingRow(Base):
    __tablename__ = "findings"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    analysis_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("analyses.id", ondelete="CASCADE"), index=True
    )
    severity: Mapped[str] = mapped_column(String(32), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)


class RetrievalLogRow(Base):
    __tablename__ = "retrieval_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    analysis_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("analyses.id", ondelete="CASCADE"), index=True
    )
    query_text: Mapped[str] = mapped_column(Text, nullable=False)
    result_ids: Mapped[list[str]] = mapped_column(JSONB, nullable=False)


class QuestionRow(Base):
    __tablename__ = "questions"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    analysis_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("analyses.id", ondelete="CASCADE"), index=True
    )
    question: Mapped[str] = mapped_column(Text, nullable=False)
    supported: Mapped[bool] = mapped_column(Boolean, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class FeedbackRow(Base):
    __tablename__ = "feedback"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    analysis_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("analyses.id", ondelete="CASCADE"), index=True
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class PostgresRepository:
    """Persist reports and normalized findings using SQLAlchemy sessions."""

    def __init__(self, engine: Engine) -> None:
        self._sessions = sessionmaker(engine, expire_on_commit=False)

    @classmethod
    def from_url(cls, database_url: str) -> PostgresRepository:
        return cls(create_engine(database_url, pool_pre_ping=True))

    def create_schema(self) -> None:
        bind = self._sessions.kw["bind"]
        Base.metadata.create_all(bind)
        with bind.begin() as connection:
            connection.execute(
                sql_text(
                    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS "
                    "evidence_json JSONB NOT NULL DEFAULT '[]'::jsonb"
                )
            )

    def save_analysis(self, record: AnalysisRecord) -> None:
        report = record.report
        with self._sessions.begin() as session:
            session.merge(
                AnalysisRow(
                    id=report.id,
                    status=report.status.value,
                    language=report.language,
                    access_token_hash=record.access_token_hash,
                    report_json=report.model_dump(mode="json"),
                    created_at=record.created_at,
                )
            )
            document = session.scalar(
                select(DocumentRow).where(DocumentRow.analysis_id == report.id)
            )
            evidence_json = [block.model_dump(mode="json") for block in record.evidence]
            if document is None:
                session.add(
                    DocumentRow(
                        analysis_id=report.id,
                        checksum_sha256=record.document_checksum,
                        evidence_json=evidence_json,
                    )
                )
            else:
                document.checksum_sha256 = record.document_checksum
                document.evidence_json = evidence_json
            session.execute(delete(ClauseRow).where(ClauseRow.analysis_id == report.id))
            session.execute(delete(FindingRow).where(FindingRow.analysis_id == report.id))
            self._add_findings(session, report)

    @staticmethod
    def _add_findings(session: Session, report: AnalysisReport) -> None:
        clause_ids: set[UUID] = set()
        for finding in report.findings:
            if finding.clause is not None and finding.clause.id not in clause_ids:
                clause_ids.add(finding.clause.id)
                session.add(
                    ClauseRow(
                        id=finding.clause.id,
                        analysis_id=report.id,
                        clause_type=finding.clause.type.value,
                        payload=finding.clause.model_dump(mode="json"),
                    )
                )
            session.add(
                FindingRow(
                    id=finding.id,
                    analysis_id=report.id,
                    severity=finding.severity.value,
                    category=finding.category.value,
                    payload=finding.model_dump(mode="json"),
                )
            )

    def get_analysis(self, analysis_id: UUID) -> AnalysisRecord | None:
        with self._sessions() as session:
            row = session.get(AnalysisRow, analysis_id)
            if row is None:
                return None
            document = session.scalar(
                select(DocumentRow).where(DocumentRow.analysis_id == analysis_id)
            )
            if document is None:
                raise RuntimeError("analysis document row is missing")
            return AnalysisRecord(
                report=AnalysisReport.model_validate(row.report_json),
                access_token_hash=row.access_token_hash,
                document_checksum=document.checksum_sha256,
                created_at=row.created_at,
                evidence=tuple(
                    DocumentEvidenceBlock.model_validate(item) for item in document.evidence_json
                ),
            )

    def save_question(self, record: QuestionRecord) -> None:
        with self._sessions.begin() as session:
            session.add(
                QuestionRow(
                    id=record.id,
                    analysis_id=record.analysis_id,
                    question=record.question,
                    supported=record.supported,
                    created_at=record.created_at,
                )
            )

    def save_feedback(self, record: FeedbackRecord) -> None:
        with self._sessions.begin() as session:
            session.add(
                FeedbackRow(
                    id=record.id,
                    analysis_id=record.analysis_id,
                    rating=record.rating,
                    comment=record.comment,
                    created_at=record.created_at,
                )
            )
