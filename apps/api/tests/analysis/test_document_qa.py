from __future__ import annotations

import hashlib
from uuid import uuid4

import pytest

from qadam_api.analysis.document_qa import (
    DeterministicQuestionProvider,
    DocumentQuestionAnswerer,
    ProviderAnswer,
    QuestionContext,
    ResilientQuestionProvider,
    rank_document_evidence,
)
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


def evidence(index: int, text: str, page: int | None = 1) -> DocumentEvidenceBlock:
    return DocumentEvidenceBlock(
        block_index=index,
        source_block_index=index,
        text=text,
        kind="page_text",
        page_number=page,
        checksum_sha256=hashlib.sha256(text.encode("utf-8")).hexdigest(),
    )


BLOCKS = (
    evidence(0, "Объект аренды расположен в городе Караганда, улица Ермекова."),
    evidence(1, "Срок найма составляет одиннадцать месяцев с 1 августа 2026 года."),
    evidence(2, "Ежемесячная плата составляет 214 000 тенге."),
    evidence(3, "Арендатор вправе проживать с одной домашней кошкой."),
    evidence(4, "Воду и электричество оплачивает арендатор."),
    evidence(5, "Депозит возвращается в течение семи рабочих дней."),
    evidence(6, "Арендодатель предупреждает о визите не менее чем за 24 часа."),
    evidence(7, "Жалдау ақысы айына 190 000 теңге мөлшерінде төленеді."),
)


def test_ranks_inflected_russian_fact_from_unseen_document() -> None:
    matches = rank_document_evidence("В каком городе находится квартира?", BLOCKS)

    assert matches
    assert matches[0].block.block_index == 0
    assert matches[0].score >= 0.35


def test_ranks_non_catalogue_pet_condition() -> None:
    matches = rank_document_evidence("Можно ли проживать с кошкой?", BLOCKS)

    assert matches[0].block.block_index == 3


def test_matches_common_living_synonym_to_residence_condition() -> None:
    matches = rank_document_evidence("Можно ли жить с кошкой?", BLOCKS)

    assert matches[0].block.block_index == 3


@pytest.mark.parametrize(
    ("question", "expected_index"),
    [
        ("Какой срок аренды?", 1),
        ("Сколько составляет ежемесячная плата?", 2),
        ("Кто оплачивает воду и электричество?", 4),
        ("Когда возвращают депозит?", 5),
        ("За сколько часов хозяин предупреждает о визите?", 6),
        ("Жалдау ақысы қанша?", 7),
        ("Что начинается 1 августа 2026 года?", 1),
    ],
)
def test_ranks_labelled_rental_facts(question: str, expected_index: int) -> None:
    matches = rank_document_evidence(question, BLOCKS)

    assert matches
    assert matches[0].block.block_index == expected_index


@pytest.mark.parametrize(
    ("question", "blocks", "expected_index"),
    [
        ("Какая арендная плата?", (BLOCKS[7],), 7),
        ("Жалдау ақысы қанша?", (BLOCKS[2],), 2),
        ("Үй иесі қашан кіре алады?", (BLOCKS[6],), 6),
        ("Какой депозит?", (evidence(20, "Кепіл сомасы 100 000 теңге."),), 20),
        ("Какой срок договора?", (evidence(21, "Шарт мерзімі 11 ай."),), 21),
        (
            "Какой срок уведомления о расторжении?",
            (evidence(22, "Шартты бұзу үшін 30 күн бұрын хабарлау керек."),),
            22,
        ),
        (
            "Кто оплачивает коммунальные услуги?",
            (evidence(23, "Су мен жарықты жалға алушы төлейді."),),
            23,
        ),
        ("Кто оплачивает ремонт?", (evidence(24, "Жөндеуді жалға беруші төлейді."),), 24),
        ("Можно ли жить с кошкой?", (evidence(25, "Пәтерде мысықпен тұруға болады."),), 25),
        ("Какой адрес объекта?", (evidence(26, "Нысанның мекенжайы: Алматы қаласы."),), 26),
    ],
)
def test_retrieves_contract_facts_across_russian_and_kazakh(
    question: str,
    blocks: tuple[DocumentEvidenceBlock, ...],
    expected_index: int,
) -> None:
    matches = rank_document_evidence(question, blocks)

    assert matches
    assert matches[0].block.block_index == expected_index


