from qadam_api.documents.privacy import mask_personal_data


def test_masks_identifiers_but_preserves_contract_facts() -> None:
    text = (
        "Арендатор ИИН 020101501234, телефон +7 701 123 45 67, "
        "email student@example.kz, карта 4400 1234 5678 9010. "
        "Арендная плата 180 000 тенге до 01.08.2026. Применяется статья 552."
    )

    result = mask_personal_data(text)

    assert "020101501234" not in result.masked_text
    assert "+7 701 123 45 67" not in result.masked_text
    assert "student@example.kz" not in result.masked_text
    assert "4400 1234 5678 9010" not in result.masked_text
    assert "[ИИН_1]" in result.masked_text
    assert "[ТЕЛЕФОН_1]" in result.masked_text
    assert "[EMAIL_1]" in result.masked_text
    assert "[КАРТА_1]" in result.masked_text
    assert "180 000" in result.masked_text
    assert "01.08.2026" in result.masked_text
    assert "552" in result.masked_text


def test_reuses_placeholder_for_repeated_value() -> None:
    result = mask_personal_data(
        "Свяжитесь по +7 (701) 123-45-67. Повторный номер: +7 (701) 123-45-67."
    )

    assert result.masked_text.count("[ТЕЛЕФОН_1]") == 2
    assert len(result.replacements) == 1


def test_numbers_that_are_not_personal_identifiers_remain_unchanged() -> None:
    text = "Депозит 200000 тенге, срок 12 месяцев, пеня 0.1 процента, статья 24."

    result = mask_personal_data(text)

    assert result.masked_text == text
    assert result.replacements == {}
