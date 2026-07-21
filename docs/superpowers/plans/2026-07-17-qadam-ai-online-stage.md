# QADAM AI Online-Stage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build, verify, document, and package a working QADAM AI rental-contract analysis MVP and every required Tech Vision 2026 online-stage artifact.

**Architecture:** A pnpm monorepo contains an accessible Next.js web app and a FastAPI API. The API implements a deterministic document-analysis baseline, curated Kazakhstan legal retrieval, optional embedding/LLM providers, grounding validation, and structured reports; PostgreSQL/pgvector is the production persistence target while tests use isolated repositories for speed and reproducibility.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Vitest, Testing Library, Playwright, FastAPI, Python 3.12+, Pydantic 2, SQLAlchemy 2, PyMuPDF, python-docx, PostgreSQL 16 with pgvector, pytest, Ruff, mypy, Docker Compose.

---

## File Map

```text
.
├── apps/
│   ├── api/
│   │   ├── pyproject.toml
│   │   ├── src/qadam_api/
│   │   │   ├── api/                 # FastAPI routes and dependencies
│   │   │   ├── analysis/            # clause extraction, rules, orchestration
│   │   │   ├── documents/           # validation, parsing, masking
│   │   │   ├── legal/               # corpus loading, retrieval, reranking
│   │   │   ├── providers/           # embedding and explanation interfaces
│   │   │   ├── repositories/        # persistence interfaces and adapters
│   │   │   ├── settings.py
│   │   │   └── main.py
│   │   └── tests/
│   └── web/
│       ├── src/app/                  # Next.js routes
│       ├── src/components/           # reusable visual components
│       ├── src/features/analysis/    # upload, processing, report, Q&A
│       ├── src/lib/                  # API client, formatting, shared helpers
│       └── src/test/                 # Vitest setup and fixtures
├── corpus/legal/                     # curated, versioned official legal chunks
├── demo/contracts/                   # labelled synthetic demonstration inputs
├── docs/
│   ├── architecture.md
│   ├── corpus-provenance.md
│   ├── research/                     # interview template and evidence matrix
│   ├── demo-script.md
│   └── verification-report.md
├── pitch/
│   ├── QADAM_AI_Pitch_Deck.html
│   └── QADAM_AI_Pitch_Deck.pdf
├── docker-compose.yml
├── Makefile
├── package.json
├── pnpm-workspace.yaml
├── .env.example
├── .gitignore
└── README.md
```

## Task 1: Repository and Tooling Foundation

**Files:**
- Create: `.gitignore`
- Create: `.env.example`
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `Makefile`
- Create: `apps/api/pyproject.toml`
- Create: `apps/api/src/qadam_api/__init__.py`
- Create: `apps/api/tests/test_smoke.py`
- Create: `README.md`

- [ ] **Step 1: Write the failing backend import smoke test**

```python
def test_qadam_api_package_is_importable() -> None:
    import qadam_api

    assert qadam_api.__version__ == "0.1.0"
```

- [ ] **Step 2: Run the smoke test and verify RED**

Run: `cd apps/api && uv run pytest tests/test_smoke.py -q`

Expected: failure because the package metadata and test dependencies do not exist yet.

- [ ] **Step 3: Add the Python project configuration and minimal package**

Use Python `>=3.12,<3.15`. Pin runtime and development dependencies in `apps/api/pyproject.toml`. Configure pytest with `pythonpath = ["src"]`, Ruff for a 100-character line length, and mypy with strict optional checking. Set `qadam_api.__version__ = "0.1.0"`.

- [ ] **Step 4: Add root workspace configuration**

Root scripts must expose `test`, `lint`, `typecheck`, `build`, and `dev`. The Makefile must provide equivalent `install`, `test`, `lint`, `typecheck`, `dev`, and `verify` targets without hiding command failures.

- [ ] **Step 5: Add secret and artifact exclusions**

Ignore `.env`, virtual environments, Python caches, test caches, Node modules, Next build output, uploaded documents, local database volumes, coverage output, and temporary pitch renders. Do not ignore the curated corpus, demo contracts, final pitch PDF, or verification report.

- [ ] **Step 6: Verify GREEN and commit**

Run: `cd apps/api && uv sync --all-groups && uv run pytest tests/test_smoke.py -q`

