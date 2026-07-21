"""End-to-end contract analysis orchestration."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, replace
from enum import StrEnum
from uuid import uuid4

from qadam_api.analysis.clause_extractor import extract_clauses
from qadam_api.analysis.grounding import validate_grounded_finding
from qadam_api.analysis.question_suggestions import build_question_suggestions
from qadam_api.analysis.rules import evaluate_rules
from qadam_api.documents.evidence import build_document_evidence
from qadam_api.documents.language import detect_language
from qadam_api.documents.parser import DocumentParsingError, parse_document
from qadam_api.documents.privacy import mask_personal_data
from qadam_api.documents.types import (
    DocumentEvidenceBlock,
    ParsedDocument,
    TextBlock,
    ValidatedUpload,
)
from qadam_api.domain import AnalysisReport, AnalysisStatus, Severity
from qadam_api.legal.reranker import rerank_results
from qadam_api.legal.retriever import HybridRetriever, RetrievalQuery
from qadam_api.providers.explanations import ExplanationContext, ExplanationProvider


class PipelineStage(StrEnum):
    """Real processing stages shown by the web UI."""

    EXTRACTING_TEXT = "extracting_text"
    MASKING_PERSONAL_DATA = "masking_personal_data"
    EXTRACTING_CLAUSES = "extracting_clauses"
    RETRIEVING_LAW = "retrieving_law"
    VALIDATING_REPORT = "validating_report"
    COMPLETED = "completed"
    FAILED = "failed"


StageCallback = Callable[[PipelineStage], None]


@dataclass(frozen=True, slots=True)
class AnalysisOutcome:
    """Public report plus private masked evidence retained for document Q&A."""

    report: AnalysisReport
    evidence: tuple[DocumentEvidenceBlock, ...] = ()


def _masked_document(document: ParsedDocument) -> ParsedDocument:
    blocks = tuple(
        TextBlock(
            index=block.index,
            text=mask_personal_data(block.text).masked_text,
            kind=block.kind,
            page_number=block.page_number,
            paragraph_number=block.paragraph_number,
        )
        for block in document.blocks
    )
    return ParsedDocument(blocks=blocks, full_text="\n\n".join(block.text for block in blocks))


class AnalysisOrchestrator:
    """Coordinate deterministic and provider-backed analysis stages."""

    def __init__(
        self,
        *,
        retriever: HybridRetriever,
        explanation_provider: ExplanationProvider,
    ) -> None:
        self._retriever = retriever
        self._explanation_provider = explanation_provider

    def analyze(
        self,
        upload: ValidatedUpload,
        *,
        on_stage: StageCallback | None = None,
    ) -> AnalysisOutcome:
        emit = on_stage or (lambda _stage: None)
        analysis_id = uuid4()
        emit(PipelineStage.EXTRACTING_TEXT)
        try:
            parsed = parse_document(upload)
        except DocumentParsingError as error:
            emit(PipelineStage.FAILED)
            return AnalysisOutcome(
                report=AnalysisReport(
                    id=analysis_id,
                    status=AnalysisStatus.FAILED,
                    language="ru",
                    summary=str(error),
                    findings=[],
                    missing_terms=[],
                    failure_code=error.code,
                )
            )

        emit(PipelineStage.MASKING_PERSONAL_DATA)
        masked = _masked_document(parsed)
        evidence = build_document_evidence(masked.blocks)
        language = detect_language(masked.full_text)

        emit(PipelineStage.EXTRACTING_CLAUSES)
        clauses = extract_clauses(masked)
        rule_matches = evaluate_rules(clauses)
        missing_terms = list(
            dict.fromkeys(match.category for match in rule_matches if match.clause is None)
        )

        emit(PipelineStage.RETRIEVING_LAW)
        findings = []
        for rule in (match for match in rule_matches if match.clause is not None):
            query = RetrievalQuery(text=rule.legal_query, clause_type=rule.category, language="ru")
            candidates = rerank_results(query, self._retriever.search(query, limit=10))
            legal_chunks = [
                candidate.chunk
                for candidate in candidates
                if rule.category in candidate.chunk.clause_types
            ][:2]
            safe_rule = rule
            if safe_rule.severity is Severity.HIGH and not legal_chunks:
                safe_rule = replace(safe_rule, severity=Severity.ATTENTION, confidence=0.65)
            context = ExplanationContext(rule=safe_rule, legal_chunks=legal_chunks)
            finding = self._explanation_provider.explain(context)
            findings.append(validate_grounded_finding(finding, retrieved_chunks=legal_chunks))

        emit(PipelineStage.VALIDATING_REPORT)
        high_count = sum(finding.severity is Severity.HIGH for finding in findings)
        attention_count = sum(finding.severity is Severity.ATTENTION for finding in findings)
        summary = (
            f"Найдено: высокий приоритет — {high_count}, требует внимания — {attention_count}. "
            "Проверьте каждый пункт и источник до подписания."
        )
        report = AnalysisReport(
            id=analysis_id,
            status=AnalysisStatus.COMPLETED,
            language=language,
            summary=summary,
            findings=findings,
            missing_terms=missing_terms,
            question_suggestions=build_question_suggestions(
                clauses=list(clauses),
                findings=findings,
                language=language,
            ),
        )
        emit(PipelineStage.COMPLETED)
        return AnalysisOutcome(report=report, evidence=evidence)
