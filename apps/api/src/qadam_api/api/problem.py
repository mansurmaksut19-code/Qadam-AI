"""RFC 9457-style application errors."""

from __future__ import annotations

from fastapi.responses import JSONResponse


def problem(
    *, status: int, code: str, title: str, detail: str, instance: str | None = None
) -> JSONResponse:
    payload: dict[str, object] = {
        "type": f"https://qadam.ai/problems/{code}",
        "title": title,
        "status": status,
        "detail": detail,
        "code": code,
    }
    if instance is not None:
        payload["instance"] = instance
    return JSONResponse(payload, status_code=status, media_type="application/problem+json")