def test_cross_language_expansion_does_not_invent_parking() -> None:
    assert rank_document_evidence("Есть ли парковочное место?", BLOCKS) == ()


def test_rejects_unrelated_question() -> None:
    assert rank_document_evidence("Какие акции купить завтра?", BLOCKS) == ()


def test_attaches_condition_after_a_short_heading() -> None:
    blocks = (
        evidence(10, "Срок найма", page=2),
        evidence(11, "Одиннадцать месяцев с 1 августа 2026 года.", page=2),
    )

    matches = rank_document_evidence("Какой срок найма?", blocks)

    assert matches[0].block.block_index == 10
    assert matches[1].block.block_index == 11
    assert matches[1].adjacent is True


def test_answer_includes_adjacent_evidence_that_also_ranks_independently() -> None:
    blocks = (
        evidence(10, "Арендодатель может повысить арендную"),
        evidence(11, "плату в одностороннем порядке."),
        evidence(12, "Арендатор оплачивает коммунальные услуги."),
    )

    result = DocumentQuestionAnswerer(DeterministicQuestionProvider()).answer(
        "Может ли арендодатель менять арендную плату?",
        blocks,
        completed_report(),
    )

    assert result is not None
    assert "в одностороннем порядке" in result.answer
    assert [item.block.block_index for item in result.evidence] == [10, 11]


def completed_report(status: AnalysisStatus = AnalysisStatus.COMPLETED) -> AnalysisReport:
    return AnalysisReport(
        id=uuid4(),
        status=status,
        language="ru",
        summary="Готово",
    )


def action_report() -> tuple[AnalysisReport, tuple[DocumentEvidenceBlock, ...]]:
    deposit_clause = Clause(
        id=uuid4(),
        type=ClauseType.DEPOSIT,
        title="Возврат депозита",
        text="Депозит возвращается без указанного срока.",
        span=ClauseSpan(block_start=30, block_end=30, page_start=1, page_end=1),
        confidence=0.91,
        extraction_method="rules",
    )
    termination_clause = Clause(
        id=uuid4(),
        type=ClauseType.TERMINATION,
        title="Расторжение",
        text="Арендодатель расторгает договор без уведомления.",
        span=ClauseSpan(block_start=31, block_end=31, page_start=2, page_end=2),
        confidence=0.87,
        extraction_method="rules",
    )
    deposit_source = Citation(
        source_id="civil-deposit",
        source_title="Гражданский кодекс Республики Казахстан",
        reference="Статья 552",
        url="https://adilet.zan.kz/rus/docs/K990000409_",
        excerpt="Официальный фрагмент о возврате имущества.",
    )
    termination_source = Citation(
        source_id="civil-termination",
        source_title="Гражданский кодекс Республики Казахстан",
        reference="Статья 401",
        url="https://adilet.zan.kz/rus/docs/K940001000_",
        excerpt="Официальный фрагмент о расторжении договора.",
    )
    findings = [
        Finding(
            id=uuid4(),
            severity=Severity.HIGH,
            category=ClauseType.DEPOSIT,
            title="Неясен срок возврата депозита",
            explanation="Срок возврата не указан.",
            action="Зафиксируйте срок возврата и основания удержания.",
            landlord_question="Когда возвращается депозит?",
            clause=deposit_clause,
            citations=[deposit_source],
            confidence=0.91,
        ),
        Finding(
            id=uuid4(),
            severity=Severity.ATTENTION,
            category=ClauseType.TERMINATION,
            title="Расторжение без уведомления",
            explanation="Нет взаимного срока уведомления.",
            action="Согласуйте взаимный письменный срок уведомления.",
            landlord_question="Какой срок уведомления действует для сторон?",
            clause=termination_clause,
            citations=[termination_source],
            confidence=0.87,
        ),
    ]
    report = AnalysisReport(
        id=uuid4(),
        status=AnalysisStatus.COMPLETED,
        language="mixed",
        summary="Два пункта требуют изменений.",
        findings=findings,
    )
    blocks = (
        evidence(30, deposit_clause.text, page=1),
        evidence(31, termination_clause.text, page=2),
    )
    return report, blocks


