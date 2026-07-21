from io import BytesIO
from pathlib import Path

import fitz
from docx import Document

from qadam_api.analysis.orchestrator import AnalysisOrchestrator, PipelineStage
from qadam_api.documents.validation import validate_upload
from qadam_api.domain import AnalysisStatus, ClauseType, Finding, Severity
from qadam_api.legal.corpus import load_corpus
from qadam_api.legal.retriever import HybridRetriever
from qadam_api.providers.embeddings import DeterministicHashEmbedding
from qadam_api.providers.explanations import (
    DeterministicExplanationProvider,
    ExplanationContext,
)

ROOT = Path(__file__).parents[4]
CORPUS_ROOT = ROOT / "corpus/legal"


def make_docx_bytes(text: str) -> bytes:
    document = Document()
    for block in text.split("\n\n"):
        if block.strip():
            document.add_paragraph(block.strip())
    buffer = BytesIO()
    document.save(buffer)
    return buffer.getvalue()


def make_short_pdf() -> bytes:
    document = fitz.open()
    document.new_page().insert_text((72, 72), "Signature")
    content = document.tobytes()
    document.close()
    return content


class CapturingProvider:
    def __init__(self) -> None:
        self.contexts: list[ExplanationContext] = []
        self.fallback = DeterministicExplanationProvider()

    def explain(self, context: ExplanationContext) -> Finding:
        self.contexts.append(context)
        return self.fallback.explain(context)


def make_orchestrator(provider: CapturingProvider) -> AnalysisOrchestrator:
    chunks = load_corpus(CORPUS_ROOT)
    return AnalysisOrchestrator(
        retriever=HybridRetriever(
            chunks=chunks,
            embeddings=DeterministicHashEmbedding(dimensions=128),
        ),
        explanation_provider=provider,
    )


def test_analyzes_risky_contract_end_to_end_with_grounded_findings() -> None:
    text = (ROOT / "demo/contracts/qadam-risky-contract.txt").read_text(encoding="utf-8")
    text = text.replace(
        "без уведомления арендатора для проверки",
        "без уведомления арендатора с ИИН 020101501234 для проверки",
    )
    upload = validate_upload(filename="risky.docx", content=make_docx_bytes(text))
    provider = CapturingProvider()
    stages: list[PipelineStage] = []

    outcome = make_orchestrator(provider).analyze(upload, on_stage=stages.append)
    report = outcome.report

    assert report.status is AnalysisStatus.COMPLETED
    assert report.language == "ru"
    assert {finding.category for finding in report.findings} >= {
        ClauseType.DEPOSIT,
        ClauseType.RENT_CHANGE,
        ClauseType.TERMINATION,
    }
    assert all(
        finding.citations for finding in report.findings if finding.severity is Severity.HIGH
    )
    assert ClauseType.TERM in report.missing_terms
    assert report.question_suggestions
    assert len(report.question_suggestions) <= 4
    assert any("изменить условие" in item.casefold() for item in report.question_suggestions)
    assert stages == [
        PipelineStage.EXTRACTING_TEXT,
        PipelineStage.MASKING_PERSONAL_DATA,
        PipelineStage.EXTRACTING_CLAUSES,
        PipelineStage.RETRIEVING_LAW,
        PipelineStage.VALIDATING_REPORT,
        PipelineStage.COMPLETED,
    ]
    assert provider.contexts
    assert all(
        "020101501234" not in context.rule.clause.text
        for context in provider.contexts
        if context.rule.clause
    )
    assert any(
        "[ИИН_1]" in context.rule.clause.text
        for context in provider.contexts
        if context.rule.clause
    )
    assert outcome.evidence
    assert any(block.page_number is None for block in outcome.evidence)
    assert all("020101501234" not in block.text for block in outcome.evidence)
    assert all("020101501234" not in item for item in report.question_suggestions)
    assert any("[ИИН_1]" in block.text for block in outcome.evidence)
    assert all(len(block.checksum_sha256) == 64 for block in outcome.evidence)
    assert [block.block_index for block in outcome.evidence] == list(range(len(outcome.evidence)))


def test_scan_like_pdf_returns_recoverable_failure_without_provider_call() -> None:
    upload = validate_upload(filename="scan.pdf", content=make_short_pdf())
    provider = CapturingProvider()
    stages: list[PipelineStage] = []

    outcome = make_orchestrator(provider).analyze(upload, on_stage=stages.append)
    report = outcome.report

    assert report.status is AnalysisStatus.FAILED
    assert report.failure_code == "ocr_required"
    assert report.findings == []
    assert provider.contexts == []
    assert stages == [PipelineStage.EXTRACTING_TEXT, PipelineStage.FAILED]
    assert outcome.evidence == ()
