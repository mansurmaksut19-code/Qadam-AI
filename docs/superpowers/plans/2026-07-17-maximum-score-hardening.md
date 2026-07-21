# QADAM AI Maximum-Score Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the observed document-Q&A failure into a grounded RU/KZ fact-and-action flow, add reproducible evaluation and submission gates, and refresh every competition artifact from verified results.

**Architecture:** Keep `DocumentQuestionAnswerer` as the single question-domain boundary, but split deterministic report suggestions and finding-action selection into focused modules. Persist only safe question templates on `AnalysisReport`; keep masked document evidence private; return exact finding IDs so the API can attach only already-grounded citations. Extend the existing evaluator and release tooling instead of introducing a second framework.

**Tech Stack:** Python 3.13, FastAPI, Pydantic v2, pytest, Next.js/React, TypeScript, Zod, Vitest/Testing Library, Playwright, Docker Compose, HTML-to-PDF pitch rendering, Python `unittest` release tooling.

---

## File map

- Create `apps/api/src/qadam_api/analysis/question_suggestions.py`: deterministic report-specific question templates and prioritisation.
- Create `apps/api/tests/analysis/test_question_suggestions.py`: suggestion relevance, ordering, language, de-duplication, and limit tests.
- Modify `apps/api/src/qadam_api/domain.py`: add safe `question_suggestions` to `AnalysisReport`.
- Modify `apps/api/src/qadam_api/analysis/orchestrator.py`: build suggestions after clauses/findings are known.
- Modify `apps/api/src/qadam_api/analysis/document_qa.py`: symmetric RU/KZ concepts, action routing, exact finding IDs, and finding-clause evidence.
- Modify `apps/api/src/qadam_api/api/routes/questions.py`: public answer mode and citation selection by exact finding ID.
- Modify backend tests under `apps/api/tests/analysis/` and `apps/api/tests/api/`: regressions for mixed-language facts, actions, refusals, polling privacy, and API contracts.
- Modify `apps/web/src/lib/report-types.ts` and `apps/web/src/lib/api-client.ts`: map contextual suggestions and answer mode.
- Modify `apps/web/src/features/analysis/question-panel.tsx` and `report-view.tsx`: report-specific suggestions and mode-specific result headings.
- Modify the matching Vitest files: schema and rendered-behaviour regressions.
- Modify `apps/web/e2e/analysis.spec.ts`: fourth real-stack mixed-language browser journey.
- Create `evaluation/document_qa_cases.json`: transparent synthetic labels for facts, actions, cross-language questions, and refusals.
- Modify `scripts/evaluate_mvp.py` and its pytest: compute five document-Q&A metrics and require each curated gate to equal `1.0`.
- Create `scripts/check_final_submission.py`, `scripts/tests/test_check_final_submission.py`, and `release/final-submission.json`: honest final-entry gate for CustDev, team, URL, pitch markers, clean tree, and intended commit.
- Modify `Makefile`: expose `final-submission-check` without weakening `release-check`.
- Modify README, architecture, AI pipeline, demo/submission/research documentation, pitch HTML/PDF, and verification output so every number comes from a fresh command.

### Task 1: Contextual question suggestion builder

**Files:**
- Create: `apps/api/src/qadam_api/analysis/question_suggestions.py`
- Create: `apps/api/tests/analysis/test_question_suggestions.py`

- [ ] **Step 1: Write failing tests for relevant, ordered, bounded suggestions**

```python
from uuid import uuid4

from qadam_api.analysis.question_suggestions import build_question_suggestions
from qadam_api.domain import Clause, ClauseSpan, ClauseType, Finding, Severity


def clause(category: ClauseType) -> Clause:
    return Clause(
        id=uuid4(),
        type=category,
        title=category.value,
        text=f"Явное условие: {category.value}",
        span=ClauseSpan(block_start=0, block_end=0),
        confidence=0.9,
        extraction_method="rules",
    )


def finding(category: ClauseType, severity: Severity) -> Finding:
    return Finding(
        id=uuid4(),
        severity=severity,
        category=category,
        title=category.value,
        explanation="Проверяемое объяснение",
        action="Зафиксируйте условие письменно.",
        landlord_question="Как будет действовать условие?",
        clause=clause(category),
        citations=[],
        confidence=0.8,
    )


def test_prioritises_finding_actions_then_document_facts() -> None:
    suggestions = build_question_suggestions(
        clauses=[clause(ClauseType.RENT), clause(ClauseType.DEPOSIT)],
        findings=[finding(ClauseType.TERMINATION, Severity.ATTENTION)],
        language="mixed",
    )
    assert suggestions == [
        "Как изменить условие о расторжении?",
        "Когда и при каких условиях вернут депозит?",
        "Какая ежемесячная плата?",
    ]


def test_never_suggests_absent_rent_change_and_limits_to_four() -> None:
    suggestions = build_question_suggestions(
        clauses=[clause(category) for category in (
            ClauseType.RENT, ClauseType.DEPOSIT, ClauseType.TERM,
            ClauseType.UTILITIES, ClauseType.OCCUPANCY,
        )],
        findings=[],
        language="ru",
    )
    assert len(suggestions) == 4
    assert all("повыс" not in item.casefold() for item in suggestions)


def test_uses_kazakh_templates_for_kazakh_report() -> None:
    assert build_question_suggestions(
        clauses=[clause(ClauseType.RENT)], findings=[], language="kz"
    ) == ["Ай сайынғы жалдау ақысы қанша?"]
```

