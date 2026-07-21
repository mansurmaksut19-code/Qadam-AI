# QADAM AI — requirement verification report

Дата аудита: 17 июля 2026. Статус считается доказанным только при наличии текущего файла,
команды, runtime-состояния или внешнего URL. Отсутствие противоречий не считается доказательством.

## Product и official brief

| Требование | Авторитетное доказательство | Вывод |
|---|---|---|
| Зона Social & Human Capital / Civic Rights & Literacy | `docs/reference/Social-and-Human-Capital.pdf`, `docs/hackathon-alignment.md` | Доказано |
| Один пользователь: иногородний студент 18–22 | README, UI и pitch используют одну персону | Доказано как product scope |
| Реальная повторяющаяся боль / CustDev | `docs/research/evidence-matrix.csv` содержит только `TEAM INPUT REQUIRED` | **Не доказано** |
| Один момент: проверка договора до подписи | upload/report/next-action flow и 3-minute demo | Доказано |
| Работающий код, не Figma | Docker runtime + Playwright загружает настоящий PDF | Доказано |

## MVP capability

| Требование | Доказательство | Вывод |
|---|---|---|
| PDF/DOCX validation и parsing | parser/validation tests, реальный PDF E2E | Доказано |
| OCR-safe failure | `ocr_required` unit/API tests | Доказано; OCR не реализован |
| RU/KZ clause handling | language/extractor tests + mixed fixture | Доказано в рамках fixture set |
| Риски, простое объяснение, следующий шаг | rule/orchestrator tests и report UI | Доказано |
| Фрагмент договора и официальный источник | grounding tests, citation panel, Adilet links | Доказано |
| Contextual Q&A: document/action/unsupported, exact excerpt и отказ вне evidence | retrieval/provider/API/frontend tests + challenge и mixed PDF E2E | Доказано в machine-readable rental scope |
| Сообщение арендодателю | API/frontend/E2E tests | Доказано |
| Privacy masking до provider | capture test с raw ИИН + Docker log scan | Доказано |
| Persistence и приватный доступ | PostgreSQL schema/upsert tests, token hash/constant-time API tests | Доказано |

## AI/RAG и evaluation

Артефакт: `docs/evaluation-results.json`, создаётся `make evaluate`.

| Gate | Результат | Вывод |
|---|---:|---|
| Clause-family micro-recall ≥0.90 | 0.9231, 24/26 | Проходит на 3 synthetic fixtures |
| Retrieval hit@5 ≥0.90 | 1.0, 20/20 | Проходит на labelled RU queries |
| High-priority citation coverage =1 | 1.0, 3/3 | Проходит |
| Finding clause-evidence rate =1 | 1.0, 7/7 | Проходит |
| Synthetic document Q&A | 9 cases: evidence 5/5, excerpts 5/5, actions 2/2, refusals 2/2, RU→KZ 1/1; 5 gates = 1.0 | Regression accuracy fixture set, не legal accuracy |
| Deterministic in-process p95 <2000 ms | Точное значение в evaluation JSON, 15 samples | Проходит; не end-to-end latency |
| Real-contract/lawyer-reviewed accuracy | Нет dataset/review | **Не доказано** |

Overall citation coverage 5/7 не является failure: два attention-вывода основаны на явной
односторонней формулировке договора, а в curated corpus нет прямой нормы. Система не подставляет
нерелевантную citation; обязательный gate применяется к high-priority findings.

## Engineering и UX gates

| Gate | Свежий результат | Вывод |
|---|---:|---|
| Backend tests | 163/163 | Проходит |
| Frontend tests | 25/25 | Проходит |
| Browser E2E | 4/4 | Проходит |
| Accessibility | Axe: no serious/critical на landing и report | Проходит в заявленном scope |
| Static quality | Ruff, strict mypy, ESLint, TypeScript | Проходит |
| Production build | Next.js build | Проходит |
| Release tooling | 20/20 standard-library tests, включая ffmpeg render, network retry и final-submission validator | Проходит |
| Release artifacts | 10/10: files, hashes, PDF pages и MP4 streams | Проходит |
| Public URL gate | 4 endpoints: repository, raw README, pitch и fallback MP4 | Перепроверить после публикации текущего hardening commit |
| CI configuration | 2 jobs, read-only permissions, 10 immutable action SHA | Проходит локальную validation; public run проверяется после push |
| Dependency audit | pnpm production: no known vulnerabilities; pip-audit: no known vulnerabilities | Проходит на lockfiles 17 июля 2026 |
| Containers | PostgreSQL/API/web healthy | Проходит |
| Internal Markdown links | `make docs-check` | Проходит после свежего прогона |
| Secrets/logs | tracked credential scan + 80 строк Docker logs по 5 sensitive patterns | Проходит в выполненном scope |

## Submission artifacts

| Deliverable | Состояние | Вывод |
|---|---|---|
| README + setup/architecture/safety | Есть, команды проверены | Готово |
| Pitch PDF ≤12 | 11 страниц, 16:9, визуально проверен | Готово локально |
| Demo script ≤3:00 | Тайминг 0:00–3:00 + checklist | Готово |
| Silent fallback demo | 48.000 секунд, H.264 1920×1080, no audio, reproducible SHA-256 | Готово локально |
| Jury/submission pack | Q&A, speaker notes и ordered runbook | Готово |
| Final submission evidence gate | `make final-submission-check` | Намеренно блокирует внешние поля до реальных данных |
| Публичный GitHub repository | visibility `PUBLIC`, default `main`; page и raw README HTTP 200 без токена | Готово; новый hardening commit проверяется после публикации |
| Public demo video/live URL | URL отсутствует | **Не готово** |
| Team names/roles | Данные не предоставлены | **Не готово** |

## Итог

Продуктовая и техническая часть MVP доказана в заявленном synthetic/curated scope. Полная
готовность к отправке **не доказана**, пока команда не предоставит реальные CustDev-данные,
team details и доступный demo URL, затем не пройдёт `make final-submission-check` на финальном
commit. Публичную ветку с текущим hardening нужно перепроверить после публикации.
