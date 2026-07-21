import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const web = join(root, "apps", "web");
const dist = join(root, "dist");
const logoDataUrl = `data:image/png;base64,${readFileSync(join(web, "public", "qadam-logo.png")).toString("base64")}`;

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
        --paper: #f5f7fb;
        --panel: #ffffff;
        --muted: #eef1f5;
        --ink: #0b1220;
        --soft: #465263;
        --teal: #0b1d49;
        --teal-dark: #071534;
        --teal-soft: #e7ecf6;
        --amber: #b88a2a;
        --amber-soft: #f6ead0;
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
        background: linear-gradient(180deg, rgb(231 236 246 / 86%), transparent 25rem), radial-gradient(circle at 86% 10%, rgb(184 138 42 / 12%), transparent 28rem), var(--paper);
        color: var(--ink);
        font-family: "Segoe UI", Inter, Roboto, Arial, system-ui, sans-serif;
        line-height: 1.55;
      }

      h1, h2, h3, p { margin-top: 0; }
      h1, h2 { font-family: Georgia, "Times New Roman", serif; line-height: 1.08; }
      a { color: var(--teal-dark); text-underline-offset: 0.18em; }

      .shell { width: min(100% - 2rem, 74rem); margin-inline: auto; }
      .topbar, .footer {
        min-height: 5.25rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        color: var(--soft);
        font-size: 0.86rem;
      }
      .topbar-actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      .account-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.45rem 0.7rem;
        border: 1px solid var(--border);
        border-radius: 999px;
        background: rgb(255 255 255 / 78%);
        color: var(--teal-dark);
        font-weight: 750;
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
      .brand-logo {
        width: 3rem;
        height: 3rem;
        object-fit: contain;
        border: 1px solid rgb(11 29 73 / 12%);
        border-radius: 0.5rem;
        background: #fff;
      }
      .brand-copy {
        display: grid;
        gap: 0.05rem;
        line-height: 1;
      }
      .brand-copy small {
        color: var(--amber);
        font-size: 0.66rem;
        font-weight: 850;
        letter-spacing: 0.12em;
        text-transform: uppercase;
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
        box-shadow: 0 12px 26px rgb(11 29 73 / 18%);
      }
      .button.secondary {
        border-color: var(--border);
        background: var(--panel);
        color: var(--ink);
        box-shadow: none;
      }
      .button.quiet {
        border-color: transparent;
        background: transparent;
        color: var(--teal-dark);
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
      .preview-logo {
        width: 5.4rem;
        height: 5.4rem;
        object-fit: contain;
        margin-bottom: 1.5rem;
        border-radius: 0.5rem;
        background: #fff;
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
        grid-template-columns: repeat(3, minmax(0, 1fr));
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
      .funnel {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.75rem;
        margin-top: 1rem;
      }
      .funnel div {
        padding: 1rem;
        border: 1px solid var(--border);
        border-radius: 0.5rem;
        background: var(--panel);
      }
      .funnel strong { display: block; color: var(--teal-dark); font-size: 1.15rem; }

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
      .history {
        display: grid;
        gap: 0.65rem;
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .history li {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0.55rem;
        color: var(--soft);
        font-size: 0.88rem;
      }
      .history li::before {
        content: "";
        width: 0.55rem;
        height: 0.55rem;
        margin-top: 0.45rem;
        border-radius: 50%;
        background: var(--teal);
      }
      .auth-dialog {
        position: fixed;
        z-index: 20;
        inset: 0;
        display: none;
        place-items: center;
        padding: 1rem;
        background: rgb(16 23 22 / 58%);
      }
      .auth-dialog.active { display: grid; }
      .auth-card {
        width: min(100%, 32rem);
        padding: 1.5rem;
        border: 1px solid var(--border);
        border-radius: 0.65rem;
        background: var(--panel);
        box-shadow: 0 30px 90px rgb(0 0 0 / 25%);
      }
      .auth-card form { display: grid; gap: 0.85rem; }
      .auth-card input {
        width: 100%;
        min-height: 44px;
        padding: 0.75rem;
        border: 1px solid var(--border);
        border-radius: 0.38rem;
        font: inherit;
      }
      .auth-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.65rem;
        align-items: center;
        justify-content: space-between;
      }
      .security-note {
        display: grid;
        gap: 0.4rem;
        margin-block: 0.75rem;
        padding: 0.9rem;
        border: 1px solid rgb(11 111 105 / 24%);
        border-radius: 0.5rem;
        background: var(--teal-soft);
        color: var(--teal-dark);
        font-size: 0.86rem;
      }
      .small { color: var(--soft); font-size: 0.84rem; }
      .hidden { display: none !important; }
      .footer { border-top: 1px solid var(--border); }

      @media (max-width: 760px) {
        .brand-copy small { display: none; }
        .topbar-actions { gap: 0.4rem; }
        .hero, .split, .report-grid { grid-template-columns: 1fr; }
        .hero { min-height: auto; }
        .plans, .funnel { grid-template-columns: 1fr; }
        .side { position: static; }
      }
    </style>
  </head>
  <body>
    <header class="shell topbar">
      <a class="brand" href="#top" aria-label="QADAM AI на главную">
        <img alt="" class="brand-logo" src="${logoDataUrl}" />
        <span class="brand-copy"><strong>QADAM AI</strong><small>Legal AI Platform</small></span>
      </a>
      <div class="topbar-actions">
        <span id="accountPill" class="account-pill hidden"></span>
        <button class="button quiet" id="authButton" type="button">Личный кабинет</button>
      </div>
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
            <a class="button secondary" href="#plans">Коммерческая модель</a>
          </div>
          <div class="proof" aria-label="Ключевые условия продукта">
            <span>Аккаунт и история проверок</span>
            <span>Free: экспресс-анализ</span>
            <span>Premium: DOCX за 490 ₸</span>
          </div>
        </div>
        <aside class="preview" aria-label="Почему это важно">
          <img alt="QADAM AI Legal AI Platform" class="preview-logo" src="${logoDataUrl}" />
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
        <p class="eyebrow">Коммерческая модель</p>
        <h2>Официальная модель монетизации QADAM</h2>
        <div class="plans">
          <article class="plan">
            <span class="price">Acquisition</span>
            <h3>Free: экспресс-анализ</h3>
            <p>Бесплатный вход в продукт: регистрация, загрузка договора, подсветка рисков и сохранение истории.</p>
          </article>
          <article class="plan premium">
            <span class="price">490 ₸</span>
            <h3>Transaction: DOCX-протокол</h3>
            <p>Разовая оплата за готовый протокол разногласий .DOCX после того, как пользователь увидел риск.</p>
          </article>
          <article class="plan">
            <span class="price">B2B</span>
            <h3>Campus license</h3>
            <p>Лицензии для вузов, общежитий и legal clinics: пакет проверок, отчётность и поддержка студентов.</p>
          </article>
        </div>
        <div class="funnel" aria-label="Коммерческие метрики">
          <div><strong>Target</strong><span class="small">студенты 18-22 и первые арендаторы</span></div>
          <div><strong>CAC</strong><span class="small">органический трафик, Telegram, партнёрства с вузами</span></div>
          <div><strong>Revenue</strong><span class="small">490 ₸ за документ + B2B-пакеты</span></div>
          <div><strong>Retention</strong><span class="small">личный кабинет, история и повторные проверки</span></div>
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
              <h3>История действий</h3>
              <ul class="history" id="historyList"></ul>
            </div>
          </aside>
        </div>
      </section>
    </main>

    <div class="auth-dialog" id="authDialog" role="dialog" aria-modal="true" aria-labelledby="authTitle">
      <div class="auth-card">
        <div class="auth-row">
          <div>
            <p class="eyebrow">Личный кабинет QADAM</p>
            <h2 id="authTitle">Безопасный вход по email-коду</h2>
          </div>
          <button class="button quiet" id="closeAuth" type="button" aria-label="Закрыть вход">Закрыть</button>
        </div>
        <div class="security-note">
          <strong>Demo access policy</strong>
          <span>Фиксированный код нужен только для судейского просмотра. Production-версия использует email/SMS OTP, rate limiting и audit log.</span>
        </div>
        <form id="authForm">
          <label>
            Email
            <input id="emailInput" autocomplete="email" inputmode="email" placeholder="student@example.com" required type="email" />
          </label>
          <label id="codeField" class="hidden">
            Код подтверждения
            <input id="codeInput" autocomplete="one-time-code" inputmode="numeric" placeholder="6 цифр" type="text" />
          </label>
          <p class="message hidden" id="authStatus" role="status"></p>
          <button class="button" id="authSubmit" type="submit">Отправить код</button>
        </form>
      </div>
    </div>

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
      const authButton = document.getElementById("authButton");
      const accountPill = document.getElementById("accountPill");
      const authDialog = document.getElementById("authDialog");
      const closeAuth = document.getElementById("closeAuth");
      const authForm = document.getElementById("authForm");
      const emailInput = document.getElementById("emailInput");
      const codeInput = document.getElementById("codeInput");
      const codeField = document.getElementById("codeField");
      const authStatus = document.getElementById("authStatus");
      const authSubmit = document.getElementById("authSubmit");
      const historyList = document.getElementById("historyList");
      let currentReport = null;
      let pendingCode = null;
      const demoAccessCode = "490490";

      function readSession() {
        try { return JSON.parse(localStorage.getItem("qadam:session") || "null"); } catch { return null; }
      }

      function writeSession(session) {
        localStorage.setItem("qadam:session", JSON.stringify(session));
        renderSession();
      }

      function readEvents() {
        try { return JSON.parse(localStorage.getItem("qadam:events") || "[]"); } catch { return []; }
      }

      function addEvent(label) {
        const events = readEvents();
        events.unshift({ label, time: new Date().toLocaleString("ru-RU", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) });
        localStorage.setItem("qadam:events", JSON.stringify(events.slice(0, 8)));
        renderHistory();
      }

      function renderHistory() {
        const events = readEvents();
        historyList.innerHTML = events.length
          ? events.map((event) => "<li><span>" + escapeHtml(event.time + " · " + event.label) + "</span></li>").join("")
          : '<li><span>История появится после входа и первой проверки.</span></li>';
      }

      function renderSession() {
        const session = readSession();
        if (session) {
          accountPill.textContent = session.email;
          accountPill.classList.remove("hidden");
          authButton.textContent = "Завершить сессию";
        } else {
          accountPill.textContent = "";
          accountPill.classList.add("hidden");
          authButton.textContent = "Личный кабинет";
        }
      }

      function openAuth() {
        authDialog.classList.add("active");
        emailInput.focus();
      }

      function closeAuthDialog() {
        authDialog.classList.remove("active");
      }

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

      authButton.addEventListener("click", () => {
        if (readSession()) {
          addEvent("Выход из аккаунта");
          localStorage.removeItem("qadam:session");
          renderSession();
          return;
        }
        openAuth();
      });

      closeAuth.addEventListener("click", closeAuthDialog);
      authDialog.addEventListener("click", (event) => {
        if (event.target === authDialog) closeAuthDialog();
      });

      authForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const email = emailInput.value.trim().toLowerCase();
        if (!pendingCode) {
          pendingCode = demoAccessCode;
          codeField.classList.remove("hidden");
          authStatus.textContent = "Код доступа для судей: " + pendingCode + ". В production он отправляется по email/SMS.";
          authStatus.classList.remove("hidden");
          authSubmit.textContent = "Подтвердить вход";
          codeInput.focus();
          return;
        }
        if (codeInput.value.trim() !== pendingCode) {
          authStatus.textContent = "Неверный код. Для судейского демо используйте " + pendingCode + ".";
          authStatus.classList.remove("hidden");
          return;
        }
        writeSession({ email, signedInAt: Date.now(), plan: "Free" });
        addEvent("Вход в аккаунт");
        pendingCode = null;
        authForm.reset();
        codeField.classList.add("hidden");
        authSubmit.textContent = "Отправить код";
        closeAuthDialog();
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
        addEvent("Экспресс-анализ: " + report.fileName);
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
        if (!readSession()) {
          showError("Войдите в личный кабинет, чтобы сохранить историю проверки и сформировать DOCX.");
          openAuth();
          return;
        }
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
        addEvent("Скачан DOCX-протокол за 490 ₸");
      }

      downloadButton.addEventListener("click", downloadDocx);
      renderSession();
      renderHistory();
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
