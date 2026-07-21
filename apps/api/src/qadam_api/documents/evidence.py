"""Build short, source-addressable evidence from masked parser blocks."""

from __future__ import annotations

import hashlib
import textwrap

from qadam_api.documents.types import DocumentEvidenceBlock, TextBlock

MAX_EVIDENCE_CHARS = 600


def _segments(text: str) -> tuple[str, ...]:
    segments: list[str] = []
    for line in text.splitlines():
        normalized = line.strip()
        if not normalized:
            continue
        segments.extend(
            textwrap.wrap(
                normalized,
                width=MAX_EVIDENCE_CHARS,
                break_long_words=False,
                break_on_hyphens=False,
            )
        )
    return tuple(segments)


def build_document_evidence(
    blocks: tuple[TextBlock, ...],
) -> tuple[DocumentEvidenceBlock, ...]:
    """Split masked blocks while preserving their original page/paragraph location."""

    evidence: list[DocumentEvidenceBlock] = []
    for source in blocks:
        for segment in _segments(source.text):
            evidence.append(
                DocumentEvidenceBlock(
                    block_index=len(evidence),
                    source_block_index=source.index,
                    text=segment,
                    kind=source.kind,
                    page_number=source.page_number,
                    paragraph_number=source.paragraph_number,
                    checksum_sha256=hashlib.sha256(segment.encode("utf-8")).hexdigest(),
                )
            )
    return tuple(evidence)
