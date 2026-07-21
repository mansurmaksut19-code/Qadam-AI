# Grounded Document Q&A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace keyword-only question responses with evidence-first Q&A over the masked text of every newly uploaded machine-readable rental agreement.

**Architecture:** The analysis orchestrator will return a public report plus private masked evidence blocks, and repositories will persist those blocks with the document checksum. A deterministic document retriever will rank evidence for every question, a grounded provider boundary will phrase answers without inventing evidence, and the token-protected API/UI will show document excerpts separately from official legal citations.

**Tech Stack:** Python 3.13, FastAPI, Pydantic 2, SQLAlchemy/PostgreSQL JSONB, pytest, Next.js 16, TypeScript, Zod, React Testing Library, Playwright, Docker Compose.

---

## File map

### Create

- `apps/api/src/qadam_api/analysis/document_qa.py` — document ranking, provider protocol,
  deterministic fallback, grounding validation, and question service.
- `apps/api/src/qadam_api/documents/evidence.py` — split masked parser blocks into short,
  page-addressable evidence segments.
- `apps/api/src/qadam_api/providers/openai_compatible_questions.py` — optional structured provider
  that receives only selected masked evidence.
- `apps/api/tests/analysis/test_document_qa.py` — labelled retrieval, grounding, refusal, and fallback
  tests.
- `apps/api/tests/documents/test_evidence.py` — PDF-page segmentation and source-location tests.
- `apps/api/tests/providers/test_question_answers.py` — optional provider payload and validation
  tests.
- `demo/contracts/qadam-qa-challenge-contract.txt` — synthetic unseen-facts contract for manual and
  browser verification; the existing generator produces its PDF/DOCX variants.

### Modify

- `apps/api/src/qadam_api/documents/types.py` — add serializable masked evidence blocks.
- `apps/api/src/qadam_api/analysis/orchestrator.py` — return an internal outcome containing report
  and masked evidence.
- `apps/api/src/qadam_api/repositories/base.py` — attach evidence to `AnalysisRecord`.
- `apps/api/src/qadam_api/repositories/postgres.py` — JSONB persistence and backward-compatible
  schema upgrade.
- `apps/api/src/qadam_api/api/routes/analyses.py` — carry evidence through queued, staged, failed,
  and completed records.
- `apps/api/src/qadam_api/api/routes/questions.py` — call the question service and expose document
  evidence in the response.
- `apps/api/src/qadam_api/api/dependencies.py` — construct deterministic or resilient optional Q&A
  provider from existing settings.
- `apps/api/tests/analysis/test_orchestrator.py` — assert masked evidence in analysis outcomes.
- `apps/api/tests/api/conftest.py` — make the API stub return an outcome with realistic evidence.
- `apps/api/tests/api/test_analyses.py` — ensure private evidence is not leaked by report polling.
- `apps/api/tests/api/test_questions.py` — cover unseen facts, evidence, refusal, authorization, and
  masked audit text.
- `apps/web/src/lib/api-client.ts` — validate and map confidence plus document evidence.
- `apps/web/src/lib/api-client.test.ts` — verify response mapping.
- `apps/web/src/features/analysis/question-panel.tsx` — render evidence and accurate refusal copy.
- `apps/web/src/features/analysis/question-panel.test.tsx` — cover evidence, page/block labels, legal
  citations, and refusal.
- `apps/web/e2e/analysis.spec.ts` — ask about a unique fact from a newly generated contract.
- `README.md`, `docs/ai-pipeline.md`, `docs/architecture.md`, `docs/demo-script.md`,
  `docs/jury-qa.md`, and `docs/verification-report.md` — describe verified Q&A and honest scope.

## Task 1: Carry masked document evidence out of analysis

**Files:**
- Modify: `apps/api/src/qadam_api/documents/types.py`
- Create: `apps/api/src/qadam_api/documents/evidence.py`
- Modify: `apps/api/src/qadam_api/analysis/orchestrator.py`
- Create: `apps/api/tests/documents/test_evidence.py`
- Modify: `apps/api/tests/analysis/test_orchestrator.py`

- [ ] **Step 1: Write the failing outcome/evidence assertions**

Update the successful orchestrator test to treat the result as an outcome and assert that evidence
contains masked text and source locations:

```python
outcome = make_orchestrator(provider).analyze(upload, on_stage=stages.append)
report = outcome.report

assert report.status is AnalysisStatus.COMPLETED
assert outcome.evidence
assert any(block.page_number is None for block in outcome.evidence)
assert all("020101501234" not in block.text for block in outcome.evidence)
assert any("[ИИН_1]" in block.text for block in outcome.evidence)
assert all(len(block.checksum_sha256) == 64 for block in outcome.evidence)
assert [block.block_index for block in outcome.evidence] == list(range(len(outcome.evidence)))
```

Update the scan test:

```python
outcome = make_orchestrator(provider).analyze(upload, on_stage=stages.append)

assert outcome.report.status is AnalysisStatus.FAILED
assert outcome.report.failure_code == "ocr_required"
assert outcome.evidence == ()
```

Create `tests/documents/test_evidence.py` with a page block containing multiple lines:

```python
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
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
cd apps/api
uv run pytest tests/documents/test_evidence.py tests/analysis/test_orchestrator.py -q
```

