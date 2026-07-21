import pytest

from qadam_api.documents.language import detect_language, normalize_search_terms


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        (
            "Арендодатель передает квартиру, а арендатор оплачивает коммунальные услуги.",
            "ru",
        ),
        (
            "Жалға беруші тұрғын үйді береді, жалға алушы коммуналдық қызметтерді төлейді.",
            "kz",
        ),
        (
            "Арендодатель передает квартиру. Жалға алушы коммуналдық қызметтерді төлейді.",
            "mixed",
        ),
    ],
)
def test_detects_russian_kazakh_and_mixed_text(text: str, expected: str) -> None:
    assert detect_language(text) == expected


@pytest.mark.parametrize(
    ("text", "expected_terms"),
    [
        ("Залог возвращается после оплаты коммуналки.", ("deposit", "utilities")),
        ("Кепілпұл коммуналдық қызметтер төленген соң қайтарылады.", ("deposit", "utilities")),
        (
            "Хозяин может повысить аренду и войти без уведомления.",
            ("landlord_access", "rent_change"),
        ),
        ("Жалға алу ақысы біржақты өзгертіледі.", ("rent_change",)),
    ],
)
def test_normalizes_bilingual_synonyms_to_clause_families(
    text: str, expected_terms: tuple[str, ...]
) -> None:
    result = normalize_search_terms(text)

    assert result.original_text == text
    assert result.canonical_terms == expected_terms