- [ ] **Step 2: Run the focused test and verify the import failure**

Run: `cd apps/api && uv run pytest tests/analysis/test_question_suggestions.py -q`

Expected: FAIL because `qadam_api.analysis.question_suggestions` does not exist.

- [ ] **Step 3: Implement deterministic templates and priority**

```python
"""Safe contextual questions derived only from extracted report structure."""

from qadam_api.domain import Clause, ClauseType, Finding, Severity

RU_FACTS = {
    ClauseType.DEPOSIT: "Когда и при каких условиях вернут депозит?",
    ClauseType.RENT: "Какая ежемесячная плата?",
    ClauseType.TERM: "Какой срок указан в договоре?",
    ClauseType.PROPERTY: "Какой объект и адрес указаны?",
    ClauseType.UTILITIES: "Кто оплачивает коммунальные услуги?",
    ClauseType.LANDLORD_ACCESS: "Когда арендодатель может посещать жильё?",
    ClauseType.OCCUPANCY: "Кто может проживать в квартире?",
    ClauseType.REPAIRS: "Кто отвечает за ремонт?",
    ClauseType.TERMINATION: "Какой порядок расторжения указан?",
    ClauseType.RENT_CHANGE: "Может ли арендодатель изменить цену?",
}
KZ_FACTS = {
    ClauseType.DEPOSIT: "Депозит қашан және қандай шартпен қайтарылады?",
    ClauseType.RENT: "Ай сайынғы жалдау ақысы қанша?",
    ClauseType.TERM: "Шарттың мерзімі қандай?",
    ClauseType.PROPERTY: "Қандай нысан және мекенжай көрсетілген?",
    ClauseType.UTILITIES: "Коммуналдық қызметтерді кім төлейді?",
    ClauseType.LANDLORD_ACCESS: "Жалға беруші тұрғын үйге қашан кіре алады?",
    ClauseType.OCCUPANCY: "Пәтерде кім тұра алады?",
    ClauseType.REPAIRS: "Жөндеуге кім жауап береді?",
    ClauseType.TERMINATION: "Шартты бұзу тәртібі қандай?",
    ClauseType.RENT_CHANGE: "Жалға беруші бағаны өзгерте ала ма?",
}
RU_ACTIONS = {
    ClauseType.DEPOSIT: "Как изменить условие о депозите?",
    ClauseType.RENT_CHANGE: "Как изменить условие об изменении цены?",
    ClauseType.TERMINATION: "Как изменить условие о расторжении?",
    ClauseType.LANDLORD_ACCESS: "Как исправить условие о доступе арендодателя?",
    ClauseType.REPAIRS: "Как уточнить обязанности по ремонту?",
}
FACT_ORDER = (
    ClauseType.DEPOSIT, ClauseType.RENT, ClauseType.TERM, ClauseType.PROPERTY,
    ClauseType.UTILITIES, ClauseType.LANDLORD_ACCESS, ClauseType.OCCUPANCY,
    ClauseType.REPAIRS, ClauseType.TERMINATION, ClauseType.RENT_CHANGE,
)


def build_question_suggestions(
    *, clauses: list[Clause], findings: list[Finding], language: str
) -> list[str]:
    facts = KZ_FACTS if language == "kz" else RU_FACTS
    severity = {Severity.HIGH: 0, Severity.ATTENTION: 1, Severity.INFO: 2}
    result: list[str] = []
    for item in sorted(findings, key=lambda value: (severity[value.severity], -value.confidence)):
        template = RU_ACTIONS.get(item.category)
        if template and item.clause is not None and template not in result:
            result.append(template)
    available = {item.type for item in clauses}
    for category in FACT_ORDER:
        if category not in available:
            continue
        template = facts.get(category)
        if template and template not in result:
            result.append(template)
    return result[:4]
```

- [ ] **Step 4: Run the focused tests**

Run: `cd apps/api && uv run pytest tests/analysis/test_question_suggestions.py -q`

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit the self-contained builder**

```bash
git add apps/api/src/qadam_api/analysis/question_suggestions.py apps/api/tests/analysis/test_question_suggestions.py
git commit -m "feat: build contextual contract questions"
```

### Task 2: Report and orchestration contract

**Files:**
- Modify: `apps/api/src/qadam_api/domain.py:124-141`
- Modify: `apps/api/src/qadam_api/analysis/orchestrator.py:78-148`
- Modify: `apps/api/tests/test_domain.py`
- Modify: `apps/api/tests/analysis/test_orchestrator.py:61-109`
- Modify: `apps/api/tests/api/test_analyses.py:59-71`

- [ ] **Step 1: Add failing report/orchestrator/polling assertions**

```python
# test_domain.py
assert report.question_suggestions == []

# test_orchestrator.py, after obtaining report
assert "Как изменить условие о расторжении?" in report.question_suggestions
assert "Может ли арендодатель изменить цену?" in report.question_suggestions
assert len(report.question_suggestions) <= 4

# test_analyses.py, inside the privacy test
assert response.json()["question_suggestions"]
assert all("Караганда" not in item for item in response.json()["question_suggestions"])
```

