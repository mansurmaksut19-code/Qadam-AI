import json
from pathlib import Path
from uuid import UUID

import pytest

from qadam_api.analysis.clause_extractor import extract_clauses, main
from qadam_api.documents.types import ParsedDocument, TextBlock
from qadam_api.domain import ClauseType


def parsed_document(*blocks: str) -> ParsedDocument:
    text_blocks = tuple(
        TextBlock(index=index, text=text, kind="paragraph", paragraph_number=index)
        for index, text in enumerate(blocks)
    )
    return ParsedDocument(blocks=text_blocks, full_text="\n\n".join(blocks))


@pytest.mark.parametrize(
    ("clause_type", "text"),
    [
        (
            ClauseType.PROPERTY,
            "Объект найма: жилое помещение по адресу город Астана, улица Сыганак, 10.",
        ),
        (ClauseType.TERM, "Срок найма устанавливается с 01.08.2026 по 31.07.2027."),
        (ClauseType.RENT, "Арендная плата составляет 180 000 тенге и вносится до пятого числа."),
        (ClauseType.DEPOSIT, "Депозит составляет 200 000 тенге и возвращается после выезда."),
        (ClauseType.UTILITIES, "Коммунальные услуги и электроэнергию оплачивает арендатор."),
        (ClauseType.HANDOVER, "Состояние мебели фиксируется в акте приема-передачи."),
        (ClauseType.REPAIRS, "Капитальный ремонт и устранение поломок выполняет арендодатель."),
        (ClauseType.TERMINATION, "Досрочное расторжение допускается с уведомлением за 30 дней."),
        (ClauseType.EVICTION, "Наниматель обязан освободить помещение в течение трех дней."),
        (
            ClauseType.OCCUPANCY,
            "Проживание членов семьи и временных жильцов допускается по согласованию.",
        ),
        (
            ClauseType.LANDLORD_ACCESS,
            "Хозяин вправе входить в помещение без уведомления арендатора.",
        ),
        (ClauseType.PENALTIES, "За просрочку предусмотрена пеня в размере 0,1 процента в день."),
        (
            ClauseType.RENT_CHANGE,
            "Арендодатель может повысить арендную плату в одностороннем порядке.",
        ),
    ],
)
def test_extracts_supported_clause_family(clause_type: ClauseType, text: str) -> None:
    clauses = extract_clauses(parsed_document(text))

    matching = [clause for clause in clauses if clause.type is clause_type]
    assert len(matching) == 1
    assert matching[0].text == text
    assert matching[0].span.block_start == 0
    assert matching[0].span.block_end == 0
    assert matching[0].confidence >= 0.7
    assert matching[0].extraction_method == "rules"
    assert isinstance(matching[0].id, UUID)


def test_extracts_amounts_and_dates_as_structured_facts() -> None:
    clauses = extract_clauses(
        parsed_document("Депозит 200 000 тенге вносится 01.08.2026 и возвращается до 05.08.2027.")
    )

    deposit = next(clause for clause in clauses if clause.type is ClauseType.DEPOSIT)
    assert deposit.facts["amounts"] == ["200 000 тенге"]
    assert deposit.facts["dates"] == ["01.08.2026", "05.08.2027"]


def test_extracts_multiple_families_from_one_source_block() -> None:
    text = (
        "Арендная плата 180 000 тенге. Коммунальные услуги оплачивает арендатор. "
        "Расторжение возможно после уведомления за 30 дней."
    )

    clauses = extract_clauses(parsed_document(text))

    assert {clause.type for clause in clauses} >= {
        ClauseType.RENT,
        ClauseType.UTILITIES,
        ClauseType.TERMINATION,
    }


def test_supports_kazakh_clause_terms() -> None:
    clauses = extract_clauses(
        parsed_document(
            "Кепілпұл 150 000 теңге. Коммуналдық қызметтерді жалға алушы төлейді. "
            "Шартты бұзу туралы 30 күн бұрын хабарлау қажет."
        )
    )

    assert {clause.type for clause in clauses} >= {
        ClauseType.DEPOSIT,
        ClauseType.UTILITIES,
        ClauseType.TERMINATION,
    }


def test_does_not_extract_clause_from_labelled_legal_reference() -> None:
    clauses = extract_clauses(
        parsed_document(
            "Справочно: статья 552 ГК РК регулирует капитальный ремонт и обязанности наймодателя."
        )
    )

    assert clauses == []


def test_cli_outputs_json_for_demo_contract(capsys: pytest.CaptureFixture[str]) -> None:
    contract = Path(__file__).parents[4] / "demo/contracts/qadam-risky-contract.txt"

    exit_code = main([str(contract)])

    assert exit_code == 0
    output = json.loads(capsys.readouterr().out)
    extracted_types = {clause["type"] for clause in output}
    assert {"deposit", "rent_change", "termination", "landlord_access"} <= extracted_types