Expected: evidence module import failure and failures because `AnalysisReport` has no `report` or
`evidence` attributes.

- [ ] **Step 3: Add the evidence and outcome types**

Add to `documents/types.py`:

```python
from pydantic import BaseModel, Field


class DocumentEvidenceBlock(BaseModel):
    """Masked source text retained for token-protected document Q&A."""

    block_index: int = Field(ge=0)
    source_block_index: int = Field(ge=0)
    text: str = Field(min_length=1)
    kind: Literal["page_text", "paragraph", "table_row"]
    page_number: int | None = Field(default=None, ge=1)
    paragraph_number: int | None = Field(default=None, ge=1)
    checksum_sha256: str = Field(min_length=64, max_length=64)

```

Create `documents/evidence.py`:

```python
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
```

Add to `analysis/orchestrator.py`:

```python
from dataclasses import dataclass, replace

from qadam_api.documents.evidence import build_document_evidence
from qadam_api.documents.types import DocumentEvidenceBlock


@dataclass(frozen=True, slots=True)
class AnalysisOutcome:
    report: AnalysisReport
    evidence: tuple[DocumentEvidenceBlock, ...] = ()
```

Return `AnalysisOutcome(report=...)` for parser failure. After masking, construct evidence once:

```python
evidence = build_document_evidence(masked.blocks)
```

Return `AnalysisOutcome(report=report, evidence=evidence)` on success.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run:

```bash
cd apps/api
uv run pytest tests/documents/test_evidence.py tests/analysis/test_orchestrator.py -q
```

Expected: evidence and orchestrator tests pass.

- [ ] **Step 5: Commit the analysis boundary**

```bash
git add apps/api/src/qadam_api/documents/types.py \
  apps/api/src/qadam_api/documents/evidence.py \
  apps/api/src/qadam_api/analysis/orchestrator.py \
  apps/api/tests/documents/test_evidence.py apps/api/tests/analysis/test_orchestrator.py
git commit -m "feat(analysis): retain masked document evidence"
```

## Task 2: Persist evidence without exposing raw document text

**Files:**
- Modify: `apps/api/src/qadam_api/repositories/base.py`
- Modify: `apps/api/src/qadam_api/repositories/postgres.py`
- Modify: `apps/api/src/qadam_api/api/routes/analyses.py`
- Modify: `apps/api/tests/api/conftest.py`
- Modify: `apps/api/tests/api/test_analyses.py`

- [ ] **Step 1: Write failing API lifecycle tests**

Make `StubOrchestrator.analyze` return `AnalysisOutcome` with this evidence on success:

```python
evidence = (
    DocumentEvidenceBlock(
        block_index=0,
        source_block_index=0,
        text="Объект аренды: квартира в городе Караганда.",
        kind="paragraph",
        paragraph_number=1,
        checksum_sha256=hashlib.sha256(
            "Объект аренды: квартира в городе Караганда.".encode("utf-8")
        ).hexdigest(),
    ),
    DocumentEvidenceBlock(
        block_index=1,
        source_block_index=2,
        text="Депозит не возвращается ни при каких обстоятельствах.",
        kind="paragraph",
        paragraph_number=2,
        checksum_sha256=hashlib.sha256(
            "Депозит не возвращается ни при каких обстоятельствах.".encode("utf-8")
        ).hexdigest(),
    ),
)
return AnalysisOutcome(report=report, evidence=evidence)
```

Add to `test_analyses.py`:

```python
def test_polling_response_does_not_expose_private_document_evidence(
    client: TestClient, uploaded_analysis: tuple[UUID, str]
) -> None:
    analysis_id, token = uploaded_analysis

    response = client.get(
        f"/api/v1/analyses/{analysis_id}",
        headers={"X-Analysis-Token": token},
    )

    assert response.status_code == 200
    assert "evidence" not in response.json()
    assert "Караганда" not in response.text
```

- [ ] **Step 2: Run API tests and verify RED**

Run:

```bash
cd apps/api
uv run pytest tests/api/test_analyses.py -q
```

Expected: fixture setup fails because `_run_analysis` still calls `.model_copy()` on the new
`AnalysisOutcome`.

- [ ] **Step 3: Extend the repository record and lifecycle**

Add a defaulted private field to `AnalysisRecord`:

```python
from qadam_api.documents.types import DocumentEvidenceBlock


@dataclass(frozen=True, slots=True)
class AnalysisRecord:
    report: AnalysisReport
    access_token_hash: str
    document_checksum: str
    created_at: datetime
    evidence: tuple[DocumentEvidenceBlock, ...] = ()
```

In `_run_analysis`, keep staged and exception records at `evidence=()`. Save the successful outcome
with the public report ID replaced and the private evidence retained:

```python
outcome = orchestrator.analyze(upload, on_stage=save_stage)
report = outcome.report.model_copy(update={"id": analysis_id})
evidence = outcome.evidence
```

Initialize `evidence = ()` before the `try` so the exception path remains explicit.

- [ ] **Step 4: Add PostgreSQL JSONB persistence and upgrade existing demo volumes**

Add to `DocumentRow`:

```python
evidence_json: Mapped[list[dict[str, Any]]] = mapped_column(
    JSONB,
    nullable=False,
    default=list,
    server_default="[]",
)
```

