# QADAM AI Competition Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reproducible CI/security evidence, a verified fallback demo MP4, a jury/submission pack and a public-clone release gate without overstating the MVP.

**Architecture:** Two standard-library Python tools own artifact generation and release validation; both expose small pure functions so their behavior can be proven test-first. A JSON manifest is the single source of truth for release constraints, while Make targets and GitHub Actions compose the existing verification commands into local and remote gates.

**Tech Stack:** Python 3.13 standard library, ffmpeg/ffprobe, GitHub Actions, pnpm 11, Node.js 24, uv, Make, Markdown and JSON.

---

## File map

- `scripts/create_fallback_demo.py`: deterministic ffmpeg command construction, MP4 generation,
  probing and manifest output.
- `scripts/check_release.py`: manifest parsing, required-file checks, PDF/video constraints,
  placeholder checks, hashes and optional public-URL checks.
- `scripts/check_repository_hygiene.py`: tracked-file credential/private-key scan.
- `scripts/tests/test_create_fallback_demo.py`: generator unit and local ffmpeg integration tests.
- `scripts/tests/test_check_release.py`: release-check success and failure fixtures.
- `scripts/tests/test_repository_hygiene.py`: secret pattern scanner fixtures.
- `release/release-manifest.json`: required artifacts and explicit constraints.
- `release/fallback-demo-manifest.json`: generated video evidence.
- `release/QADAM_AI_fallback_demo.mp4`: generated silent technical walkthrough.
- `.github/workflows/quality.yml`: reproducible quality, artifact and security jobs.
- `docs/jury-qa.md`: evidence-backed jury answers and honest boundaries.
- `docs/pitch-speaker-notes.md`: timing and proof points for all 11 slides.
- `docs/submission-runbook.md`: ordered final release and fallback procedure.
- `README.md`, `docs/submission-checklist.md`, `Makefile`: discoverability and commands.

### Task 1: Release validator and repository hygiene

**Files:**
- Create: `scripts/tests/__init__.py`
- Create: `scripts/tests/test_check_release.py`
- Create: `scripts/tests/test_repository_hygiene.py`
- Create: `scripts/check_release.py`
- Create: `scripts/check_repository_hygiene.py`
- Create: `release/release-manifest.json`
- Modify: `Makefile`

- [ ] **Step 1: Write failing release-check tests**

Create temporary manifests which prove that the checker accepts a valid required file and rejects a
missing path, an over-limit PDF page count, a forbidden placeholder and a video outside its duration
limit. Exercise `validate_release(root, manifest, probe)` directly and assert exact error fragments.

```python
def test_missing_required_artifact_is_reported(tmp_path: Path) -> None:
    manifest = {"artifacts": [{"path": "missing.pdf", "required": True}]}
    errors = validate_release(tmp_path, manifest, probe=lambda _: {})
    assert errors == ["missing required artifact: missing.pdf"]
```

- [ ] **Step 2: Run tests and verify RED**

Run: `python -m unittest scripts.tests.test_check_release -v`  
Expected: import failure because `scripts.check_release` does not exist.

- [ ] **Step 3: Implement the minimal release validator**

Implement typed standard-library helpers for SHA-256, `pdfinfo`, `ffprobe`, placeholder scanning,
manifest validation and optional HTTP checks. The CLI reads `release/release-manifest.json`, prints
every result and exits non-zero when any constraint fails.

```python
def validate_release(root: Path, manifest: dict[str, object], probe: Probe) -> list[str]:
    errors: list[str] = []
    for artifact in manifest["artifacts"]:
        path = root / artifact["path"]
        if artifact.get("required", True) and not path.is_file():
            errors.append(f"missing required artifact: {artifact['path']}")
            continue
        errors.extend(validate_artifact(path, artifact, probe))
    return errors
```

- [ ] **Step 4: Verify release-check GREEN**

Run: `python -m unittest scripts.tests.test_check_release -v`  
Expected: all release-check tests pass.

- [ ] **Step 5: Write failing hygiene tests**

Use temporary tracked-file content to prove detection of PEM private keys and assignment-style API
secrets while allowing `.env.example` placeholders and obvious test values.

```python
def test_private_key_header_is_rejected(tmp_path: Path) -> None:
    candidate = tmp_path / "leak.pem"
    candidate.write_text("-----BEGIN PRIVATE KEY-----\n", encoding="utf-8")
    assert scan_files([candidate], tmp_path) == ["leak.pem: private key material"]
```

- [ ] **Step 6: Run hygiene tests and verify RED**

Run: `python -m unittest scripts.tests.test_repository_hygiene -v`  
Expected: import failure because `scripts.check_repository_hygiene` does not exist.

- [ ] **Step 7: Implement and verify hygiene GREEN**

Implement a scanner which obtains tracked paths from `git ls-files -z`, rejects binary files,
detects high-confidence secret forms and permits documented example/test tokens.

Run: `python -m unittest scripts.tests.test_repository_hygiene -v`  
Expected: all hygiene tests pass.

- [ ] **Step 8: Add the manifest and Make targets**

Define required README, pitch, official brief, evaluation report, demo contracts, jury pack and
fallback video. Add `release-tools-test`, `security-check` and `release-check` targets.

- [ ] **Step 9: Verify and commit**

Run:

```bash
make release-tools-test
make security-check
git diff --check
```

Expected: tests and hygiene scan pass. Commit as `test(release): add artifact and hygiene gates`.

### Task 2: Fallback demo generator

