"""Application dependency wiring kept replaceable for tests and deployments."""

from __future__ import annotations

from functools import lru_cache

import httpx

from qadam_api.analysis.document_qa import (
    DeterministicQuestionProvider,
    DocumentQuestionAnswerer,
    QuestionAnswerProvider,
    ResilientQuestionProvider,
)
from qadam_api.analysis.orchestrator import AnalysisOrchestrator
from qadam_api.legal.corpus import load_corpus
from qadam_api.legal.retriever import HybridRetriever
from qadam_api.providers.embeddings import DeterministicHashEmbedding
from qadam_api.providers.explanations import (
    DeterministicExplanationProvider,
    ExplanationProvider,
    ResilientExplanationProvider,
)
from qadam_api.providers.openai_compatible import OpenAICompatibleExplanationProvider
from qadam_api.providers.openai_compatible_questions import OpenAICompatibleQuestionProvider
from qadam_api.repositories.base import AnalysisRepository
from qadam_api.repositories.memory import InMemoryRepository
from qadam_api.repositories.postgres import PostgresRepository
from qadam_api.settings import Settings, get_settings


def _build_model_client(settings: Settings) -> httpx.Client:
    if not (settings.llm_base_url and settings.llm_api_key):
        raise ValueError("complete model endpoint configuration is required")
    return httpx.Client(
        base_url=f"{settings.llm_base_url.rstrip('/')}/",
        headers={"Authorization": f"Bearer {settings.llm_api_key}"},
        timeout=15.0,
    )


def build_explanation_provider(settings: Settings) -> ExplanationProvider:
    """Enable the optional model only when every required secret is configured."""
    fallback = DeterministicExplanationProvider()
    if not (settings.llm_base_url and settings.llm_api_key and settings.llm_model):
        return fallback

    client = _build_model_client(settings)
    primary = OpenAICompatibleExplanationProvider(client=client, model=settings.llm_model)
    return ResilientExplanationProvider(primary=primary, fallback=fallback)


def build_question_provider(settings: Settings) -> QuestionAnswerProvider:
    """Use optional model phrasing without losing deterministic grounded fallback."""

    fallback = DeterministicQuestionProvider()
    if not (settings.llm_base_url and settings.llm_api_key and settings.llm_model):
        return fallback
    client = _build_model_client(settings)
    primary = OpenAICompatibleQuestionProvider(client=client, model=settings.llm_model)
    return ResilientQuestionProvider(primary=primary, fallback=fallback)


@lru_cache
def get_repository() -> AnalysisRepository:
    settings = get_settings()
    if settings.database_url:
        repository = PostgresRepository.from_url(settings.database_url)
        repository.create_schema()
        return repository
    return InMemoryRepository()


@lru_cache
def get_orchestrator() -> AnalysisOrchestrator:
    settings = get_settings()
    chunks = load_corpus(settings.legal_corpus_path)
    return AnalysisOrchestrator(
        retriever=HybridRetriever(
            chunks=chunks,
            embeddings=DeterministicHashEmbedding(dimensions=128),
        ),
        explanation_provider=build_explanation_provider(settings),
    )


@lru_cache
def get_question_answerer() -> DocumentQuestionAnswerer:
    """Build the evidence-first document question service."""

    return DocumentQuestionAnswerer(build_question_provider(get_settings()))