Import SQLAlchemy `text` as `sql_text`, then make schema creation backward-compatible:

```python
def create_schema(self) -> None:
    bind = self._sessions.kw["bind"]
    Base.metadata.create_all(bind)
    with bind.begin() as connection:
        connection.execute(
            sql_text(
                "ALTER TABLE documents ADD COLUMN IF NOT EXISTS "
                "evidence_json JSONB NOT NULL DEFAULT '[]'::jsonb"
            )
        )
```

Write evidence on insert/update:

```python
evidence_json = [block.model_dump(mode="json") for block in record.evidence]
if document is None:
    session.add(
        DocumentRow(
            analysis_id=report.id,
            checksum_sha256=record.document_checksum,
            evidence_json=evidence_json,
        )
    )
else:
    document.checksum_sha256 = record.document_checksum
    document.evidence_json = evidence_json
```

Read it with:

```python
document = session.scalar(select(DocumentRow).where(DocumentRow.analysis_id == analysis_id))
if document is None:
    raise RuntimeError("analysis document row is missing")
evidence = tuple(
    DocumentEvidenceBlock.model_validate(item) for item in document.evidence_json
)
```

Return the reconstructed evidence in `AnalysisRecord`.

- [ ] **Step 5: Verify API tests and a real PostgreSQL round trip**

Run:

```bash
cd apps/api
uv run pytest tests/api/test_analyses.py tests/analysis/test_orchestrator.py -q
cd ../..
docker compose up -d --build postgres api
docker compose exec -T postgres psql -U qadam -d qadam -c '\d+ documents'
```

Expected: Python tests pass; PostgreSQL output contains non-null `evidence_json` with default `[]`.

- [ ] **Step 6: Commit persistence**

```bash
git add apps/api/src/qadam_api/repositories/base.py \
  apps/api/src/qadam_api/repositories/postgres.py \
  apps/api/src/qadam_api/api/routes/analyses.py \
  apps/api/tests/api/conftest.py apps/api/tests/api/test_analyses.py
git commit -m "feat(storage): persist masked document evidence"
```

## Task 3: Build deterministic document retrieval

**Files:**
- Create: `apps/api/src/qadam_api/analysis/document_qa.py`
- Create: `apps/api/tests/analysis/test_document_qa.py`

- [ ] **Step 1: Write labelled failing retrieval tests**

Create fixtures through a helper that computes real checksums, then cover new facts and refusal:

```python
import hashlib

from qadam_api.analysis.document_qa import rank_document_evidence
from qadam_api.documents.types import DocumentEvidenceBlock


def evidence(index: int, text: str, page: int | None = 1) -> DocumentEvidenceBlock:
    return DocumentEvidenceBlock(
        block_index=index,
        source_block_index=index,
        text=text,
        kind="page_text",
        page_number=page,
        checksum_sha256=hashlib.sha256(text.encode("utf-8")).hexdigest(),
    )


BLOCKS = (
    evidence(0, "Объект аренды расположен в городе Караганда, улица Ермекова."),
    evidence(1, "Срок найма составляет одиннадцать месяцев."),
    evidence(2, "Ежемесячная плата составляет 214 000 тенге."),
    evidence(3, "Арендатор вправе проживать с одной домашней кошкой."),
)


def test_ranks_inflected_russian_fact_from_unseen_document() -> None:
    matches = rank_document_evidence("В каком городе находится квартира?", BLOCKS)

    assert matches
    assert matches[0].block.block_index == 0
    assert matches[0].score >= 0.35


def test_ranks_non_catalogue_pet_condition() -> None:
    matches = rank_document_evidence("Можно ли проживать с кошкой?", BLOCKS)

    assert matches[0].block.block_index == 3


def test_rejects_unrelated_question() -> None:
    assert rank_document_evidence("Какие акции купить завтра?", BLOCKS) == ()


def test_attaches_condition_after_a_short_heading() -> None:
    blocks = (
        evidence(10, "Срок найма", page=2),
        evidence(11, "Одиннадцать месяцев с 1 августа 2026 года.", page=2),
    )

    matches = rank_document_evidence("Какой срок найма?", blocks)

    assert matches[0].block.block_index == 10
    assert matches[1].block.block_index == 11
    assert matches[1].adjacent is True
```

Add parameterized RU/KZ cases for rent, deposit, utilities, duration, landlord access, and exact
dates. Every expected block must contain a unique fact.

- [ ] **Step 2: Run retrieval tests and verify RED**

Run:

```bash
cd apps/api
uv run pytest tests/analysis/test_document_qa.py -q
```

Expected: import failure because `document_qa.py` does not exist.

- [ ] **Step 3: Implement normalized hybrid scoring**

Create these public types and function in `document_qa.py`:

