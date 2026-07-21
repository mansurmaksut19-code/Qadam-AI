# Tech Vision 2026 — submission checklist QADAM AI

Дедлайн из официального брифа: **21 июля 2026, 23:59 (Asia/Almaty)**.

## Обязательные online-stage deliverables

| Deliverable | Готовый артефакт | Проверка | Статус |
|---|---|---|---|
| Работающий MVP | `make up`, web `:3000`, API `:8000` | 3 healthy services + 4 Playwright E2E | Готово |
| Pitch PDF ≤12 слайдов | `pitch/QADAM_AI_Pitch_Deck.pdf` | 11 страниц, 16:9, tagged PDF | Готово |
| Public repository + README | [animcin84-dev/qadam-ai-techvision-2026](https://github.com/animcin84-dev/qadam-ai-techvision-2026) | `PUBLIC`, `main`; repository и raw README доступны без авторизации | Готово |
| Demo ≤3:00 или live URL | `docs/demo-script.md` + 48-секундный `release/QADAM_AI_fallback_demo.mp4` | локальный fallback проверен; публичная озвученная запись отсутствует | `TEAM INPUT REQUIRED` |

## Финальные поля команды

- [x] Создать подтверждённый public repository:
  `animcin84-dev/qadam-ai-techvision-2026`.
- [ ] Добавить имена и роли участников на слайд 11.
- [ ] Провести 3–5 интервью по `docs/research/interview-guide.md`; минимум 2–3 разговора требует
  официальный бриф.
- [ ] Внести обезличенные факты в `docs/research/evidence-matrix.csv` и заменить research block на
  слайде 3 без вымышленных цитат/процентов.
- [ ] Записать demo по `docs/demo-script.md`, проверить `≤03:00` и доступ в приватном окне.
- [x] Сгенерировать и проверить silent fallback через `make fallback-demo`; не выдавать его за
  CustDev или финальную озвученную запись.
- [x] Внести public repo URL на слайд 11 и повторно выполнить `make pitch`.
- [ ] Внести video/live URL на слайд 11 и повторно выполнить `make pitch`.
- [ ] Заполнить `release/final-submission.json` только реальными данными и пройти
  `python scripts/check_final_submission.py --intended-commit "$(git rev-parse HEAD)"` после
  чистого финального commit.
- [ ] Открыть финальные URL без авторизации и заполнить submission form до дедлайна.

## Свежий verification gate

```bash
pnpm verify
make release-tools-test
make security-check
make docs-check
make evaluate
make pitch
make fallback-demo
make release-check
make e2e
docker compose config --quiet
docker compose ps
pdfinfo pitch/QADAM_AI_Pitch_Deck.pdf
git diff --check
```

Зафиксированный результат 17 июля 2026:

- 163/163 backend tests;
- 25/25 frontend tests;
- 20/20 release/security tooling tests, включая настоящий короткий ffmpeg render, network retry и
  final-submission validator;
- Ruff, ESLint, strict mypy и TypeScript — без ошибок;
- Next.js production build — успешен;
- `pnpm audit --prod --audit-level moderate` и Python `pip-audit` — no known vulnerabilities;
- 20/20 labelled retrieval queries находят ожидаемый source в top-5;
- clause-family micro-recall 0.9231, high-priority citation coverage 1.0, grounded clause evidence
  1.0; точный in-process p95 за 15 запусков зафиксирован в `docs/evaluation-results.json`;
- synthetic document Q&A: 9 cases, 5/5 evidence, 5/5 expected excerpts, 2/2 actions, 2/2 refusals
  и 1/1 RU→KZ — все пять gates равны 1.0; это regression set, не legal accuracy;
- 4/4 Playwright tests — Axe-аудит, основной путь, Q&A по challenge-договору и mixed RU/KZ journey;
- PostgreSQL, API и web — `healthy`;
- 10/10 release artifacts; fallback — 48.000 секунд, H.264 1920×1080, no audio;
- внутренние Markdown-ссылки проходят `make docs-check`;
- credential-pattern scan и проверка 80 строк Docker logs не нашли ключей, ИИН, номера карты или
  access token.

## Контрольные SHA-256

```text
23e4c34e5c203cf0dc48cd6704c67290714f484601ef541b3429a8b98ebb5545  pitch/QADAM_AI_Pitch_Deck.pdf
c79b7ead485644323b778555719214574dc9040092a79ada9db329b10b21f3e8  demo/contracts/qadam-risky-contract.pdf
260cf13afe3215cc65de844b91679267712023a4b8111c933127a684093b7f81  docs/reference/Social-and-Human-Capital.pdf
2f0762127119b9b1a9bcc3b3a40d13fd99bf5e1c6892563e47c46375ffc1e8e0  release/QADAM_AI_fallback_demo.mp4
2abae8afdd41ce8448fe7700006f3de21583c0f911da961c263c73f9412ef70f  release/fallback-demo-manifest.json
```

После замены командных полей pitch hash обязан измениться; пересчитайте его перед загрузкой.

## Не заявлять в форме или pitch без новых доказательств

- завершённый CustDev, NPS, willingness to pay или пользовательские проценты;
- партнёрство с вузом, legal clinic или молодёжным центром;
- production legal accuracy, OCR, полный казахский evaluation set;
- автоматическую очистку данных или юридическое заключение.

Это сознательные границы текущего MVP, а не скрытые возможности.
