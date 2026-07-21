# QADAM AI MVP Design

## 1. Purpose

QADAM AI is a Kazakhstan-focused rental-contract guardian for one primary user: a non-resident university student aged 18–22 who is renting housing independently for the first time.

The product addresses one critical moment and one pain: before signing a rental agreement, the student cannot understand the legal language, identify practical risks, or decide what to clarify with the landlord.

The online-stage release must be a working, explainable product rather than a design prototype. It must demonstrate research depth, a custom AI pipeline, modular engineering, repeatable tests, and visible development history.

## 2. Product Promise

The core promise is:

> Upload a rental agreement and receive a grounded report that explains what the document says, where the risks are, which Kazakhstan legal provisions are relevant, and what to ask before signing.

The product does not certify that a contract is safe, declare clauses illegal without direct support, or replace a lawyer, notary, or official legal consultation.

## 3. Scope

### 3.1 Primary flow

1. The student opens the landing page and sees a single primary action: analyze a rental agreement.
2. The student uploads a PDF or DOCX file and consents to document processing.
3. The system validates the file, extracts text, masks obvious personal identifiers, detects the document language, and identifies rental clauses.
4. The system retrieves relevant legal passages and evaluates each clause with deterministic rules plus an optional language-model explanation layer.
5. The student receives a structured report with a summary, risk cards, missing-term warnings, citations, confidence levels, and next actions.
6. The student can ask grounded questions about the uploaded agreement.
7. The student can generate a polite message asking the landlord to clarify or amend a term.

### 3.2 Supported inputs

- Text-based PDF documents.
- DOCX documents.
- Russian, Kazakh, and mixed Russian/Kazakh text.
- Scanned PDFs are detected and return a recoverable “OCR required” state in the first release. OCR is an enhancement after the primary text-based flow is stable.

### 3.3 Clause families

The first release analyzes:

- property identity and address;
- lease term;
- rent amount, due date, and payment method;
- deposit amount, retention grounds, and return deadline;
- utilities and additional payments;
- handover condition and inventory;
- current and capital repairs;
- early termination and notice periods;
- eviction or vacation wording;
- occupancy by family members, roommates, or temporary residents;
- landlord access to the property;
- penalties and unilateral rent changes.

### 3.4 Explicit non-goals

- A general-purpose AI lawyer.
- Legal disputes after a contract has already been signed.
- Court-document generation.
- Property search, booking, payments, or landlord verification.
- User accounts, subscriptions, social features, or collaboration.
- A numerical “safety guarantee.” Any displayed score is a prioritization aid and is accompanied by plain-language findings.

## 4. Architecture

The repository is a monorepo with two independently testable applications:

- `apps/web`: Next.js App Router, TypeScript, Tailwind CSS, accessible React components.
- `apps/api`: FastAPI, Python, Pydantic, SQLAlchemy, document parsing, retrieval, risk analysis, and provider adapters.

Runtime services are orchestrated with Docker Compose:

- PostgreSQL with pgvector for application records, legal chunks, lexical search data, and vector embeddings.
- The API service.
- The web service.

The core architecture deliberately separates deterministic behavior from model-dependent behavior:

```text
Upload
  -> file validation
  -> text extraction
  -> PII masking
  -> language detection
  -> clause segmentation
  -> deterministic risk rules
  -> hybrid legal retrieval
  -> reranking
  -> structured explanation provider
  -> grounding validation
  -> risk report
```

This separation makes the system testable, explainable during Q&A, and resilient when an external model is unavailable.

## 5. Backend Components

### 5.1 Upload service

Responsibilities:

- accept PDF and DOCX only;
- enforce a 10 MB file limit;
- verify the real file signature rather than trusting the extension;
- calculate a checksum;
- create an analysis record;
- reject encrypted, empty, or malformed documents with a recoverable error.

### 5.2 Document parser

- PyMuPDF extracts text from text-based PDFs.
- `python-docx` extracts DOCX paragraphs and tables.
- Text is normalized while preserving paragraph boundaries and page references.
- Documents with insufficient extracted text are marked `ocr_required` instead of being silently analyzed as empty documents.

### 5.3 Privacy filter

Before retrieval or external-model calls, obvious identifiers are replaced with stable placeholders:

- IIN-like 12-digit identifiers;
- phone numbers;
- email addresses;
- bank-card-like numbers;
- party names when identifiable from standard agreement headings.

The report refers to `Арендатор`, `Арендодатель`, and masked values. Raw files have a configurable short retention period and are never committed to the repository.

### 5.4 Clause extractor

The extractor uses headings, paragraph structure, dictionaries, patterns, and an optional structured-output model adapter. It returns clause records with:

- type;
- title;
- source text;
- page or paragraph span;
- extracted amounts and dates;
- confidence;
- extraction method.