```python
from __future__ import annotations

import re
from pydantic import BaseModel, Field

from qadam_api.documents.types import DocumentEvidenceBlock

WORD_RE = re.compile(r"[0-9]+(?:[ .,-][0-9]+)*|[а-яәіңғүұқөһёa-z]+", re.IGNORECASE)
STOP_WORDS = {
    "а", "в", "во", "и", "или", "к", "как", "какая", "какие", "какой", "ли",
    "мне", "на", "по", "про", "с", "со", "у", "что", "это", "этот", "договор",
    "договоре", "условие", "условия", "указан", "указана", "указано",
}
SUFFIXES = (
    "иями", "ами", "ями", "ого", "ему", "ому", "ыми", "ими", "ий", "ый", "ая",
    "ое", "ее", "ов", "ев", "ам", "ям", "ах", "ях", "ом", "ем", "ы", "и", "а",
    "я", "у", "ю", "е",
)
SYNONYMS = (
    frozenset({"аренд", "найм"}),
    frozenset({"хозяин", "арендодател"}),
    frozenset({"квартир", "помещен", "жиль", "объект"}),
    frozenset({"плат", "цен", "стоим"}),
)
MIN_SCORE = 0.35


class EvidenceMatch(BaseModel):
    block: DocumentEvidenceBlock
    score: float = Field(ge=0.0, le=1.0)
    adjacent: bool = False


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
    for group in SYNONYMS:
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
        if neighbor is not None and all(item.block.block_index != next_index for item in selected):
            selected.insert(
                1,
                EvidenceMatch(
                    block=neighbor,
                    score=round(max(MIN_SCORE, selected[0].score * 0.8), 4),
                    adjacent=True,
                ),
            )
    return tuple(selected[:limit])
```

Remove unused imports during implementation; the final file must pass Ruff.

- [ ] **Step 4: Run retrieval tests and tune only against labelled cases**

Run:

```bash
cd apps/api
uv run pytest tests/analysis/test_document_qa.py -q
uv run ruff check src/qadam_api/analysis/document_qa.py tests/analysis/test_document_qa.py
```

Expected: all labelled cases pass, unrelated questions return no matches, Ruff reports no errors.
If a threshold changes, add the failing labelled case first and record the final threshold as a
named constant.

- [ ] **Step 5: Commit retrieval**

```bash
git add apps/api/src/qadam_api/analysis/document_qa.py \
  apps/api/tests/analysis/test_document_qa.py
git commit -m "feat(qa): retrieve evidence from uploaded contracts"
```

## Task 4: Generate grounded answers with deterministic fallback

**Files:**
- Modify: `apps/api/src/qadam_api/analysis/document_qa.py`
- Modify: `apps/api/tests/analysis/test_document_qa.py`

- [ ] **Step 1: Write failing service and grounding tests**

Add tests for extractive answers, evidence allow-listing, number grounding, and fallback:

```python
from uuid import uuid4

from qadam_api.analysis.document_qa import (
    DeterministicQuestionProvider,
    DocumentQuestionAnswerer,
    ProviderAnswer,
    QuestionContext,
    ResilientQuestionProvider,
)
from qadam_api.domain import AnalysisReport, AnalysisStatus


def completed_report() -> AnalysisReport:
    return AnalysisReport(
        id=uuid4(),
        status=AnalysisStatus.COMPLETED,
        language="ru",
        summary="Готово",
    )


def test_answerer_builds_answer_from_retrieved_document_text() -> None:
    answerer = DocumentQuestionAnswerer(DeterministicQuestionProvider())
    report = AnalysisReport(
        id=uuid4(),
        status=AnalysisStatus.COMPLETED,
        language="ru",
        summary="Готово",
    )

    result = answerer.answer("В каком городе квартира?", BLOCKS, report)

    assert result is not None
    assert "Караганда" in result.answer
    assert result.evidence[0].block.block_index == 0


class FabricatingProvider:
    def answer(self, context: QuestionContext) -> ProviderAnswer:
        return ProviderAnswer(
            answer="Аренда стоит 999 999 тенге.",
            evidence_block_indexes=[999],
            confidence=0.99,
        )


def test_resilient_provider_rejects_unknown_evidence_and_falls_back() -> None:
    answerer = DocumentQuestionAnswerer(
        ResilientQuestionProvider(
            primary=FabricatingProvider(),
            fallback=DeterministicQuestionProvider(),
        )
    )

    result = answerer.answer("Сколько стоит аренда?", BLOCKS, completed_report())

    assert result is not None
    assert "214 000" in result.answer
    assert "999 999" not in result.answer
```

Also assert `answer(...) is None` for the investment question and for non-completed reports.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
cd apps/api
uv run pytest tests/analysis/test_document_qa.py -q
```

Expected: import failures for the provider and service types.

- [ ] **Step 3: Add the provider boundary and grounded service**

Add to `document_qa.py`:

```python
from dataclasses import dataclass
from typing import Protocol

from qadam_api.domain import AnalysisReport, AnalysisStatus, Citation


@dataclass(frozen=True, slots=True)
class QuestionContext:
    question: str
    matches: tuple[EvidenceMatch, ...]
    language: str


class ProviderAnswer(BaseModel):
    answer: str = Field(min_length=1, max_length=1500)
    evidence_block_indexes: list[int] = Field(min_length=1, max_length=3)
    confidence: float = Field(ge=0.0, le=1.0)


class GroundedQuestionAnswer(BaseModel):
    answer: str
    confidence: float = Field(ge=0.0, le=1.0)
    evidence: tuple[EvidenceMatch, ...]
    citations: tuple[Citation, ...] = ()


class QuestionAnswerProvider(Protocol):
    def answer(self, context: QuestionContext) -> ProviderAnswer: ...