Expected: `1 passed`.

Commit: `chore: initialize QADAM AI monorepo`

## Task 2: Domain Schemas and Analysis State

**Files:**
- Create: `apps/api/src/qadam_api/domain.py`
- Create: `apps/api/tests/test_domain.py`

- [ ] **Step 1: Write failing schema tests**

Test that:

- `Clause` rejects confidence outside `0..1`;
- `Citation` requires a canonical `https://` URL and non-empty source reference;
- `Finding` cannot be high severity without at least one citation;
- `AnalysisReport` calculates severity counts from findings;
- analysis status values are limited to `queued`, `extracting`, `analyzing`, `completed`, and `failed`.

The intended public model is:

```python
class Finding(BaseModel):
    id: UUID
    severity: Literal["info", "attention", "high"]
    category: ClauseType
    title: str
    explanation: str
    action: str
    landlord_question: str
    clause: Clause | None
    citations: list[Citation]
    confidence: float
```

- [ ] **Step 2: Verify RED**

Run: `cd apps/api && uv run pytest tests/test_domain.py -q`

Expected: import failure for `qadam_api.domain`.

- [ ] **Step 3: Implement minimal Pydantic models**

Create enums and models for upload metadata, clause spans, clauses, citations, findings, processing stages, analysis status, analysis report, grounded answer, and negotiation message. Add model validators only for tested invariants.

- [ ] **Step 4: Verify GREEN and commit**

Run: `cd apps/api && uv run pytest tests/test_domain.py -q`

Expected: all domain tests pass.

Commit: `feat(api): define structured analysis domain`

## Task 3: File Validation and Document Parsing

**Files:**
- Create: `apps/api/src/qadam_api/documents/validation.py`
- Create: `apps/api/src/qadam_api/documents/parser.py`
- Create: `apps/api/src/qadam_api/documents/types.py`
- Create: `apps/api/tests/documents/test_validation.py`
- Create: `apps/api/tests/documents/test_parser.py`
- Create: `apps/api/tests/fixtures/contracts/valid.pdf`
- Create: `apps/api/tests/fixtures/contracts/valid.docx`
- Create: `apps/api/tests/fixtures/contracts/scan_like.pdf`

- [ ] **Step 1: Write failing validation tests**

Cover valid PDF/DOCX signatures, spoofed extensions, unsupported types, empty files, a 10 MB limit, and encrypted PDFs. Assert stable error codes such as `unsupported_type`, `file_too_large`, `empty_file`, and `encrypted_pdf`.

- [ ] **Step 2: Verify validation RED**

Run: `cd apps/api && uv run pytest tests/documents/test_validation.py -q`

Expected: import failure for the validation module.

- [ ] **Step 3: Implement validation and verify GREEN**

The validator accepts bytes and a client filename, checks `%PDF-` or ZIP/DOCX structure, and returns a typed `ValidatedUpload`. It never builds a filesystem path from the client filename.

Run: `cd apps/api && uv run pytest tests/documents/test_validation.py -q`

- [ ] **Step 4: Write failing parser tests**

Assert that PDF pages and DOCX paragraphs/tables become normalized `TextBlock` objects with source spans. Assert that fewer than 80 useful characters produces `ocr_required`.

- [ ] **Step 5: Verify parser RED**

Run: `cd apps/api && uv run pytest tests/documents/test_parser.py -q`

- [ ] **Step 6: Implement parsing and verify GREEN**

Use PyMuPDF and `python-docx`. Preserve page/paragraph labels and collapse repeated whitespace without joining separate blocks.

Run: `cd apps/api && uv run pytest tests/documents -q`

Expected: validation and parsing suites pass.

Commit: `feat(parser): validate and extract rental documents`

## Task 4: Privacy Masking and Language Normalization

**Files:**
- Create: `apps/api/src/qadam_api/documents/privacy.py`
- Create: `apps/api/src/qadam_api/documents/language.py`
- Create: `apps/api/tests/documents/test_privacy.py`
- Create: `apps/api/tests/documents/test_language.py`

- [ ] **Step 1: Write failing masking tests**

Use realistic Russian/Kazakh contract text and assert masking of IIN-like identifiers, phone numbers, emails, and card-like numbers while preserving rent amounts, dates, article numbers, and paragraph spans.

