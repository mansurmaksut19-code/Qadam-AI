# QADAM AI

[![Quality and release evidence](https://github.com/mansurmaksut19-code/Qadam-AI/actions/workflows/quality.yml/badge.svg)](https://github.com/mansurmaksut19-code/Qadam-AI/actions/workflows/quality.yml)

> Понять договор аренды до подписи — с точным фрагментом, официальным источником и
> конкретным следующим шагом.

QADAM AI — работающий MVP для одного пользователя и одной острой боли: иногородний студент
18–22 лет в Казахстане впервые снимает жильё и не понимает рискованные условия договора до
подписания. Сервис принимает PDF/DOCX, маскирует персональные идентификаторы, извлекает условия,
находит риски, связывает выводы с версионированными нормами права РК и помогает сформулировать
вопрос арендодателю.

Публичный репозиторий: [mansurmaksut19-code/Qadam-AI](https://github.com/mansurmaksut19-code/Qadam-AI).

Проект создан с 17 июля 2026 года для онлайн-этапа Tech Vision 2026, направление Social & Human
Capital, проблемная зона «Гражданская грамотность». Официальный бриф требует работающий код,
публичный репозиторий, PDF до 12 слайдов и demo до 3 минут; технический фильтр отсеивает проекты
только с макетом. См. [матрицу соответствия](docs/hackathon-alignment.md).

## Что уже работает

- PDF/DOCX до 10 МБ: проверка реальной сигнатуры, защита от пустых/зашифрованных/поддельных
  файлов и явный `ocr_required` для сканов без текстового слоя.
- Маскирование ИИН, телефонов, email и номеров карт до любого внешнего explanation provider.
- Русско-казахская нормализация и извлечение 14 семейств условий аренды.
- Проверяемые risk rules: депозит, одностороннее изменение цены, доступ хозяина, ремонт,
  расторжение, отсутствие срока/адреса/коммуналки и другие.
- Hybrid retrieval по 15 фрагментам официальных актов: lexical 0.45 + vector 0.35 + metadata
  0.20, затем inspectable reranking.
- Grounding gate не пропускает выдуманный source ID, нерелевантную норму, сильный вывод без
  фрагмента договора или категоричное «незаконно» без прямого основания.
- Асинхронный жизненный цикл `queued → extracting → analyzing → completed/failed`, приватный
  токен доступа и PostgreSQL persistence.
- Контекстные вопросы строятся только из найденных условий и рисков. Q&A имеет три проверяемых
  режима: `document` возвращает маскированный фрагмент договора, `action` собирает следующий шаг
  из уже найденных рисков и их доказательств, `unsupported` честно возвращает отказ без evidence
  и citations. Правовые ссылки остаются отдельным слоем, а не подменяют текст договора.
- Доступный адаптивный интерфейс: keyboard path, visible focus, 44 px targets, reduced motion,
  текстовые severity labels и mobile disclosure.
- Полностью автономный demo без внешнего API-ключа; OpenAI-compatible structured adapter имеет
  schema/citation allow-list и безопасный deterministic fallback.

## Быстрый запуск через Docker

Нужны Docker Engine и Compose.

```bash
make up
```

Откройте [http://localhost:3000](http://localhost:3000). API healthcheck:
[http://localhost:8000/healthz](http://localhost:8000/healthz).

Для демонстрации используйте
[`demo/contracts/qadam-risky-contract.pdf`](demo/contracts/qadam-risky-contract.pdf). Документ
синтетический и детерминированно генерируется из одноимённого UTF-8 `.txt`:

Для отдельной проверки Q&A на договоре с новыми фактами есть
[`demo/contracts/qadam-qa-challenge-contract.pdf`](demo/contracts/qadam-qa-challenge-contract.pdf):
после загрузки спросите «В каком городе находится квартира?» и «Можно ли жить с кошкой?». Ответы
должны показать фрагменты про Караганду и домашнюю кошку. Вопроса о парковочном месте в документе
нет, поэтому на него ожидается отказ.

Для RU/KZ-проверки загрузите
[`demo/contracts/qadam-mixed-language-contract.pdf`](demo/contracts/qadam-mixed-language-contract.pdf),
задайте «Какая арендная плата?» и получите фрагмент с `160 000`. Затем вопрос «Как решить
найденные проблемы?» должен вернуть действия по депозиту и расторжению, привязанные к тем же
находкам; это не готовый ответ из интерфейса.

```bash
make demo-documents
make seed-corpus
make evaluate
make e2e
```

Остановить stack:

```bash
make down
```

## Локальная разработка

Нужны Node.js 24, pnpm 11.3, Python 3.13 и uv 0.11.

```bash
make install
make demo-documents
```

Терминал 1:

```bash
cd apps/api
uv run uvicorn qadam_api.main:app --reload --port 8000
```

Терминал 2:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000 pnpm --filter web dev
```

Без `QADAM_DATABASE_URL` API использует process-local memory repository. Для PostgreSQL задайте
`QADAM_DATABASE_URL=postgresql+psycopg://qadam:qadam@localhost:5432/qadam`. Полный пример —
в [`.env.example`](.env.example).

## Проверка качества

```bash
# Все unit/integration tests, lint, strict types и production build
pnpm verify

# Backend отдельно
cd apps/api
uv run pytest -q
uv run ruff check src tests
uv run mypy src

# Browser journey
cd ../..
pnpm --filter web exec playwright install chromium
make e2e
```

Текущий проверяемый набор: 164 backend tests, 25 frontend component/client tests, 20 labelled
legal-retrieval queries и четыре Playwright-сценария: Axe-аудит, полный пользовательский путь,
Q&A по challenge-договору и смешанный RU/KZ journey с фактами и действиями. Порог legal retrieval
hit@5 — `≥0.90`; все 20 текущих запросов находят ожидаемый официальный фрагмент в top-5.
Воспроизводимый [evaluation report](docs/evaluation-results.json) измеряет три demo-договора:
micro-recall семейств клауз 24/26 (`0.9231`), high-priority citation coverage `1.0` и отдельный
in-process latency baseline. Дополнительный прозрачный synthetic Q&A set содержит 9 случаев:
five evidence/excerpt/action/refusal/cross-language gates сейчас равны `1.0`. Это регрессионная
точность данного fixture set, а не production legal accuracy. Отчёт честно исключает HTTP, очередь,
PostgreSQL и сеть.

## Архитектура

```mermaid
flowchart LR
  U[Студент / Next.js] -->|PDF/DOCX + consent| A[FastAPI]
  A --> V[Signature validation + parser]
  V --> M[PII masking + RU/KZ normalization]
  M --> C[Clause extractor + risk rules]
  C --> R[Hybrid legal retrieval + reranker]
  R --> G[Explanation provider + grounding gate]
  G --> P[(PostgreSQL / in-memory)]
  P --> U
  M --> E[Masked document evidence]
  E --> Q[Document Q&A retriever + answer gate]
  Q --> U
  R --> L[(Versioned legal corpus\nAdilet snapshot 2026-07-17)]
```

Подробно: [системная архитектура](docs/architecture.md), [AI/RAG pipeline](docs/ai-pipeline.md),
[происхождение правового корпуса](docs/corpus-provenance.md).

## API

| Метод | Путь | Назначение |
|---|---|---|
| `POST` | `/api/v1/analyses` | Принять PDF/DOCX, вернуть `202`, ID и приватный токен |
| `GET` | `/api/v1/analyses/{id}` | Polling отчёта с `X-Analysis-Token` |
| `GET` | `/api/v1/analyses/{id}/findings` | Структурированные находки |
| `POST` | `/api/v1/analyses/{id}/questions` | Вопрос по маскированным доказательствам загруженного договора |
| `POST` | `/api/v1/analyses/{id}/negotiation` | Сообщение по выбранной находке |
| `POST` | `/api/v1/analyses/{id}/feedback` | Оценка 1–5 и необязательный комментарий |
| `GET` | `/healthz` | Readiness endpoint |

OpenAPI доступен по `/docs` и `/openapi.json`.

## Данные, приватность и границы

- Сырые байты договора существуют только в памяти запроса/background task и не записываются в
  базу. Хранятся SHA-256, маскированные фрагменты, находки и журнал взаимодействий.
- Токен отчёта хранится в PostgreSQL только как SHA-256; открытый токен остаётся в `localStorage`
  браузера. Ссылку на отчёт нельзя считать публичной.
- Автоматическая очистка сохранённых отчётов пока не реализована. Для demo удалите Docker volume
  командой `docker compose down -v`; production deployment обязан добавить retention job.
- Корпус — небольшой hand-curated snapshot, а не полная правовая база. Перед решением пользователь
  должен открыть ссылку «Әділет» и проверить действующую редакцию.
- QADAM даёт информационную помощь, не юридическое заключение и не замену юриста/нотариуса.
- OCR фотографий, redlining исходного DOCX и production-grade semantic embeddings не входят в
  online-stage MVP; интерфейс сообщает эти ограничения явно.
- Q&A проверено для машиночитаемых договоров найма PDF/DOCX и не означает поддержку любых типов
  документов. Ответ может быть неполным при необычной формулировке; отсутствие релевантного
  фрагмента приводит к честному отказу, а не к догадке.

## Research и материалы сдачи

- [Research evidence pack](docs/research/README.md) — guide, consent и матрица без выдуманных
  интервью.
- [Pitch deck](pitch/QADAM_AI_Pitch_Deck.pdf) — 11 слайдов, воспроизводимо отрендеренных из
  [`QADAM_AI_Pitch_Deck.html`](pitch/QADAM_AI_Pitch_Deck.html).
- [Трёхминутный demo script](docs/demo-script.md).
- [Demo reliability checklist](docs/demo-recording-checklist.md).
- [Fallback technical walkthrough](release/QADAM_AI_fallback_demo.mp4) — 48-секундный silent MP4,
  воспроизводимый командой `make fallback-demo`; это резерв, а не замена командной озвученной записи.
- [Jury Q&A](docs/jury-qa.md) и [speaker notes](docs/pitch-speaker-notes.md) — ответы с
  доказательствами и честными границами.
- [Submission runbook](docs/submission-runbook.md) — порядок release gates, проверки URL и fallback.
- [Submission checklist](docs/submission-checklist.md) — готовые артефакты, verification gate и
  оставшиеся командные поля без приукрашивания.
- [Verification report](docs/verification-report.md) — requirement-by-requirement доказательства и
  незакрытые внешние условия.

Перед необратимой отправкой запустите `make final-submission-check`. Он намеренно не проходит,
пока в `release/final-submission.json` не появятся реальные anonymised CustDev observations,
имена и роли команды, public video/live URL и финальный pitch без внешних маркеров.

До сдачи команда должна заменить только отмеченные `TEAM INPUT REQUIRED` поля: реальные
интервью/CustDev, имена участников и demo/video URL. Код, тестовые метрики и источники уже
воспроизводимы из публичного репозитория.

## Структура

```text
apps/api/        FastAPI, analysis/RAG, repositories, tests
apps/web/        Next.js UI, component tests, Playwright E2E
corpus/legal/    versioned official-law passages + manifest
demo/contracts/  transparent synthetic sources and generated PDF/DOCX
docs/            architecture, research, demo and alignment evidence
pitch/           HTML/PDF pitch deck
scripts/         deterministic artifact generators
evaluation/      labelled synthetic retrieval and document-Q&A fixtures
```

## Лицензирование

Исходный код проекта доступен по MIT License. Тексты правовых актов и официальный бриф принадлежат
соответствующим правообладателям и включены только как источники/контекст с прямыми ссылками.