- [ ] **Step 2: Verify the schema assertions fail**

Run: `cd apps/api && uv run pytest tests/test_domain.py tests/analysis/test_orchestrator.py tests/api/test_analyses.py -q`

Expected: FAIL because `question_suggestions` is absent or empty.

- [ ] **Step 3: Add the public safe field and populate it**

```python
# domain.py, in AnalysisReport
question_suggestions: list[str] = Field(default_factory=list, max_length=4)

# orchestrator.py imports
from qadam_api.analysis.question_suggestions import build_question_suggestions

# orchestrator.py, in the completed AnalysisReport constructor
question_suggestions=build_question_suggestions(
    clauses=list(clauses), findings=findings, language=language
),
```

- [ ] **Step 4: Run the focused and full backend tests**

Run: `cd apps/api && uv run pytest tests/test_domain.py tests/analysis/test_question_suggestions.py tests/analysis/test_orchestrator.py tests/api/test_analyses.py -q`

Expected: PASS.

- [ ] **Step 5: Commit report integration**

```bash
git add apps/api/src/qadam_api/domain.py apps/api/src/qadam_api/analysis/orchestrator.py apps/api/tests
git commit -m "feat: expose grounded question suggestions"
```

### Task 3: Symmetric Russian/Kazakh concept retrieval

**Files:**
- Modify: `apps/api/src/qadam_api/analysis/document_qa.py:13-88,218-301`
- Modify: `apps/api/tests/analysis/test_document_qa.py:31-83`

- [ ] **Step 1: Add failing cross-language and negative regression cases**

```python
@pytest.mark.parametrize(
    ("question", "expected_index"),
    [
        ("Какая арендная плата?", 7),
        ("Жалдау ақысы қанша?", 2),
        ("Үй иесі қашан кіре алады?", 6),
    ],
)
def test_cross_language_concepts(question: str, expected_index: int) -> None:
    matches = rank_document_evidence(question, BLOCKS)
    assert matches
    assert matches[0].block.block_index == expected_index


def test_cross_language_expansion_does_not_invent_parking() -> None:
    assert rank_document_evidence("Есть ли парковочное место?", BLOCKS) == ()
```

- [ ] **Step 2: Run the regression and confirm at least the Russian-to-Kazakh rent case fails**

Run: `cd apps/api && uv run pytest tests/analysis/test_document_qa.py::test_cross_language_concepts tests/analysis/test_document_qa.py::test_cross_language_expansion_does_not_invent_parking -q`

Expected: FAIL for cross-language retrieval; parking remains PASS.

- [ ] **Step 3: Replace one-language synonym groups with inspectable concept groups**

```python
CONCEPTS = (
    frozenset({"аренд", "найм", "жалдау"}),
    frozenset({"плат", "цен", "стоим", "акы", "ақы", "баға", "төлем"}),
    frozenset({"хозяин", "арендодател", "беруш", "иесі"}),
    frozenset({"арендатор", "нанимател", "жалға", "алуш"}),
    frozenset({"депозит", "залог", "кепіл"}),
    frozenset({"срок", "дат", "мерзім", "күн"}),
    frozenset({"расторж", "прекращ", "бұзу", "тоқтат"}),
    frozenset({"уведом", "предупреж", "хабар", "ескерт"}),
    frozenset({"коммунал", "вод", "электр", "қызмет", "су", "жарық"}),
    frozenset({"ремонт", "жөндеу"}),
    frozenset({"визит", "посещен", "доступ", "кір", "кіру"}),
    frozenset({"жить", "прожив", "тұру", "тұр"}),
    frozenset({"кошк", "питом", "үй жануар"}),
    frozenset({"квартир", "помещен", "жиль", "объект", "пәтер", "тұрғын", "нысан"}),
    frozenset({"адрес", "город", "улиц", "мекенжай", "қала", "көше"}),
    frozenset({"вернут", "возврат", "қайтар"}),
)
```

Update `_expand` to iterate `CONCEPTS`, add common Kazakh question particles to `STOP_WORDS`, and keep `MIN_SCORE = 0.35` unchanged.

- [ ] **Step 4: Run all document-Q&A unit tests**

Run: `cd apps/api && uv run pytest tests/analysis/test_document_qa.py -q`

Expected: PASS, including unrelated-question and parking refusals.

- [ ] **Step 5: Commit cross-language retrieval**

```bash
git add apps/api/src/qadam_api/analysis/document_qa.py apps/api/tests/analysis/test_document_qa.py
git commit -m "feat: retrieve rental facts across ru and kz"
```

### Task 4: Grounded finding-action answers

**Files:**
- Modify: `apps/api/src/qadam_api/analysis/document_qa.py:92-215`
- Modify: `apps/api/tests/analysis/test_document_qa.py`

- [ ] **Step 1: Add failing action-routing tests**