class DeterministicQuestionProvider:
    def answer(self, context: QuestionContext) -> ProviderAnswer:
        best = context.matches[0]
        selected = (best,) + tuple(match for match in context.matches[1:] if match.adjacent)
        excerpt = " ".join(match.block.text.strip() for match in selected)[:1200]
        return ProviderAnswer(
            answer=f"В договоре указано: «{excerpt}».",
            evidence_block_indexes=[match.block.block_index for match in selected],
            confidence=best.score,
        )


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
    answer_numbers = set(re.findall(r"\d[\d .,-]*", answer.answer))
    evidence_numbers = set(re.findall(r"\d[\d .,-]*", selected_text))
    if not answer_numbers <= evidence_numbers:
        raise ValueError("provider introduced a number absent from selected evidence")
    return answer


class ResilientQuestionProvider:
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


class DocumentQuestionAnswerer:
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
```

Legal-finding enrichment is added at the route boundary in Task 5. It does not control
support/refusal.

- [ ] **Step 4: Run focused and regression tests**

Run:

```bash
cd apps/api
uv run pytest tests/analysis/test_document_qa.py tests/analysis/test_grounding.py -q
uv run ruff check src/qadam_api/analysis/document_qa.py tests/analysis/test_document_qa.py
```

Expected: all tests pass and Ruff reports no errors.

- [ ] **Step 5: Commit grounded fallback**

```bash
git add apps/api/src/qadam_api/analysis/document_qa.py \
  apps/api/tests/analysis/test_document_qa.py
git commit -m "feat(qa): ground answers in retrieved evidence"
```

## Task 5: Replace the keyword-only HTTP question path

**Files:**
- Modify: `apps/api/src/qadam_api/api/dependencies.py`
- Modify: `apps/api/src/qadam_api/api/routes/questions.py`
- Modify: `apps/api/tests/api/test_questions.py`
- Modify: `apps/api/tests/api/conftest.py`

- [ ] **Step 1: Write failing API tests for real evidence**

Replace the old category-only success assertion with:

```python
def test_question_about_unseen_fact_returns_document_evidence(
    client: TestClient, uploaded_analysis: tuple[UUID, str]
) -> None:
    analysis_id, token = uploaded_analysis

    response = client.post(
        f"/api/v1/analyses/{analysis_id}/questions",
        headers={"X-Analysis-Token": token},
        json={"question": "Какой город указан в договоре?"},
    )

    payload = response.json()
    assert response.status_code == 200
    assert payload["supported"] is True
    assert payload["confidence"] >= 0.35
    assert payload["evidence"][0]["excerpt"].endswith("Караганда.")
    assert payload["evidence"][0]["block_index"] == 0
```

Keep the deposit test and assert both document evidence and the existing Article 552 citation. Add:

```python
def test_question_audit_masks_identifier(
    client: TestClient,
    repository: InMemoryRepository,
    uploaded_analysis: tuple[UUID, str],
) -> None:
    analysis_id, token = uploaded_analysis

    client.post(
        f"/api/v1/analyses/{analysis_id}/questions",
        headers={"X-Analysis-Token": token},
        json={"question": "Есть ли в договоре ИИН 020101501234?"},
    )

    assert "020101501234" not in repository.questions[-1].question
    assert "[ИИН_1]" in repository.questions[-1].question
```

Keep the unrelated question assertion and add `evidence == []` plus `confidence == 0.0`.

- [ ] **Step 2: Run API tests and verify RED**

Run:

```bash
cd apps/api
uv run pytest tests/api/test_questions.py -q
```

Expected: the current endpoint omits confidence/evidence and refuses the city question.

- [ ] **Step 3: Wire the deterministic answerer dependency**

Add to `api/dependencies.py`:

```python
from qadam_api.analysis.document_qa import (
    DeterministicQuestionProvider,
    DocumentQuestionAnswerer,
)


@lru_cache
def get_question_answerer() -> DocumentQuestionAnswerer:
    return DocumentQuestionAnswerer(DeterministicQuestionProvider())
```

Override this dependency in the API test fixture only when a provider-specific behavior is tested;
the standard fixture uses the real deterministic answerer.

- [ ] **Step 4: Replace category gating in the route**

Add response evidence schemas:

```python
class DocumentEvidenceResponse(BaseModel):
    block_index: int
    page: int | None
    excerpt: str
    score: float


class QuestionAnswer(BaseModel):
    answer: str
    supported: bool
    confidence: float = Field(ge=0.0, le=1.0)
    evidence: list[DocumentEvidenceResponse]
    citations: list[Citation]
```

Inject `get_question_answerer` into `ask_question`, call it with `record.evidence`, and map selected
matches:

```python
grounded = answerer.answer(payload.question, record.evidence, record.report)
if grounded is None:
    answer = QuestionAnswer(
        answer=(
            "Не нашёл подтверждение в тексте загруженного договора. "
            "Спросите о явно указанном условии, сумме, сроке или обязанности сторон."
        ),
        supported=False,
        confidence=0.0,
        evidence=[],
        citations=[],
    )
