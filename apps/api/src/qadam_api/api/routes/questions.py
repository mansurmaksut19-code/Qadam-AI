"""Evidence-bound questions and landlord negotiation drafts."""

from __future__ import annotations

from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from qadam_api.analysis.document_qa import DocumentQuestionAnswerer, question_categories
from qadam_api.api.dependencies import get_question_answerer, get_repository
from qadam_api.api.problem import problem
from qadam_api.api.routes.analyses import require_record
from qadam_api.documents.privacy import mask_personal_data
from qadam_api.domain import Citation
from qadam_api.repositories.base import AnalysisRepository, QuestionRecord

router = APIRouter(prefix="/api/v1/analyses", tags=["questions"])

class QuestionRequest(BaseModel):
    question: str = Field(min_length=3, max_length=500)


class QuestionAnswer(BaseModel):
    answer: str
    mode: Literal["document", "action", "unsupported"]
    supported: bool
    confidence: float = Field(ge=0.0, le=1.0)
    evidence: list[DocumentEvidenceResponse]
    citations: list[Citation]


class DocumentEvidenceResponse(BaseModel):
    block_index: int
    page: int | None
    excerpt: str
    score: float


class NegotiationRequest(BaseModel):
    finding_id: UUID
    tone: Literal["polite", "direct"] = "polite"


class NegotiationResponse(BaseModel):
    finding_id: UUID
    message: str


@router.post("/{analysis_id}/questions", response_model=QuestionAnswer)
def ask_question(
    analysis_id: UUID,
    payload: QuestionRequest,
    repository: Annotated[AnalysisRepository, Depends(get_repository)],
    answerer: Annotated[DocumentQuestionAnswerer, Depends(get_question_answerer)],
    token: Annotated[str | None, Header(alias="X-Analysis-Token")] = None,
) -> QuestionAnswer | JSONResponse:
    record = require_record(analysis_id=analysis_id, token=token, repository=repository)
    if isinstance(record, JSONResponse):
        return record

    grounded = answerer.answer(payload.question, record.evidence, record.report)
    if grounded is None:
        answer = QuestionAnswer(
            answer=(
                "Не нашёл подтверждение в тексте загруженного договора. "
                "Спросите о явно указанном условии, сумме, сроке или обязанности сторон."
            ),
            mode="unsupported",
            supported=False,
            confidence=0.0,
            evidence=[],
            citations=[],
        )
    else:
        if grounded.mode == "action":
            finding_ids = set(grounded.finding_ids)
            related_findings = [
                finding for finding in record.report.findings if finding.id in finding_ids
            ]
        else:
            categories = question_categories(payload.question)
            related_findings = [
                finding
                for finding in record.report.findings
                if finding.category in categories
                and finding.clause is not None
                and any(
                    finding.clause.span.block_start
                    <= match.block.source_block_index
                    <= finding.clause.span.block_end
                    for match in grounded.evidence
                )
            ]
        legal_citations = list(
            {
                citation.source_id: citation
                for finding in related_findings
                for citation in finding.citations
            }.values()
        )
        answer = QuestionAnswer(
            answer=grounded.answer,
            mode=grounded.mode,
            supported=True,
            confidence=grounded.confidence,
            evidence=[
                DocumentEvidenceResponse(
                    block_index=match.block.block_index,
                    page=match.block.page_number,
                    excerpt=match.block.text[:600],
                    score=match.score,
                )
                for match in grounded.evidence
            ],
            citations=legal_citations,
        )
    repository.save_question(
        QuestionRecord.create(
            analysis_id=analysis_id,
            question=mask_personal_data(payload.question).masked_text,
            supported=answer.supported,
        )
    )
    return answer


@router.post("/{analysis_id}/negotiation", response_model=NegotiationResponse)
def create_negotiation_message(
    analysis_id: UUID,
    payload: NegotiationRequest,
    repository: Annotated[AnalysisRepository, Depends(get_repository)],
    token: Annotated[str | None, Header(alias="X-Analysis-Token")] = None,
) -> NegotiationResponse | JSONResponse:
    record = require_record(analysis_id=analysis_id, token=token, repository=repository)
    if isinstance(record, JSONResponse):
        return record
    finding = next((item for item in record.report.findings if item.id == payload.finding_id), None)
    if finding is None:
        return problem(
            status=404,
            code="finding_not_found",
            title="Пункт не найден",
            detail="Выберите пункт из текущего отчёта.",
        )
    greeting = "Здравствуйте! Подскажите, пожалуйста," if payload.tone == "polite" else "Уточните:"
    return NegotiationResponse(
        finding_id=finding.id,
        message=f"{greeting} {finding.landlord_question} Предлагаю закрепить это в договоре.",
    )
