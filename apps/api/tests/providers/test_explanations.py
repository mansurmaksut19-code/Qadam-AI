from pathlib import Path
from uuid import uuid4

import httpx

from qadam_api.analysis.rules import RuleMatch
from qadam_api.domain import Citation, Clause, ClauseSpan, ClauseType, Finding, Severity
from qadam_api.legal.corpus import LegalChunk, load_corpus
from qadam_api.providers.explanations import (
    DeterministicExplanationProvider,
    ExplanationContext,
    ResilientExplanationProvider,
)
from qadam_api.providers.openai_compatible import OpenAICompatibleExplanationProvider

CORPUS_ROOT = Path(__file__).parents[4] / "corpus/legal"


def source(chunk_id: str = "civil-552-capital-repair") -> LegalChunk:
    return next(chunk for chunk in load_corpus(CORPUS_ROOT) if chunk.id == chunk_id)


def rule() -> RuleMatch:
    return RuleMatch(
        rule_id="tenant_pays_capital_repairs",
        severity=Severity.HIGH,
        category=ClauseType.REPAIRS,
        title="Капитальный ремонт переложен на арендатора",
        reason="Пункт перекладывает капитальный ремонт на студента.",
        action="Разделите текущий и капитальный ремонт.",
        landlord_question="Оставим капитальный ремонт обязанностью владельца?",
        legal_query="статья 552 капитальный ремонт",
        clause=Clause(
            id=uuid4(),
            type=ClauseType.REPAIRS,
            title="Ремонт",
            text="Капитальный ремонт оплачивает [ИИН_1].",
            span=ClauseSpan(block_start=2, block_end=2, page_start=1, page_end=1),
            confidence=0.9,
            extraction_method="rules",
        ),
        confidence=0.9,
    )


def test_deterministic_provider_builds_structured_finding() -> None:
    context = ExplanationContext(rule=rule(), legal_chunks=[source()])

    finding = DeterministicExplanationProvider().explain(context)

    assert finding.severity is Severity.HIGH
    assert finding.clause is context.rule.clause
    assert finding.citations[0].source_id == "civil-552-capital-repair"
    assert finding.action == context.rule.action
    assert "незакон" not in finding.explanation.casefold()


def test_resilient_provider_uses_fallback_on_timeout() -> None:
    class TimeoutProvider:
        def explain(self, context: ExplanationContext) -> Finding:
            raise TimeoutError

    provider = ResilientExplanationProvider(
        primary=TimeoutProvider(), fallback=DeterministicExplanationProvider()
    )

    finding = provider.explain(ExplanationContext(rule=rule(), legal_chunks=[source()]))

    assert finding.citations[0].source_id == "civil-552-capital-repair"


def test_resilient_provider_rejects_fabricated_citation_and_uses_fallback() -> None:
    class FabricatingProvider:
        def explain(self, context: ExplanationContext) -> Finding:
            valid = DeterministicExplanationProvider().explain(context)
            fake = Citation(
                source_id="invented-999",
                source_title="Выдуманный закон",
                reference="Статья 999",
                url="https://adilet.zan.kz/rus/docs/INVENTED",
                excerpt="Выдуманный текст",
            )
            return valid.model_copy(update={"citations": [fake]})

    provider = ResilientExplanationProvider(
        primary=FabricatingProvider(), fallback=DeterministicExplanationProvider()
    )

    finding = provider.explain(ExplanationContext(rule=rule(), legal_chunks=[source()]))

    assert [citation.source_id for citation in finding.citations] == ["civil-552-capital-repair"]


def test_openai_compatible_provider_sends_only_masked_context_and_parses_json() -> None:
    context = ExplanationContext(rule=rule(), legal_chunks=[source()])
    expected = DeterministicExplanationProvider().explain(context)

    def handler(request: httpx.Request) -> httpx.Response:
        body = request.content.decode("utf-8")
        assert "020101501234" not in body
        assert "[ИИН_1]" in body
        assert request.headers["authorization"] == "Bearer test-key"
        return httpx.Response(
            200,
            json={
                "choices": [
                    {"message": {"content": expected.model_dump_json()}},
                ]
            },
        )

    client = httpx.Client(
        base_url="https://llm.example/v1",
        transport=httpx.MockTransport(handler),
        headers={"Authorization": "Bearer test-key"},
    )
    provider = OpenAICompatibleExplanationProvider(client=client, model="test-model")

    finding = provider.explain(context)

    assert finding == expected
