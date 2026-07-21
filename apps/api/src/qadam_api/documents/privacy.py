"""Best-effort masking before contract text reaches retrieval or model providers."""

from __future__ import annotations

import re
from dataclasses import dataclass
from re import Match, Pattern


@dataclass(frozen=True, slots=True)
class MaskingResult:
    """Masked text plus a private placeholder-to-original mapping."""

    masked_text: str
    replacements: dict[str, str]


_PATTERNS: tuple[tuple[str, Pattern[str]], ...] = (
    ("EMAIL", re.compile(r"(?i)(?<![\w.-])[\w.+-]+@[\w.-]+\.[a-z]{2,}(?![\w.-])")),
    (
        "ТЕЛЕФОН",
        re.compile(r"(?<!\d)(?:\+?7|8)[\s(.-]*\d{3}[\s).-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}(?!\d)"),
    ),
    ("КАРТА", re.compile(r"(?<!\d)(?:\d{4}[ -]){3}\d{4}(?!\d)")),
    ("ИИН", re.compile(r"(?<!\d)\d{12}(?!\d)")),
)


def mask_personal_data(text: str) -> MaskingResult:
    """Mask common identifiers while leaving monetary and legal numbers intact."""

    value_to_placeholder: dict[tuple[str, str], str] = {}
    replacements: dict[str, str] = {}
    masked_text = text

    for label, pattern in _PATTERNS:

        def replace(match: Match[str], *, current_label: str = label) -> str:
            value = match.group(0)
            key = (current_label, value)
            if key not in value_to_placeholder:
                existing_values = (
                    saved_label == current_label for saved_label, _ in value_to_placeholder
                )
                index = sum(existing_values) + 1
                placeholder = f"[{current_label}_{index}]"
                value_to_placeholder[key] = placeholder
                replacements[placeholder] = value
            return value_to_placeholder[key]

        masked_text = pattern.sub(replace, masked_text)

    return MaskingResult(masked_text=masked_text, replacements=replacements)
