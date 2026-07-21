from qadam_api.documents.evidence import build_document_evidence
from qadam_api.documents.types import TextBlock


def test_splits_pdf_page_into_short_addressable_evidence() -> None:
    blocks = (
        TextBlock(
            index=4,
            text=(
                "Объект аренды: квартира в городе Астана.\n"
                "Срок найма составляет одиннадцать месяцев."
            ),
            kind="page_text",
            page_number=2,
        ),
    )

    evidence = build_document_evidence(blocks)

    assert [item.text for item in evidence] == [
        "Объект аренды: квартира в городе Астана.",
        "Срок найма составляет одиннадцать месяцев.",
    ]
    assert [item.block_index for item in evidence] == [0, 1]
    assert all(item.source_block_index == 4 for item in evidence)
    assert all(item.page_number == 2 for item in evidence)
    assert all(len(item.checksum_sha256) == 64 for item in evidence)