- [ ] **Step 2: Verify RED, implement, and verify GREEN**

Run RED: `cd apps/api && uv run pytest tests/documents/test_privacy.py -q`

Implement stable placeholders such as `[ИИН_1]`, `[ТЕЛЕФОН_1]`, and `[EMAIL_1]` plus a private mapping that is not sent to providers.

Run GREEN: `cd apps/api && uv run pytest tests/documents/test_privacy.py -q`

- [ ] **Step 3: Write failing language and synonym tests**

Assert `ru`, `kz`, and `mixed` detection for representative blocks. Assert that synonyms including `залог`, `депозит`, `кепілпұл`, `коммуналка`, and `коммуналдық қызметтер` normalize to clause-family search terms without rewriting original text.

- [ ] **Step 4: Verify RED, implement, and verify GREEN**

Run: `cd apps/api && uv run pytest tests/documents/test_language.py -q`

Commit: `feat(privacy): mask identifiers and normalize bilingual terms`

## Task 5: Clause Extraction

**Files:**
- Create: `apps/api/src/qadam_api/analysis/clause_extractor.py`
- Create: `apps/api/src/qadam_api/analysis/clause_taxonomy.py`
- Create: `apps/api/tests/analysis/test_clause_extractor.py`
- Create: `demo/contracts/qadam-balanced-contract.txt`
- Create: `demo/contracts/qadam-risky-contract.txt`
- Create: `demo/contracts/qadam-mixed-language-contract.txt`
- Create: `demo/contracts/labels.json`

- [ ] **Step 1: Write one failing test per clause family**

Tests must exercise actual text blocks and verify clause type, source text, span, extracted monetary amounts/dates, and confidence. Include negative tests so “депозит” in a legal citation is not treated as a contract deposit clause.

- [ ] **Step 2: Verify RED**

Run: `cd apps/api && uv run pytest tests/analysis/test_clause_extractor.py -q`

- [ ] **Step 3: Implement the deterministic extractor**

Use heading patterns, keyword families, neighbor-block context, and typed fact extractors. Keep taxonomy and extraction separate so the implementation can be explained and extended.

- [ ] **Step 4: Verify GREEN and fixture coverage**

Run: `cd apps/api && uv run pytest tests/analysis/test_clause_extractor.py -q`

Run: `cd apps/api && uv run python -m qadam_api.analysis.clause_extractor ../../demo/contracts/qadam-risky-contract.txt`

Expected: JSON containing rent, deposit, utilities, repairs, termination, occupancy, and landlord-access clauses.

Commit: `feat(analysis): extract bilingual rental clauses`

## Task 6: Curated Legal Corpus and Provenance

**Files:**
- Create: `corpus/legal/housing_relations.json`
- Create: `corpus/legal/civil_code_lease.json`
- Create: `corpus/legal/personal_data.json`
- Create: `corpus/legal/manifest.json`
- Create: `docs/corpus-provenance.md`
- Create: `apps/api/src/qadam_api/legal/corpus.py`
- Create: `apps/api/tests/legal/test_corpus.py`

- [ ] **Step 1: Capture official source metadata**

For every selected article, store the canonical Adilet/eGov URL, act title, article reference, Russian text, optional Kazakh text, effective date, retrieval timestamp, and SHA-256 checksum. Include only provisions relevant to the supported clause families and privacy behavior.

- [ ] **Step 2: Write failing corpus integrity tests**

Assert unique chunk IDs, HTTPS official URLs, non-empty article references, snapshot dates, effective dates, supported clause-family metadata, checksum correctness, and no superseded source marked active.

- [ ] **Step 3: Verify RED, implement loader, and verify GREEN**

Run RED: `cd apps/api && uv run pytest tests/legal/test_corpus.py -q`

Implement a loader that validates every JSON chunk through Pydantic before making it searchable.

Run GREEN: `cd apps/api && uv run pytest tests/legal/test_corpus.py -q`

Commit: `data(legal): add verified Kazakhstan rental corpus`

## Task 7: Hybrid Retrieval and Reranking

**Files:**
- Create: `apps/api/src/qadam_api/providers/embeddings.py`
- Create: `apps/api/src/qadam_api/legal/retriever.py`
- Create: `apps/api/src/qadam_api/legal/reranker.py`
- Create: `apps/api/tests/legal/test_retriever.py`
- Create: `apps/api/tests/legal/test_reranker.py`
- Create: `apps/api/tests/evaluation/test_retrieval_quality.py`