```python
def test_generic_action_question_reuses_grounded_findings() -> None:
    report = completed_report_with_findings()
    result = DocumentQuestionAnswerer(DeterministicQuestionProvider()).answer(
        "Как решить найденные проблемы?", finding_blocks(), report
    )
    assert result is not None
    assert result.mode == "action"
    assert result.finding_ids == tuple(item.id for item in report.findings[:2])
    assert "Зафиксируйте срок возврата" in result.answer
    assert result.evidence


def test_category_action_question_selects_only_termination() -> None:
    report = completed_report_with_findings()
    result = DocumentQuestionAnswerer(DeterministicQuestionProvider()).answer(
        "Как исправить расторжение?", finding_blocks(), report
    )
    assert result is not None
    assert result.finding_ids == (report.findings[1].id,)


def test_action_question_without_findings_is_refused() -> None:
    assert DocumentQuestionAnswerer(DeterministicQuestionProvider()).answer(
        "Что делать с найденными проблемами?", BLOCKS, completed_report()
    ) is None
```

Create `completed_report_with_findings()` with deposit and termination findings whose clause spans map to `finding_blocks()`. The exact `action`, IDs, and citations must be asserted, not merely non-empty output.

- [ ] **Step 2: Run action tests and verify the generic question is unsupported**

Run: `cd apps/api && uv run pytest tests/analysis/test_document_qa.py -k 'action_question' -q`

Expected: FAIL because the current answerer only retrieves raw document facts.

- [ ] **Step 3: Extend the grounded answer contract and action intent detection**

```python
from typing import Literal
from uuid import UUID

class GroundedQuestionAnswer(BaseModel):
    answer: str
    mode: Literal["document", "action"] = "document"
    confidence: float = Field(ge=0.0, le=1.0)
    evidence: tuple[EvidenceMatch, ...]
    citations: tuple[Citation, ...] = ()
    finding_ids: tuple[UUID, ...] = ()

ACTION_PATTERNS = (
    "что делать", "как решить", "как исправить", "как изменить",
    "как уточнить", "не істеу керек", "қалай түзет", "қалай өзгерт",
)

def _is_action_question(question: str) -> bool:
    normalized = question.casefold().replace("ё", "е")
    return any(pattern in normalized for pattern in ACTION_PATTERNS)
```

- [ ] **Step 4: Implement deterministic action selection and evidence mapping**

```python
def _answer_from_findings(
    question: str,
    evidence: tuple[DocumentEvidenceBlock, ...],
    report: AnalysisReport,
) -> GroundedQuestionAnswer | None:
    categories = _question_categories(question)
    order = {Severity.HIGH: 0, Severity.ATTENTION: 1, Severity.INFO: 2}
    candidates = [
        item for item in report.findings
        if item.clause is not None and (not categories or item.category in categories)
    ]
    candidates.sort(key=lambda item: (order[item.severity], -item.confidence, str(item.id)))
    selected_findings = []
    selected_matches = []
    for item in candidates:
        clause = item.clause
        assert clause is not None
        blocks = [
            block for block in evidence
            if clause.span.block_start <= block.source_block_index <= clause.span.block_end
        ]
        if not blocks:
            continue
        selected_findings.append(item)
        selected_matches.extend(EvidenceMatch(block=block, score=item.confidence) for block in blocks)
        if len(selected_findings) == 3:
            break
    if not selected_findings:
        return None
    lines = [f"{index}. {item.title}: {item.action}" for index, item in enumerate(selected_findings, 1)]
    return GroundedQuestionAnswer(
        answer="\n".join(lines), mode="action",
        confidence=min(item.confidence for item in selected_findings),
        evidence=tuple(selected_matches[:3]),
        citations=tuple({citation.source_id: citation for item in selected_findings for citation in item.citations}.values()),
        finding_ids=tuple(item.id for item in selected_findings),
    )
```

Call `_answer_from_findings` before raw-document ranking when `_is_action_question(question)` is true. Reuse the existing category vocabulary in one helper so fact citation matching and action filtering cannot drift.

- [ ] **Step 5: Run the complete document-Q&A test module**

Run: `cd apps/api && uv run pytest tests/analysis/test_document_qa.py -q`

Expected: PASS; fact answers retain mode `document`, action answers use exact finding IDs, and unsupported questions remain `None`.

- [ ] **Step 6: Commit action routing**

```bash
git add apps/api/src/qadam_api/analysis/document_qa.py apps/api/tests/analysis/test_document_qa.py
git commit -m "feat: answer action questions from grounded findings"
```

### Task 5: Public question API modes and exact citations

**Files:**
- Modify: `apps/api/src/qadam_api/api/routes/questions.py:34-139`
- Modify: `apps/api/tests/api/conftest.py:30-101`
- Modify: `apps/api/tests/api/test_questions.py:8-78`

- [ ] **Step 1: Add failing API assertions for all three modes**

```python
assert grounded_response.json()["mode"] == "document"
assert refusal_response.json()["mode"] == "unsupported"

action = client.post(
    f"/api/v1/analyses/{analysis_id}/questions",
    headers={"X-Analysis-Token": token},
    json={"question": "Как решить эти проблемы?"},
)
payload = action.json()
assert payload["mode"] == "action"
assert payload["supported"] is True
assert "Зафиксируйте срок возврата" in payload["answer"]
assert payload["evidence"][0]["excerpt"].startswith("Депозит")
assert payload["citations"][0]["source_id"] == "civil-lease-552"
```

- [ ] **Step 2: Verify the API schema test fails on missing mode**

