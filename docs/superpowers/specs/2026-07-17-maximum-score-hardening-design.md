# QADAM AI maximum-score hardening design

**Date:** 17 July 2026  
**Status:** approved for specification by the user  
**Scope:** Tech Vision 2026 online-stage evidence, product UX, validation, and submission safety

## 1. Objective

Raise QADAM AI's defensible score against the official 30-point online-stage rubric without
inventing research, team, legal-accuracy, or deployment claims.

The release must strengthen all evidence that can be produced autonomously:

- research framing and a submission-ready field protocol;
- custom AI/engineering depth;
- functional completeness and iteration evidence;
- a reliable three-minute demo path;
- consistency between runtime, tests, README, pitch, and submission materials.

Three facts remain team-supplied and cannot be fabricated: completed participant interviews,
real participant names/roles, and a team-owned YouTube/Google Drive/live URL. The repository must
make those gates explicit and prevent an unfinished package from being mistaken for a final one.

## 2. Official rubric mapping

### 2.1 Research depth, relevance, and novelty — 10 points

Autonomous work can prove alignment, scope, protocol quality, and falsifiable hypotheses. It cannot
prove user pain without real sessions.

The repository will provide:

- one persona, one pre-signature moment, and one measurable job-to-be-done;
- a short problem-interview and usability protocol;
- a structured evidence matrix with disconfirming-evidence fields;
- a final-submission gate that requires real, anonymised observations before claiming CustDev;
- pitch language that distinguishes context statistics from evidence of pain.

### 2.2 Engineering and architectural quality — 10 points

The product will demonstrate a custom, inspectable pipeline rather than an unrestricted model
wrapper:

```text
signature validation
→ PDF/DOCX parsing
→ PII masking
→ RU/KZ clause extraction
→ deterministic risk rules
→ legal retrieval and reranking
→ grounded findings
→ contextual question suggestions
→ document/action question routing
→ answer grounding
→ private persistence
```

Every generated claim must be traceable to a masked document block, an existing structured
finding, or an allow-listed legal source.

### 2.3 Technical validation and iterative development — 10 points

The release will add regression tests for the observed user failure, a labelled document-Q&A
evaluation set, Docker browser journeys, release checks, and consistent public evidence. Commit
history must preserve the red/green implementation sequence.

## 3. Approaches considered

### 3.1 Presentation-only refresh

Updating slides and metrics is fast but leaves the observed Q&A failure unresolved. It creates weak
evidence and is rejected.

### 3.2 Evidence-first product and submission hardening — selected

Fix the user journey, quantify it, then update every submission artifact from verified results.
This maximises both engineering and validation scores while keeping research claims honest.

### 3.3 Broad scope expansion

Adding OCR, arbitrary legal documents, a large legal corpus, or production hosting increases risk
without directly addressing the rubric's largest current gaps. These remain post-hackathon work.

## 4. Product behaviour

### 4.1 Contextual question suggestions

Static suggestions are removed. The analysis report exposes up to four deterministic suggestions
built from clauses and findings in that specific document.

Priority order:

1. questions about high-priority findings;
2. questions about attention findings;
3. factual questions for extracted deposit, rent, term, property, utilities, access, occupancy,
   repairs, and termination clauses;
4. no suggestion when the report cannot prove that the relevant clause exists.

Suggestions contain no raw document facts and no personal data. They are templates chosen by
clause family. A suggestion shown in the UI must pass the same backend answer path as typed input.

Examples:

| Available evidence | Suggestion |
|---|---|
| Deposit clause | `Когда и при каких условиях вернут депозит?` |
| Termination finding | `Как изменить условие о расторжении?` |
| Rent clause | `Какая ежемесячная плата?` |
| Occupancy clause | `Кто может проживать в квартире?` |

### 4.2 Question modes

The question endpoint supports three grounded modes.

#### Contract fact

