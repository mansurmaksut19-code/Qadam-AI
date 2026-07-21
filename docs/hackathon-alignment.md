# Соответствие официальному брифу Tech Vision 2026

Источник: `docs/reference/Social-and-Human-Capital.pdf`, 12 страниц, опубликован 17 июля 2026.

## Выбранная зона и фокус

Официальная зона №10 «Гражданская грамотность» прямо называет ситуацию молодого человека,
который впервые снимает квартиру и не понимает, что законно требовать от хозяина. QADAM сужает её
до одного пользователя и одного момента:

> Иногородний студент 18–22 лет перед первой подписью под договором аренды не понимает условия и
> не знает, какой пункт уточнить письменно.

Это не маркетплейс жилья, универсальный legal chatbot или генератор любого документа. Основной
job-to-be-done — за 3–5 минут превратить уже полученный договор в проверяемый список рисков и
следующих действий.

## Deliverables online-stage

| Требование официального PDF | Артефакт QADAM | Состояние |
|---|---|---|
| Работающий интерактивный MVP, не Figma | Next.js + FastAPI + PostgreSQL; `make up` | Проверено Docker healthchecks и Playwright |
| Pitch deck PDF до 12 слайдов | `pitch/QADAM_AI_Pitch_Deck.pdf`, 11 слайдов | Генерируемый артефакт |
| Публичный repository + README | [animcin84-dev/qadam-ai-techvision-2026](https://github.com/animcin84-dev/qadam-ai-techvision-2026) и корневой `README.md` | `PUBLIC`, default branch `main`, repository и raw README возвращают HTTP 200 |
| Demo до 3 минут или live URL | `docs/demo-script.md`, recording checklist, live Docker path | Видео/URL — `TEAM INPUT REQUIRED` |
| Дедлайн 21 июля 2026, 23:59 | Submission checklist | Ответственность команды |

## Матрица 30 баллов online-stage

| Критерий | Что требует бриф | Проверяемое доказательство в репозитории |
|---|---|---|
| Research depth, relevance, novelty — 10 | CustDev, конкретная боль, оправданное применение технологии | Официальная статистика, narrowly scoped persona/JTBD, evidence matrix, non-leading interview guide, explicit unverified slots, competitor gap в pitch |
| Engineering and architecture — 10 | Чистота, модульность, schema; для AI — custom chains, не пустая API wrapper | Parser → masking → taxonomy → rules → hybrid retrieval → rerank → structured provider → grounding; repository protocol; PostgreSQL schema; OpenAPI; strict types |
| Technical validation and iteration — 10 | Полнота MVP и история коммитов | TDD-коммиты с 163 backend + 25 frontend tests, 20 legal-retrieval queries, 9 transparent synthetic Q&A cases с 5 gates = 1.0, deterministic demo files и четыре Docker Playwright E2E: Axe, полный journey, challenge и mixed RU/KZ action |

## Честные незакрытые командные поля

- `TEAM INPUT REQUIRED`: минимум 2–3 реальных разговора, которые официальный бриф называет более
  ценными, чем догадки. Репозиторий не подменяет их синтетическими ответами.
- `TEAM INPUT REQUIRED`: имена/роли команды и публичная demo/live ссылка.
- `TEAM INPUT REQUIRED`: финальная запись demo или deployed URL.

Эти поля нельзя заполнять вымышленными цитатами, процентами готовности пользоваться сервисом или
несуществующими партнёрствами.