The deterministic extractor remains the baseline and permits offline demonstration. The model adapter may enrich segmentation but cannot remove source spans or invent clauses.

### 5.5 Legal corpus

The repository contains a curated snapshot of relevant provisions from primary official sources:

- the Law of the Republic of Kazakhstan “On Housing Relations”;
- the Special Part of the Civil Code of the Republic of Kazakhstan;
- the Law “On Personal Data and Their Protection” for product processing rules;
- official eGov guidance where it clarifies registration procedures.

Every chunk stores:

- source title and authority;
- article or subsection reference;
- canonical URL;
- language;
- effective-date metadata;
- snapshot date;
- exact source text used by retrieval.

The initial housing-law snapshot is dated no earlier than 1 July 2026 because the official act changed on that date.

### 5.6 Hybrid retrieval

Retrieval combines:

- lexical relevance using PostgreSQL full-text search and legal-term synonyms;
- dense multilingual embeddings through an `EmbeddingProvider` interface;
- metadata filtering by clause family and language;
- a second-stage reranker that considers article references, clause family, lexical overlap, and embedding similarity.

Production configuration can use BGE-M3 or an API embedding provider. Tests use a deterministic embedding provider so they are fast, reproducible, and independent of network access.

The retrieval log records the query, candidates, lexical scores, vector scores, reranked order, and selected citations. This log is part of the engineering evidence for the judges.

### 5.7 Risk engine

Rules detect absence, ambiguity, and one-sided wording. They do not claim that every unusual term is unlawful.

Each finding includes:

- `severity`: `info`, `attention`, or `high`;
- `category`;
- source clause and span;
- plain-language reason;
- relevant retrieved legal passages;
- action to take before signing;
- suggested landlord question;
- confidence and confidence rationale.

High-severity findings require either a deterministic high-severity rule or explicit support from a retrieved legal passage. Unsupported model claims are discarded by grounding validation.

### 5.8 Explanation provider

The provider interface supports:

- an OpenAI-compatible structured-output model configured through environment variables;
- a deterministic local fallback that formats extracted facts, rules, and retrieved citations.

The provider receives only masked contract text, extracted clauses, rule results, and retrieved legal passages. It must return schema-validated JSON. It cannot introduce citations that were not retrieved.

### 5.9 Grounded Q&A

Questions are answered only from:

- the uploaded agreement;
- extracted clauses;
- selected legal-corpus passages.

An answer without a usable contract span or legal citation returns a low-confidence response and recommends manual verification. Conversation memory is limited to the current analysis.

## 6. Data Model

The first release uses these records:

- `analyses`: processing status, language, summary, risk counts, timestamps, and failure code;
- `documents`: metadata, checksum, masked text, parser information, and retention deadline;
- `clauses`: type, text, source span, structured facts, and confidence;
- `legal_chunks`: official-source metadata, effective date, text, search vector, and embedding;
- `findings`: severity, explanation, action, confidence, clause link, and citation links;
- `retrieval_logs`: query and ranking evidence;
- `questions`: question, answer, grounding status, and citations;
- `feedback`: usefulness, trust rating, and optional comment.

No account table is required for the online-stage MVP. A random analysis token provides temporary access to a report.

## 7. API Contract

- `POST /api/v1/analyses`: upload and start an analysis.
- `GET /api/v1/analyses/{analysis_id}`: get processing status or the completed report.
- `GET /api/v1/analyses/{analysis_id}/findings`: get clause findings and citations.
- `POST /api/v1/analyses/{analysis_id}/questions`: ask a grounded question.
- `POST /api/v1/analyses/{analysis_id}/negotiation-message`: generate a message from selected findings.
- `POST /api/v1/feedback`: submit usefulness and trust feedback.
- `GET /healthz`: liveness and dependency status.

Responses share a versioned JSON schema between the API and generated TypeScript types.

## 8. User Interface

### 8.1 Visual direction

QADAM uses a calm document-forensics aesthetic rather than a generic AI-chat aesthetic:

- warm paper-like background;
- graphite typography;
- deep teal for trusted actions and links;
- amber for attention findings;
- restrained red only for high-severity findings;
- strong source and document-span affordances;
- IBM Plex Sans for interface text and Literata for selected editorial headings and quotations.

The interface uses semantic color tokens, a four/eight-pixel spacing scale, Lucide SVG icons, 44 px minimum targets, visible keyboard focus, and reduced-motion support.

### 8.2 Screens

**Landing**

- one-sentence value proposition;
- a single primary upload CTA;
- a concise three-step explanation;
- trust statement and legal disclaimer;
- evidence strip using verified research data.

**Upload**

- visible file label and format/size rules;
- drag-and-drop plus keyboard-accessible file selection;
- processing-consent checkbox;
- optional disclosure for an external AI provider when enabled;
- clear privacy and retention explanation.

