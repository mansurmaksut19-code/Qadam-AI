"""Minimal product feedback endpoint."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from qadam_api.api.dependencies import get_repository
from qadam_api.api.routes.analyses import require_record
from qadam_api.repositories.base import AnalysisRepository, FeedbackRecord

router = APIRouter(prefix="/api/v1/analyses", tags=["feedback"])


class FeedbackRequest(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=1000)


class FeedbackAccepted(BaseModel):
    accepted: bool = True


@router.post(
    "/{analysis_id}/feedback",
    response_model=FeedbackAccepted,
    status_code=status.HTTP_201_CREATED,
)
def submit_feedback(
    analysis_id: UUID,
    payload: FeedbackRequest,
    repository: Annotated[AnalysisRepository, Depends(get_repository)],
    token: Annotated[str | None, Header(alias="X-Analysis-Token")] = None,
) -> FeedbackAccepted | JSONResponse:
    record = require_record(analysis_id=analysis_id, token=token, repository=repository)
    if isinstance(record, JSONResponse):
        return record
    repository.save_feedback(
        FeedbackRecord.create(
            analysis_id=analysis_id,
            rating=payload.rating,
            comment=payload.comment,
        )
    )
    return FeedbackAccepted()