Run: `cd apps/api && uv run pytest tests/api/test_questions.py -q`

Expected: FAIL because the response has no `mode`, and generic action is refused.

- [ ] **Step 3: Add the response discriminator and exact citation lookup**

```python
class QuestionAnswer(BaseModel):
    answer: str
    mode: Literal["document", "action", "unsupported"]
    supported: bool
    confidence: float
    evidence: list[DocumentEvidenceResponse]
    citations: list[Citation]
```

For `grounded is None`, set `mode="unsupported"`. Otherwise set `mode=grounded.mode`, build a `finding_by_id` dictionary from `record.report.findings`, and for action answers attach citations only from `grounded.finding_ids`. For document answers retain the existing clause-overlap calculation. Never accept a source ID from request or provider output.

- [ ] **Step 4: Run API and privacy tests**

Run: `cd apps/api && uv run pytest tests/api/test_questions.py tests/api/test_analyses.py -q`

Expected: PASS.

- [ ] **Step 5: Commit the public answer contract**

```bash
git add apps/api/src/qadam_api/api/routes/questions.py apps/api/tests/api/conftest.py apps/api/tests/api/test_questions.py
git commit -m "feat: expose grounded question answer modes"
```

### Task 6: Contextual frontend question experience

**Files:**
- Modify: `apps/web/src/lib/report-types.ts:31-40`
- Modify: `apps/web/src/lib/api-client.ts:39-80,112-226`
- Modify: `apps/web/src/lib/api-client.test.ts`
- Modify: `apps/web/src/features/analysis/question-panel.tsx:15-134`
- Modify: `apps/web/src/features/analysis/question-panel.test.tsx`
- Modify: `apps/web/src/features/analysis/report-view.tsx:108-121`
- Modify: `apps/web/src/features/analysis/report-view.test.tsx`

- [ ] **Step 1: Write failing client-schema and component tests**

```typescript
// api-client.test.ts response fixtures
question_suggestions: ["Как изменить условие о депозите?"],
// assertion
expect(report.questionSuggestions).toEqual(["Как изменить условие о депозите?"]);
expect(answer.mode).toBe("action");

// question-panel.test.tsx
render(
  <QuestionPanel
    analysisId="analysis-1"
    suggestions={["Какая ежемесячная плата?"]}
    onAsk={vi.fn()}
  />,
);
expect(screen.getByRole("button", { name: "Какая ежемесячная плата?" })).toBeVisible();
expect(screen.queryByRole("button", { name: "Кто оплачивает ремонт?" })).not.toBeInTheDocument();

// action response assertion
expect(await screen.findByText("Действия основаны на найденных пунктах")).toBeVisible();
```

Also render `suggestions={[]}` and assert no element with label `Примеры вопросов` exists.

- [ ] **Step 2: Run focused web tests and verify type/schema/prop failures**

Run: `pnpm --filter web test -- src/lib/api-client.test.ts src/features/analysis/question-panel.test.tsx src/features/analysis/report-view.test.tsx`

Expected: FAIL because `questionSuggestions`, `mode`, and the `suggestions` prop do not exist.

- [ ] **Step 3: Extend frontend types and Zod mapping**

```typescript
// report-types.ts
questionSuggestions: string[];

// api-client.ts report schema
question_suggestions: z.array(z.string().min(1)).max(4),

// getAnalysis mapping
questionSuggestions: parsed.question_suggestions,

// QuestionAnswer
mode: "document" | "action" | "unsupported";

// askQuestion schema
mode: z.enum(["document", "action", "unsupported"]),
```

- [ ] **Step 4: Remove static examples and render only report suggestions**

```typescript
interface QuestionPanelProps {
  analysisId: string;
  suggestions: string[];
  onAsk?: (question: string) => Promise<QuestionAnswer>;
}

{suggestions.length ? (
  <div className="suggestions" aria-label="Примеры вопросов">
    {suggestions.map((suggestion) => (
      <button key={suggestion} onClick={() => setQuestion(suggestion)} type="button">
        {suggestion}
      </button>
    ))}
  </div>
) : null}
```

Pass `report.questionSuggestions` from `ReportView`. Choose the answer heading with a total record:

```typescript
const answerTitles: Record<QuestionAnswer["mode"], string> = {
  document: "Ответ подтверждён текстом договора",
  action: "Действия основаны на найденных пунктах",
  unsupported: "Ответ не найден в тексте договора",
};
```

- [ ] **Step 5: Run component tests, lint, and TypeScript**

Run: `pnpm --filter web test -- src/lib/api-client.test.ts src/features/analysis/question-panel.test.tsx src/features/analysis/report-view.test.tsx && pnpm --filter web lint && pnpm --filter web typecheck`

Expected: PASS.

- [ ] **Step 6: Commit the contextual UI**

```bash
git add apps/web/src
git commit -m "feat: show contextual grounded questions"
```

### Task 7: Mixed-language browser journey and labelled Q&A evaluation

**Files:**
- Modify: `apps/web/e2e/analysis.spec.ts`
- Create: `evaluation/document_qa_cases.json`
- Modify: `scripts/evaluate_mvp.py`
- Modify: `apps/api/tests/evaluation/test_mvp_evaluation.py`

- [ ] **Step 1: Add a failing fourth Playwright journey**

