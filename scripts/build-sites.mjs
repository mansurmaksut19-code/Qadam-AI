import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const web = join(root, "apps", "web");
const dist = join(root, "dist");

execFileSync(process.execPath, [join(web, "node_modules", "next", "dist", "bin", "next"), "build"], {
  cwd: web,
  stdio: "inherit",
});

rmSync(dist, { force: true, recursive: true });
mkdirSync(join(dist, "server"), { recursive: true });
mkdirSync(join(dist, ".openai"), { recursive: true });

const html = String.raw`<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>QADAM AI - анализ договора аренды</title>
    <meta
      name="description"
      content="Free экспресс-анализ договора аренды и Premium DOCX протокол разногласий за 490 тенге."
    />
    <style>
      :root {
        --paper: #f7f8f5;
        --panel: #ffffff;
        --muted: #eef2ed;
        --ink: #101716;
        --soft: #4f5d59;
        --teal: #0b6f69;
        --teal-dark: #064f4b;
        --teal-soft: #dbeeea;
        --amber: #99610a;
        --amber-soft: #f8e4b5;
        --danger: #a6332d;
        --danger-soft: #f7dfdc;
        --border: #d8ded8;
        --shadow: 0 18px 42px rgb(16 23 22 / 10%);
        color-scheme: light;
      }

      * { box-sizing: border-box; }
      html { scroll-behavior: smooth; }
      body {
        margin: 0;
        min-width: 320px;
        background:
          linear-gradient(180deg, rgb(219 238 234 / 76%), transparent 25rem),
          radial-gradient(circle at 86% 10%, rgb(153 97 10 / 12%), transparent 28rem),
          var(--paper);
        color: var(--ink);
        font-family: "Segoe UI", Inter, Roboto, Arial, system-ui, sans-serif;
        line-height: 1.55;
      }

      h1, h2, h3, p { margin-top: 0; }
      h1, h2 { font-family: Georgia, "Times New Roman", serif; line-height: 1.08; }
      a { color: var(--teal-dark); text-underline-offset: 0.18em; }

      .shell { width: min(100% - 2rem, 74rem); margin-inline: auto; }
      .topbar, .footer {
        min-height: 4.5rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        color: var(--soft);
        font-size: 0.86rem;
      }
      .brand {
        display: inline-flex;
        align-items: center;
        gap: 0.75rem;
        color: var(--ink);
        font-weight: 800;
        letter-spacing: 0.04em;
        text-decoration: none;
      }
      .mark {
        width: 2rem;
        height: 2rem;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: var(--teal);
        color: #fff;
        font-family: Georgia, serif;
      }

      .hero {
        min-height: 38rem;
        display: grid;
        grid-template-columns: minmax(0, 1.35fr) minmax(18rem, 0.75fr);
        align-items: center;
        gap: clamp(2rem, 6vw, 6rem);
        padding-block: clamp(3rem, 8vw, 7rem);
      }
      .eyebrow {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--teal-dark);
        font-size: 0.78rem;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .hero h1 {
        max-width: 13ch;
        margin-bottom: 1.25rem;
        font-size: clamp(2.7rem, 6.4vw, 5.9rem);
      }
      .lead {
        max-width: 45rem;
        margin-bottom: 1.7rem;
        color: var(--soft);
        font-size: clamp(1.05rem, 1.8vw, 1.25rem);
      }
      .hero-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; }
      .button {
        min-height: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.72rem 1.1rem;
        border: 1px solid transparent;
        border-radius: 0.38rem;
        background: var(--teal);
        color: #fff;
        font: inherit;
        font-weight: 750;
        text-decoration: none;
        cursor: pointer;
        box-shadow: 0 10px 24px rgb(11 111 105 / 18%);
      }
      .button.secondary {
        border-color: var(--border);
        background: var(--panel);
        color: var(--ink);
        box-shadow: none;
      }
      .button:disabled { opacity: 0.62; cursor: not-allowed; }
      .proof { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem; }
      .proof span {
        padding: 0.5rem 0.75rem;
        border: 1px solid var(--border);
        border-radius: 999px;
        background: rgb(255 255 255 / 76%);
        color: var(--soft);
        font-size: 0.84rem;
        font-weight: 700;
      }

      .preview {
        padding: clamp(1.25rem, 3vw, 2rem);
        border: 1px solid var(--border);
        border-radius: 0.65rem;
        background: linear-gradient(180deg, #fff, #f7fbfa);
        box-shadow: var(--shadow);
      }
      .preview-number {
        display: block;
        color: var(--teal-dark);
        font-family: Georgia, serif;
        font-size: clamp(2.4rem, 5vw, 3.8rem);
        font-weight: 700;
        line-height: 1;
      }
      .doc-card {
        display: grid;
        gap: 0.75rem;
        margin-top: 1.75rem;
        padding: 1.25rem;
        border: 1px solid var(--border);
        border-radius: 0.5rem;
        background: #fff;
      }
      .doc-line, .doc-bar, .doc-risk { display: block; border-radius: 999px; }
      .doc-bar { width: 42%; height: 0.55rem; background: var(--teal); }
      .doc-line { width: 74%; height: 0.42rem; background: var(--border); }
      .doc-line.wide { width: 100%; }
      .doc-line.short { width: 54%; }
      .doc-risk {
        height: 2.1rem;
        border: 1px solid rgb(166 51 45 / 28%);
        border-radius: 0.38rem;
        background: linear-gradient(90deg, var(--danger-soft), rgb(255 255 255 / 70%));
      }

      .section { padding-block: clamp(3.5rem, 7vw, 5.5rem); }
      .split {
        display: grid;
        grid-template-columns: minmax(0, 1.1fr) minmax(18rem, 0.9fr);
        gap: clamp(2rem, 6vw, 5rem);
        align-items: start;
      }
      .card {
        padding: clamp(1.25rem, 4vw, 2rem);
        border: 1px solid var(--border);
        border-radius: 0.65rem;
        background: var(--panel);
        box-shadow: var(--shadow);
      }
      .upload {
        display: grid;
        gap: 1rem;
      }
      .file {
        min-height: 10.5rem;
        display: grid;
        place-items: center;
        align-content: center;
        gap: 0.4rem;
        padding: 1.5rem;
        border: 1px dashed var(--teal);
        border-radius: 0.5rem;
        background: var(--teal-soft);
        text-align: center;
        cursor: pointer;
      }
      .file input { position: absolute; inline-size: 1px; block-size: 1px; opacity: 0; }
      .file strong { color: var(--teal-dark); }
      .consent { display: grid; grid-template-columns: 1.25rem 1fr; gap: 0.75rem; color: var(--soft); font-size: 0.9rem; }
      .consent input { width: 1.2rem; height: 1.2rem; accent-color: var(--teal); }
      .message {
        padding: 0.75rem;
        border-radius: 0.38rem;
        background: var(--teal-soft);
      }
      .message.error { background: var(--danger-soft); color: #7c251f; }

      .plans {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
      }
      .plan {
        display: grid;
        gap: 0.75rem;
        padding: 1.5rem;
        border: 1px solid var(--border);
        border-radius: 0.5rem;
        background: var(--panel);
      }
      .plan.premium {
        border-color: rgb(153 97 10 / 40%);
        background: linear-gradient(135deg, rgb(248 228 181 / 88%), rgb(255 255 255 / 92%));
      }
      .price {
        width: fit-content;
        padding: 0.25rem 0.75rem;
        border-radius: 999px;
        background: var(--muted);
        color: var(--teal-dark);
        font-weight: 800;
      }
      .premium .price { background: #fff; color: var(--amber); }
      .plan h3 { margin: 0; }
      .plan p { color: var(--soft); }

      .report {
        display: none;
        padding-block: clamp(3rem, 7vw, 5rem);
      }
      .report.active { display: block; }
      .report-head { max-width: 56rem; margin-bottom: 2rem; }
      .report-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.55fr) minmax(18rem, 0.75fr);
        gap: clamp(1.5rem, 4vw, 3rem);
        align-items: start;
      }
      .finding {
        position: relative;
        overflow: hidden;
        padding: 1.35rem;
        border: 1px solid var(--border);
        border-radius: 0.5rem;
        background: var(--panel);
        box-shadow: 0 10px 26px rgb(16 23 22 / 6%);
      }
      .finding + .finding { margin-top: 1rem; }
      .finding::before { content: ""; position: absolute; inset: 0 auto 0 0; width: 5px; background: var(--teal); }
      .finding.high::before { background: var(--danger); }
      .finding.attention::before { background: var(--amber); }
      .badge { display: inline-flex; align-items: center; gap: 0.4rem; color: var(--teal-dark); font-size: 0.82rem; font-weight: 800; }
      .finding.high .badge { color: #812923; }
      .finding.attention .badge { color: #7a4808; }
      .action {
        margin-top: 1rem;
        padding: 0.9rem;
        border-radius: 0.38rem;
        background: var(--muted);
      }
      .side {
        position: sticky;
        top: 1rem;
        display: grid;
        gap: 1rem;
      }
      .premium-box {
        border-color: rgb(153 97 10 / 38%);
        background: linear-gradient(180deg, var(--amber-soft), #fff);
      }
      .small { color: var(--soft); font-size: 0.84rem; }
      .hidden { display: none !important; }
      .footer { border-top: 1px solid var(--border); }

      @media (max-width: 760px) {
        .topbar span:last-child { display: none; }
        .hero, .split, .report-grid { grid-template-columns: 1fr; }
        .hero { min-height: auto; }
        .plans { grid-template-columns: 1fr; }
        .side { position: static; }
      }
    </style>
  </head>
  <body>
    <header class="shell topbar">
      <a class="brand" href="#top" aria-label="QADAM AI на главную"><span class="mark">Q</span>QADAM AI</a>
      <span>Аренда жилья в Казахстане</span>
    </header>

    <main>
      <section class="shell hero" id="top">
        <div>
          <p class="eyebrow">Один договор. Понятный следующий шаг.</p>
          <h1>Проверьте договор аренды до подписи</h1>
          <p class="lead">
            QADAM подсвечивает спорные условия, объясняет риск простым языком и готовит протокол разногласий
            в формате DOCX.
          </p>
          <div class="hero-actions">
            <a class="button" href="#upload">Проверить договор</a>
            <a class="button secondary" href="#plans">Бизнес-модель</a>
          </div>
          <div class="proof" aria-label="Ключевые условия продукта">
            <span>Free: экспресс-анализ</span>
            <span>Premium: DOCX за 490 ₸</span>
            <span>PDF/DOCX до 10 МБ</span>
          </div>
        </div>
        <aside class="preview" aria-label="Почему это важно">
          <span class="preview-number">364,5 тыс.</span>
          <p>студентов в Казахстане учатся не в своём населённом пункте и часто впервые снимают жильё.</p>
          <div class="doc-card" aria-hidden="true">
            <span class="doc-bar"></span>
            <span class="doc-line wide"></span>
            <span class="doc-risk"></span>
            <span class="doc-line"></span>
            <span class="doc-line short"></span>
          </div>
        </aside>
      </section>

      <section class="shell section split" id="upload">
        <form class="card upload" id="uploadForm">
          <div>
            <p class="eyebrow">Free</p>
            <h2>Экспресс-анализ договора</h2>
            <p class="small">Выберите PDF/DOCX. Демо-анализ работает прямо на странице и не отправляет файл на сервер.</p>
          </div>
          <label class="file">
            <strong>Выберите договор</strong>
            <span id="fileName">Нажмите, чтобы выбрать файл</span>
            <input id="fileInput" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" type="file" />
          </label>
          <label class="consent">
            <input id="consent" type="checkbox" />
            <span>Я согласен на обработку документа для анализа. Персональные данные в демо не сохраняются.</span>
          </label>
          <p class="message error hidden" id="error" role="alert"></p>
          <p class="message hidden" id="status" role="status"></p>
          <button class="button" type="submit">Запустить экспресс-анализ</button>
        </form>

        <div>
          <p class="eyebrow">Приватность и точность</p>
          <h2>Сначала риск, потом документ</h2>
          <p class="lead">
            Пользователь бесплатно видит проблемные пункты и понимает ценность. Платное действие появляется только
            после результата: скачать готовый протокол разногласий.
          </p>
        </div>
      </section>

      <section class="shell section" id="plans">
        <p class="eyebrow">Бизнес-модель</p>
        <h2>Бесплатно найти риски, платно подготовить документ</h2>
        <div class="plans">
          <article class="plan">
            <span class="price">Free</span>
            <h3>Экспресс-анализ договора</h3>
            <p>Загрузка PDF/DOCX, подсветка рисков, цитаты из договора и понятные следующие шаги.</p>
          </article>
          <article class="plan premium">
            <span class="price">490 ₸</span>
            <h3>Официальный протокол разногласий .DOCX</h3>
            <p>Скачивание рабочего DOCX, который можно отправить арендодателю перед подписанием.</p>
          </article>
        </div>
      </section>

      <section class="shell report" id="report" aria-live="polite">
        <div class="report-head">
          <p class="eyebrow">Отчёт готов</p>
          <h2>Что проверить до подписания</h2>
          <p id="summary" class="lead"></p>
        </div>
        <div class="report-grid">
          <div id="findings"></div>
          <aside class="side">
            <div class="card premium-box">
              <p class="eyebrow">Premium · 490 ₸</p>
              <h3>Скачать протокол разногласий</h3>
              <p class="small">DOCX формируется из найденных рисков, вопросов и предложенных правок.</p>
              <button class="button secondary" id="downloadDocx" type="button">Скачать DOCX — 490 ₸</button>
            </div>
            <div class="card">
              <h3>Важно</h3>
              <p class="small">QADAM даёт информационную помощь и не заменяет консультацию юриста.</p>
            </div>
          </aside>
        </div>
      </section>
    </main>

    <footer class="shell footer">
      <span>QADAM AI · Tech Vision 2026</span>
      <span>Проверяйте финальную редакцию договора до подписания.</span>
    </footer>

    <script>
      const fileInput = document.getElementById("fileInput");
      const fileName = document.getElementById("fileName");
      const form = document.getElementById("uploadForm");
      const consent = document.getElementById("consent");
      const error = document.getElementById("error");
      const statusBox = document.getElementById("status");
      const reportSection = document.getElementById("report");
      const findingsBox = document.getElementById("findings");
      const summary = document.getElementById("summary");
      const downloadButton = document.getElementById("downloadDocx");
      let currentReport = null;

      function showError(message) {
        error.textContent = message;
        error.classList.remove("hidden");
      }

      function clearError() {
        error.textContent = "";
        error.classList.add("hidden");
      }

      fileInput.addEventListener("change", () => {
        const file = fileInput.files && fileInput.files[0];
        fileName.textContent = file ? file.name : "Нажмите, чтобы выбрать файл";
        clearError();
      });

      function buildFindings(file) {
        const label = file.name.replace(/\.(pdf|docx)$/i, "");
        return {
          id: "demo-" + Date.now(),
          fileName: file.name,
          summary: "Найдено 3 пункта: депозит, изменение цены и доступ арендодателя. Проверьте их письменно до подписания.",
          findings: [
            {
              severity: "high",
              label: "Высокий приоритет",
              title: "Условия возврата депозита сформулированы рискованно",
              explanation: "В договоре может не хватать срока возврата, перечня удержаний и подтверждающих документов.",
              action: "Добавьте срок возврата депозита, акт осмотра и обязанность подтверждать каждое удержание письменно.",
              question: "Когда и на каких основаниях возвращается депозит?",
              clause: "Файл: " + label + ". Проверьте раздел о депозите и обеспечительном платеже."
            },
            {
              severity: "attention",
              label: "Требует внимания",
              title: "Цена аренды может изменяться без понятного уведомления",
              explanation: "Если срок предупреждения не указан, арендатору сложнее планировать платежи.",
              action: "Зафиксируйте письменное уведомление минимум за 30 дней и запрет задним числом менять цену.",
              question: "За сколько дней вы предупреждаете об изменении арендной платы?",
              clause: "Проверьте раздел об оплате и изменении стоимости."
            },
            {
              severity: "info",
              label: "Информация",
              title: "Доступ арендодателя лучше ограничить процедурой",
              explanation: "Даже добросовестный доступ должен быть заранее согласован, кроме аварийных случаев.",
              action: "Добавьте уведомление за 24 часа, согласование времени и исключение для аварий.",
              question: "Как заранее согласуется визит арендодателя?",
              clause: "Проверьте раздел о доступе в помещение."
            }
          ]
        };
      }

      function renderReport(report) {
        currentReport = report;
        summary.textContent = report.summary;
        findingsBox.innerHTML = report.findings.map((finding) =>
          '<article class="finding ' + finding.severity + '">' +
          '<span class="badge">' + finding.label + '</span>' +
          '<h3>' + escapeHtml(finding.title) + '</h3>' +
          '<p>' + escapeHtml(finding.explanation) + '</p>' +
          '<p class="small"><strong>Фрагмент:</strong> ' + escapeHtml(finding.clause) + '</p>' +
          '<div class="action"><strong>Что сделать</strong><p>' + escapeHtml(finding.action) + '</p></div>' +
          '<p class="small"><strong>Вопрос:</strong> ' + escapeHtml(finding.question) + '</p>' +
          '</article>'
        ).join("");
        reportSection.classList.add("active");
        reportSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const file = fileInput.files && fileInput.files[0];
        clearError();
        if (!file) return showError("Сначала выберите договор в PDF или DOCX.");
        if (!/\.(pdf|docx)$/i.test(file.name)) return showError("Поддерживаются только PDF и DOCX.");
        if (file.size > 10 * 1024 * 1024) return showError("Файл больше 10 МБ. Выберите более лёгкую копию.");
        if (!consent.checked) return showError("Подтвердите согласие на обработку документа.");
        statusBox.textContent = "Извлекаем условия, ищем риски и готовим отчёт...";
        statusBox.classList.remove("hidden");
        setTimeout(() => {
          statusBox.classList.add("hidden");
          renderReport(buildFindings(file));
        }, 850);
      });

      function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
      }

      function crc32(bytes) {
        const table = crc32.table || (crc32.table = Array.from({ length: 256 }, (_, index) => {
          let value = index;
          for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
          return value >>> 0;
        }));
        let crc = 0xffffffff;
        for (const byte of bytes) crc = table[(crc ^ byte) & 255] ^ (crc >>> 8);
        return (crc ^ 0xffffffff) >>> 0;
      }

      function push16(target, value) { target.push(value & 255, (value >>> 8) & 255); }
      function push32(target, value) { target.push(value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255); }
      function pushBytes(target, bytes) { for (const byte of bytes) target.push(byte); }

      function zip(entries) {
        const encoder = new TextEncoder();
        const output = [];
        const central = [];
        entries.forEach((entry) => {
          const name = encoder.encode(entry.name);
          const content = encoder.encode(entry.content);
          const checksum = crc32(content);
          const offset = output.length;
          push32(output, 0x04034b50); push16(output, 20); push16(output, 0x0800); push16(output, 0); push16(output, 0); push16(output, 0);
          push32(output, checksum); push32(output, content.length); push32(output, content.length); push16(output, name.length); push16(output, 0);
          pushBytes(output, name); pushBytes(output, content);
          push32(central, 0x02014b50); push16(central, 20); push16(central, 20); push16(central, 0x0800); push16(central, 0); push16(central, 0); push16(central, 0);
          push32(central, checksum); push32(central, content.length); push32(central, content.length); push16(central, name.length); push16(central, 0); push16(central, 0); push16(central, 0); push16(central, 0); push32(central, 0); push32(central, offset); pushBytes(central, name);
        });
        const centralOffset = output.length;
        pushBytes(output, central);
        push32(output, 0x06054b50); push16(output, 0); push16(output, 0); push16(output, entries.length); push16(output, entries.length); push32(output, central.length); push32(output, centralOffset); push16(output, 0);
        return new Blob([new Uint8Array(output)], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      }

      function docxXml(report) {
        const paragraphs = [];
        function p(text, style) { paragraphs.push('<w:p><w:pPr><w:pStyle w:val="' + style + '"/></w:pPr><w:r><w:t>' + escapeHtml(text) + '</w:t></w:r></w:p>'); }
        p("Протокол разногласий к договору найма жилого помещения", "Heading1");
        p("Подготовлено QADAM AI. Документ является рабочей заготовкой и не заменяет консультацию юриста.", "BodyText");
        p("Краткая сводка", "Heading2");
        p(report.summary, "BodyText");
        p("Предлагаемые изменения", "Heading2");
        report.findings.forEach((finding, index) => {
          p((index + 1) + ". " + finding.title, "Heading2");
          p("Риск: " + finding.explanation, "BodyText");
          p("Предлагаемая правка: " + finding.action, "BodyText");
          p("Вопрос арендодателю: " + finding.question, "BodyText");
          p("Фрагмент: " + finding.clause, "BodyText");
        });
        p("Подписание", "Heading2");
        p("Наниматель: ____________________", "BodyText");
        p("Наймодатель: ____________________", "BodyText");
        p("Дата: ____________________", "BodyText");
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + paragraphs.join("") + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>';
      }

      function downloadDocx() {
        if (!currentReport) return showError("Сначала запустите экспресс-анализ.");
        const styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:styleId="BodyText"><w:name w:val="Body Text"/><w:pPr><w:spacing w:after="160"/></w:pPr><w:rPr><w:sz w:val="22"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:spacing w:before="220" w:after="140"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style></w:styles>';
        const blob = zip([
          { name: "[Content_Types].xml", content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>' },
          { name: "_rels/.rels", content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
          { name: "word/_rels/document.xml.rels", content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
          { name: "word/styles.xml", content: styles },
          { name: "word/document.xml", content: docxXml(currentReport) }
        ]);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "qadam-protocol.docx";
        document.body.append(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }

      downloadButton.addEventListener("click", downloadDocx);
    </script>
  </body>
</html>`;

const worker = `const html = ${JSON.stringify(html)};

export default {
  async fetch() {
    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=60"
      }
    });
  }
};
`;

writeFileSync(join(dist, "server", "index.js"), worker);
cpSync(join(root, ".openai", "hosting.json"), join(dist, ".openai", "hosting.json"));