- [ ] **Step 1: Write failing retrieval contract tests**

Define an `EmbeddingProvider` protocol and deterministic test implementation. Assert that deposit queries retrieve deposit/payment provisions, capital-repair queries retrieve the correct Civil Code article, ownership-change queries retrieve the relevant housing/Civil Code passage, and results expose lexical, vector, and final scores.

- [ ] **Step 2: Verify RED**

Run: `cd apps/api && uv run pytest tests/legal/test_retriever.py -q`

- [ ] **Step 3: Implement hybrid scoring**

Normalize lexical and cosine scores to `0..1`, combine them with metadata-family matches, and keep the weights in an explicit configuration object. The in-memory adapter is the reference behavior; a PostgreSQL adapter may use `tsvector` and pgvector while returning the same domain result.

- [ ] **Step 4: Write reranker tests before implementation**

Assert authority priority, article-reference matches, clause-family matches, active-source preference, and stable tie-breaking.

- [ ] **Step 5: Implement reranking and quality evaluation**

Create at least 20 labelled Russian/Kazakh evaluation queries. Calculate hit@5 and fail the evaluation test below the documented threshold.

Run: `cd apps/api && uv run pytest tests/legal tests/evaluation/test_retrieval_quality.py -q`

Expected: hit@5 at or above `0.90` on the curated evaluation set.

Commit: `feat(rag): add hybrid legal retrieval and reranking`

## Task 8: Risk Rules and Grounding Validator

**Files:**
- Create: `apps/api/src/qadam_api/analysis/rules.py`
- Create: `apps/api/src/qadam_api/analysis/grounding.py`
- Create: `apps/api/tests/analysis/test_rules.py`
- Create: `apps/api/tests/analysis/test_grounding.py`

- [ ] **Step 1: Write failing risk-rule tests**

Cover unclear deposit return, unilateral rent changes, unrestricted landlord entry, tenant-funded capital repairs, missing property identity, missing utility allocation, one-sided immediate termination, and a balanced clause that must not be marked high risk.

- [ ] **Step 2: Verify RED and implement rules**

Run RED: `cd apps/api && uv run pytest tests/analysis/test_rules.py -q`

Rules return evidence objects, not finished prose. Every high-severity rule names the exact trigger and required legal family.

Run GREEN: `cd apps/api && uv run pytest tests/analysis/test_rules.py -q`

- [ ] **Step 3: Write grounding tests**

Reject fabricated source IDs, high-severity findings without legal support, citations unrelated to the finding category, missing clause spans when a claim is document-specific, and categorical “illegal” language without explicit source support.

- [ ] **Step 4: Implement grounding and verify GREEN**

Run: `cd apps/api && uv run pytest tests/analysis/test_grounding.py -q`

Commit: `feat(safety): ground risk findings in contract and law`

## Task 9: Explanation Provider and Analysis Orchestrator

**Files:**
- Create: `apps/api/src/qadam_api/providers/explanations.py`
- Create: `apps/api/src/qadam_api/providers/openai_compatible.py`
- Create: `apps/api/src/qadam_api/analysis/orchestrator.py`
- Create: `apps/api/tests/providers/test_explanations.py`
- Create: `apps/api/tests/analysis/test_orchestrator.py`

- [ ] **Step 1: Write failing provider tests**

Assert schema validation, citation allow-listing, timeout fallback, deterministic fallback text, and prohibition of raw unmasked text in provider calls.

- [ ] **Step 2: Verify RED, implement interfaces, and verify GREEN**

The deterministic provider must produce a readable report entirely from rules, clauses, and retrieved sources. The OpenAI-compatible adapter is optional at runtime and accepts base URL, model, and API key only through settings.

- [ ] **Step 3: Write the failing end-to-end orchestrator test**

Given the risky synthetic contract, assert processing-stage order, detected findings, citation coverage, next actions, and a completed report. Given a scan-like file, assert `failed` with `ocr_required` and no provider call.

- [ ] **Step 4: Implement orchestrator and verify GREEN**

Run: `cd apps/api && uv run pytest tests/providers tests/analysis/test_orchestrator.py -q`

