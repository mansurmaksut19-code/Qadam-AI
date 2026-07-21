"""Deterministic, source-grounded rental-clause extraction."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from uuid import uuid4

from qadam_api.analysis.clause_taxonomy import CLAUSE_DEFINITIONS
from qadam_api.documents.types import ParsedDocument, TextBlock
from qadam_api.domain import Clause, ClauseSpan

_REFERENCE_PREFIX = re.compile(
    r"^\s*(?:справочно|правовая\s+информация|нормативная\s+справка|legal\s+reference)\s*:",
    re.IGNORECASE,
)
_AMOUNT = re.compile(r"(?<!\d)\d[\d\s\xa0]*(?:[.,]\d+)?\s*(?:тенге|теңге|₸)(?!\w)", re.IGNORECASE)
_DATE = re.compile(
    r"(?<!\d)(?:0?[1-9]|[12]\d|3[01])[./-](?:0?[1-9]|1[0-2])[./-](?:19|20)\d{2}(?!\d)"
)


def _facts(text: str) -> dict[str, list[str]]:
    amounts = [re.sub(r"\s+", " ", value).strip() for value in _AMOUNT.findall(text)]
    dates = _DATE.findall(text)
    facts: dict[str, list[str]] = {}
    if amounts:
        facts["amounts"] = amounts
    if dates:
        facts["dates"] = dates
    return facts


def _span(block: TextBlock) -> ClauseSpan:
    return ClauseSpan(
        block_start=block.index,
        block_end=block.index,
        page_start=block.page_number,
        page_end=block.page_number,
    )


def extract_clauses(document: ParsedDocument) -> list[Clause]:
    """Extract every matching supported family while preserving original blocks."""

    clauses: list[Clause] = []
    for block in document.blocks:
        if _REFERENCE_PREFIX.search(block.text):
            continue
        for definition in CLAUSE_DEFINITIONS:
            match_count = sum(bool(pattern.search(block.text)) for pattern in definition.patterns)
            if not match_count:
                continue
            clauses.append(
                Clause(
                    id=uuid4(),
                    type=definition.type,
                    title=definition.title,
                    text=block.text,
                    span=_span(block),
                    confidence=min(0.95, 0.72 + 0.05 * match_count),
                    extraction_method="rules",
                    facts=_facts(block.text),
                )
            )
    return clauses


def main(argv: list[str] | None = None) -> int:
    """Inspect clause extraction against a committed plain-text demo contract."""

    parser = argparse.ArgumentParser(description="Extract QADAM AI rental clauses")
    parser.add_argument("contract", type=Path)
    arguments = parser.parse_args(argv)

    text = arguments.contract.read_text(encoding="utf-8")
    source_blocks = [block.strip() for block in re.split(r"\n\s*\n", text) if block.strip()]
    blocks = tuple(
        TextBlock(index=index, text=block, kind="paragraph", paragraph_number=index)
        for index, block in enumerate(source_blocks)
    )
    document = ParsedDocument(blocks=blocks, full_text="\n\n".join(source_blocks))
    payload = [clause.model_dump(mode="json") for clause in extract_clauses(document)]
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":  # pragma: no cover - exercised through main().
    raise SystemExit(main())
