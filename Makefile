.PHONY: install test lint typecheck build dev verify docs-check evaluate demo-documents seed-corpus e2e screenshots pitch release-tools-test security-check release-check final-submission-check fallback-demo up down logs

install:
	pnpm install
	cd apps/api && uv sync --all-groups

test:
	pnpm test

lint:
	pnpm lint

typecheck:
	pnpm typecheck

build:
	pnpm build

dev:
	pnpm dev

verify:
	pnpm verify

docs-check:
	python scripts/check_markdown_links.py

evaluate: demo-documents
	cd apps/api && uv run python ../../scripts/evaluate_mvp.py --output ../../docs/evaluation-results.json

demo-documents:
	cd apps/api && uv run python ../../scripts/create_demo_documents.py

seed-corpus:
	cd apps/api && uv run python ../../scripts/seed_legal_corpus.py

e2e: demo-documents
	pnpm --filter web exec playwright test

screenshots: demo-documents
	pnpm --filter web exec node scripts/capture-demo-screenshots.mjs

pitch:
	pnpm --filter web exec node scripts/render-pitch.mjs

release-tools-test:
	python -m unittest discover -s scripts/tests -v

security-check:
	python scripts/check_repository_hygiene.py

release-check:
	python scripts/check_release.py

final-submission-check:
	python scripts/check_final_submission.py

fallback-demo:
	python -m scripts.create_fallback_demo

up: demo-documents
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs --no-color --tail=200