The retriever selects masked document blocks. The answer contains only retrieved facts, returns the
exact excerpt and page/block location, and may attach a legal citation only when a related finding
overlaps the selected evidence.

#### Finding action

Action-intent questions include Russian and Kazakh equivalents of `что делать`, `как решить`,
`как исправить`, `как изменить`, and `не істеу керек`. The answerer selects existing findings from
the completed report and returns their pre-grounded `action` values. It does not ask a provider to
invent advice.

If the question names a clause family, only matching findings are used. A generic question such as
`Как решить найденные проблемы?` may include up to three highest-priority findings. Each item is
backed by the finding's document clause and existing legal citations. If the report has no finding,
the system refuses instead of manufacturing a problem.

#### Unsupported

If neither document evidence nor a grounded finding supports the request, the endpoint returns
`supported=false`, empty evidence/citations, and a concise explanation of what can be asked.

### 4.3 Answer contract

`GroundedQuestionAnswer` gains the IDs of findings used to produce an action answer. The API uses
those IDs to attach citations directly, avoiding lexical guesses for generic action questions.

The public response retains:

- `supported`;
- `answer`;
- `confidence`;
- document `evidence` with page/block location;
- separate legal `citations`.

Polling the analysis report never exposes the private evidence store.

### 4.4 RU/KZ cross-language matching

Concept expansion is symmetrical across Russian and Kazakh forms for at least:

- rent/payment/price;
- landlord/owner;
- tenant;
- deposit;
- term/date;
- termination/notice;
- utilities;
- repairs;
- access/visit;
- occupancy/pets;
- address/property.

Russian questions must retrieve explicit Kazakh clauses and Kazakh questions must retrieve explicit
Russian clauses. Expansion is deterministic and inspectable. The support threshold remains in
place; cross-language expansion must not make an unrelated parking question match a rental clause.

## 5. Backend design

### 5.1 Suggestion builder

Create a focused analysis module responsible for:

- mapping clause/finding families to question templates;
- prioritising findings before neutral facts;
- de-duplicating suggestions;
- limiting output to four items;
- selecting Russian, Kazakh, or mixed-report templates deterministically.

`AnalysisOrchestrator` calls the builder after clauses and findings are known. `AnalysisReport`
stores the resulting string list so the web client receives suggestions through the existing
private polling endpoint.

### 5.2 Action answer routing

`DocumentQuestionAnswerer` remains the single question-domain entry point. Internally it delegates
to two focused paths:

- document evidence ranking and provider-backed phrasing;
- deterministic finding-action composition.

Action composition sorts findings by severity and confidence, selects matching categories when
present, maps finding clause spans back to masked evidence blocks, and returns at most three
findings. No new legal conclusion is introduced.

### 5.3 Failure handling

- Incomplete analysis → unsupported response.
- Action question with no findings → unsupported response.
- Fact question below the support threshold → unsupported response.
- Provider timeout/schema/evidence violation → deterministic excerpt fallback.
- No evidence block for a selected finding → omit that finding rather than returning ungrounded
  advice.

## 6. Frontend design

`QuestionPanel` receives suggestions from the completed report instead of importing a global list.
No suggestion area is rendered when the list is empty.

The panel distinguishes:

- `Ответ подтверждён текстом договора` for fact answers;
- `Действия основаны на найденных пунктах` for finding-action answers;
- `Ответ не найден в тексте договора` for safe refusal.

The response schema therefore includes an answer mode (`document`, `action`, or `unsupported`).
Evidence cards remain visually separate from official legal-source links. Existing typography,
spacing, focus treatment, reduced-motion behaviour, and responsive layout are preserved.

## 7. Evaluation and tests

### 7.1 Unit and API coverage

Tests must be written before implementation and observed failing for the expected reason.

Required regressions:

