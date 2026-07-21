#!/usr/bin/env python3
"""Measure the deterministic QADAM pipeline against committed synthetic fixtures."""

from __future__ import annotations

import argparse
import json
import math
import statistics
import sys
from pathlib import Path
from time import perf_counter_ns
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps/api/src"))

from qadam_api.analysis.clause_extractor import extract_clauses  # noqa: E402
from qadam_api.analysis.document_qa import (  # noqa: E402
    DeterministicQuestionProvider,
    DocumentQuestionAnswerer,
)
from qadam_api.analysis.orchestrator import AnalysisOrchestrator  # noqa: E402
from qadam_api.documents.parser import parse_document  # noqa: E402
from qadam_api.documents.validation import validate_upload  # noqa: E402
from qadam_api.domain import AnalysisStatus, ClauseType, Severity  # noqa: E402
from qadam_api.legal.corpus import load_corpus, load_manifest  # noqa: E402
from qadam_api.legal.reranker import rerank_results  # noqa: E402
from qadam_api.legal.retriever import HybridRetriever, RetrievalQuery  # noqa: E402
from qadam_api.providers.embeddings import DeterministicHashEmbedding  # noqa: E402
from qadam_api.providers.explanations import DeterministicExplanationProvider  # noqa: E402


def _percentile(values: list[float], fraction: float) -> float:
    ordered = sorted(values)
    index = max(0, math.ceil(fraction * len(ordered)) - 1)
    return ordered[index]


def _orchestrator(corpus_root: Path) -> AnalysisOrchestrator:
    return AnalysisOrchestrator(
        retriever=HybridRetriever(
            chunks=load_corpus(corpus_root),
            embeddings=DeterministicHashEmbedding(dimensions=128),
        ),
        explanation_provider=DeterministicExplanationProvider(),
    )


