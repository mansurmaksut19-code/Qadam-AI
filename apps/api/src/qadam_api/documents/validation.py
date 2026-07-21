"""Validate document bytes before parsing or persistence."""

from __future__ import annotations

from hashlib import sha256
from io import BytesIO
from pathlib import Path
from zipfile import BadZipFile, ZipFile

import fitz

from qadam_api.documents.types import ValidatedUpload

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
PDF_MEDIA_TYPE = "application/pdf"
DOCX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


class UploadValidationError(ValueError):
    """Stable, user-safe validation failure."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


def _is_docx(content: bytes) -> bool:
    if not content.startswith(b"PK"):
        return False
    try:
        with ZipFile(BytesIO(content)) as archive:
            names = set(archive.namelist())
    except BadZipFile:
        return False
    return "[Content_Types].xml" in names and "word/document.xml" in names


def _validate_pdf(content: bytes) -> None:
    try:
        document = fitz.open(stream=content, filetype="pdf")
    except (fitz.FileDataError, RuntimeError) as error:
        raise UploadValidationError(
            "unsupported_type", "Файл не является корректным PDF."
        ) from error
    try:
        if document.needs_pass:
            raise UploadValidationError(
                "encrypted_pdf", "PDF защищён паролем. Загрузите разблокированную копию."
            )
    finally:
        document.close()


def validate_upload(*, filename: str, content: bytes) -> ValidatedUpload:
    """Return a validated upload or raise a stable validation error."""

    if not content:
        raise UploadValidationError("empty_file", "Загруженный файл пуст.")
    if len(content) > MAX_UPLOAD_BYTES:
        raise UploadValidationError("file_too_large", "Размер файла превышает 10 МБ.")

    extension = Path(filename).suffix.lower()
    media_type: str
    if extension == ".pdf" and content.startswith(b"%PDF-"):
        _validate_pdf(content)
        media_type = PDF_MEDIA_TYPE
    elif extension == ".docx" and _is_docx(content):
        media_type = DOCX_MEDIA_TYPE
    else:
        raise UploadValidationError(
            "unsupported_type", "Поддерживаются только настоящие PDF и DOCX файлы."
        )

    return ValidatedUpload(
        filename=filename,
        media_type=media_type,
        content=content,
        size_bytes=len(content),
        checksum_sha256=sha256(content).hexdigest(),
    )
