"""Lightweight bilingual detection and legal-term normalization."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal

DocumentLanguage = Literal["ru", "kz", "mixed"]

_WORDS = re.compile(r"[а-яёәіңғүұқөһ]+", re.IGNORECASE)
_KAZAKH_UNIQUE = set("әіңғүұқөһ")
_RUSSIAN_MARKERS = {
    "арендодатель",
    "арендатор",
    "квартира",
    "коммунальные",
    "передает",
    "оплачивает",
    "хозяин",
    "уведомления",
}
_KAZAKH_MARKERS = {
    "жалға",
    "беруші",
    "алушы",
    "тұрғын",
    "үйді",
    "береді",
    "коммуналдық",
    "қызметтерді",
    "төлейді",
    "кепілпұл",
    "қайтарылады",
    "біржақты",
    "өзгертіледі",
}

_CANONICAL_PATTERNS: dict[str, tuple[re.Pattern[str], ...]] = {
    "deposit": (
        re.compile(r"\bдепозит\w*", re.IGNORECASE),
        re.compile(r"\bзалог\w*", re.IGNORECASE),
        re.compile(r"\bкепілпұл\w*", re.IGNORECASE),
    ),
    "utilities": (
        re.compile(r"\bкоммуналк\w*", re.IGNORECASE),
        re.compile(r"\bкоммунальн\w*", re.IGNORECASE),
        re.compile(r"\bкоммуналдық\s+қызмет\w*", re.IGNORECASE),
    ),
    "landlord_access": (
        re.compile(r"\b(?:хозяин|арендодатель)\b.{0,50}\b(?:войти|входить|доступ)", re.IGNORECASE),
        re.compile(r"\b(?:жалға\s+беруші)\b.{0,50}\b(?:кіру|кіреді)", re.IGNORECASE),
    ),
    "rent_change": (
        re.compile(r"\b(?:повысить|изменить|увеличить)\b.{0,30}\bаренд\w*", re.IGNORECASE),
        re.compile(r"\bаренд\w*.{0,30}\b(?:повышается|изменяется)", re.IGNORECASE),
        re.compile(r"\bжалға\s+алу\s+ақысы\b.{0,30}\b(?:өзгертіледі|көтеріледі)", re.IGNORECASE),
    ),
}


@dataclass(frozen=True, slots=True)
class NormalizedTerms:
    """Canonical search families without modifying source text."""

    original_text: str
    canonical_terms: tuple[str, ...]


def detect_language(text: str) -> DocumentLanguage:
    """Detect Russian, Kazakh, or a meaningful mixture of both."""

    words = [word.casefold() for word in _WORDS.findall(text)]
    russian_score = sum(word in _RUSSIAN_MARKERS for word in words)
    kazakh_score = sum(word in _KAZAKH_MARKERS for word in words)

    if russian_score and kazakh_score:
        return "mixed"
    if kazakh_score or any(character in _KAZAKH_UNIQUE for character in text.casefold()):
        return "kz"
    return "ru"


def normalize_search_terms(text: str) -> NormalizedTerms:
    """Map bilingual colloquialisms to stable clause-family search terms."""

    matched = {
        canonical
        for canonical, patterns in _CANONICAL_PATTERNS.items()
        if any(pattern.search(text) for pattern in patterns)
    }
    return NormalizedTerms(original_text=text, canonical_terms=tuple(sorted(matched)))
