# QADAM AI Grounded Document Q&A — Design

**Date:** 2026-07-17  
**Status:** Approved in conversation by the project owner  
**Scope:** Evidence-first questions over newly uploaded rental agreements

## Objective

Replace the current keyword-to-finding question handler with real question answering over the
masked text of each uploaded document. A user must be able to upload a previously unseen,
machine-readable rental agreement in PDF or DOCX format, ask about an explicit condition, and
receive an answer backed by a visible excerpt and page or block reference.

The feature must strengthen the Tech Vision 2026 submission without broadening the product beyond
its validated problem. QADAM AI will claim support for machine-readable residential rental
agreements, not arbitrary legal documents and not scanned images without a text layer.

## Current failure and root cause

`POST /api/v1/analyses/{analysis_id}/questions` currently maps question stems to seven
`ClauseType` families and returns the first matching finding. The handler never searches the full
uploaded document. A real upload followed by the question `Какой город указан в договоре?`
therefore returns `supported: false`, even though the document contains `квартира в городе
Астана`.

The parser already extracts normalized blocks and the privacy stage masks identifiers. However,
the repository keeps only a checksum, findings, and the masked clause fragments referenced by
findings. It does not retain the complete masked evidence needed for document Q&A.

## Product boundary

### Supported

- New machine-readable PDF and DOCX residential rental agreements accepted by the existing upload
  validator.
- Questions in Russian or Kazakh about facts explicitly present in the uploaded document.
- Offline, deterministic extractive answers with document evidence.
- Optional model-backed phrasing when an OpenAI-compatible provider is configured.
- Honest refusal when retrieved evidence is too weak or the question is unrelated to the document.

### Not claimed

- Correct answers for every possible file or every legal question.
- OCR for photos or scanned PDFs without a usable text layer.
- Analysis of unrelated invoices, medical records, employment agreements, or arbitrary document
  classes.
- Legal advice, a safety verdict, or facts that are not stated in the uploaded document.
- Dependence on an external API for the default demo path.

This boundary is deliberate: a deep and reproducible rental-contract workflow is more credible for
the competition than shallow support for unrelated document types.

## Selected approach

Use a hybrid evidence-first pipeline with a deterministic offline answerer and an optional
structured provider:

1. Parse and normalize the uploaded PDF or DOCX with the existing document parser.
2. Mask identifiers before evidence leaves the analysis process.
3. Persist ordered masked evidence blocks with block indexes and optional page numbers.
4. Rank those blocks for every question using lexical relevance, light RU/KZ normalization,
   character similarity, and exact number/date/entity boosts.
5. Reject the question when the best evidence does not cross an explicit confidence threshold.
6. In offline mode, return an extractive answer built from the highest-ranked excerpt.
7. When a provider is configured, allow it to phrase a concise answer using only the retrieved
   masked excerpts. Validate its structured output and evidence IDs; on timeout or invalid output,
   fall back to the extractive answer.
8. Show the supporting document excerpt and page or block reference in the web interface.
9. Preserve official-law citations when the answer is also linked to an existing legal finding.

The existing question-family mapping may remain only as optional legal-finding enrichment. It must
not decide whether a document question is answerable.

## Architecture

### Evidence model

Add a private persisted evidence structure with these fields:

- stable block index;
- masked block text;
- optional one-based page number;
- parser source type;
- checksum derived from the masked text.

Raw upload bytes and unmasked text remain transient. Evidence is never included in public logs and
is returned only through the token-protected question endpoint as selected excerpts.

The analysis service returns an internal result containing both the public `AnalysisReport` and
the masked evidence blocks. `AnalysisRecord` stores both. PostgreSQL persists evidence in the
document row as JSON, while the in-memory repository keeps the same domain structure. Schema
initialization must upgrade an existing demo database without requiring the user to delete its
volume.

### Document retrieval

Create an isolated document retriever that accepts a question and evidence blocks and returns
ranked evidence candidates. Ranking combines:

- normalized word overlap with RU/KZ stop-word removal and conservative suffix normalization;
- character n-gram similarity for inflected forms such as `город` and `городе`;
- exact matches and boosts for amounts, dates, durations, addresses, and named values;
- a small adjacency expansion so a heading and its following condition can be returned together.

Scores and the acceptance threshold are deterministic and covered by labelled tests. The retriever
does not use the legal corpus; legal retrieval and document retrieval remain separate components.

### Answer generation and grounding

Define a question-answer provider boundary with a structured result:

- answer text;
- selected evidence block IDs;
- confidence;
- optional linked finding ID.

