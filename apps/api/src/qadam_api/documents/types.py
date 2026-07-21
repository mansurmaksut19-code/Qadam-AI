"""Typed document-ingestion values."""

from dataclasses import dataclass
from typing import Literal

from pydantic import BaseModel, Field


@dataclass(frozen=True, slots=True)
class ValidatedUpload:
    """Upload proven to match a supported file signature."""

    filename: str
    media_type: str
    content: bytes
    size_bytes: int
    checksum_sha256: str


@dataclass(frozen=True, slots=True)
class TextBlock:
    """Normalized text with a stable location in the source document."""

    index: int
    text: str
    kind: Literal["page_text", "paragraph", "table_row"]
    page_number: int | None = None
    paragraph_number: int | None = None


class DocumentEvidenceBlock(BaseModel):
    """Masked source text retained for token-protected document Q&A."""

    block_index: int = Field(ge=0)
    source_block_index: int = Field(ge=0)
    text: str = Field(min_length=1)
    kind: Literal["page_text", "paragraph", "table_row"]
    page_number: int | None = Field(default=None, ge=1)
    paragraph_number: int | None = Field(default=None, ge=0)
    checksum_sha256: str = Field(min_length=64, max_length=64)


@dataclass(frozen=True, slots=True)
class ParsedDocument:
    """Ordered document blocks used by downstream clause analysis."""

    blocks: tuple[TextBlock, ...]
    full_text: str