else:
    categories = _matching_categories(payload.question)
    related_findings = [
        finding
        for finding in record.report.findings
        if finding.category in categories
        and finding.clause is not None
        and any(
            finding.clause.span.block_start
            <= match.block.source_block_index
            <= finding.clause.span.block_end
            for match in grounded.evidence
        )
    ]
    legal_citations = list(
        {
            citation.source_id: citation
            for finding in related_findings
            for citation in finding.citations
        }.values()
    )
    answer = QuestionAnswer(
        answer=grounded.answer,
        supported=True,
        confidence=grounded.confidence,
        evidence=[
            DocumentEvidenceResponse(
                block_index=match.block.block_index,
                page=match.block.page_number,
                excerpt=match.block.text[:600],
                score=match.score,
            )
            for match in grounded.evidence
        ],
        citations=legal_citations,
    )
```

Persist `mask_personal_data(payload.question).masked_text` in `QuestionRecord.create`.

- [ ] **Step 5: Run API and privacy regressions**

Run:

```bash
cd apps/api
uv run pytest tests/api/test_questions.py tests/api/test_analyses.py \
  tests/documents/test_privacy.py -q
```

Expected: grounded city/deposit questions pass, unrelated question refuses, audit text is masked,
and polling does not expose evidence.

- [ ] **Step 6: Commit the real HTTP path**

```bash
git add apps/api/src/qadam_api/api/dependencies.py \
  apps/api/src/qadam_api/api/routes/questions.py \
  apps/api/tests/api/conftest.py apps/api/tests/api/test_questions.py
git commit -m "feat(api): answer questions from uploaded document evidence"
```

## Task 6: Add optional model phrasing behind the same grounding gate

**Files:**
- Create: `apps/api/src/qadam_api/providers/openai_compatible_questions.py`
- Create: `apps/api/tests/providers/test_question_answers.py`
- Modify: `apps/api/src/qadam_api/api/dependencies.py`
- Modify: `apps/api/tests/api/test_dependencies.py`

- [ ] **Step 1: Write failing provider contract tests**

Use `httpx.MockTransport` to capture the outbound JSON and return structured content:

```python
def test_provider_sends_only_selected_masked_evidence() -> None:
    captured: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured.update(json.loads(request.content))
        return httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(
                                {
                                    "answer": "Квартира находится в Караганде.",
                                    "evidence_block_indexes": [0],
                                    "confidence": 0.82,
                                },
                                ensure_ascii=False,
                            )
                        }
                    }
                ]
            },
        )

    client = httpx.Client(transport=httpx.MockTransport(handler), base_url="https://model.test/")
    provider = OpenAICompatibleQuestionProvider(client=client, model="qa-model")

    result = provider.answer(question_context())

    serialized = json.dumps(captured, ensure_ascii=False)
    assert "Караганда" in serialized
    assert "020101501234" not in serialized
    assert result.evidence_block_indexes == [0]
```

Add malformed JSON and out-of-allow-list evidence tests through `ResilientQuestionProvider`.

- [ ] **Step 2: Run provider tests and verify RED**

Run:

```bash
cd apps/api
uv run pytest tests/providers/test_question_answers.py -q
```

Expected: import failure because the optional provider does not exist.

- [ ] **Step 3: Implement the structured optional provider**

Create `OpenAICompatibleQuestionProvider` with the same `chat/completions` endpoint pattern used by
the existing explanation provider. Its request must set `temperature: 0`, request a JSON object,
and include only this context payload:

```python
def _context_payload(context: QuestionContext) -> dict[str, object]:
    return {
        "question": context.question,
        "language": context.language,
        "evidence": [
            {
                "block_index": match.block.block_index,
                "page": match.block.page_number,
                "text": match.block.text,
            }
            for match in context.matches
        ],
        "rules": {
            "answer_only_from_evidence": True,
            "unknown_fact_means_refusal": True,
            "return_json": ["answer", "evidence_block_indexes", "confidence"],
        },
    }
```

Parse `choices[0].message.content` with `json.loads` and validate it through
`ProviderAnswer.model_validate`. Let transport, parsing, and validation exceptions reach the
resilient wrapper.

- [ ] **Step 4: Select resilient provider from existing settings**

Refactor HTTP client creation into a small private helper so explanation and Q&A providers share
base URL, authorization, and timeout. Update `get_question_answerer`:

```python
@lru_cache
def get_question_answerer() -> DocumentQuestionAnswerer:
    settings = get_settings()
    fallback = DeterministicQuestionProvider()
    if not (settings.llm_base_url and settings.llm_api_key and settings.llm_model):
        return DocumentQuestionAnswerer(fallback)
    client = build_model_client(settings)
    primary = OpenAICompatibleQuestionProvider(client=client, model=settings.llm_model)
    return DocumentQuestionAnswerer(
        ResilientQuestionProvider(primary=primary, fallback=fallback)
    )
```

Extend dependency tests to prove incomplete configuration selects deterministic behavior and full
configuration selects the resilient provider without exposing the API key in representations.

- [ ] **Step 5: Run provider and dependency tests**

Run:

```bash
cd apps/api
uv run pytest tests/providers/test_question_answers.py tests/api/test_dependencies.py \
  tests/providers/test_explanations.py -q
```

Expected: all provider and dependency tests pass.

- [ ] **Step 6: Commit optional model support**

```bash
git add apps/api/src/qadam_api/providers/openai_compatible_questions.py \
  apps/api/src/qadam_api/api/dependencies.py \
  apps/api/tests/providers/test_question_answers.py \
  apps/api/tests/api/test_dependencies.py
