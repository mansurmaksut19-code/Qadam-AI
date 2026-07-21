"""Explainable bilingual patterns for supported rental-clause families."""

from __future__ import annotations

import re
from dataclasses import dataclass

from qadam_api.domain import ClauseType


@dataclass(frozen=True, slots=True)
class ClauseDefinition:
    """Human-readable clause title and its discovery patterns."""

    type: ClauseType
    title: str
    patterns: tuple[re.Pattern[str], ...]


def _patterns(*values: str) -> tuple[re.Pattern[str], ...]:
    return tuple(re.compile(value, re.IGNORECASE) for value in values)


CLAUSE_DEFINITIONS: tuple[ClauseDefinition, ...] = (
    ClauseDefinition(
        ClauseType.PROPERTY,
        "Объект аренды",
        _patterns(r"\bобъект\s+(?:найма|аренды)", r"\bжилое\s+помещение", r"\bмекенжай\b"),
    ),
    ClauseDefinition(
        ClauseType.TERM,
        "Срок договора",
        _patterns(r"\bсрок\s+(?:найма|аренды|договора)", r"\bмерзім\w*"),
    ),
    ClauseDefinition(
        ClauseType.RENT,
        "Арендная плата",
        _patterns(r"\bарендная\s+плата", r"\bнаемная\s+плата", r"\bжалға\s+алу\s+ақысы"),
    ),
    ClauseDefinition(
        ClauseType.DEPOSIT,
        "Депозит",
        _patterns(r"\bдепозит\w*", r"\bзалог\w*", r"\bобеспечительн\w+\s+платеж", r"\bкепілпұл\w*"),
    ),
    ClauseDefinition(
        ClauseType.UTILITIES,
        "Коммунальные услуги",
        _patterns(
            r"\bкоммунальн\w+\s+услуг",
            r"\bкоммуналк\w*",
            r"\bэлектроэнерг\w*",
            r"\bкоммуналдық\s+қызмет",
        ),
    ),
    ClauseDefinition(
        ClauseType.HANDOVER,
        "Акт приёма-передачи",
        _patterns(r"\bакт[ае]?\s+при[её]ма[- ]передачи", r"\bқабылдау[- ]тапсыру"),
    ),
    ClauseDefinition(
        ClauseType.REPAIRS,
        "Ремонт и поломки",
        _patterns(r"\bремонт\w*", r"\bполом\w*", r"\bжөндеу\w*"),
    ),
    ClauseDefinition(
        ClauseType.TERMINATION,
        "Расторжение договора",
        _patterns(
            r"\bрасторжен\w*",
            r"\bпрекращен\w*",
            r"\bуведомлен\w*",
            r"\bшартты\s+бұзу",
            r"\bхабарлау\w*",
        ),
    ),
    ClauseDefinition(
        ClauseType.EVICTION,
        "Освобождение жилья",
        _patterns(
            r"\bвыселен\w*",
            r"\bосвободить\s+(?:помещение|жилище|квартиру)",
            r"\bсъехать\b",
            r"\bбосат\w*",
        ),
    ),
    ClauseDefinition(
        ClauseType.OCCUPANCY,
        "Проживание других лиц",
        _patterns(
            r"\bпроживан\w+\s+(?:других\s+лиц|членов\s+семьи)",
            r"\bвременн\w+\s+жильц",
            r"\bподсел\w*",
            r"\bбірге\s+тұру",
        ),
    ),
    ClauseDefinition(
        ClauseType.LANDLORD_ACCESS,
        "Доступ арендодателя",
        _patterns(
            r"\b(?:хозяин|арендодатель)\b.{0,45}\b(?:входить|доступ|посещать)",
            r"\bжалға\s+беруші\b.{0,45}\bкіру",
        ),
    ),
    ClauseDefinition(
        ClauseType.PENALTIES,
        "Штрафы и пени",
        _patterns(r"\bштраф\w*", r"\bпен[яи]\b", r"\bнеустойк\w*", r"\bайыппұл\w*"),
    ),
    ClauseDefinition(
        ClauseType.RENT_CHANGE,
        "Изменение арендной платы",
        _patterns(
            r"\b(?:повысить|увеличить|изменить)\b.{0,35}\bарендн\w+\s+плат",
            r"\bарендн\w+\s+плат\w*.{0,35}\bодносторонн\w+",
            r"\bиндексац\w+\s+(?:платы|аренды)",
            r"\bжалға\s+алу\s+ақысы\b.{0,35}\b(?:өзгертіледі|көтеріледі)",
        ),
    ),
)
