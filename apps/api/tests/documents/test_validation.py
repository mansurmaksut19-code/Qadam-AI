from io import BytesIO

import fitz
import pytest
from docx import Document

from qadam_api.documents.validation import (
    MAX_UPLOAD_BYTES,
    UploadValidationError,
    validate_upload,
)


def make_pdf_bytes(text: str = "Договор аренды жилого помещения") -> bytes:
    document = fitz.open()
    page = document.new_page()
    page.insert_text((72, 72), text)
    result = document.tobytes()
    document.close()
    return result


def make_encrypted_pdf_bytes() -> bytes:
    document = fitz.open()
    document.new_page().insert_text((72, 72), "Protected rental agreement")
    buffer = BytesIO()
    document.save(
        buffer,
        encryption=fitz.PDF_ENCRYPT_AES_256,
        owner_pw="owner-secret",
        user_pw="tenant-secret",
    )
    document.close()
    return buffer.getvalue()


def make_docx_bytes() -> bytes:
    document = Document()
    document.add_paragraph("Договор аренды жилого помещения")
    buffer = BytesIO()
    document.save(buffer)
    return buffer.getvalue()


@pytest.mark.parametrize(
    ("filename", "content", "expected_media_type"),
    [
        ("agreement.pdf", make_pdf_bytes(), "application/pdf"),
        (
            "agreement.docx",
            make_docx_bytes(),
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ),
        ("AGREEMENT.PDF", make_pdf_bytes(), "application/pdf"),
    ],
    ids=["pdf", "docx", "uppercase-pdf"],
)
def test_accepts_supported_files_by_signature(
    filename: str, content: bytes, expected_media_type: str
) -> None:
    upload = validate_upload(filename=filename, content=content)

    assert upload.filename == filename
    assert upload.media_type == expected_media_type
    assert upload.size_bytes == len(content)
    assert len(upload.checksum_sha256) == 64


@pytest.mark.parametrize(
    ("filename", "content"),
    [
        ("agreement.pdf", b"This is not a PDF"),
        ("agreement.docx", make_pdf_bytes()),
        ("agreement.pdf", make_docx_bytes()),
        ("agreement.txt", b"Rental agreement"),
        ("agreement.zip", make_docx_bytes()),
    ],
    ids=["fake-pdf", "pdf-as-docx", "docx-as-pdf", "txt", "zip-extension"],
)
def test_rejects_unsupported_or_spoofed_file(filename: str, content: bytes) -> None:
    with pytest.raises(UploadValidationError) as error:
        validate_upload(filename=filename, content=content)

    assert error.value.code == "unsupported_type"


def test_rejects_empty_file() -> None:
    with pytest.raises(UploadValidationError) as error:
        validate_upload(filename="agreement.pdf", content=b"")

    assert error.value.code == "empty_file"


def test_rejects_file_larger_than_ten_megabytes() -> None:
    with pytest.raises(UploadValidationError) as error:
        validate_upload(filename="agreement.pdf", content=b"x" * (MAX_UPLOAD_BYTES + 1))

    assert error.value.code == "file_too_large"


def test_rejects_encrypted_pdf() -> None:
    with pytest.raises(UploadValidationError) as error:
        validate_upload(filename="agreement.pdf", content=make_encrypted_pdf_bytes())

    assert error.value.code == "encrypted_pdf"