git commit -m "feat(qa): add grounded optional model phrasing"
```

## Task 7: Render document evidence in the web application

**Files:**
- Modify: `apps/web/src/lib/api-client.ts`
- Modify: `apps/web/src/lib/api-client.test.ts`
- Modify: `apps/web/src/features/analysis/question-panel.tsx`
- Modify: `apps/web/src/features/analysis/question-panel.test.tsx`

- [ ] **Step 1: Write failing client mapping and component tests**

Extend the mocked question response with:

```typescript
confidence: 0.86,
evidence: [
  {
    block_index: 0,
    page: 1,
    excerpt: "Объект аренды: квартира в городе Караганда.",
    score: 0.86,
  },
],
```

Assert the client maps it:

```typescript
expect(answer.confidence).toBe(0.86);
expect(answer.evidence[0]).toEqual({
  blockIndex: 0,
  page: 1,
  excerpt: "Объект аренды: квартира в городе Караганда.",
  score: 0.86,
});
```

Add component assertions:

```typescript
expect(await screen.findByText("Фрагмент договора")).toBeVisible();
expect(screen.getByText(/Караганда/)).toBeVisible();
expect(screen.getByText("Страница 1")).toBeVisible();
```

For `page: null`, assert `Блок 1`. For unsupported answers, assert the heading
`Ответ не найден в тексте договора` and no evidence card.

- [ ] **Step 2: Run web tests and verify RED**

Run:

```bash
pnpm --filter web test -- src/lib/api-client.test.ts \
  src/features/analysis/question-panel.test.tsx
```

Expected: schema/mapping lacks confidence and evidence; evidence card is absent.

- [ ] **Step 3: Extend API types and Zod parsing**

Add:

```typescript
const documentEvidenceSchema = z.object({
  block_index: z.number().int().nonnegative(),
  page: z.number().int().positive().nullable(),
  excerpt: z.string().min(1),
  score: z.number().min(0).max(1),
});

export interface QuestionEvidence {
  blockIndex: number;
  page: number | null;
  excerpt: string;
  score: number;
}

export interface QuestionAnswer {
  answer: string;
  supported: boolean;
  confidence: number;
  evidence: QuestionEvidence[];
  citations: AnalysisReport["findings"][number]["citations"];
}
```

Parse all five API fields and map snake_case evidence keys to camelCase.

- [ ] **Step 4: Render accessible document evidence**

For each supported evidence item, render a non-link card because it is not an external source:

```tsx
{answer.evidence.map((item) => (
  <blockquote className="question-evidence" key={`${item.blockIndex}-${item.score}`}>
    <strong>Фрагмент договора</strong>
    <p>{item.excerpt}</p>
    <footer>{item.page ? `Страница ${item.page}` : `Блок ${item.blockIndex + 1}`}</footer>
  </blockquote>
))}
```

Change the unsupported heading to `Ответ не найден в тексте договора`. Keep official citations as
external links below the evidence cards.

- [ ] **Step 5: Run tests, lint, and typecheck**

Run:

```bash
pnpm --filter web test -- src/lib/api-client.test.ts \
  src/features/analysis/question-panel.test.tsx
pnpm --filter web lint
pnpm --filter web typecheck
```

Expected: focused tests pass; lint and typecheck exit 0.

- [ ] **Step 6: Commit the web experience**

```bash
git add apps/web/src/lib/api-client.ts apps/web/src/lib/api-client.test.ts \
  apps/web/src/features/analysis/question-panel.tsx \
  apps/web/src/features/analysis/question-panel.test.tsx
git commit -m "feat(web): show grounded document evidence"
```

## Task 8: Prove the flow with an unseen contract and browser E2E

**Files:**
- Create: `demo/contracts/qadam-qa-challenge-contract.txt`
- Generate: `demo/contracts/qadam-qa-challenge-contract.pdf`
- Generate: `demo/contracts/qadam-qa-challenge-contract.docx`
- Modify: `apps/web/e2e/analysis.spec.ts`

- [ ] **Step 1: Add an unseen synthetic contract source**

Use facts absent from the original three demos:

```text
СИНТЕТИЧЕСКИЙ ТЕСТОВЫЙ ДОГОВОР QADAM AI

Объект аренды: квартира в городе Караганда, район Юго-Восток.

Срок найма составляет одиннадцать месяцев с 1 августа 2026 года.

Ежемесячная плата составляет 214 000 тенге и вносится до пятого числа месяца.

Депозит составляет 120 000 тенге и возвращается в течение семи рабочих дней после подписания акта возврата.

Арендатор вправе проживать с одной домашней кошкой при соблюдении санитарных правил.

Показания воды и электроэнергии оплачивает арендатор, остальные коммунальные расходы включены в плату.

