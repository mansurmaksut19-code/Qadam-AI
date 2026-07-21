"""Evidence-first question retrieval over masked rental documents."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal, Protocol
from uuid import UUID

from pydantic import BaseModel, Field

from qadam_api.documents.types import DocumentEvidenceBlock
from qadam_api.domain import AnalysisReport, AnalysisStatus, Citation, ClauseType, Severity

WORD_RE = re.compile(r"[0-9]+(?:[ .,-][0-9]+)*|[а-яәіңғүұқөһёa-z]+", re.IGNORECASE)
STOP_WORDS = {
    "а",
    "в",
    "во",
    "где",
    "и",
    "или",
    "к",
    "как",
    "какая",
    "какие",
    "какой",
    "когда",
    "кто",
    "ли",
    "мне",
    "можно",
    "на",
    "не",
    "о",
    "по",
    "про",
    "с",
    "сколько",
    "со",
    "у",
    "что",
    "это",
    "этот",
    "договор",
    "договоре",
    "условие",
    "условия",
    "указан",
    "указана",
    "указано",
    "қанша",
    "қашан",
    "алады",
    "алад",
    "болады",
    "болад",
    "үй",
}
SUFFIXES = (
    "иями",
    "ами",
    "ями",
    "ого",
    "ему",
    "ому",
    "ыми",
    "ими",
    "ий",
    "ый",
    "ая",
    "ое",
    "ее",
    "ов",
    "ев",
    "ам",
    "ям",
    "ах",
    "ях",
    "ом",
    "ем",
    "ы",
    "и",
    "а",
    "я",
    "у",
    "ю",
    "е",
)
CONCEPTS = (
    frozenset({"аренд", "арендн", "найм", "жалда"}),
    frozenset({"плат", "цен", "стоим", "стоит", "ақыс", "баға", "төлем"}),
    frozenset({"хозяин", "арендодател", "арендодатель", "беруші", "иесі"}),
    frozenset({"арендатор", "нанимател", "жалғ", "алуш"}),
    frozenset({"депозит", "залог", "кепіл"}),
    frozenset({"срок", "дат", "мерзімі", "күн"}),
    frozenset({"расторж", "расторжени", "прекращ", "бұзу", "тоқтат"}),
    frozenset({"уведом", "уведомлени", "предупреж", "предупреждает", "хабарла", "ескерт"}),
    frozenset({"коммунал", "коммунальны", "услуг", "вод", "электр", "су", "жарықт"}),
    frozenset({"ремонт", "жөндеу", "жөндеуді"}),
    frozenset({"визит", "посещен", "доступ", "кіре", "кіру"}),
    frozenset({"жить", "проживать", "прожив", "тұруғ", "тұр"}),
    frozenset({"кошк", "кошкой", "питом", "мысықпен", "жануар"}),
    frozenset({"квартир", "помещен", "жиль", "объект", "пәтерд", "тұрғын", "нысанның"}),
    frozenset({"адрес", "город", "улиц", "мекенжай", "қала", "қалас", "көше"}),
    frozenset({"вернут", "вернуть", "возврат", "возвращаетс", "қайтар"}),
    frozenset({"оплачивает", "оплат", "төлейді"}),
)
MIN_SCORE = 0.35
ACTION_PATTERNS = (
    "что делать",
    "как решить",
    "как исправить",
    "как изменить",
    "как уточнить",
    "не істеу керек",
    "қалай түзет",
    "қалай өзгерт",
)
QUESTION_FAMILIES: dict[ClauseType, tuple[str, ...]] = {
    ClauseType.DEPOSIT: ("депозит", "залог", "кепіл"),
    ClauseType.RENT: ("арендная плата", "жалдау ақы", "плата"),
    ClauseType.RENT_CHANGE: ("повыс", "изменение цены", "бағаны", "ақысын өзгерт"),
    ClauseType.TERMINATION: ("растор", "высел", "прекращ", "шартты бұзу", "тоқтат"),
    ClauseType.UTILITIES: ("коммун", "свет", "вода", "жарық", "су"),
    ClauseType.REPAIRS: ("ремонт", "полом", "повреж", "жөндеу"),
    ClauseType.LANDLORD_ACCESS: ("доступ", "визит", "арендодатель", "кіру"),
    ClauseType.TERM: ("срок", "мерзім"),
    ClauseType.PROPERTY: ("адрес", "объект", "мекенжай", "нысан"),
    ClauseType.OCCUPANCY: ("прожив", "жить", "кошк", "тұру", "мысық"),
}


class EvidenceMatch(BaseModel):
    """A masked evidence block ranked for a document question."""

    block: DocumentEvidenceBlock
    score: float = Field(ge=0.0, le=1.0)
    adjacent: bool = False


@dataclass(frozen=True, slots=True)
class QuestionContext:
    """Allow-listed masked evidence supplied to an answer provider."""

    question: str
    matches: tuple[EvidenceMatch, ...]
    language: str


class ProviderAnswer(BaseModel):
    """Structured output required from deterministic and optional providers."""

    answer: str = Field(min_length=1, max_length=1500)
    evidence_block_indexes: list[int] = Field(min_length=1, max_length=3)
    confidence: float = Field(ge=0.0, le=1.0)


class GroundedQuestionAnswer(BaseModel):
    """Validated answer plus the exact masked document evidence supporting it."""

    answer: str
    mode: Literal["document", "action"] = "document"
    confidence: float = Field(ge=0.0, le=1.0)
    evidence: tuple[EvidenceMatch, ...]
    citations: tuple[Citation, ...] = ()
    finding_ids: tuple[UUID, ...] = ()


class QuestionAnswerProvider(Protocol):
    def answer(self, context: QuestionContext) -> ProviderAnswer: ...


class DeterministicQuestionProvider:
    """Offline extractive provider that quotes selected document evidence."""

    def answer(self, context: QuestionContext) -> ProviderAnswer:
        best = context.matches[0]
        selected = (best, *(match for match in context.matches[1:] if match.adjacent))
        excerpt = " ".join(match.block.text.strip() for match in selected)[:1200]
        return ProviderAnswer(
            answer=f"В договоре указано: «{excerpt}».",
            evidence_block_indexes=[match.block.block_index for match in selected],
            confidence=best.score,
        )


def _numbers(text: str) -> set[str]:
    return {
        value.replace(" ", "").replace("\u00a0", "").replace(",", ".")
        for value in re.findall(r"\d+(?:[ \u00a0]\d{3})*(?:[.,]\d+)?", text)
    }


def _validate_provider_answer(
    answer: ProviderAnswer,
    context: QuestionContext,
) -> ProviderAnswer:
    allowed = {match.block.block_index for match in context.matches}
    if not set(answer.evidence_block_indexes) <= allowed:
        raise ValueError("provider referenced evidence outside the retrieved allow-list")
    selected_text = " ".join(
        match.block.text
        for match in context.matches
        if match.block.block_index in answer.evidence_block_indexes
    )
    if not _numbers(answer.answer) <= _numbers(selected_text):
        raise ValueError("provider introduced a number absent from selected evidence")
    return answer


class ResilientQuestionProvider:
    """Use deterministic extraction after transport or grounding failure."""

    def __init__(
        self,
        *,
        primary: QuestionAnswerProvider,
        fallback: QuestionAnswerProvider,
    ) -> None:
        self._primary = primary
        self._fallback = fallback

    def answer(self, context: QuestionContext) -> ProviderAnswer:
        try:
            return _validate_provider_answer(self._primary.answer(context), context)
        except Exception:
            return self._fallback.answer(context)


def question_categories(question: str) -> set[ClauseType]:
    """Return explicitly named rental clause families without inferring generic action verbs."""

    normalized = question.casefold().replace("ё", "е")
    return {
        category
        for category, patterns in QUESTION_FAMILIES.items()
        if any(pattern in normalized for pattern in patterns)
    }


def _is_action_question(question: str) -> bool:
    normalized = question.casefold().replace("ё", "е")
    return any(pattern in normalized for pattern in ACTION_PATTERNS)


def _answer_from_findings(
    question: str,
    evidence: tuple[DocumentEvidenceBlock, ...],
    report: AnalysisReport,
) -> GroundedQuestionAnswer | None:
    categories = question_categories(question)
    severity_order = {Severity.HIGH: 0, Severity.ATTENTION: 1, Severity.INFO: 2}
    candidates = [
        finding
        for finding in report.findings
        if finding.clause is not None
        and (not categories or finding.category in categories)
    ]
    candidates.sort(
        key=lambda finding: (
            severity_order[finding.severity],
            -finding.confidence,
            str(finding.id),
        )
    )

    selected_findings = []
    selected_evidence: list[EvidenceMatch] = []
    for finding in candidates:
        clause = finding.clause
        if clause is None:
            continue
        matching_blocks = [
            block
            for block in evidence
            if clause.span.block_start <= block.source_block_index <= clause.span.block_end
        ]
        if not matching_blocks:
            continue
        selected_findings.append(finding)
        selected_evidence.extend(
            EvidenceMatch(block=block, score=finding.confidence)
            for block in matching_blocks
        )
        if len(selected_findings) == 3:
            break

    if not selected_findings:
        return None

    citations = {
        citation.source_id: citation
        for finding in selected_findings
        for citation in finding.citations
    }
    answer_lines = [
        f"{index}. {finding.title}: {finding.action}"
        for index, finding in enumerate(selected_findings, start=1)
    ]
    return GroundedQuestionAnswer(
        answer="\n".join(answer_lines),
        mode="action",
        confidence=min(finding.confidence for finding in selected_findings),
        evidence=tuple(selected_evidence[:3]),
        citations=tuple(citations.values()),
        finding_ids=tuple(finding.id for finding in selected_findings),
    )


class DocumentQuestionAnswerer:
    """Retrieve, generate, and ground an answer for one completed analysis."""

    def __init__(self, provider: QuestionAnswerProvider) -> None:
        self._provider = provider

    def answer(
        self,
        question: str,
        evidence: tuple[DocumentEvidenceBlock, ...],
        report: AnalysisReport,
    ) -> GroundedQuestionAnswer | None:
        if report.status is not AnalysisStatus.COMPLETED:
            return None
        if _is_action_question(question):
            return _answer_from_findings(question, evidence, report)
        matches = rank_document_evidence(question, evidence)
        if not matches:
            return None
        context = QuestionContext(question=question, matches=matches, language=report.language)
        provider_answer = _validate_provider_answer(self._provider.answer(context), context)
        selected = tuple(
            match
            for match in matches
            if match.block.block_index in provider_answer.evidence_block_indexes
        )
        return GroundedQuestionAnswer(
            answer=provider_answer.answer,
            confidence=min(provider_answer.confidence, selected[0].score),
            evidence=selected,
        )


def _stem(token: str) -> str:
    normalized = token.casefold().replace("ё", "е")
    if normalized.isdigit() or len(normalized) <= 4:
        return normalized
    for suffix in SUFFIXES:
        if normalized.endswith(suffix) and len(normalized) - len(suffix) >= 4:
            return normalized[: -len(suffix)]
    return normalized


def _tokens(text: str) -> tuple[str, ...]:
    return tuple(
        stemmed
        for token in WORD_RE.findall(text.casefold())
        if token not in STOP_WORDS
        if (stemmed := _stem(token)) not in STOP_WORDS
    )


def _expand(tokens: tuple[str, ...]) -> set[str]:
    expanded = set(tokens)
    for group in CONCEPTS:
        if expanded & group:
            expanded.update(group)
    return expanded


def _trigrams(token: str) -> set[str]:
    padded = f"  {token} "
    return {padded[index : index + 3] for index in range(len(padded) - 2)}


def _character_score(query: set[str], block: set[str]) -> float:
    if not query or not block:
        return 0.0
    similarities = []
    for query_token in query:
        query_grams = _trigrams(query_token)
        similarities.append(
            max(
                len(query_grams & _trigrams(block_token))
                / len(query_grams | _trigrams(block_token))
                for block_token in block
            )
        )
    return sum(similarities) / len(similarities)


def rank_document_evidence(
    question: str,
    blocks: tuple[DocumentEvidenceBlock, ...],
    *,
    limit: int = 3,
) -> tuple[EvidenceMatch, ...]:
    """Return deterministic evidence candidates or no result below the support threshold."""

    query = _expand(_tokens(question))
    if not query:
        return ()
    ranked: list[EvidenceMatch] = []
    for block in blocks:
        block_tokens = _expand(_tokens(block.text))
        overlap = len(query & block_tokens) / len(query)
        character = _character_score(query, block_tokens)
        exact_numbers = set(re.findall(r"\d+", question)) & set(re.findall(r"\d+", block.text))
        numeric_boost = min(0.1, 0.05 * len(exact_numbers))
        score = min(1.0, 0.7 * overlap + 0.3 * character + numeric_boost)
        if score >= MIN_SCORE:
            ranked.append(EvidenceMatch(block=block, score=round(score, 4)))
    ranked.sort(key=lambda item: (-item.score, item.block.block_index))
    selected = ranked[:limit]
    if selected and not re.search(r"[.!?]$", selected[0].block.text.strip()):
        next_index = selected[0].block.block_index + 1
        neighbor = next((block for block in blocks if block.block_index == next_index), None)
        if neighbor is not None:
            selected_neighbor = next(
                (item for item in selected if item.block.block_index == next_index),
                None,
            )
            if selected_neighbor is not None:
                selected[selected.index(selected_neighbor)] = EvidenceMatch(
                    block=selected_neighbor.block,
                    score=selected_neighbor.score,
                    adjacent=True,
                )
            else:
                selected.insert(
                    1,
                    EvidenceMatch(
                        block=neighbor,
                        score=round(max(MIN_SCORE, selected[0].score * 0.8), 4),
                        adjacent=True,
                    ),
                )
    return tuple(selected[:limit])
