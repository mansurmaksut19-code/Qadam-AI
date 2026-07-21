"""Contract upload, polling, and finding endpoints."""

from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, File, Header, UploadFile, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from qadam_api.analysis.orchestrator import AnalysisOrchestrator, PipelineStage
from qadam_api.api.dependencies import get_orchestrator, get_repository
from qadam_api.api.problem import problem
from qadam_api.documents.types import DocumentEvidenceBlock, ValidatedUpload
from qadam_api.documents.validation import UploadValidationError, validate_upload
from qadam_api.domain import AnalysisReport, AnalysisStatus, Finding
from qadam_api.repositories.base import AnalysisRecord, AnalysisRepository

router = APIRouter(prefix="/api/v1/analyses", tags=["analyses"])


class AcceptedAnalysis(BaseModel):
    analysis_id: UUID
    access_token: str
    status: AnalysisStatus


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def require_record(
    *,
    analysis_id: UUID,
    token: str | None,
    repository: AnalysisRepository,
) -> AnalysisRecord | JSONResponse:
    if token is None:
        return problem(
            status=401,
            code="access_token_required",
            title="Требуется токен доступа",
            detail="Передайте токен анализа в заголовке X-Analysis-Token.",
        )
    record = repository.get_analysis(analysis_id)
    supplied_hash = token_digest(token)
    if record is None or not secrets.compare_digest(record.access_token_hash, supplied_hash):
        return problem(
            status=404,
            code="analysis_not_found",
            title="Анализ не найден",
            detail="Проверьте идентификатор и токен доступа.",
        )
    return record


def _run_analysis(
    *,
    analysis_id: UUID,
    upload: ValidatedUpload,
    repository: AnalysisRepository,
    orchestrator: AnalysisOrchestrator,
    access_token_hash: str,
    created_at: datetime,
) -> None:
    evidence: tuple[DocumentEvidenceBlock, ...] = ()

    def save_stage(stage: PipelineStage) -> None:
        if stage in {PipelineStage.COMPLETED, PipelineStage.FAILED}:
            return
        current_status = (
            AnalysisStatus.EXTRACTING
            if stage
            in {
                PipelineStage.EXTRACTING_TEXT,
                PipelineStage.MASKING_PERSONAL_DATA,
            }
            else AnalysisStatus.ANALYZING
        )
        repository.save_analysis(
            AnalysisRecord(
                report=AnalysisReport(
                    id=analysis_id,
                    status=current_status,
                    language="ru",
                    summary="Анализируем условия и проверяем основания.",
                ),
                access_token_hash=access_token_hash,
                document_checksum=upload.checksum_sha256,
                created_at=created_at,
            )
        )

    try:
        outcome = orchestrator.analyze(upload, on_stage=save_stage)
        report = outcome.report.model_copy(update={"id": analysis_id})
        evidence = outcome.evidence
    except Exception:
        report = AnalysisReport(
            id=analysis_id,
            status=AnalysisStatus.FAILED,
            language="ru",
            summary="Не удалось завершить анализ. Загрузите документ ещё раз.",
            failure_code="internal_error",
        )
    repository.save_analysis(
        AnalysisRecord(
            report=report,
            access_token_hash=access_token_hash,
            document_checksum=upload.checksum_sha256,
            created_at=created_at,
            evidence=evidence,
        )
    )


@router.post("", response_model=AcceptedAnalysis, status_code=status.HTTP_202_ACCEPTED)
async def create_analysis(
    file: Annotated[UploadFile, File()],
    background_tasks: BackgroundTasks,
    repository: Annotated[AnalysisRepository, Depends(get_repository)],
    orchestrator: Annotated[AnalysisOrchestrator, Depends(get_orchestrator)],
) -> AcceptedAnalysis | JSONResponse:
    content = await file.read()
    try:
        upload = validate_upload(filename=file.filename or "upload", content=content)
    except UploadValidationError as error:
        http_status = 415 if error.code == "unsupported_type" else 400
        return problem(
            status=http_status,
            code=error.code,
            title="Файл не принят",
            detail=str(error),
        )

    analysis_id = uuid4()
    access_token = secrets.token_urlsafe(32)
    access_token_hash = token_digest(access_token)
    created_at = datetime.now(UTC)
    repository.save_analysis(
        AnalysisRecord(
            report=AnalysisReport(
                id=analysis_id,
                status=AnalysisStatus.QUEUED,
                language="ru",
                summary="Договор принят и ожидает анализа.",
            ),
            access_token_hash=access_token_hash,
            document_checksum=upload.checksum_sha256,
            created_at=created_at,
        )
    )
    background_tasks.add_task(
        _run_analysis,
        analysis_id=analysis_id,
        upload=upload,
        repository=repository,
        orchestrator=orchestrator,
        access_token_hash=access_token_hash,
        created_at=created_at,
    )
    return AcceptedAnalysis(
        analysis_id=analysis_id,
        access_token=access_token,
        status=AnalysisStatus.QUEUED,
    )


@router.get("/{analysis_id}", response_model=AnalysisReport)
def get_analysis(
    analysis_id: UUID,
    repository: Annotated[AnalysisRepository, Depends(get_repository)],
    token: Annotated[str | None, Header(alias="X-Analysis-Token")] = None,
) -> AnalysisReport | JSONResponse:
    record = require_record(analysis_id=analysis_id, token=token, repository=repository)
    return record if isinstance(record, JSONResponse) else record.report


@router.get("/{analysis_id}/findings", response_model=list[Finding])
def get_findings(
    analysis_id: UUID,
    repository: Annotated[AnalysisRepository, Depends(get_repository)],
    token: Annotated[str | None, Header(alias="X-Analysis-Token")] = None,
) -> list[Finding] | JSONResponse:
    record = require_record(analysis_id=analysis_id, token=token, repository=repository)
    return record if isinstance(record, JSONResponse) else record.report.findings