Арендодатель посещает квартиру только после письменного уведомления не менее чем за 24 часа.
```

- [ ] **Step 2: Generate PDF/DOCX and write a failing browser assertion**

Run:

```bash
make demo-documents
```

Extend `analysis.spec.ts` to upload `qadam-qa-challenge-contract.pdf`, wait for the completed report,
ask `В каком городе находится квартира?`, and assert `Караганда`, `Фрагмент договора`, and
`Страница 1` are visible. Then ask `Можно ли жить с кошкой?` and assert the pet excerpt appears.

- [ ] **Step 3: Run E2E and verify RED before rebuilding containers**

Run:

```bash
pnpm --filter web exec playwright test e2e/analysis.spec.ts
```

Expected before rebuilding the application stack: the new evidence assertion fails against the old
container image or old endpoint contract.

- [ ] **Step 4: Rebuild and verify GREEN through the actual Docker stack**

Run:

```bash
docker compose up -d --build
pnpm --filter web exec playwright test e2e/analysis.spec.ts
```

Expected: the new contract upload and both non-catalogue questions pass in Chromium.

- [ ] **Step 5: Verify PostgreSQL stored only masked evidence**

Run:

```bash
docker compose exec -T postgres psql -U qadam -d qadam -Atc \
  "SELECT count(*) FROM documents WHERE evidence_json <> '[]'::jsonb;"
if docker compose logs --no-color --tail=200 | rg -q '020101501234|qadam:analysis:'; then
  echo 'Sensitive test value or browser token key appeared in Docker logs' >&2
  exit 1
fi
```

Expected: at least one document has evidence JSON, and the log scan exits 0 without echoing
sensitive values.

- [ ] **Step 6: Commit proof fixtures and E2E**

```bash
git add demo/contracts/qadam-qa-challenge-contract.txt \
  demo/contracts/qadam-qa-challenge-contract.pdf \
  demo/contracts/qadam-qa-challenge-contract.docx \
  apps/web/e2e/analysis.spec.ts
git commit -m "test(e2e): prove qa on an unseen contract"
```

## Task 9: Update competition claims and release evidence

**Files:**
- Modify: `README.md`
- Modify: `docs/ai-pipeline.md`
- Modify: `docs/architecture.md`
- Modify: `docs/demo-script.md`
- Modify: `docs/jury-qa.md`
- Modify: `docs/verification-report.md`
- Modify: `docs/evaluation-results.json` through `make evaluate`

- [ ] **Step 1: Update documentation with the verified boundary**

Document these exact claims only after the relevant tests pass:

```text
QADAM AI answers questions over newly uploaded machine-readable rental PDF/DOCX files by retrieving
masked document evidence first. Supported answers show the exact contract excerpt and page/block;
unsupported questions are refused. The default path works offline. OCR and unrelated document
classes remain out of scope.
```

Update the architecture data flow to include `masked evidence JSONB -> document retriever ->
grounded answer`, and update privacy text to state that masked evidence is retained while raw bytes
and unmasked text are not.

Update the demo script to ask the city question and one non-catalogue question from the challenge
contract. Do not claim universal document support.

- [ ] **Step 2: Recalculate measured counts**

Run:

```bash
make evaluate
pnpm verify
make release-tools-test
make docs-check
```

Record actual backend/frontend/tooling counts and evaluation values from these fresh commands in
`docs/verification-report.md`. Do not copy the old `120/22/16` counts after tests are added.

- [ ] **Step 3: Verify release artifacts and the real Docker scenario**

Run:

```bash
make release-check
make security-check
make e2e
docker compose config --quiet
git diff --check
```

Expected: all commands exit 0; release artifacts remain valid; browser tests include the unseen
contract Q&A scenario.

- [ ] **Step 4: Manually call the live endpoint with the original failing question**

Upload `demo/contracts/qadam-risky-contract.pdf` to the Docker API, poll until completed, then call:

```http
POST /api/v1/analyses/{analysis_id}/questions
X-Analysis-Token: {one-time token}
Content-Type: application/json

{"question":"Какой город указан в договоре?"}
```

Expected response: `supported: true`, answer/excerpt containing `Астана`, `page: 1`, and no invented
official citation.

- [ ] **Step 5: Commit verified documentation**

```bash
git add README.md docs/ai-pipeline.md docs/architecture.md docs/demo-script.md \
  docs/jury-qa.md docs/verification-report.md docs/evaluation-results.json
git commit -m "docs: document grounded contract questions"
```

## Task 10: Final branch verification and publication readiness

**Files:**
- Verify only; modify a file only when a failing gate proves a defect.

- [ ] **Step 1: Run the complete local gate from repository root**

```bash
pnpm verify
make release-tools-test
make security-check
make docs-check
make release-check
make e2e
docker compose config --quiet
git diff --check
git status --short --branch
```

Expected: every command exits 0 and the worktree is clean.

- [ ] **Step 2: Inspect the changed symbol impact**

Run the codebase knowledge graph change detector and confirm all changed API/repository/orchestrator
callers are covered by tests. Re-index the worktree if the graph reports stale symbols.

- [ ] **Step 3: Inspect the final diff and commit history**

```bash
git diff main...HEAD --stat
git log --oneline main..HEAD
```

Expected: changes are limited to grounded Q&A, its evidence/test fixtures, and truthful competition
documentation. No unrelated user changes or secrets appear.

- [ ] **Step 4: Publish only after explicit branch handoff approval**

Use the finishing-a-development-branch workflow to present merge/push choices. If publication is
approved, push the branch, verify the final GitHub Actions run, and repeat the public release check
against the pushed commit.