Commit: `feat(ai): orchestrate grounded contract analysis`

## Task 10: Repositories and FastAPI Endpoints

**Files:**
- Create: `apps/api/src/qadam_api/repositories/base.py`
- Create: `apps/api/src/qadam_api/repositories/memory.py`
- Create: `apps/api/src/qadam_api/repositories/postgres.py`
- Create: `apps/api/src/qadam_api/settings.py`
- Create: `apps/api/src/qadam_api/api/dependencies.py`
- Create: `apps/api/src/qadam_api/api/routes/analyses.py`
- Create: `apps/api/src/qadam_api/api/routes/questions.py`
- Create: `apps/api/src/qadam_api/api/routes/feedback.py`
- Create: `apps/api/src/qadam_api/main.py`
- Create: `apps/api/tests/api/test_analyses.py`
- Create: `apps/api/tests/api/test_questions.py`
- Create: `apps/api/tests/api/test_health.py`

- [ ] **Step 1: Write failing API tests**

Use FastAPI `TestClient` and dependency overrides. Cover upload, polling, findings, invalid token, unsupported file, OCR-required response, grounded question, unsupported question, negotiation message, feedback, and `/healthz`.

- [ ] **Step 2: Verify RED**

Run: `cd apps/api && uv run pytest tests/api -q`

- [ ] **Step 3: Implement in-memory repository and routes**

Return `202` for accepted analyses, stable public analysis IDs/tokens, and RFC 9457-style problem details for errors. Do not expose raw exceptions or filesystem paths.

- [ ] **Step 4: Implement PostgreSQL adapter and migrations**

Use SQLAlchemy models behind the repository protocol. Add tables for analyses, documents, clauses, legal chunks, findings, retrieval logs, questions, and feedback. Store vectors with pgvector when configured.

- [ ] **Step 5: Verify GREEN, OpenAPI, lint, and typecheck**

Run:

```bash
cd apps/api
uv run pytest tests/api -q
uv run ruff check src tests
uv run mypy src
uv run python -c "from qadam_api.main import app; assert app.openapi()['info']['title'] == 'QADAM AI API'"
```

Commit: `feat(api): expose contract analysis endpoints`

## Task 11: Accessible Web Foundation and Design System

**Files:**
- Create: `apps/web/` using the official empty Next.js scaffold
- Modify: `apps/web/package.json`
- Modify: `apps/web/src/app/globals.css`
- Modify: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/components/ui/button.tsx`
- Create: `apps/web/src/components/ui/card.tsx`
- Create: `apps/web/src/components/ui/icon.tsx`
- Create: `apps/web/src/test/setup.ts`
- Create: `apps/web/src/components/ui/button.test.tsx`
- Create: `design-system/MASTER.md`

- [ ] **Step 1: Scaffold configuration only**

Run:

```bash
pnpm dlx create-next-app@16.2.10 apps/web --ts --tailwind --eslint --app --src-dir --import-alias '@/*' --empty --use-pnpm --disable-git --yes
pnpm --dir apps/web add lucide-react zod
pnpm --dir apps/web add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test axe-core
```

- [ ] **Step 2: Write the failing button accessibility test**

```tsx
it("exposes loading and disabled state without changing its label", () => {
  render(<Button loading>Анализируем договор</Button>);
  const button = screen.getByRole("button", { name: "Анализируем договор" });
  expect(button).toBeDisabled();
  expect(button).toHaveAttribute("aria-busy", "true");
});
```

- [ ] **Step 3: Verify RED, implement UI primitives, and verify GREEN**

Use CSS variables for paper, ink, teal, amber, danger, borders, focus, radii, spacing, and motion. Use IBM Plex Sans and Literata through `next/font`. Provide skip navigation, a visible focus ring, reduced-motion rules, and 44 px minimum controls.

Run: `pnpm --dir apps/web test -- --run`

Commit: `feat(web): establish accessible QADAM design system`

## Task 12: Landing and Upload Experience

**Files:**
- Modify: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/features/analysis/upload-form.tsx`
- Create: `apps/web/src/features/analysis/upload-form.test.tsx`
- Create: `apps/web/src/lib/api-client.ts`
- Create: `apps/web/src/lib/api-client.test.ts`

- [ ] **Step 1: Write failing upload-flow tests**

