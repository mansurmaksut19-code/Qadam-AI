"""Optional structured adapter for grounded document question phrasing."""

from __future__ import annotations

import json

import httpx

from qadam_api.analysis.document_qa import ProviderAnswer, QuestionContext


class OpenAICompatibleQuestionProvider:
    """Phrase an answer using only allow-listed masked document evidence."""

    def __init__(self, *, client: httpx.Client, model: str) -> None:
        if not model.strip():
            raise ValueError("model must not be empty")
        self._client = client
        self._model = model

    @staticmethod
    def _context_payload(context: QuestionContext) -> dict[str, object]:
        return {
            "question": context.question,
            "language": context.language,
            "evidence": [
                {
                    "block_index": match.block.block_index,
                    "page": match.block.page_number,
                    "text": match.block.text,
                }
                for match in context.matches
            ],
            "rules": {
                "answer_only_from_evidence": True,
                "unknown_fact_means_refusal": True,
                "return_json": ["answer", "evidence_block_indexes", "confidence"],
            },
        }

    def answer(self, context: QuestionContext) -> ProviderAnswer:
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
                                "Answer only from the supplied masked evidence. Return one JSON "
                                "object with answer, evidence_block_indexes, and confidence."
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
            raise TimeoutError("question provider timed out") from error

        content = response.json()["choices"][0]["message"]["content"]
        return ProviderAnswer.model_validate_json(content)
