FROM ghcr.io/astral-sh/uv:0.11.23 AS uv

FROM python:3.13-slim

COPY --from=uv /uv /uvx /bin/
WORKDIR /workspace/apps/api

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/workspace/apps/api/.venv/bin:$PATH"

COPY apps/api/pyproject.toml apps/api/uv.lock apps/api/README.md ./
RUN uv sync --frozen --no-dev --no-install-project

COPY apps/api/src ./src
COPY corpus /workspace/corpus
RUN uv sync --frozen --no-dev

EXPOSE 8000
CMD ["uvicorn", "qadam_api.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