**Files:**
- Create: `scripts/tests/test_create_fallback_demo.py`
- Create: `scripts/create_fallback_demo.py`
- Create: `release/fallback-demo-manifest.json`
- Create: `release/QADAM_AI_fallback_demo.mp4`
- Modify: `Makefile`
- Modify: `.gitignore`

- [ ] **Step 1: Write failing generator tests**

Test the exact four-segment timeline, missing-input error, ffprobe parsing and a real short MP4 built
from a temporary PNG when ffmpeg is available.

```python
def test_timeline_stays_below_three_minutes() -> None:
    assert sum(segment.duration_seconds for segment in default_timeline()) == 48
```

- [ ] **Step 2: Run tests and verify RED**

Run: `python -m unittest scripts.tests.test_create_fallback_demo -v`  
Expected: import failure because `scripts.create_fallback_demo` does not exist.

- [ ] **Step 3: Implement minimal ffmpeg generation**

Create four image segments from the three verified product screenshots, normalize each to 1920×1080,
concatenate them into H.264/yuv420p at 30 fps, strip variable metadata and create a JSON evidence
manifest with duration, streams, dimensions and SHA-256. No network or external model is used.

- [ ] **Step 4: Verify GREEN and generate the artifact**

Run:

```bash
python -m unittest scripts.tests.test_create_fallback_demo -v
make fallback-demo
ffprobe -v error -show_entries format=duration:stream=codec_type,codec_name,width,height \
  -of json release/QADAM_AI_fallback_demo.mp4
```

Expected: tests pass; duration is 48 seconds; one H.264 1920×1080 video stream; no audio stream.

- [ ] **Step 5: Add video verification to the release gate and commit**

Run: `make release-check`  
Expected: every local artifact constraint passes. Commit as `feat(demo): generate verified fallback walkthrough`.

### Task 3: CI and security workflow

**Files:**
- Create: `.github/workflows/quality.yml`
- Modify: `docs/submission-runbook.md` after Task 4 if needed

- [ ] **Step 1: Add the workflow configuration**

Use read-only permissions, push/PR triggers, concurrency cancellation and timeouts. The `quality`
job installs Node 24, pnpm 11.3, Python 3.13, uv and ffmpeg, then runs install, `pnpm verify`,
evaluation, docs, pitch, fallback demo, release checks and Playwright. The `security` job runs the
repository hygiene checker plus production dependency audits.

- [ ] **Step 2: Validate workflow structure locally**

Parse the YAML with Ruby's standard YAML parser and verify required job/step strings with a Python
assertion so configuration mistakes fail before push.

Run:

```bash
ruby -e 'require "yaml"; YAML.load_file(".github/workflows/quality.yml", aliases: true)'
python - <<'PY'
from pathlib import Path
text = Path('.github/workflows/quality.yml').read_text()
for required in ('pnpm verify', 'make release-check', 'make security-check', 'make e2e'):
    assert required in text, required
PY
```

Expected: exit 0.

- [ ] **Step 3: Commit**

Commit as `ci: add reproducible quality and security gates`.

### Task 4: Jury and submission pack

**Files:**
- Create: `docs/jury-qa.md`
- Create: `docs/pitch-speaker-notes.md`
- Create: `docs/submission-runbook.md`
- Modify: `README.md`
- Modify: `docs/submission-checklist.md`
- Modify: `docs/demo-recording-checklist.md`
- Modify: `release/release-manifest.json`

- [ ] **Step 1: Write the jury Q&A**

Cover problem focus, novelty, why AI is justified, grounding, legal safety, privacy, Kazakhstan
specificity, validation, scale, business model, alternatives and honest limitations. Every numeric
claim must point to a repository artifact or command.

- [ ] **Step 2: Write speaker notes**

Map all 11 slides to one claim, one proof and one transition; include a 30-second opening, 20-second
architecture answer and recovery phrases for demo/network failure.

- [ ] **Step 3: Write the ordered submission runbook**

Separate agent-executable gates from team-only fields. Include artifact regeneration, private-window
URL checks, final hashes, submission-form copy, rollback to the deterministic demo and a deadline
buffer in Asia/Almaty.

- [ ] **Step 4: Link the pack and verify**

Update README and checklists. Add the documents to the release manifest.

Run:

```bash
make docs-check
make release-check
git diff --check
```

Expected: all local links and release constraints pass. Commit as `docs: add jury and submission operating pack`.

### Task 5: Full release and public-clone proof

**Files:**
- Modify: `docs/verification-report.md`
- Modify: `docs/submission-checklist.md`
- Modify: `release/release-manifest.json` hashes/evidence only when generated artifacts change

- [ ] **Step 1: Run the complete local gate**

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

Expected: zero failures; pitch no more than 12 pages; fallback MP4 below 180 seconds.

- [ ] **Step 2: Review tracked diff and claims**

Check production files for TODO/FIXME/mock/stub markers, confirm only explicit team fields remain,
inspect generated media metadata and verify no secret/raw personal data is tracked.

- [ ] **Step 3: Update verification evidence and re-run affected checks**

Record exact counts and commands, then run `make docs-check`, `make release-check` and
`git diff --check` again. Commit as `docs: record competition hardening verification`.

- [ ] **Step 4: Push to public main and verify a fresh clone**

Push the reviewed branch to `origin/main`, clone the public URL into a temporary directory, run the
offline release check there, and confirm README, pitch, fallback MP4 and workflow return HTTP 200
without authentication. Never delete or overwrite the working repository.

- [ ] **Step 5: Report remaining human-only inputs**

Report the exact public commit and artifacts. Keep real CustDev, team names/roles, narrated demo
upload URL and final submission click as explicit team responsibilities.