**Processing**

- stable progress panel with the real backend stage;
- stages for extraction, clause detection, legal retrieval, and report validation;
- no fake percentage;
- timeout and retry recovery.

**Report**

- summary and document metadata;
- counts by severity rather than a misleading “safe/unsafe” verdict;
- prioritized finding cards;
- missing-term checklist;
- expandable contract excerpt and official citation per finding;
- next-action checklist;
- ask-a-question entry point;
- negotiation-message action;
- feedback prompt.

**Grounded Q&A**

- suggested contract-specific questions;
- answer, contract excerpt, legal source, and confidence displayed together;
- explicit low-confidence and no-evidence states.

### 8.3 Responsive and accessible behavior

- Mobile content is prioritized in a single column at 375 px.
- Desktop report uses a main findings column and a sticky document/source context panel.
- No critical behavior depends on hover.
- Route changes focus the main heading.
- Errors use text and icons in addition to color.
- All controls have visible labels or accessible names.

## 9. Failure Handling

- Unsupported file: explain accepted formats and preserve the upload screen.
- Oversized file: show the 10 MB limit before network submission when possible.
- Encrypted PDF: request an unlocked copy.
- Scan without usable text: mark OCR as required and offer a sample document for the demo path.
- Parser failure: retain the analysis record with a non-sensitive diagnostic code.
- Database or retrieval failure: do not call the explanation provider; show retry guidance.
- External model timeout: use the deterministic explanation fallback and label the mode in internal diagnostics.
- Low retrieval confidence: show “manual verification needed” rather than a categorical answer.
- No high risks: still display missing terms, attention items, and the limits of the analysis.

## 10. Security and Legal Safety

- File type, signature, size, and parser time are limited.
- Uploaded filenames are never used as storage paths.
- Raw documents are stored outside the public web root.
- Logs contain identifiers and status codes, not raw contract text.
- External-model calls require explicit provider disclosure and use masked text.
- Secrets are read only from environment variables and `.env` files are ignored.
- The UI and README state that the service is educational and not legal advice.
- Legal-corpus metadata exposes the snapshot date so stale sources are visible.

## 11. Testing Strategy

Implementation follows red-green-refactor TDD.

### 11.1 Backend tests

- file-signature and size validation;
- PDF and DOCX extraction with page/paragraph spans;
- scan and encrypted-document detection;
- PII masking;
- Russian/Kazakh synonym normalization;
- clause extraction for every supported family;
- missing-clause and ambiguity rules;
- hybrid retrieval and top-k ordering;
- reranking and metadata filtering;
- grounding rejection of fabricated citations;
- structured-provider schema validation;
- API success, validation, timeout, and failure states;
- data-retention cleanup.

### 11.2 Frontend tests

- upload validation and consent;
- real processing-state rendering;
- report severity sorting;
- contract excerpt and legal-citation disclosure;
- Q&A evidence and low-confidence states;
- keyboard flow and accessible labels;
- mobile and desktop layouts;
- failed-analysis recovery.

### 11.3 Evaluation fixtures

The repository includes clearly labelled synthetic agreements for:

- a balanced reference case;
- unclear deposit return;
- unilateral termination and landlord-entry wording;
- missing utilities and repair allocation;
- mixed-language clauses.

Evaluation reports measure retrieval hit@5, citation coverage, clause-family recall on labelled fixtures, analysis latency, and grounded-answer rate.

## 12. Submission Deliverables

The repository must contain:

- working source code and tests;
- Docker and local-start instructions;
- architecture and data-flow diagrams;
- curated legal-corpus provenance;
- synthetic demo agreements and expected findings;
- research templates and an evidence-matrix structure without fabricated interviews;
- a public README with product, setup, architecture, safety, limitations, and demo sections;
- a pitch deck exported to PDF with no more than 12 slides;
- a three-minute online demo script and recording checklist;
- a final requirement-verification report.

Real CustDev answers, quotations, team details, repository URL, deployment URL, and recorded video URL must come from the team and are never fabricated by the implementation agent.

## 13. Acceptance Criteria

The MVP is ready for the online-stage technical submission when all of the following are evidenced:

1. A fresh clone can start the full application using documented commands.
2. A judge can upload a supported agreement and receive a report without editing source code.
3. The report shows sourced contract excerpts, official legal citations, findings, and concrete next actions.
4. Grounded Q&A refuses unsupported conclusions.
5. The deterministic fallback keeps the prepared demo operational without an external AI key.
6. Automated backend and frontend suites pass.
7. The application is checked at mobile and desktop widths with keyboard navigation and reduced motion.
8. README, architecture, corpus provenance, pitch-deck PDF, and three-minute demo script exist and match the implemented product.
9. Git history shows incremental development beginning on the official hackathon start date.
10. The public repository and submitted demo link are accessible without private credentials.

