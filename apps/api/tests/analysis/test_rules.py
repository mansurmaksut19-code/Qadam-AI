from uuid import uuid4

from qadam_api.analysis.rules import evaluate_rules
from qadam_api.domain import Clause, ClauseSpan, ClauseType, Severity


def clause(clause_type: ClauseType, text: str) -> Clause:
    return Clause(
        id=uuid4(),
        type=clause_type,
        title=clause_type.value,
        text=text,
        span=ClauseSpan(block_start=0, block_end=0, page_start=1, page_end=1),
        confidence=0.9,
        extraction_method="rules",
    )


def rule_ids(clauses: list[Clause]) -> set[str]:
    return {match.rule_id for match in evaluate_rules(clauses)}


def test_flags_unclear_deposit_return() -> None:
    matches = evaluate_rules(
        [clause(ClauseType.DEPOSIT, "Депозит удерживается и возвращается после выезда.")]
    )

    match = next(item for item in matches if item.rule_id == "deposit_return_unclear")
    assert match.severity is Severity.ATTENTION
    assert match.category is ClauseType.DEPOSIT
    assert match.clause is not None
    assert match.legal_query


def test_flags_unilateral_rent_change_as_high() -> None:
    matches = evaluate_rules(
        [
            clause(
                ClauseType.RENT_CHANGE,
                "Арендодатель может повысить арендную плату в одностороннем порядке.",
            )
        ]
    )

    match = next(item for item in matches if item.rule_id == "unilateral_rent_change")
    assert match.severity is Severity.HIGH


def test_flags_unrestricted_landlord_entry_as_high() -> None:
    assert "landlord_entry_without_notice" in rule_ids(
        [
            clause(
                ClauseType.LANDLORD_ACCESS,
                "Хозяин вправе входить в квартиру без уведомления арендатора.",
            )
        ]
    )


def test_flags_tenant_funded_capital_repairs_as_high() -> None:
    assert "tenant_pays_capital_repairs" in rule_ids(
        [
            clause(
                ClauseType.REPAIRS,
                "Любой ремонт, включая капитальный ремонт, оплачивает арендатор.",
            )
        ]
    )


def test_does_not_confuse_tenant_minor_repairs_with_landlord_capital_repairs() -> None:
    matches = evaluate_rules(
        [
            clause(
                ClauseType.REPAIRS,
                "Текущий мелкий ремонт выполняет арендатор. "
                "Капитальный ремонт выполняет арендодатель за свой счёт, "
                "если повреждение не причинено арендатором.",
            )
        ]
    )

    assert "tenant_pays_capital_repairs" not in {match.rule_id for match in matches}


def test_flags_missing_property_identity_as_high() -> None:
    matches = evaluate_rules([clause(ClauseType.RENT, "Арендная плата составляет 180 000 тенге.")])

    match = next(item for item in matches if item.rule_id == "property_identity_missing")
    assert match.severity is Severity.HIGH
    assert match.clause is None


def test_flags_missing_utilities_allocation() -> None:
    assert "utilities_allocation_missing" in rule_ids(
        [
            clause(ClauseType.PROPERTY, "Объект найма: квартира по адресу улица Сыганак, 10."),
            clause(ClauseType.RENT, "Арендная плата составляет 180 000 тенге."),
        ]
    )


def test_flags_one_sided_immediate_termination_as_high() -> None:
    assert "immediate_termination" in rule_ids(
        [
            clause(
                ClauseType.TERMINATION,
                "Арендодатель вправе расторгнуть договор немедленно без уведомления.",
            )
        ]
    )


def test_balanced_clauses_do_not_create_high_severity_match() -> None:
    matches = evaluate_rules(
        [
            clause(
                ClauseType.PROPERTY, "Объект: квартира по адресу город Астана, улица Сыганак, 10."
            ),
            clause(ClauseType.RENT, "Арендная плата составляет 180 000 тенге до пятого числа."),
            clause(
                ClauseType.DEPOSIT,
                "Депозит возвращается в течение пяти рабочих дней после подписания акта.",
            ),
            clause(ClauseType.UTILITIES, "Коммунальные услуги по счетчикам оплачивает арендатор."),
            clause(ClauseType.REPAIRS, "Капитальный ремонт выполняет арендодатель за свой счет."),
            clause(
                ClauseType.TERMINATION,
                "Любая сторона может расторгнуть договор после уведомления за 30 дней.",
            ),
            clause(
                ClauseType.LANDLORD_ACCESS,
                "Арендодатель посещает квартиру после уведомления за 24 часа.",
            ),
            clause(
                ClauseType.RENT_CHANGE,
                "Изменение арендной платы возможно только по письменному соглашению сторон.",
            ),
        ]
    )

    assert not [match for match in matches if match.severity is Severity.HIGH]
