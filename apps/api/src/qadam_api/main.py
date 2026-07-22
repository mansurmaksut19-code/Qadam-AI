"""FastAPI application entry point."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from qadam_api.api.routes import analyses, auth, feedback, questions
from qadam_api.settings import get_settings


def create_app() -> FastAPI:
    application = FastAPI(
        title="QADAM AI API",
        version="0.1.0",
        description="Evidence-bound analysis of Kazakhstan rental contracts.",
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=get_settings().allowed_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-Analysis-Token"],
    )
    application.include_router(analyses.router)
    application.include_router(auth.router)
    application.include_router(questions.router)
    application.include_router(feedback.router)

    @application.get("/healthz", tags=["operations"])
    def healthz() -> dict[str, str]:
        return {"status": "ok"}

    return application


app = create_app()
