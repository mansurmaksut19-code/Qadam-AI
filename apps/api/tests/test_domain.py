from uuid import uuid4

import pytest
from pydantic import ValidationError

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


def make_clause(*, confidence: float = 0.9) -> Clause:
    return Clause(
        id=uuid4(),
        type=ClauseType.DEPOSIT,
        title="Обеспечительный платеж",
        text="Депозит составляет 200 000 тенге.",
        span=ClauseSpan(block_start=3, block_end=3, page_start=1, page_end=1),
        confidence=confidence,
        extraction_method="rules",
    )


def make_citation() -> Citation:
    return Citation(
        source_id="civil-code-552",
        source_title="Гражданский кодекс Республики Казахстан",
        reference="Статья 552",
        url="https://adilet.zan.kz/rus/docs/K990000409_",
        excerpt="Наймодатель обязан производить за свой счет капитальный ремонт.",
    )


def make_finding(*, severity: Severity = Severity.ATTENTION) -> Finding:
    return Finding(
        id=uuid4(),
        severity=severity,
        category=ClauseType.DEPOSIT,
        title="Не указан срок возврата депозита",
        explanation="Непонятно, когда арендодатель должен вернуть деньги.",
        action="Зафиксируйте срок возврата депозита в договоре.",
        landlord_question="В какой срок вы вернете депозит после выезда?",
        clause=make_clause(),
        citations=[make_citation()],
        confidence=0.88,
    )


@pytest.mark.parametrize("confidence", [-0.01, 1.01])
def test_clause_rejects_confidence_outside_unit_interval(confidence: float) -> None:
    with pytest.raises(ValidationError):
        make_clause(confidence=confidence)


@pytest.mark.parametrize(
    ("url", "reference"),
    [
        ("http://adilet.zan.kz/rus/docs/K990000409_", "Статья 552"),
        ("https://adilet.zan.kz/rus/docs/K990000409_", ""),
    ],
)
def test_citation_requires_https_url_and_reference(url: str, reference: str) -> None:
    with pytest.raises(ValidationError):
        Citation(
            source_id="civil-code-552",
            source_title="Гражданский кодекс Республики Казахстан",
            reference=reference,
            url=url,
            excerpt="Фрагмент нормы",
        )


def test_high_severity_finding_requires_legal_citation() -> None:
    with pytest.raises(ValidationError, match="citation"):
        Finding(
            id=uuid4(),
            severity=Severity.HIGH,
            category=ClauseType.TERMINATION,
            title="Одностороннее немедленное расторжение",
            explanation="Арендодатель оставляет за собой право прекратить договор сразу.",
            action="Запросите взаимный срок предварительного уведомления.",
            landlord_question="Можно ли установить одинаковый срок уведомления для сторон?",
            clause=make_clause(),
            citations=[],
            confidence=0.8,
        )


def test_report_calculates_severity_counts_from_findings() -> None:
    report = AnalysisReport(
        id=uuid4(),
        status=AnalysisStatus.COMPLETED,
        language="ru",
        summary="В договоре есть условия, требующие уточнения.",
        findings=[
            make_finding(severity=Severity.HIGH),
            make_finding(severity=Severity.ATTENTION),
            make_finding(severity=Severity.ATTENTION),
        ],
        missing_terms=[ClauseType.UTILITIES],
    )

    assert report.severity_counts == {"high": 1, "attention": 2, "info": 0}
    assert report.question_suggestions == []


def test_analysis_status_rejects_unknown_value() -> None:
    with pytest.raises(ValidationError):
        AnalysisReport(
            id=uuid4(),
            status="done",
            language="ru",
            summary="",
            findings=[],
            missing_terms=[],
        )