def evaluate(*, runs_per_document: int) -> dict[str, Any]:
    corpus_root = ROOT / "corpus/legal"
    manifest = load_manifest(corpus_root / "manifest.json")
    labels = json.loads((ROOT / "demo/contracts/labels.json").read_text(encoding="utf-8"))
    retrieval_fixture = json.loads(
        (ROOT / "evaluation/retrieval_cases.json").read_text(encoding="utf-8")
    )
    question_fixture = json.loads(
        (ROOT / "evaluation/document_qa_cases.json").read_text(encoding="utf-8")
    )
    orchestrator = _orchestrator(corpus_root)
    answerer = DocumentQuestionAnswerer(DeterministicQuestionProvider())

    document_results: list[dict[str, Any]] = []
    outcomes_by_document: dict[str, Any] = {}
    latencies_ms: list[float] = []
    expected_total = 0
    recovered_total = 0
    finding_total = 0
    cited_total = 0
    grounded_total = 0
    high_priority_total = 0
    high_priority_cited_total = 0
    completed_total = 0

    for document_label in labels["documents"]:
        source_name = Path(document_label["file"])
        demo_path = ROOT / "demo/contracts" / source_name.with_suffix(".pdf")
        upload = validate_upload(filename=demo_path.name, content=demo_path.read_bytes())
        clauses = extract_clauses(parse_document(upload))
        extracted_types = {clause.type.value for clause in clauses}
        expected_types = set(document_label["expected_clause_types"])
        recovered = expected_types & extracted_types
        expected_total += len(expected_types)
        recovered_total += len(recovered)

        outcome = None
        run_latencies: list[float] = []
        for _ in range(runs_per_document):
            started = perf_counter_ns()
            outcome = orchestrator.analyze(upload)
            elapsed_ms = (perf_counter_ns() - started) / 1_000_000
            run_latencies.append(elapsed_ms)
            latencies_ms.append(elapsed_ms)

        assert outcome is not None
        report = outcome.report
        outcomes_by_document[demo_path.name] = outcome
        completed_total += report.status is AnalysisStatus.COMPLETED
        finding_total += len(report.findings)
        cited_total += sum(bool(finding.citations) for finding in report.findings)
        grounded_total += sum(finding.clause is not None for finding in report.findings)
        high_priority = [
            finding for finding in report.findings if finding.severity is Severity.HIGH
        ]
        high_priority_total += len(high_priority)
        high_priority_cited_total += sum(bool(finding.citations) for finding in high_priority)
        document_results.append(
            {
                "file": demo_path.name,
                "expected_clause_types": len(expected_types),
                "recovered_clause_types": len(recovered),
                "clause_recall": round(len(recovered) / len(expected_types), 4),
                "findings": len(report.findings),
                "status": report.status.value,
                "latency_median_ms": round(statistics.median(run_latencies), 2),
            }
        )

    retriever = HybridRetriever(
        chunks=load_corpus(corpus_root),
        embeddings=DeterministicHashEmbedding(dimensions=128),
    )
    retrieval_hits = 0
    for case in retrieval_fixture["cases"]:
        query = RetrievalQuery(
            text=case["text"],
            clause_type=ClauseType(case["clause_type"]),
            language="ru",
        )
        results = rerank_results(query, retriever.search(query, limit=10))[:5]
        returned_ids = {result.chunk.id for result in results}
        retrieval_hits += bool(returned_ids & set(case["expected_ids"]))

    document_count = len(document_results)
    retrieval_count = len(retrieval_fixture["cases"])
    micro_recall = recovered_total / expected_total
    citation_coverage = cited_total / finding_total if finding_total else 1.0
    grounded_rate = grounded_total / finding_total if finding_total else 1.0
    high_priority_citation_coverage = (
        high_priority_cited_total / high_priority_total if high_priority_total else 1.0
    )
    hit_at_5 = retrieval_hits / retrieval_count
    latency_p95_ms = _percentile(latencies_ms, 0.95)

    def outcome_for(document_name: str) -> Any:
        cached = outcomes_by_document.get(document_name)
        if cached is not None:
            return cached
        demo_path = ROOT / "demo/contracts" / document_name
        upload = validate_upload(filename=demo_path.name, content=demo_path.read_bytes())
        analyzed = orchestrator.analyze(upload)
        outcomes_by_document[document_name] = analyzed
        return analyzed

    supported_total = 0
    supported_correct = 0
    excerpt_total = 0
    excerpt_correct = 0
    action_total = 0
    action_correct = 0
    refusal_total = 0
    refusal_correct = 0
    cross_language_total = 0
    cross_language_correct = 0

    for case in question_fixture["cases"]:
        outcome = outcome_for(case["document"])
        answer = answerer.answer(case["question"], outcome.evidence, outcome.report)
        actual_mode = "unsupported" if answer is None else answer.mode
        evidence_text = " ".join(match.block.text for match in answer.evidence) if answer else ""
        finding_categories = {
            finding.category.value
            for finding in outcome.report.findings
            if answer is not None and finding.id in answer.finding_ids
        }
        expected_mode = case["expected_mode"]

        if expected_mode == "document":
            supported_total += 1
            supported_correct += actual_mode == "document" and bool(answer and answer.evidence)
            excerpt_total += 1
            excerpt_correct += case["expected_excerpt_contains"] in evidence_text
        elif expected_mode == "action":
            action_total += 1
            action_correct += actual_mode == "action" and finding_categories == set(
                case["expected_categories"]
            )
        else:
            refusal_total += 1
            refusal_correct += actual_mode == "unsupported"

        if case["cross_language"]:
            cross_language_total += 1
            cross_language_correct += (
                actual_mode == "document"
                and case["expected_excerpt_contains"] in evidence_text
            )

    supported_evidence_accuracy = supported_correct / supported_total if supported_total else 1.0
    expected_excerpt_accuracy = excerpt_correct / excerpt_total if excerpt_total else 1.0
    action_finding_accuracy = action_correct / action_total if action_total else 1.0
    refusal_accuracy = refusal_correct / refusal_total if refusal_total else 1.0
    cross_language_accuracy = (
        cross_language_correct / cross_language_total if cross_language_total else 1.0
    )
    gates = {
        "all_documents_completed": completed_total == document_count,
        "clause_micro_recall_at_least_0_90": micro_recall >= 0.90,
        "retrieval_hit_at_5_at_least_0_90": hit_at_5 >= 0.90,
        "high_priority_citation_coverage_equals_1": high_priority_citation_coverage == 1.0,
        "grounded_clause_rate_equals_1": grounded_rate == 1.0,
        "pipeline_p95_below_2000_ms": latency_p95_ms < 2_000,
        "document_qa_supported_evidence_accuracy_equals_1": supported_evidence_accuracy == 1.0,
        "document_qa_expected_excerpt_accuracy_equals_1": expected_excerpt_accuracy == 1.0,
        "document_qa_action_finding_accuracy_equals_1": action_finding_accuracy == 1.0,
        "document_qa_refusal_accuracy_equals_1": refusal_accuracy == 1.0,
        "document_qa_cross_language_accuracy_equals_1": cross_language_accuracy == 1.0,
    }

    return {
        "scope": "deterministic in-process pipeline; excludes HTTP, queue, DB and network",
        "corpus": {
            "version": manifest.version,
            "snapshot_date": manifest.snapshot_date.isoformat(),
            "chunks": len(load_corpus(corpus_root)),
        },
        "dataset": {
            "name": labels["dataset"],
            "synthetic": labels["synthetic"],
            "documents": document_count,
            "runs_per_document": runs_per_document,
        },
        "clause_extraction": {
            "expected_families": expected_total,
            "recovered_families": recovered_total,
            "micro_recall": round(micro_recall, 4),
        },
        "retrieval": {
            "queries": retrieval_count,
            "hits_at_5": retrieval_hits,
            "hit_at_5": round(hit_at_5, 4),
        },
        "grounding": {
            "findings": finding_total,
            "findings_with_citations": cited_total,
            "citation_coverage": round(citation_coverage, 4),
            "high_priority_findings": high_priority_total,
            "high_priority_findings_with_citations": high_priority_cited_total,
            "high_priority_citation_coverage": round(high_priority_citation_coverage, 4),
            "findings_with_clause_evidence": grounded_total,
            "grounded_clause_rate": round(grounded_rate, 4),
        },
        "document_question_answering": {
            "dataset": question_fixture["dataset"],
            "synthetic": question_fixture["synthetic"],
            "cases": len(question_fixture["cases"]),
            "supported_evidence": {"correct": supported_correct, "total": supported_total},
            "supported_evidence_accuracy": round(supported_evidence_accuracy, 4),
            "expected_excerpt": {"correct": excerpt_correct, "total": excerpt_total},
            "expected_excerpt_accuracy": round(expected_excerpt_accuracy, 4),
            "action_findings": {"correct": action_correct, "total": action_total},
            "action_finding_accuracy": round(action_finding_accuracy, 4),
            "refusals": {"correct": refusal_correct, "total": refusal_total},
            "refusal_accuracy": round(refusal_accuracy, 4),
            "cross_language": {
                "correct": cross_language_correct,
                "total": cross_language_total,
            },
            "cross_language_accuracy": round(cross_language_accuracy, 4),
        },
        "latency": {
            "samples": len(latencies_ms),
            "median_ms": round(statistics.median(latencies_ms), 2),
            "p95_ms": round(latency_p95_ms, 2),
        },
        "documents": document_results,
        "gates": gates,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--runs-per-document", type=int, default=5)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    if args.runs_per_document < 1:
        parser.error("--runs-per-document must be at least 1")

    result = evaluate(runs_per_document=args.runs_per_document)
    rendered = json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding="utf-8")
    else:
        print(rendered, end="")
    return 0 if all(result["gates"].values()) else 1


if __name__ == "__main__":
    raise SystemExit(main())
