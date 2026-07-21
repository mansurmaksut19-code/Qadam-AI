from pathlib import Path
from uuid import uuid4

import pytest

from qadam_api.analysis.grounding import (
    GroundingError,
    citation_from_chunk,
    validate_grounded_finding,
)
from qadam_api.domain import Citation, Clause, ClauseSpan, ClauseType, Finding, Severity
from qadam_api.legal.corpus import LegalChunk, load_corpus

CORPUS_ROOT = Path(__file__).parents[4] / "corpus/legal"


def legal_chunk(chunk_id: str) -> LegalChunk:
    return next(chunk for chunk in load_corpus(CORPUS_ROOT) if chunk.id == chunk_id)


def make_clause(clause_type: ClauseType = ClauseType.REPAIRS) -> Clause:
    return Clause(
        id=uuid4(),
        type=clause_type,
        title="Условие договора",
        text="Капитальный ремонт оплачивает арендатор.",
        span=ClauseSpan(block_start=4, block_end=4, page_start=2, page_end=2),
        confidence=0.9,
        extraction_method="rules",
    )


def make_finding(
    *,
    category: ClauseType = ClauseType.REPAIRS,
    citation: Citation | None = None,
    clause_value: Clause | None = None,
    explanation: str = "Условие перекладывает капитальный ремонт на арендатора.",
) -> Finding:
    return Finding(
        id=uuid4(),
        severity=Severity.HIGH,
        category=category,
        title="Капитальный ремонт за счет арендатора",
        explanation=explanation,
        action="Уточните распределение ремонта до подписания.",
        landlord_question="Можно ли оставить капитальный ремонт обязанностью владельца?",
        clause=clause_value if clause_value is not None else make_clause(category),
        citations=[citation or citation_from_chunk(legal_chunk("civil-552-capital-repair"))],
        confidence=0.9,
    )


def test_rejects_citation_that_was_not_retrieved() -> None:
    fabricated = Citation(
        source_id="invented-law-999",
        source_title="Выдуманный источник",
        reference="Статья 999",
        url="https://adilet.zan.kz/rus/docs/INVENTED",
        excerpt="Выдуманный текст.",
    )

    with pytest.raises(GroundingError) as error:
        validate_grounded_finding(
            make_finding(citation=fabricated),
            retrieved_chunks=[legal_chunk("civil-552-capital-repair")],
        )

    assert error.value.code == "ungrounded_citation"


def test_rejects_citation_unrelated_to_finding_family() -> None:
    repair_source = legal_chunk("civil-552-capital-repair")

    with pytest.raises(GroundingError) as error:
        validate_grounded_finding(
            make_finding(
                category=ClauseType.DEPOSIT,
                citation=citation_from_chunk(repair_source),
                clause_value=make_clause(ClauseType.DEPOSIT),
            ),
            retrieved_chunks=[repair_source],
        )

    assert error.value.code == "unrelated_citation"


def test_rejects_document_specific_claim_without_clause_span() -> None:
    source = legal_chunk("civil-546-rent-payment")
    finding = make_finding(
        category=ClauseType.RENT,
        citation=citation_from_chunk(source),
        clause_value=make_clause(ClauseType.RENT),
    ).model_copy(update={"clause": None})

    with pytest.raises(GroundingError) as error:
        validate_grounded_finding(finding, retrieved_chunks=[source])

    assert error.value.code == "missing_contract_span"


def test_rejects_categorical_illegal_claim() -> None:
    source = legal_chunk("civil-546-rent-payment")

    with pytest.raises(GroundingError) as error:
        validate_grounded_finding(
            make_finding(
                category=ClauseType.RENT,
                citation=citation_from_chunk(source),
                clause_value=make_clause(ClauseType.RENT),
                explanation="Это условие незаконно и договор недействителен.",
            ),
            retrieved_chunks=[source],
        )

    assert error.value.code == "unsupported_illegal_claim"


def test_accepts_finding_grounded_in_clause_and_relevant_source() -> None:
    source = legal_chunk("civil-552-capital-repair")
    finding = make_finding(citation=citation_from_chunk(source))

    assert validate_grounded_finding(finding, retrieved_chunks=[source]) is finding