Cover visible labels, format/size help, consent required, PDF/DOCX selection, client-side size error, loading state, API problem display, keyboard operation, and successful navigation to the analysis route.

- [ ] **Step 2: Verify RED**

Run: `pnpm --dir apps/web test -- --run src/features/analysis/upload-form.test.tsx`

- [ ] **Step 3: Implement landing and upload**

The landing hero uses one primary CTA, verified student statistics, a three-step explanation, privacy statement, and legal disclaimer. The form uses a native file input enhanced by drag-and-drop; it must never require drag-and-drop.

- [ ] **Step 4: Verify GREEN and commit**

Run: `pnpm --dir apps/web test -- --run`

Commit: `feat(web): add focused contract upload journey`

## Task 13: Processing and Report Experience

**Files:**
- Create: `apps/web/src/app/analysis/[id]/page.tsx`
- Create: `apps/web/src/features/analysis/processing-status.tsx`
- Create: `apps/web/src/features/analysis/report-view.tsx`
- Create: `apps/web/src/features/analysis/finding-card.tsx`
- Create: `apps/web/src/features/analysis/citation-panel.tsx`
- Create: `apps/web/src/features/analysis/report-view.test.tsx`

- [ ] **Step 1: Write failing processing/report tests**

Assert real stage labels, no fake percentage, severity sorting, finding counts, expandable contract excerpts, official source links, confidence text, missing-term section, next actions, empty/high-risk states, and retryable failure messages.

- [ ] **Step 2: Verify RED and implement**

Desktop uses a two-column report with a sticky evidence panel; mobile uses a single-column disclosure pattern. Color never acts as the only severity indicator.

- [ ] **Step 3: Verify GREEN and commit**

Run: `pnpm --dir apps/web test -- --run src/features/analysis/report-view.test.tsx`

Commit: `feat(web): present grounded rental risk report`

## Task 14: Grounded Q&A and Negotiation Helper

**Files:**
- Create: `apps/web/src/features/analysis/question-panel.tsx`
- Create: `apps/web/src/features/analysis/negotiation-dialog.tsx`
- Create: `apps/web/src/features/analysis/question-panel.test.tsx`
- Create: `apps/web/src/features/analysis/negotiation-dialog.test.tsx`

- [ ] **Step 1: Write failing interaction tests**

Cover suggested questions, pending state, cited answer, low-confidence response, error recovery, selected findings, generated landlord message, clipboard action, and accessible dialog close/focus restoration.

- [ ] **Step 2: Verify RED, implement, and verify GREEN**

Run: `pnpm --dir apps/web test -- --run src/features/analysis/question-panel.test.tsx src/features/analysis/negotiation-dialog.test.tsx`

Commit: `feat(web): add grounded questions and landlord messages`

## Task 15: Docker, End-to-End Tests, and Demo Reliability

**Files:**
- Create: `apps/api/Dockerfile`
- Create: `apps/web/Dockerfile`
- Create: `docker-compose.yml`
- Create: `apps/web/e2e/analysis.spec.ts`
- Create: `scripts/seed_legal_corpus.py`
- Create: `scripts/create_demo_documents.py`
- Modify: `Makefile`

- [ ] **Step 1: Write the failing browser journey**

The Playwright test uploads the risky demo PDF, observes real processing stages, verifies at least one high-risk deposit/termination finding and official citation, asks a grounded question, generates a landlord message, and confirms the disclaimer.

- [ ] **Step 2: Verify E2E RED**

Run: `pnpm --dir apps/web exec playwright test e2e/analysis.spec.ts`

- [ ] **Step 3: Add containers, seeding, and deterministic demo data**

Health checks must cover PostgreSQL and API readiness. The demo remains functional with no external model key. Demo documents are generated from committed plain-text source so their provenance is transparent.

- [ ] **Step 4: Verify E2E GREEN and failure scenarios**

Run:

```bash
docker compose up -d --build
docker compose ps
curl --fail http://localhost:8000/healthz
pnpm --dir apps/web exec playwright test
docker compose logs --no-color --tail=200
```

Expected: healthy services, passing browser suite, no raw contract text or secrets in logs.

Commit: `test(e2e): verify resilient contract analysis journey`

## Task 16: Research Evidence Structure and Technical Documentation