@pytest.mark.parametrize(
    "question",
    ["Как решить найденные проблемы?", "Бұл мәселелерді қалай өзгертуге болады?"],
)
def test_generic_action_question_reuses_grounded_findings(question: str) -> None:
    report, blocks = action_report()

    result = DocumentQuestionAnswerer(DeterministicQuestionProvider()).answer(
        question,
        blocks,
        report,
    )

    assert result is not None
    assert result.mode == "action"
    assert result.finding_ids == tuple(item.id for item in report.findings)
    assert "Почему это риск" in result.answer
    assert "Вопрос арендодателю" in result.answer
    assert "Зафиксируйте срок возврата" in result.answer
    assert "Согласуйте взаимный письменный срок" in result.answer
    assert {item.block.block_index for item in result.evidence} == {30, 31}
    assert {item.source_id for item in result.citations} == {
        "civil-deposit",
        "civil-termination",
    }


def test_category_action_question_selects_only_termination() -> None:
    report, blocks = action_report()

    result = DocumentQuestionAnswerer(DeterministicQuestionProvider()).answer(
        "Как исправить условие о расторжении?",
        blocks,
        report,
    )

    assert result is not None
    assert result.finding_ids == (report.findings[1].id,)
    assert "Согласуйте взаимный письменный срок" in result.answer
    assert "возврата" not in result.answer.casefold()
    assert [item.block.block_index for item in result.evidence] == [31]


def test_action_question_without_findings_or_clause_evidence_is_refused() -> None:
    answerer = DocumentQuestionAnswerer(DeterministicQuestionProvider())
    report, _blocks = action_report()

    assert answerer.answer("Что делать с проблемами?", BLOCKS, completed_report()) is None
    assert answerer.answer("Что делать с проблемами?", BLOCKS, report) is None


def test_answerer_builds_answer_from_retrieved_document_text() -> None:
    answerer = DocumentQuestionAnswerer(DeterministicQuestionProvider())

    result = answerer.answer("В каком городе квартира?", BLOCKS, completed_report())

    assert result is not None
    assert "Караганда" in result.answer
    assert result.evidence[0].block.block_index == 0


class FabricatingProvider:
    def answer(self, context: QuestionContext) -> ProviderAnswer:
        return ProviderAnswer(
            answer="Аренда стоит 999 999 тенге.",
            evidence_block_indexes=[999],
            confidence=0.99,
        )


def test_resilient_provider_rejects_unknown_evidence_and_falls_back() -> None:
    answerer = DocumentQuestionAnswerer(
        ResilientQuestionProvider(
            primary=FabricatingProvider(),
            fallback=DeterministicQuestionProvider(),
        )
    )

    result = answerer.answer(
        "Сколько составляет ежемесячная плата?",
        BLOCKS,
        completed_report(),
    )

    assert result is not None
    assert "214 000" in result.answer
    assert "999 999" not in result.answer


def test_answerer_refuses_unrelated_or_incomplete_analysis() -> None:
    answerer = DocumentQuestionAnswerer(DeterministicQuestionProvider())

    unrelated = answerer.answer("Какие акции купить?", BLOCKS, completed_report())
    in_progress = answerer.answer(
        "В каком городе квартира?",
        BLOCKS,
        completed_report(AnalysisStatus.ANALYZING),
    )

    assert unrelated is None
    assert in_progress is None
