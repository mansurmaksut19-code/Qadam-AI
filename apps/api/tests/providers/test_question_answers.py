from __future__ import annotations

import hashlib
import json

import httpx

from qadam_api.analysis.document_qa import (
    DeterministicQuestionProvider,
    EvidenceMatch,
    QuestionContext,
    ResilientQuestionProvider,
)
from qadam_api.documents.types import DocumentEvidenceBlock
from qadam_api.providers.openai_compatible_questions import OpenAICompatibleQuestionProvider


def question_context() -> QuestionContext:
    text = "Квартира находится в Караганде. ИИН арендатора: [ИИН_1]."
    block = DocumentEvidenceBlock(
        block_index=0,
        source_block_index=0,
        text=text,
        kind="paragraph",
        paragraph_number=0,
        checksum_sha256=hashlib.sha256(text.encode("utf-8")).hexdigest(),
    )
    return QuestionContext(
        question="В каком городе находится квартира?",
        matches=(EvidenceMatch(block=block, score=0.86),),
        language="ru",
    )


def test_provider_sends_only_selected_masked_evidence() -> None:
    captured: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured.update(json.loads(request.content))
        return httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(
                                {
                                    "answer": "Квартира находится в Караганде.",
                                    "evidence_block_indexes": [0],
                                    "confidence": 0.82,
                                },
                                ensure_ascii=False,
                            )
                        }
                    }
                ]
            },
        )

    client = httpx.Client(transport=httpx.MockTransport(handler), base_url="https://model.test/")
    provider = OpenAICompatibleQuestionProvider(client=client, model="qa-model")

    result = provider.answer(question_context())

    serialized = json.dumps(captured, ensure_ascii=False)
    assert "Караганде" in serialized
    assert "[ИИН_1]" in serialized
    assert "020101501234" not in serialized
    assert result.evidence_block_indexes == [0]


def test_malformed_provider_output_uses_extractive_fallback() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"choices": [{"message": {"content": "not json"}}]})

    client = httpx.Client(transport=httpx.MockTransport(handler), base_url="https://model.test/")
    provider = ResilientQuestionProvider(
        primary=OpenAICompatibleQuestionProvider(client=client, model="qa-model"),
        fallback=DeterministicQuestionProvider(),
    )

    result = provider.answer(question_context())

    assert "Квартира находится в Караганде" in result.answer
    assert result.evidence_block_indexes == [0]
