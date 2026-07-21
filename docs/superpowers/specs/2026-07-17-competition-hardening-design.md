# QADAM AI Competition Hardening — Design

**Date:** 2026-07-17  
**Status:** Approved by the project owner  
**Scope:** Online-stage evidence, reliability and submission readiness

## Objective

Increase QADAM AI's chance of winning the Tech Vision 2026 online stage by making every important
claim independently reproducible, giving the team a reliable fallback demo artifact, and providing
a concise jury/submission operating pack. The work must preserve the current honest MVP boundary
and the official rules documented in `docs/reference/Social-and-Human-Capital.pdf`.

## Guardrails

- Do not invent interviews, quotations, adoption metrics, partnerships, team identities or URLs.
- Do not claim OCR, production legal accuracy, complete Kazakh evaluation, automatic retention or
  neural embeddings.
- Keep the current deterministic, offline-capable demo path; external providers remain optional.
- Do not add a live deployment merely for optics: the reproducible Docker path is the source of
  truth for this hardening pass.
- Keep the pitch at no more than 12 pages and the human-recorded demo at no more than 3:00.

## Deliverables

### 1. CI and security evidence

Add a GitHub Actions workflow for pushes and pull requests to `main`. It will run repository
verification, deterministic evaluation, Markdown link validation, pitch rendering and artifact
checks. A separate lightweight security job will scan tracked files for high-confidence private-key
and credential patterns and check dependency manifests with the package managers' audit commands.

The workflow will use pinned action major versions, least-privilege read permissions, explicit
toolchain versions matching the repository, dependency caches, timeouts and concurrency
cancellation. Docker E2E remains a documented local release gate because browser/container setup is
slower and less deterministic on shared CI runners; the existing Playwright test still runs in CI
against the in-process application path.

### 2. Deterministic fallback demo video

Create a small Python generator that combines verified product screenshots with short title cards
and the pitch proof slide into a silent H.264 MP4 of less than three minutes. Generation will use
local `ffmpeg`, require all input assets, produce a machine-checkable manifest, and fail if duration,
resolution or stream type is wrong.

This artifact is a fallback technical walkthrough. It will not be represented as the final narrated
team demo, and it will not remove the `TEAM INPUT REQUIRED` status for a public video URL.

### 3. Jury and submission operating pack

Add:

- a jury Q&A with evidence-backed answers, honest limits and short response patterns;
- speaker notes aligned to the 11-slide pitch and three-minute demo;
- a submission runbook with an ordered release sequence, rollback/fallback choices and a final
  private-window check;
- a machine-readable release manifest containing required artifact paths and constraints.

Existing README and checklists will link to these assets and distinguish generated evidence from
team-only inputs.

### 4. Public clone verification

Add a script that validates the release manifest in any clone: required files, forbidden placeholder
markers in release-critical documents, PDF page count, MP4 duration/streams, deterministic hashes
and public repository reachability when network verification is requested. The default mode remains
offline so contributors and CI do not depend on GitHub availability.

## Verification strategy

Behavioral scripts will be developed test-first with temporary fixtures. Configuration and Markdown
will be validated by executable checks. The final gate is:

```bash
pnpm verify
make evaluate
make docs-check
make pitch
make fallback-demo
make release-check
make e2e
docker compose config --quiet
git diff --check
```

After local verification, the branch will be pushed to the public repository and checked through a
fresh public clone or raw HTTP fetch. External fields that only the team can truthfully provide will
remain clearly marked.

## Out of scope for this pass

- Recording the team's voice or publishing to the team's video account.
- Fabricating or conducting interviews on behalf of team members.
- Adding OCR, a larger legal corpus, neural embeddings, a retention worker or production hosting.
- Replacing the deterministic MVP with an externally hosted model dependency.

