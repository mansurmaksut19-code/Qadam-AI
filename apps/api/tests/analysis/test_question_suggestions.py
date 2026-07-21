from uuid import uuid4

from qadam_api.analysis.question_suggestions import build_question_suggestions
from qadam_api.domain import Clause, ClauseSpan, ClauseType, Finding, Severity


def clause(category: ClauseType) -> Clause:
    return Clause(
        id=uuid4(),
        type=category,
        title=category.value,
        text=f"Явное условие: {category.value}",
        span=ClauseSpan(block_start=0, block_end=0),
        confidence=0.9,
        extraction_method="rules",
    )


def finding(category: ClauseType, severity: Severity) -> Finding:
    return Finding(
        id=uuid4(),
        severity=severity,
        category=category,
        title=category.value,
        explanation="Проверяемое объяснение",
        action="Зафиксируйте условие письменно.",
        landlord_question="Как будет действовать условие?",
        clause=clause(category),
        citations=[],
        confidence=0.8,
    )


def test_prioritises_finding_actions_then_document_facts() -> None:
    suggestions = build_question_suggestions(
        clauses=[clause(ClauseType.RENT), clause(ClauseType.DEPOSIT)],
        findings=[finding(ClauseType.TERMINATION, Severity.ATTENTION)],
        language="mixed",
    )

    assert suggestions == [
        "Как изменить условие о расторжении?",
        "Когда и при каких условиях вернут депозит?",
        "Какая ежемесячная плата?",
    ]


def test_never_suggests_absent_rent_change_and_limits_to_four() -> None:
    suggestions = build_question_suggestions(
        clauses=[
            clause(category)
            for category in (
                ClauseType.RENT,
                ClauseType.DEPOSIT,
                ClauseType.TERM,
                ClauseType.UTILITIES,
                ClauseType.OCCUPANCY,
            )
        ],
        findings=[],
        language="ru",
    )

    assert len(suggestions) == 4
    assert all("повыс" not in item.casefold() for item in suggestions)


def test_uses_kazakh_templates_for_kazakh_report() -> None:
    assert build_question_suggestions(
        clauses=[clause(ClauseType.RENT)],
        findings=[],
        language="kz",
    ) == ["Ай сайынғы жалдау ақысы қанша?"]


def test_uses_kazakh_action_templates_for_kazakh_report() -> None:
    suggestions = build_question_suggestions(
        clauses=[clause(ClauseType.TERMINATION)],
        findings=[finding(ClauseType.TERMINATION, Severity.ATTENTION)],
        language="kz",
    )

    assert suggestions[0] == "Шартты бұзу талабын қалай өзгертуге болады?"
