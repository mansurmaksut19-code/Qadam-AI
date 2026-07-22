# QADAM AI — submission runbook

Операционный порядок финальной подачи Tech Vision 2026 online stage. Дедлайн из официального брифа:
**21 июля 2026, 23:59 Asia/Almaty**. Цель команды — закончить загрузку минимум за два часа до
дедлайна и оставить последний час только на проверку доступа, не на разработку функций.

## Роли

Назначьте реальных людей перед началом финального прогона:

- **submit owner** — заполняет форму и сохраняет подтверждение;
- **demo owner** — записывает/загружает видео и проверяет ссылку в приватном окне;
- **release checker** — запускает команды, сверяет hashes и public repository;
- **content checker** — проверяет имена, роли, CustDev и формулировки без преувеличений.

Один человек может совмещать роли, но submit owner не должен единолично проверять собственную
форму.

## Gate 0. Заморозить scope

После начала финального прогона не добавляйте OCR, новый provider, live hosting или новый corpus.
Разрешены только исправления, которые воспроизводят конкретный failing test или неверное поле
подачи. Рабочая точка возврата — последний commit, прошедший полный gate.

```bash
git status --short --branch
git log -1 --oneline
```

Ожидается clean worktree и public commit, который команда собирается отправлять.

## Gate 1. Заполнить только реальные командные поля

- внести имена и роли участников на слайд 11;
- провести минимум требуемых брифом реальных разговоров и добавить обезличенные факты в
  `docs/research/evidence-matrix.csv`;
- заменить research block на слайде 3 только выводами из этих разговоров;
- внести публичный/unlisted demo URL после проверки доступа;
- удалить визуальные метки `TEAM INPUT REQUIRED` из финального pitch, но не скрывать реальные
  ограничения MVP.

Заполните те же факты в `release/final-submission.json`. Поле `intended_commit` оставьте пустым в
tracked manifest: SHA нельзя честно поместить в commit, который он сам должен идентифицировать.
После финального чистого commit передайте SHA одноразово через CLI в Gate 7.

Если данных нет, не придумывайте их. Лучше прямо назвать незавершённый эксперимент, чем получить
дисквалифицирующее несоответствие доказательствам.

## Gate 2. Записать основной demo

1. Выполнить `make up` и дождаться healthy services.
2. Выполнить `make e2e`.
3. Записать синтетический `demo/contracts/qadam-risky-contract.pdf` по
   [demo script](demo-script.md).
4. Проверить длительность `≤03:00`, читаемость 1080p, звук и отсутствие приватных данных.
5. Загрузить video как public/unlisted и открыть URL в приватном окне без авторизации.

### Fallback

Если запись сорвана, локальный `release/QADAM_AI_fallback_demo.mp4` даёт 48-секундный silent
technical walkthrough. Он уже содержит problem, evidence report и landlord action, но для сильной
подачи команда должна добавить короткое живое вступление/озвучку и загрузить файл на свой video
account. Не называйте fallback пользовательским тестом или CustDev.

Проверка fallback:

```bash
make fallback-demo
ffprobe -v error \
  -show_entries format=duration:stream=codec_type,codec_name,width,height \
  -of json release/QADAM_AI_fallback_demo.mp4
```

Ожидается 48.000 секунд, H.264 1920×1080, один video stream и без audio stream.

## Gate 3. Перегенерировать обязательные артефакты

```bash
make demo-documents
make evaluate
make pitch
make fallback-demo
```

После изменения screenshots перегенерируйте fallback и обновите ожидаемые SHA-256 для MP4 и его
evidence manifest в `release/release-manifest.json`. После изменения pitch повторно проверьте число
страниц и пересчитайте контрольный hash в submission checklist. Не изменяйте hashes без повторной
визуальной проверки соответствующего файла.

## Gate 4. Полный технический прогон

```bash
pnpm verify
make release-tools-test
make security-check
make docs-check
make evaluate
make release-check
make e2e
docker compose config --quiet
docker compose ps
pdfinfo pitch/QADAM_AI_Pitch_Deck.pdf
git diff --check
```

Критерии выхода:

- lint, types, tests и production build без ошибок;
- pitch не больше 12 страниц;
- release validator принимает все артефакты и hashes;
- основной Playwright journey и Axe-аудит проходят;
- Docker services healthy;
- tracked secret scan пуст;
- worktree clean после commit проверенных generated artifacts.

## Gate 5. Проверить public repository как участник жюри

```bash
python scripts/check_release.py --online
```

Затем в приватном окне без GitHub login откройте:

1. repository root и README;
2. pitch PDF;
3. demo URL;
4. ссылку на официальный источник из отчёта.

Для независимой проверки клона:

```bash
review_dir=$(mktemp -d)
git clone --depth 1 https://github.com/mansurmaksut19-code/Qadam-AI.git "$review_dir/qadam"
cd "$review_dir/qadam"
python scripts/check_release.py
```

Временный clone можно удалить после проверки; основной workspace не трогать.

## Gate 6. Заполнить форму без новых claims

Безопасный порядок copy/paste:

1. **Название:** QADAM AI.
2. **Направление:** Social & Human Capital.
3. **Проблемная зона:** Гражданская грамотность.
4. **Проблема:** иногородний студент перед первой подписью не понимает рискованные условия аренды
   и не знает, что уточнить письменно.
5. **Решение:** пункт договора → официальная норма → конкретный следующий шаг.
6. **Repository URL:** `https://github.com/mansurmaksut19-code/Qadam-AI`.
7. **Pitch:** финальный PDF после проверки страниц.
8. **Demo/live URL:** только ссылка, открытая без авторизации.

Не добавляйте в форму partnership, traction, NPS, legal accuracy, OCR или automatic retention без
нового проверяемого доказательства.

## Gate 7. Необратимый final-submission gate

После заполнения реальных полей, rerender pitch и финального чистого commit выполните:

```bash
python scripts/check_final_submission.py --intended-commit "$(git rev-parse HEAD)"
```

Команда должна завершиться без блокеров. Если она называет CustDev, team, URL или marker, вернитесь
к Gate 1: это реальные недостающие доказательства, а не техническая ошибка, которую можно скрыть.

## Gate 8. Двойная проверка и отправка

- content checker сравнивает форму с README, pitch и evidence matrix;
- release checker повторно открывает все URLs;
- submit owner делает screenshot заполненной формы до отправки;
- submit owner отправляет форму до внутреннего дедлайна;
- команда сохраняет confirmation page/email и timestamp Asia/Almaty;
- после отправки не меняйте public artifacts без необходимости; если изменили — повторите Gate 4–7.

## Матрица отказов

| Сбой | Действие | Что не делать |
|---|---|---|
| External provider недоступен | Использовать deterministic fallback | Не менять provider перед записью |
| Нет внешней сети во время demo | Показать локальный отчёт; URL проверить после | Не заявлять, что official site встроен offline |
| Live app недоступен | Отправить video + public repository | Не публиковать непроверенный emergency hosting |
| Основная запись повреждена | Использовать проверенный 48-секундный MP4 и озвучку | Не отправлять файл, который не просмотрен целиком |
| CustDev не завершён | Оставить честную гипотезу | Не генерировать цитаты или проценты |
| Pitch превысил 12 страниц | Сократить существующий slide content | Не объединять страницы только визуально |