**Files:**
- Create: `docs/research/interview-guide.md`
- Create: `docs/research/consent-template.md`
- Create: `docs/research/evidence-matrix.csv`
- Create: `docs/research/README.md`
- Create: `docs/architecture.md`
- Create: `docs/ai-pipeline.md`
- Modify: `README.md`

- [ ] **Step 1: Add honest research templates**

Include recruitment criteria, non-leading questions, consent, anonymization, severity/frequency coding, rejected-hypothesis tracking, and evidence-matrix columns. Do not create interview answers, quotations, or willingness-to-use percentages.

- [ ] **Step 2: Document the implemented architecture**

README and architecture documents must match actual paths, commands, providers, error modes, data retention, corpus dates, limitations, and test commands. Include Mermaid diagrams and a criterion-to-evidence table for the three online judging dimensions.

- [ ] **Step 3: Verify documentation commands**

Run every setup and test command from a clean environment or container. Check all relative links with a Markdown link checker.

Commit: `docs: add research and engineering evidence pack`

## Task 17: Pitch Deck and Three-Minute Demo Package

**Files:**
- Create: `pitch/QADAM_AI_Pitch_Deck.html`
- Create: `pitch/QADAM_AI_Pitch_Deck.pdf`
- Create: `docs/demo-script.md`
- Create: `docs/demo-recording-checklist.md`
- Create: `scripts/render_pitch.mjs`

- [ ] **Step 1: Create an 11-slide evidence-led deck**

Slides:

1. QADAM AI and one-sentence promise.
2. One user, one painful moment.
3. Verified scale and CustDev evidence slots.
4. Existing alternatives and product gap.
5. Upload-to-action product flow.
6. Real MVP report screenshots.
7. Custom AI/RAG architecture.
8. Legal grounding and safety.
9. Validation metrics and development history.
10. Sustainability and adoption path.
11. Team, ask, demo/repository links.

Use explicit “insert verified team evidence” markers only for facts that require team input; never fabricate them. The final PDF must have at most 12 pages and readable A4/16:9 slide rendering.

- [ ] **Step 2: Write the timed three-minute script**

Allocate 25 seconds to the problem/evidence, 95 seconds to upload and report, 30 seconds to grounded Q&A and negotiation message, 20 seconds to architecture, and 10 seconds to closing. Include a prepared fallback recording path and exact demo document.

- [ ] **Step 3: Render and visually verify**

Run: `node scripts/render_pitch.mjs`

Verify: `pdfinfo pitch/QADAM_AI_Pitch_Deck.pdf` reports `Pages: 11`.

Render pages to images and inspect every slide for overflow, contrast, and unreadable citations.

Commit: `docs(pitch): add online-stage deck and demo script`

## Task 18: Full Verification, Public Repository, and Submission Audit

**Files:**
- Create: `docs/verification-report.md`
- Modify: `README.md`

- [ ] **Step 1: Run the complete local verification gate**

```bash
make verify
docker compose up -d --build
pnpm --dir apps/web exec playwright test
curl --fail http://localhost:8000/healthz
curl --fail http://localhost:3000
pdfinfo pitch/QADAM_AI_Pitch_Deck.pdf
git diff --check
git status --short
```

- [ ] **Step 2: Perform the requirement-by-requirement audit**

Record evidence for working upload, structured report, citations, next actions, Q&A refusal, deterministic fallback, backend tests, frontend tests, E2E tests, mobile/desktop accessibility checks, README commands, architecture, pitch PDF, demo script, commit history, and absence of committed secrets or personal contracts.

- [ ] **Step 3: Create and verify the public GitHub repository**

Create the remote only after secret scanning. Push `main`, verify anonymous visibility, check README rendering, and verify that clone/setup instructions work from the public URL. Do not force-push or rewrite the hackathon development history.

- [ ] **Step 4: Record external links without fabricating missing artifacts**

Add the public repository URL and deployment URL to README and the deck after they exist. Add the video URL only after the team records and uploads it with open access.

- [ ] **Step 5: Final commit and release tag**

Commit: `release: prepare Tech Vision 2026 online submission`

Tag: `online-stage-v1.0.0`

Expected final state: clean tracked worktree, passing verification gate, public repository accessible, pitch deck at most 12 slides, and a complete three-minute demo package.
