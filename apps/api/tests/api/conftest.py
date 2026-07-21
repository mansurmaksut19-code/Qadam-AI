from __future__ import annotations

import hashlib
from collections.abc import Iterator
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from qadam_api.analysis.orchestrator import AnalysisOutcome
from qadam_api.api.dependencies import get_orchestrator, get_repository
from qadam_api.documents.types import DocumentEvidenceBlock
from qadam_api.domain import (
    AnalysisReport,
    AnalysisStatus,
    Citation,
    Clause,
    ClauseSpan,
    ClauseType,
    Finding,
    Severity,
)
from qadam_api.main import create_app
from qadam_api.repositories.memory import InMemoryRepository


class StubOrchestrator:
    """Small deterministic boundary fake; parser and rules are covered separately."""

    def analyze(self, upload: object, *, on_stage: object = None) -> AnalysisOutcome:
        filename = str(getattr(upload, "filename", "contract.docx"))
        if filename == "scan.pdf":
            return AnalysisOutcome(
                report=AnalysisReport(
                    id=uuid4(),
                    status=AnalysisStatus.FAILED,
                    language="ru",
                    summary="В PDF недостаточно распознаваемого текста.",
                    failure_code="ocr_required",
                )
            )

        clause = Clause(
            id=uuid4(),
            type=ClauseType.DEPOSIT,
            title="Возврат депозита",
            text="Депозит не возвращается ни при каких обстоятельствах.",
            span=ClauseSpan(block_start=2, block_end=2),
            confidence=0.94,
            extraction_method="rules",
        )
        finding = Finding(
            id=uuid4(),
            severity=Severity.HIGH,
            category=ClauseType.DEPOSIT,
            title="Неясный порядок возврата депозита",
            explanation="Условие не описывает расчёт удержаний и срок возврата.",
            action="Зафиксируйте срок возврата и перечень подтверждаемых удержаний.",
            landlord_question="Когда и на каких основаниях возвращается депозит?",
            clause=clause,
            citations=[
                Citation(
                    source_id="civil-lease-552",
                    source_title="Гражданский кодекс Республики Казахстан",
                    reference="Статья 552",
                    url="https://adilet.zan.kz/rus/docs/K990000409_",
                    excerpt="Наниматель обязан возвратить имущество в надлежащем состоянии.",
                )
            ],
            confidence=0.9,
        )
        city_text = "Объект аренды: квартира в городе Караганда."
        deposit_text = "Депозит не возвращается ни при каких обстоятельствах."
        return AnalysisOutcome(
            report=AnalysisReport(
                id=uuid4(),
                status=AnalysisStatus.COMPLETED,
                language="ru",
                summary="Найден один пункт высокого приоритета.",
                findings=[finding],
                missing_terms=[ClauseType.UTILITIES],
                question_suggestions=["Как изменить условие о депозите?"],
            ),
            evidence=(
                DocumentEvidenceBlock(
                    block_index=0,
                    source_block_index=0,
                    text=city_text,
                    kind="paragraph",
                    paragraph_number=0,
                    checksum_sha256=hashlib.sha256(city_text.encode("utf-8")).hexdigest(),
                ),
                DocumentEvidenceBlock(
                    block_index=1,
                    source_block_index=2,
                    text=deposit_text,
                    kind="paragraph",
                    paragraph_number=2,
                    checksum_sha256=hashlib.sha256(deposit_text.encode("utf-8")).hexdigest(),
                ),
            ),
        )


@pytest.fixture
def repository() -> InMemoryRepository:
    return InMemoryRepository()


@pytest.fixture
def client(repository: InMemoryRepository) -> Iterator[TestClient]:
    app = create_app()
    app.dependency_overrides[get_repository] = lambda: repository
    app.dependency_overrides[get_orchestrator] = StubOrchestrator
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def uploaded_analysis(client: TestClient) -> tuple[UUID, str]:
    response = client.post(
        "/api/v1/analyses",
        files={
            "file": (
                "contract.docx",
                _minimal_docx(),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )
    payload = response.json()
    return UUID(payload["analysis_id"]), payload["access_token"]


def _minimal_docx() -> bytes:
    from io import BytesIO

    from docx import Document

    document = Document()
    document.add_paragraph("Договор найма жилого помещения")
    buffer = BytesIO()
    document.save(buffer)
    return buffer.getvalue()