The deterministic provider returns `В договоре указано: «…»` using the best evidence excerpt. The
text after the prefix comes from the uploaded document, not a response catalogue.

An optional external provider receives only the question, selected masked excerpts, language, and
relevant existing finding metadata. A grounding validator rejects unknown evidence IDs, empty
support, out-of-context citations, and provider failures. The resilient wrapper then uses the
deterministic answer.

The answer is unsupported when no candidate reaches the threshold. The refusal must explain that
the requested fact was not found in the document; it must not imply that the feature only accepts a
small fixed set of question categories.

### API contract

Keep the existing route and fields for compatibility, then extend the response with document
evidence:

```json
{
  "answer": "В договоре указано: «Объект аренды: квартира в городе Астана».",
  "supported": true,
  "confidence": 0.86,
  "evidence": [
    {
      "block_index": 1,
      "page": 1,
      "excerpt": "Объект аренды: квартира в городе Астана.",
      "score": 0.86
    }
  ],
  "citations": []
}
```

`citations` continues to mean official legal sources. `evidence` means excerpts from the user's
uploaded agreement. Keeping them separate prevents the UI and jury narrative from presenting a
contract quotation as a legal citation.

Question audit records store a masked version of the question so an identifier typed into the
question box does not bypass the document privacy boundary.

### Web experience

The question panel keeps its existing input and suggestions. A supported answer displays:

- the concise grounded answer;
- a `Фрагмент договора` evidence card;
- page number when known, otherwise the document block number;
- official-law links only when legal citations are present.

An unsupported answer displays `Ответ не найден в тексте договора` and suggests asking about an
explicit condition. Loading, network error, and access-token states remain unchanged.

## Error handling and privacy

- Do not attempt Q&A until analysis status is `completed`.
- Treat missing or empty evidence as unsupported rather than raising an internal error.
- Preserve the current token authorization on every question request.
- Mask the uploaded document before persistence or provider calls.
- Mask question text before audit persistence.
- Never log raw document text, complete evidence arrays, access tokens, or provider payloads.
- Fall back deterministically on provider timeout, malformed JSON, unknown evidence references, or
  low grounded confidence.
- Keep the existing `ocr_required` failure for scan-only documents.

## Test strategy

Implementation follows red-green-refactor. Tests use documents whose facts are not present in the
current three demo contracts.

### Unit tests

- Evidence construction preserves order and page references after masking.
- RU/KZ normalization matches inflected question and document terms.
- Ranking selects explicit city, duration, rent, deposit, utility, and access conditions.
- Unrelated questions stay below the support threshold.
- Deterministic answers contain the selected excerpt rather than a fixture-specific response.
- Provider output cannot reference evidence that was not retrieved.
- Provider timeout and invalid structured output use the extractive fallback.

### Repository tests

- In-memory and PostgreSQL repositories round-trip masked evidence.
- Existing databases receive the backward-compatible evidence storage upgrade.
- Raw identifiers are absent from stored evidence and stored question audit text.

### API and browser tests

- Upload a newly generated rental agreement, wait for completion, ask about a unique fact, and
  assert the answer and evidence come from that file.
- Ask `Какой город указан в договоре?` about the current risky demo and receive evidence containing
  `Астана` with page 1.
- Ask an unrelated investment question and receive `supported: false` with no evidence.
- Verify that a mismatched or missing access token cannot read evidence.
- Verify that the web UI renders the excerpt, page label, official sources, fallback, and refusal
  states accessibly.

## Acceptance criteria

The feature is complete only when all of the following are demonstrated from a clean environment:

1. A new, previously unseen machine-readable rental PDF and DOCX can be uploaded and analyzed.
2. Questions about explicit unique facts in those files return `supported: true` and quote the
   correct masked evidence.
3. The city question over `qadam-risky-contract.pdf` returns `Астана` and page 1.
4. An unrelated or unsupported question returns `supported: false` without fabricated evidence.
5. The offline Docker demo works without an AI API key.
6. Optional-provider failures fall back to the same grounded offline behavior.
7. Raw personal identifiers do not appear in repository evidence, provider contexts, question
   audit data, or Docker logs.
8. Existing backend, frontend, E2E, release, security, documentation, and build gates pass.

## Competition narrative

The demo and pitch will describe the feature precisely:

> QADAM AI answers questions over a newly uploaded rental agreement by retrieving masked document
> evidence first. Every supported answer shows the exact contract excerpt; if evidence is missing,
> the system refuses. The default path works offline, while an optional model can improve phrasing
> without bypassing the grounding gate.

This is stronger than claiming universal document understanding because the behavior is visible,
testable, privacy-aware, and aligned with the hackathon problem.
