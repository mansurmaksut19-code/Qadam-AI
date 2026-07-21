"""Thread-safe process-local repository for local development and tests."""

from __future__ import annotations

from threading import RLock
from uuid import UUID

from qadam_api.repositories.base import AnalysisRecord, FeedbackRecord, QuestionRecord


class InMemoryRepository:
    def __init__(self) -> None:
        self._analyses: dict[UUID, AnalysisRecord] = {}
        self._questions: list[QuestionRecord] = []
        self._feedback: list[FeedbackRecord] = []
        self._lock = RLock()

    def save_analysis(self, record: AnalysisRecord) -> None:
        with self._lock:
            self._analyses[record.report.id] = record

    def get_analysis(self, analysis_id: UUID) -> AnalysisRecord | None:
        with self._lock:
            return self._analyses.get(analysis_id)

    def save_question(self, record: QuestionRecord) -> None:
        with self._lock:
            self._questions.append(record)

    def save_feedback(self, record: FeedbackRecord) -> None:
        with self._lock:
            self._feedback.append(record)

    @property
    def questions(self) -> tuple[QuestionRecord, ...]:
        return tuple(self._questions)

    @property
    def feedback(self) -> tuple[FeedbackRecord, ...]:
        return tuple(self._feedback)
