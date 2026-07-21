from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parents[4]


def test_evaluation_script_generates_passing_reproducible_evidence(tmp_path: Path) -> None:
    output = tmp_path / "evaluation.json"

    completed = subprocess.run(
        [
            sys.executable,
            str(ROOT / "scripts/evaluate_mvp.py"),
            "--runs-per-document",
            "1",
            "--output",
            str(output),
        ],
        check=False,
        capture_output=True,
        text=True,
    )

    assert completed.returncode == 0, completed.stderr
    payload = json.loads(output.read_text(encoding="utf-8"))
    assert payload["dataset"]["synthetic"] is True
    assert payload["dataset"]["documents"] == 3
    assert payload["retrieval"]["queries"] == 20
    assert payload["retrieval"]["hit_at_5"] >= 0.90
    assert payload["clause_extraction"]["micro_recall"] >= 0.90
    assert payload["grounding"]["high_priority_citation_coverage"] == 1.0
    question_answering = payload["document_question_answering"]
    assert question_answering["dataset"] == "qadam-synthetic-document-qa-v1"
    assert question_answering["synthetic"] is True
    assert question_answering["cases"] >= 8
    assert question_answering["supported_evidence_accuracy"] == 1.0
    assert question_answering["expected_excerpt_accuracy"] == 1.0
    assert question_answering["action_finding_accuracy"] == 1.0
    assert question_answering["refusal_accuracy"] == 1.0
    assert question_answering["cross_language_accuracy"] == 1.0
    assert all(payload["gates"].values())