```typescript
test("answers mixed-language facts and grounded actions", async ({ page }) => {
  await page.goto("/");
  const mixedPdf = path.resolve(process.cwd(), "../../demo/contracts/qadam-mixed-language-contract.pdf");
  await page.getByLabel("Выберите договор").setInputFiles(mixedPdf);
  await page.getByRole("checkbox", { name: /согласен на обработку/i }).check();
  await page.getByRole("button", { name: "Проверить договор" }).click();
  await expect(page.getByRole("heading", { name: "Что проверить до подписания" })).toBeVisible({ timeout: 20_000 });

  await expect(page.getByRole("button", { name: "Какая ежемесячная плата?" })).toBeVisible();
  await expect(page.getByRole("button", { name: /повысить|изменить цену/i })).toHaveCount(0);
  await page.getByLabel("Вопрос по договору").fill("Какая арендная плата?");
  await page.getByRole("button", { name: "Получить ответ" }).click();
  await expect(page.getByText(/160 000/).last()).toBeVisible();

  await page.getByLabel("Вопрос по договору").fill("Как решить найденные проблемы?");
  await page.getByRole("button", { name: "Получить ответ" }).click();
  await expect(page.getByText("Действия основаны на найденных пунктах")).toBeVisible();
  await expect(page.getByText(/письменн.*срок уведомления/i).last()).toBeVisible();
});
```

- [ ] **Step 2: Run the journey against Docker and confirm the observed failure is reproduced**

Run: `make up && pnpm --filter web exec playwright test e2e/analysis.spec.ts -g "mixed-language"`

Expected before Tasks 1–6: FAIL on missing contextual suggestion or Russian-to-Kazakh rent answer. Expected now: PASS. Keep this run as an integration proof, then continue.

- [ ] **Step 3: Commit a transparent Q&A label set**

Create JSON with schema:

```json
{
  "dataset": "qadam-synthetic-document-qa-v1",
  "synthetic": true,
  "cases": [
    {
      "id": "mixed-rent-ru-to-kz",
      "document": "qadam-mixed-language-contract.pdf",
      "question": "Какая арендная плата?",
      "expected_mode": "document",
      "expected_excerpt_contains": "160 000",
      "expected_categories": [],
      "cross_language": true
    },
    {
      "id": "mixed-actions",
      "document": "qadam-mixed-language-contract.pdf",
      "question": "Как решить найденные проблемы?",
      "expected_mode": "action",
      "expected_excerpt_contains": "",
      "expected_categories": ["deposit", "termination"],
      "cross_language": false
    },
    {
      "id": "challenge-parking-refusal",
      "document": "qadam-qa-challenge-contract.pdf",
      "question": "Есть ли парковочное место?",
      "expected_mode": "unsupported",
      "expected_excerpt_contains": "",
      "expected_categories": [],
      "cross_language": false
    }
  ]
}
```

Add cases for risky rent change, mixed Kazakh rent, challenge city/pet, balanced action refusal, and category-specific termination action. Each supported fact must name an expected excerpt; each action must name exact expected clause categories.

- [ ] **Step 4: Add failing evaluator assertions**

```python
question_answering = result["document_question_answering"]
assert question_answering["cases"] >= 8
assert question_answering["supported_evidence_accuracy"] == 1.0
assert question_answering["expected_excerpt_accuracy"] == 1.0
assert question_answering["action_finding_accuracy"] == 1.0
assert question_answering["refusal_accuracy"] == 1.0
assert question_answering["cross_language_accuracy"] == 1.0
assert all(result["gates"].values())
```

- [ ] **Step 5: Implement Q&A evaluation through the production answerer**

In `evaluate_mvp.py`, cache each analysed document's `AnalysisOutcome`, construct `DocumentQuestionAnswerer(DeterministicQuestionProvider())`, run every fixture case, and compare:

```python
result = answerer.answer(case["question"], outcome.evidence, outcome.report)
actual_mode = "unsupported" if result is None else result.mode
evidence_text = " ".join(match.block.text for match in result.evidence) if result else ""
finding_categories = {
    finding.category.value for finding in outcome.report.findings
    if result is not None and finding.id in result.finding_ids
}
```

Compute each metric with an explicit numerator/denominator and add five equality gates. Keep the top-level scope and dataset labels explicitly synthetic.

- [ ] **Step 6: Run evaluator tests and regenerate evidence**

Run: `cd apps/api && uv run pytest tests/evaluation/test_mvp_evaluation.py -q && uv run python ../../scripts/evaluate_mvp.py --runs-per-document 5 --output ../../docs/evaluation-results.json`

Expected: PASS and all document-Q&A metrics/gates equal `1.0`.

- [ ] **Step 7: Run all four browser journeys and commit**

Run: `make e2e`

Expected: PASS, 4 Playwright tests.

```bash
git add apps/web/e2e/analysis.spec.ts evaluation/document_qa_cases.json scripts/evaluate_mvp.py apps/api/tests/evaluation/test_mvp_evaluation.py docs/evaluation-results.json
git commit -m "test: validate grounded document qa end to end"
```

### Task 8: Honest final-submission validator

**Files:**
- Create: `scripts/check_final_submission.py`
- Create: `scripts/tests/test_check_final_submission.py`
- Create: `release/final-submission.json`
- Modify: `Makefile:1-55`

