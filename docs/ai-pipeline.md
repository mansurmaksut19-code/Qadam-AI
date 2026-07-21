# AI/RAG pipeline QADAM AI

QADAM использует AI не как свободный чат, а как ограниченную доказательствами цепочку. Правила и
retrieval определяют допустимые факты; explanation provider может только упаковать уже найденные
данные в schema-validated `Finding`.

## 1. Вход и извлечение текста

1. `validate_upload` проверяет размер ≤10 МБ, расширение и настоящую PDF/DOCX signature.
2. PDF открывается PyMuPDF; password-protected file отклоняется.
3. DOCX читается `python-docx` по абзацам/таблицам.
4. Если распознаваемого текста меньше 80 alphanumeric symbols, pipeline останавливается с
   `ocr_required`. Это лучше выдуманного анализа пустого скана.

Каждый блок сохраняет индекс и, где возможно, страницу/номер абзаца. Поэтому finding содержит не
только пересказ, но и source span.

## 2. Privacy и bilingual normalization

До explanation provider применяются стабильные placeholders:

- ИИН → `[ИИН_1]`;
- телефон → `[ТЕЛЕФОН_1]`;
- email → `[EMAIL_1]`;
- банковская карта → `[КАРТА_1]`.

Русские и казахские варианты терминов нормализуются в canonical search terms; язык отчёта —
`ru`, `kz` или `mixed`. В тесте raw ИИН отсутствует во всех provider contexts.

## 3. Clause taxonomy и risk rules

Extractor выделяет property, term, rent, deposit, utilities, handover, repairs, termination,
eviction, occupancy, landlord access, penalties, rent change и other. Regex/rule extraction выбран
для auditability и устойчивого offline demo; модельный extractor можно добавить за тем же domain
contract.

Risk engine выдаёт `RuleMatch`, а не готовый юридический текст. Match включает trigger clause,
severity, query family, confidence, action и вопрос арендодателю. Отдельное правило проверяет
пропущенные существенные для пользователя условия.

## 4. Hybrid retrieval

Для запроса `q` и legal chunk `d`:

```text
hybrid(q,d) = 0.45 · lexical_overlap
            + 0.35 · cosine(hash_embedding(q), hash_embedding(d))
            + 0.20 · clause_family_match
```

После top-10 применяется второй этап:

```text
rerank = min(1,
             0.70 · hybrid
           + 0.30 · explicit_article_match
           + 0.15 · clause_family_match)
```

Все компоненты score и `rerank_reasons` остаются inspectable. Deterministic hash embeddings —
сознательная offline baseline, не заявление о SOTA semantic quality. На 20 вручную размеченных
RU-запросах current suite даёт 20/20 hit@5; gate падает ниже 0.90.

## 5. Правовой корпус

Manifest `2026.07.17` фиксирует три файла и snapshot date. Каждый из 15 chunks содержит act ID,
название, authority, article reference, language, effective/snapshot/retrieved dates, status,
canonical HTTPS URL и SHA-256 текста. Используются официальные страницы:

- [ГК РК, Особенная часть](https://adilet.zan.kz/rus/docs/K990000409_);
- [Закон «О жилищных отношениях»](https://adilet.zan.kz/rus/docs/Z970000094_);
- [Закон «О персональных данных и их защите»](https://adilet.zan.kz/rus/docs/Z1300000094).

Corpus маленький и curated. Отсутствие подходящего chunk не заменяется догадкой: high severity
понижается до attention или finding не заявляет правовой вывод.

## 6. Structured explanation и grounding

Default `DeterministicExplanationProvider` строит ответ только из `RuleMatch`, masked clause и
retrieved chunks. Optional `OpenAICompatibleExplanationProvider` отправляет те же masked поля и
требует JSON object, совместимый с Pydantic schema. `ResilientExplanationProvider` использует
fallback при timeout, invalid schema или citation вне allow-list.

После provider отдельный `validate_grounded_finding` отвергает:

- source ID, которого не было в retrieved set;
- citation из другой clause family;
- document-specific claim без clause span;
- high severity без official citation;
- категоричное «незаконно/противоречит закону» без явной нормы.

Это разделяет генерацию текста и принятие safety-решения: provider не может расширить набор
доказательств.

## 7. Контекстные вопросы и Q&A по доказательствам договора

После завершения анализа `question_suggestions` строятся только из извлечённых clause families и
findings: сначала действия для самых приоритетных рисков, затем фактические вопросы о реально
найденных условиях. Несуществующее в договоре изменение цены не попадает в подсказки.

После masking исходные блоки дополнительно режутся на стабильные evidence-блоки с checksum и
source location. Они сохраняются отдельно от публичного report JSON: polling отчёта не раскрывает
полный текст, а question endpoint получает их только после проверки приватного токена.

`DocumentQuestionAnswerer` разделяет три режима. В `document` `DocumentEvidenceRetriever` ранжирует
блоки по совпадению нормализованных RU/KZ concept groups, чисел, лёгких словоформ и символьных
триграмм. Короткий заголовок может подтянуть соседнее условие, но блок ниже порога не становится
доказательством. Optional OpenAI-compatible provider получает только эти маскированные фрагменты и
обязан вернуть разрешённые block IDs. Невалидный ID, неподтверждённое число, timeout или ошибка
schema включают детерминированный ответ из самого фрагмента.

В `action` route выбирает только findings из completed report, возвращает их точные IDs, action и
связанный clause evidence; API присоединяет только уже существующие citations этих findings. В
`unsupported` route не нашёл подходящего contract evidence или finding: он возвращает пустые
evidence/citations, а не догадку.

Document evidence и legal citations — разные контуры. Первый отвечает, что написано в договоре;
второй появляется только когда найденная clause family действительно связана с finding и нормой
из правового корпуса.

## 8. Evaluation и failure modes

| Проверка | Gate |
|---|---|
| Retrieval | 20 labelled queries; hit@5 ≥0.90 |
| Rules | risky clauses + balanced negative case |
| Grounding | fabricated/irrelevant/missing evidence rejection |
| Privacy | raw IIN absent from provider contexts |
| Provider | schema, allow-list, timeout fallback |
| Document Q&A | 9 transparent synthetic cases; evidence, expected excerpt, action finding, refusal and RU→KZ gates = 1.0 |
| E2E | 4 browser journeys: Axe, report/negotiation, challenge facts and mixed RU/KZ fact + action |

Не покрыто как готовая production capability: OCR, broad Kazakh evaluation set, learned
cross-encoder, automated legal updates и lawyer-reviewed precision/recall on real contracts. Q&A
figures above are synthetic regression accuracy, not a claim of legal correctness. Эти пункты
должны быть следующими экспериментами, а не скрытыми обещаниями.
