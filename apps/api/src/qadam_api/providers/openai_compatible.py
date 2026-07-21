"""Optional structured-output adapter for OpenAI-compatible chat endpoints."""

from __future__ import annotations

import json

import httpx

from qadam_api.domain import Finding
from qadam_api.providers.explanations import ExplanationContext


class OpenAICompatibleExplanationProvider:
    """Ask a configured model to format evidence without expanding its source set."""

    def __init__(self, *, client: httpx.Client, model: str) -> None:
        if not model.strip():
            raise ValueError("model must not be empty")
        self._client = client
        self._model = model

    @staticmethod
    def _context_payload(context: ExplanationContext) -> dict[str, object]:
        clause = context.rule.clause
        return {
            "rule": {
                "severity": context.rule.severity.value,
                "category": context.rule.category.value,
                "title": context.rule.title,
                "reason": context.rule.reason,
                "action": context.rule.action,
                "landlord_question": context.rule.landlord_question,
                "confidence": context.rule.confidence,
            },
            "clause": clause.model_dump(mode="json") if clause else None,
            "legal_chunks": [
                {
                    "source_id": chunk.id,
                    "source_title": chunk.act_title,
                    "reference": chunk.article_ref,
                    "url": str(chunk.canonical_url),
                    "excerpt": chunk.text,
                }
                for chunk in context.legal_chunks
            ],
        }

    def explain(self, context: ExplanationContext) -> Finding:
        payload = self._context_payload(context)
        try:
            response = self._client.post(
                "chat/completions",
                json={
                    "model": self._model,
                    "temperature": 0,
                    "response_format": {"type": "json_object"},
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "Return one Finding JSON object using only the supplied masked "
                                "clause and legal_chunks. Keep source_id values unchanged."
                            ),
                        },
                        {
                            "role": "user",
                            "content": json.dumps(payload, ensure_ascii=False),
                        },
                    ],
                },
            )
            response.raise_for_status()
        except httpx.TimeoutException as error:
            raise TimeoutError("explanation provider timed out") from error

        content = response.json()["choices"][0]["message"]["content"]
        return Finding.model_validate_json(content)