- [ ] **Step 1: Write validator unit tests before implementation**

```python
def ready_payload() -> dict[str, object]:
    return {
        "custdev_observations": [
            {"evidence_id": "CUST-01", "status": "verified", "observation": "Anon A"},
            {"evidence_id": "CUST-02", "status": "verified", "observation": "Anon B"},
            {"evidence_id": "CUST-03", "status": "verified", "observation": "Anon C"},
        ],
        "team": [{"name": "Member One", "role": "Product and AI"}],
        "demo_url": "https://www.youtube.com/watch?v=verified-demo",
        "intended_commit": "a" * 40,
        "pitch_path": "pitch/QADAM_AI_Pitch_Deck.html",
    }


def test_external_requirements_are_reported_independently(tmp_path: Path) -> None:
    payload = ready_payload()
    payload["custdev_observations"] = []
    payload["team"] = []
    payload["demo_url"] = ""
    errors = validate_submission(tmp_path, payload, git_state=lambda _root: (True, "a" * 40))
    assert errors == [
        "custdev: at least 3 verified anonymised observations are required",
        "team: at least one real name and role are required",
        "demo_url: public YouTube, Google Drive, or live URL is required",
    ]


def test_dirty_or_wrong_commit_and_pitch_markers_fail(tmp_path: Path) -> None:
    pitch = tmp_path / "pitch" / "QADAM_AI_Pitch_Deck.html"
    pitch.parent.mkdir(parents=True)
    pitch.write_text("TEAM INPUT REQUIRED / VIDEO_OR_LIVE_URL", encoding="utf-8")
    payload = ready_payload()
    payload["intended_commit"] = "b" * 40
    errors = validate_submission(
        tmp_path, payload, git_state=lambda _root: (False, "a" * 40)
    )
    assert errors == [
        "pitch: unresolved marker 'TEAM INPUT REQUIRED'",
        "pitch: unresolved marker 'VIDEO_OR_LIVE_URL'",
        "git: repository has uncommitted changes",
        f"git: intended commit {'b' * 40} does not match HEAD {'a' * 40}",
    ]


def test_ready_submission_passes(tmp_path: Path) -> None:
    pitch = tmp_path / "pitch" / "QADAM_AI_Pitch_Deck.html"
    pitch.parent.mkdir(parents=True)
    pitch.write_text("QADAM AI verified submission", encoding="utf-8")
    payload = ready_payload()
    assert validate_submission(
        tmp_path, payload, git_state=lambda _root: (True, "a" * 40)
    ) == []
```

Use these concrete filesystem writes, payload mutations, and exact error-list assertions in the test file.

- [ ] **Step 2: Run the unit test and verify the import failure**

Run: `python -m unittest scripts.tests.test_check_final_submission -v`

Expected: FAIL because `scripts.check_final_submission` does not exist.

- [ ] **Step 3: Implement pure validation plus a thin CLI**

```python
ALLOWED_DEMO_HOSTS = {"youtube.com", "www.youtube.com", "youtu.be", "drive.google.com"}
SUBMISSION_MARKERS = ("TEAM INPUT REQUIRED", "VIDEO_OR_LIVE_URL")

def validate_submission(root: Path, payload: dict[str, object], *, git_state=read_git_state) -> list[str]:
    errors: list[str] = []
    observations = payload.get("custdev_observations", [])
    verified = [item for item in observations if isinstance(item, dict) and item.get("status") == "verified" and item.get("observation")]
    if len(verified) < 3:
        errors.append("custdev: at least 3 verified anonymised observations are required")
    team = payload.get("team", [])
    if not isinstance(team, list) or not team or not all(isinstance(item, dict) and item.get("name") and item.get("role") for item in team):
        errors.append("team: at least one real name and role are required")
    # Parse demo_url, accept https YouTube/Drive or any https URL when live_url=true.
    # Read pitch_path and reject each explicit submission marker.
    # Compare intended_commit to git rev-parse HEAD and reject a dirty tree.
    return errors
```

The CLI reads `release/final-submission.json`, prints every blocker, and exits `1` until all external inputs are real. The checked-in JSON must intentionally contain empty external values and the current expected marker-bearing pitch path, so the gate reports reality.

- [ ] **Step 4: Run tooling tests and confirm the real final gate fails accurately**

Run: `python -m unittest scripts.tests.test_check_final_submission -v && python scripts/check_final_submission.py`

Expected: unit tests PASS; real command exits `1` and lists missing CustDev, team, demo URL, intended public commit, and unresolved pitch markers as applicable.

- [ ] **Step 5: Add the Make target and commit**

```make
final-submission-check:
	python scripts/check_final_submission.py
```

```bash
git add scripts/check_final_submission.py scripts/tests/test_check_final_submission.py release/final-submission.json Makefile
git commit -m "feat: gate final hackathon submission evidence"
```

### Task 9: Competition documentation and pitch refresh