- mixed RU/KZ contract answers Russian rent question;
- mixed RU/KZ contract answers Kazakh rent question;
- risky contract supports rent-change question;
- mixed contract does not show or support rent-change suggestion;
- generic `как решить эти проблемы` returns grounded finding actions;
- category-specific action question selects only the matching finding;
- action answer includes finding clause evidence and allow-listed citations;
- balanced contract with no findings refuses generic action advice;
- unrelated parking question remains unsupported;
- polling response contains contextual suggestions but not private evidence.

### 7.2 Labelled document-Q&A evaluation

Add a committed synthetic evaluation fixture covering all demo contracts, Russian and Kazakh
queries, action questions, and refusals. The evaluator reports:

- supported-answer evidence accuracy;
- expected fact/excerpt accuracy;
- action-answer finding accuracy;
- unsupported-question refusal accuracy;
- RU/KZ cross-language accuracy.

All curated gates must equal 1.0. Results are explicitly limited to synthetic fixtures and are not
presented as lawyer-reviewed real-contract accuracy.

### 7.3 Browser coverage

Docker Playwright must prove:

1. risky contract full journey and landlord message;
2. accessibility on landing and completed report;
3. unseen challenge-contract facts;
4. mixed-language report shows contextual suggestions, answers a natural Russian question over a
   Kazakh clause, and answers `Как решить найденные проблемы?` with grounded actions.

## 8. Competition artifacts

### 8.1 Pitch

The 11-slide deck remains within the 12-slide limit and the existing visual system.

Required changes:

- update all technical metrics from fresh verification output;
- show the new document/action Q&A proof;
- distinguish context statistics, synthetic evaluation, and real CustDev;
- replace technical placeholders with verified public repository/fallback-demo evidence;
- keep team-supplied names and real research conclusions explicitly gated outside claims;
- provide the public GitHub fallback video URL as a verified technical fallback, not as a voiced
  user demo.

The generated PDF must be inspected visually and with `pdfinfo`/`pdftotext`.

### 8.2 Submission safety

Add a final-submission validator that fails when any of these are missing:

- at least the minimum real anonymised CustDev observations required by the team protocol;
- real team names and roles;
- a public YouTube/Google Drive/live URL;
- a clean repository state and the intended public commit;
- a pitch free of unresolved submission markers.

The ordinary development/release validator continues to verify reproducible local artifacts. The
new final gate must not be weakened to make an incomplete submission appear ready.

### 8.3 Documentation consistency

README, architecture, AI pipeline, demo script, jury Q&A, speaker notes, submission checklist,
runbook, evaluation JSON, and verification report use the same current metrics and limitations.

## 9. Privacy and safety invariants

- Raw upload bytes are never persisted.
- Masking occurs before optional external providers and evidence persistence.
- Question audit text is masked.
- External question providers receive only selected masked evidence.
- Action answers reuse existing grounded findings and cannot introduce new source IDs.
- Unsupported questions never receive inferred legal advice.
- The product remains informational assistance, not a legal opinion.

## 10. Non-goals

This hardening cycle does not implement:

- OCR for image-only scans;
- arbitrary document classes outside machine-readable rental agreements;
- a complete or automatically updated legal corpus;
- production semantic embeddings;
- automatic data retention;
- user interviews, team identities, or a team-owned voiced recording;
- universal legal accuracy.

## 11. Acceptance criteria

The autonomous release is complete when:

1. every contextual suggestion is derived from the current report;
2. the observed mixed-language and generic-action failures have red/green regression tests;
3. fact, action, and refusal modes are grounded and visible in the UI;
4. the labelled Q&A evaluation gates pass;
5. four Docker browser tests pass;
6. all unit, integration, type, lint, build, security, release, privacy, and documentation gates
   pass;
7. the pitch is 11 pages or fewer than the 12-page maximum, visually verified, and uses current
   metrics;
8. the public feature branch and PR contain the verified commits with green CI;
9. the final-submission validator accurately reports any remaining team-supplied blockers.

Maximum research and final-submission readiness are not considered proven until real CustDev,
team identities, and a team-owned public demo URL pass the final-submission validator.