**Files:**
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `docs/ai-pipeline.md`
- Modify: `docs/demo-script.md`
- Modify: `docs/demo-recording-checklist.md`
- Modify: `docs/jury-qa.md`
- Modify: `docs/pitch-speaker-notes.md`
- Modify: `docs/submission-checklist.md`
- Modify: `docs/submission-runbook.md`
- Modify: `docs/verification-report.md`
- Modify: `docs/research/README.md`
- Modify: `pitch/QADAM_AI_Pitch_Deck.html`
- Regenerate: `pitch/QADAM_AI_Pitch_Deck.pdf`
- Modify: `release/release-manifest.json` only if a regenerated tracked artifact hash changes there.

- [ ] **Step 1: Capture fresh facts before editing prose**

Run:

```bash
cd apps/api && uv run pytest -q
cd ../.. && pnpm --filter web test
python -m unittest discover -s scripts/tests -v
python scripts/evaluate_mvp.py --runs-per-document 5 --output docs/evaluation-results.json
```

Expected: all commands PASS. Record exact test counts and evaluator numerators from output/JSON; do not estimate them.

- [ ] **Step 2: Update technical explanation and user-facing demo path**

Document this exact behaviour consistently:

```text
contextual suggestions → document/action router
document mode → masked evidence retrieval → grounded phrasing
action mode → existing findings → exact clause evidence + existing legal citations
unsupported mode → empty evidence and citations
```

Add the mixed-language demo sequence and expected `160 000`/grounded-action proof. State that the Q&A fixture is synthetic and that its `1.0` gates are regression accuracy, not production legal accuracy.

- [ ] **Step 3: Update research and submission truthfulness**

Keep the verified statistics separate from user research. Preserve the explicit remaining actions: at least three anonymised sessions in the evidence matrix, real team names/roles, and a public team-owned YouTube/Drive/live URL. Explain `make final-submission-check` as the final irreversible submission gate.

- [ ] **Step 4: Refresh the 11-slide pitch from verified evidence**

Update slide 8/9 engineering and validation proof with current test counts, four browser journeys, and the five Q&A metrics. Add the public raw GitHub fallback-video URL as a technical backup. Keep real team and field-research claims visibly unclaimed until supplied; do not substitute invented names, quotes, or percentages.

- [ ] **Step 5: Render and inspect the PDF**

Run:

```bash
make pitch
pdfinfo pitch/QADAM_AI_Pitch_Deck.pdf
pdftotext pitch/QADAM_AI_Pitch_Deck.pdf - | sed -n '1,240p'
```

Expected: 11 pages, no clipped/missing slide text in extraction, and no technical metric disagreement with `docs/evaluation-results.json`. Render pages to images and visually inspect all 11 pages at readable resolution before accepting the deck.

- [ ] **Step 6: Run documentation and ordinary release gates**

Run: `make docs-check && make release-check && git diff --check`

Expected: PASS. `make final-submission-check` must still fail only on genuine team-supplied blockers.

- [ ] **Step 7: Commit the artifact refresh**

```bash
git add README.md docs pitch release/release-manifest.json
git commit -m "docs: refresh competition evidence and pitch"
```

### Task 10: Full verification, publication, and truthful handoff

**Files:**
- Modify if metrics changed: `docs/verification-report.md`
- Modify if hashes changed: `docs/submission-checklist.md`, `release/release-manifest.json`

- [ ] **Step 1: Run the complete deterministic quality gate**

Run:

```bash
pnpm verify
make release-tools-test
make security-check
make docs-check
make evaluate
make pitch
make fallback-demo
make release-check
make e2e
docker compose config --quiet
docker compose ps
pdfinfo pitch/QADAM_AI_Pitch_Deck.pdf
git diff --check
```

Expected: all ordinary development/release commands PASS; API, web, and PostgreSQL are healthy; pitch remains at most 12 pages; browser suite has four passing journeys.

- [ ] **Step 2: Run the intentionally strict final gate**

Run: `make final-submission-check`

Expected before team input: FAIL with explicit missing real CustDev, team names/roles, public demo/live URL, and any still-unresolved pitch/commit fields. No code regression may appear in this list.

- [ ] **Step 3: Refresh exact counts and hashes once, then re-run affected gates**

Use `sha256sum` for the pitch, demo PDFs, brief, fallback video, and fallback manifest. Update tracked verification prose only with observed outputs. Re-run `make docs-check`, `make release-check`, `git diff --check`, and focused tests for any changed script.

- [ ] **Step 4: Commit the final verified snapshot**

```bash
git add docs/evaluation-results.json docs/verification-report.md docs/submission-checklist.md pitch/QADAM_AI_Pitch_Deck.pdf release/release-manifest.json
git commit -m "chore: record maximum-score verification evidence"
```

If no file changed after verification, do not create an empty commit.

- [ ] **Step 5: Verify repository state and publish the feature branch**

Run:

```bash
git status --short
git log --oneline --decorate -12
git push origin feature/qadam-online-stage
```

Expected: clean tree before push; remote branch points at the locally verified commit. Then confirm the public repository/PR and CI checks without rewriting history.

- [ ] **Step 6: Handoff the remaining real-world maximum-score actions**

Report the verified rubric evidence and the exact final-gate blockers. The team must then conduct and record real anonymised sessions, add actual names/roles, record and publish the ≤3-minute voiced demo or provide a live URL, put those facts in the pitch/config, and re-run `make final-submission-check`. Do not claim a guaranteed score or completed field evidence before that gate passes.
