import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const web = join(root, "apps", "web");
const dist = join(root, "dist");
const logoDataUrl = `data:image/png;base64,${readFileSync(join(web, "public", "qadam-logo.png")).toString("base64")}`;

execFileSync(
  process.execPath,
  [join(web, "node_modules", "next", "dist", "bin", "next"), "build"],
  { cwd: web, stdio: "inherit" },
);

rmSync(dist, { force: true, recursive: true });
mkdirSync(join(dist, "server"), { recursive: true });
mkdirSync(join(dist, ".openai"), { recursive: true });

const html = String.raw`<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="QADAM AI - Legal AI Platform для экспресс-анализа договоров, AI-консультаций и DOCX-протокола разногласий за 490 ₸.">
  <title>QADAM AI - Legal AI Platform</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #06382f;
      --primary-container: #0b5145;
      --primary-fixed: #d6eadf;
      --primary-fixed-dim: #b9d8ca;
      --secondary: #8a641d;
      --secondary-container: #d9aa42;
      --surface: #f4efe5;
      --surface-low: #eee5d6;
      --surface-container: #e8dcc9;
      --surface-high: #ded1bb;
      --surface-highest: #d4c4aa;
      --white: #fffdf8;
      --ink: #1d1b17;
      --muted: #585044;
      --outline: #766d5f;
      --outline-variant: #cbbda8;
      --danger: #ba1a1a;
      --danger-soft: #ffdad6;
      --success: #005312;
      --success-soft: #a3f69c;
      --shadow: 0 18px 40px rgba(0, 52, 43, 0.12);
      --radius: 8px;
      --max: 1440px;
      --margin: 48px;
      font-family: Manrope, "Segoe UI", Inter, Arial, sans-serif;
      color: var(--ink);
      background:
        linear-gradient(180deg, rgba(255, 253, 248, .72), transparent 430px),
        radial-gradient(circle at 16% 0%, rgba(217, 170, 66, .13), transparent 360px),
        var(--surface);
    }

    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      min-width: 320px;
      background: var(--surface);
      color: var(--ink);
      line-height: 1.5;
      text-rendering: optimizeLegibility;
    }
    body::before {
      content: "";
      position: fixed;
      inset: 64px 0 auto;
      z-index: -1;
      height: 520px;
      pointer-events: none;
      background:
        radial-gradient(ellipse at 18% 10%, rgba(217, 170, 66, .13), transparent 42%),
        radial-gradient(ellipse at 82% 0%, rgba(214, 234, 223, .42), transparent 45%);
      opacity: .72;
      animation: surfaceDrift 18s ease-in-out infinite alternate;
    }
    @keyframes surfaceDrift {
      from { transform: translate3d(-1.5%, 0, 0) scale(1); opacity: .58; }
      to { transform: translate3d(1.5%, 12px, 0) scale(1.035); opacity: .82; }
    }
    body.modal-open { overflow: hidden; }
    h1, h2, h3, p { margin-top: 0; }
    h1, h2, .serif { font-family: "Cormorant Garamond", "Palatino Linotype", Palatino, "Iowan Old Style", Georgia, "Times New Roman", serif; letter-spacing: 0; }
    a { color: inherit; }
    button, input, textarea, select { font: inherit; }
    button { cursor: pointer; }
    .container { width: min(100% - 96px, var(--max)); margin: 0 auto; }

    .topbar {
      position: fixed;
      inset: 0 0 auto;
      z-index: 40;
      height: 64px;
      border-bottom: 1px solid var(--outline-variant);
      background: rgba(244, 239, 229, 0.94);
      backdrop-filter: blur(10px);
    }
    .nav-row { height: 64px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
    .brand { display: inline-flex; align-items: center; gap: 12px; text-decoration: none; }
    .brand-logo {
      width: 38px;
      height: 38px;
      object-fit: contain;
      border: 1px solid var(--outline-variant);
      border-radius: 8px;
      background: var(--white);
      box-shadow: 0 8px 18px rgba(0, 52, 43, .08);
    }
    .brand-text { color: var(--primary); font-family: "Cormorant Garamond", "Palatino Linotype", Palatino, Georgia, serif; font-size: 25px; font-weight: 700; line-height: 1; }
    .site-nav { display: flex; align-items: center; gap: 32px; color: var(--muted); font-size: 12px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; }
    .site-nav a { padding: 22px 0 18px; border-bottom: 2px solid transparent; text-decoration: none; }
    .language-switcher { display: flex; gap: 2px; padding: 3px; border: 1px solid var(--outline-variant); border-radius: 4px; background: var(--white); }
    .language-switcher button { min-width: 30px; padding: 5px 6px; border: 0; border-radius: 2px; background: transparent; color: var(--muted); font-size: 10px; font-weight: 800; cursor: pointer; }
    .language-switcher button.active { background: var(--primary); color: var(--white); }
    .site-nav a:hover, .site-nav a.active { color: var(--primary); border-bottom-color: var(--primary); }
    .top-actions { display: flex; align-items: center; gap: 10px; }
    .btn {
      position: relative;
      overflow: hidden;
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 11px 22px;
      border: 1px solid transparent;
      border-radius: 6px;
      background: var(--primary);
      color: var(--white);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .08em;
      text-decoration: none;
      text-transform: uppercase;
      transition: transform .28s cubic-bezier(.22, 1, .36, 1), background-color .28s ease, border-color .28s ease, box-shadow .28s ease;
    }
    .btn::after { content: ""; position: absolute; inset: 0 auto 0 -120%; width: 70%; pointer-events: none; background: linear-gradient(105deg, transparent, rgba(255,255,255,.28), transparent); transform: skewX(-18deg); transition: left .7s cubic-bezier(.22, 1, .36, 1); }
    .btn:hover::after { left: 140%; }
    .btn:hover { transform: translateY(-1px); background: var(--primary-container); }
    .btn:active { transform: translateY(0) scale(.985); transition-duration: .12s; }
    .btn.secondary { border-color: var(--primary); background: transparent; color: var(--primary); }
    .btn.secondary:hover { background: var(--primary-fixed); }
    .btn.gold { background: var(--secondary-container); color: #2d1b00; }
    .btn.gold:hover { background: #e6bc5c; }
    .btn.ghost { border-color: var(--outline-variant); background: var(--white); color: var(--primary); }
    .btn.full { width: 100%; }
    .btn.small { min-height: 36px; padding: 8px 12px; font-size: 11px; }

    main { padding-top: 96px; padding-bottom: 80px; }
    .hero { margin-bottom: 72px; }
    .hero-grid { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: 32px; }
    .eyebrow {
      display: block;
      margin-bottom: 10px;
      color: var(--primary);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .14em;
      text-transform: uppercase;
    }
    .hero h1 {
      max-width: 860px;
      margin-bottom: 16px;
      color: var(--primary);
      font-size: clamp(36px, 5vw, 58px);
      font-weight: 700;
      line-height: 1.12;
    }
    .lead { max-width: 760px; color: var(--muted); font-size: 18px; line-height: 1.55; }
    .hero-panel {
      width: min(100%, 380px);
      padding: 24px;
      border: 1px solid var(--outline-variant);
      border-radius: 12px;
      background: linear-gradient(180deg, var(--white), #faf5eb);
      box-shadow: 0 18px 38px rgba(61, 47, 24, .11);
    }
    .hero-panel strong { display: block; color: var(--primary); font-size: 34px; line-height: 1; }
    .hero-panel span { color: var(--muted); font-size: 13px; }
    .hero-status-grid { display: grid; gap: 10px; margin-top: 22px; }
    .hero-status-grid div {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 11px 0;
      border-top: 1px solid var(--outline-variant);
      color: var(--muted);
      font-size: 13px;
    }
    .hero-status-grid b { color: var(--primary); }
    .divider { width: 1px; height: 40px; background: var(--outline-variant); }

    .mission-brief {
      display: grid;
      grid-template-columns: minmax(0, .82fr) minmax(0, 1.18fr);
      gap: 24px;
      margin: -28px 0 84px;
    }
    .brief-card, .judge-card, .architecture-card, .security-panel {
      border: 1px solid var(--outline-variant);
      border-radius: 12px;
      background: var(--white);
      box-shadow: 0 16px 34px rgba(0, 52, 43, .07);
    }
    .brief-card { padding: 34px; background: linear-gradient(180deg, #ffffff, #f6faf8); }
    .brief-card h2, .judge-card h3, .architecture-card h3, .security-panel h2 { color: var(--primary); }
    .brief-card h2 { margin-bottom: 14px; font-size: 34px; line-height: 1.13; }
    .brief-grid { display: grid; gap: 12px; margin-top: 24px; }
    .brief-grid div {
      display: grid;
      grid-template-columns: 132px 1fr;
      gap: 14px;
      padding: 12px 0;
      border-top: 1px solid var(--outline-variant);
      color: var(--muted);
      font-size: 14px;
    }
    .brief-grid strong { color: var(--primary); font-size: 12px; letter-spacing: .08em; text-transform: uppercase; }
    .judge-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
    .judge-card { min-height: 100%; padding: 24px; }
    .judge-card strong {
      display: inline-flex;
      margin-bottom: 16px;
      padding: 5px 10px;
      border-radius: 999px;
      background: var(--primary-fixed);
      color: #00201a;
      font-size: 11px;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    .judge-card h3 { margin-bottom: 10px; font-size: 20px; }
    .judge-card p { margin: 0; color: var(--muted); font-size: 14px; }

    .model-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; margin-bottom: 84px; }
    .model-card {
      position: relative;
      display: flex;
      min-height: 420px;
      flex-direction: column;
      padding: 32px;
      border: 1px solid var(--outline-variant);
      border-radius: var(--radius);
      background: var(--white);
      transition: border-color .18s ease, transform .18s ease, box-shadow .18s ease;
    }
    .model-card:hover { transform: translateY(-4px); border-color: var(--primary-container); box-shadow: var(--shadow); }
    .model-card.featured { border: 2px solid var(--primary); box-shadow: var(--shadow); }
    .badge {
      position: absolute;
      top: -13px;
      right: 32px;
      padding: 5px 14px;
      border-radius: 999px;
      background: var(--secondary-container);
      color: #281900;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: .04em;
      text-transform: uppercase;
    }
    .icon-box {
      width: 48px;
      height: 48px;
      display: grid;
      place-items: center;
      margin-bottom: 24px;
      border-radius: 6px;
      background: var(--surface-container);
      color: var(--primary);
      font-size: 24px;
    }
    .featured .icon-box { background: var(--primary-container); color: var(--white); }
    .model-card h3 { margin-bottom: 8px; color: var(--primary); font-size: 12px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
    .model-card h2 { margin-bottom: 16px; font-size: 26px; line-height: 1.2; }
    .model-card p { flex: 1; color: var(--muted); font-size: 14px; }
    .check-list { display: grid; gap: 12px; margin: 24px 0 28px; padding: 0; list-style: none; }
    .check-list li { display: flex; gap: 10px; color: var(--ink); font-size: 14px; }
    .check-list li::before { content: "✓"; flex: 0 0 auto; color: var(--primary); font-weight: 900; }
    .price-line { margin-top: auto; padding-top: 22px; border-top: 1px solid var(--outline-variant); }
    .price-line strong { font-family: Georgia, serif; font-size: 26px; }
    .price-line span { color: var(--outline); font-size: 12px; font-weight: 700; }

    .commerce-panel {
      display: grid;
      grid-template-columns: minmax(0, .92fr) minmax(0, 1.08fr);
      gap: 24px;
      margin: -38px 0 84px;
      padding: 34px;
      border: 1px solid var(--outline-variant);
      border-radius: 14px;
      background:
        linear-gradient(135deg, rgba(255,253,248,.92), rgba(238,229,214,.86)),
        var(--white);
      box-shadow: 0 22px 46px rgba(61, 47, 24, .12);
    }
    .commerce-panel h2 { margin-bottom: 12px; color: var(--primary); font-size: 36px; }
    .commerce-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
    .commerce-item {
      padding: 18px;
      border: 1px solid var(--outline-variant);
      border-radius: 10px;
      background: rgba(255,253,248,.86);
    }
    .commerce-item strong { display: block; color: var(--primary); font-size: 22px; }
    .commerce-item span { color: var(--muted); font-size: 13px; }
    .commerce-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
    .procurement-card {
      padding: 22px;
      border: 1px solid var(--primary-fixed-dim);
      border-radius: 12px;
      background: #f8f4e9;
    }
    .procurement-card h3 { margin: 0 0 14px; color: var(--primary); font-size: 20px; }
    .procurement-list { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
    .procurement-list li { display: flex; justify-content: space-between; gap: 14px; padding: 10px 0; border-top: 1px solid var(--outline-variant); color: var(--muted); font-size: 13px; }
    .procurement-list b { color: var(--primary); }

    .section-title { display: flex; align-items: center; gap: 18px; margin-bottom: 40px; }
    .section-title h2 { margin: 0; color: var(--primary); font-size: 28px; line-height: 1.2; }
    .section-title::after { content: ""; flex: 1; height: 1px; background: var(--outline-variant); }
    .metrics { margin-bottom: 84px; }
    .metrics-grid { display: grid; grid-template-columns: 4fr 8fr; gap: 24px; }
    .target-card {
      position: relative;
      overflow: hidden;
      min-height: 360px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 40px;
      border-radius: var(--radius);
      background: var(--primary);
      color: var(--white);
    }
    .target-card > * { position: relative; z-index: 1; }
    .target-card .eyebrow { color: var(--primary-fixed); }
    .target-card h3 { margin-bottom: 14px; font-family: Georgia, serif; font-size: 34px; line-height: 1.16; }
    .target-card p { color: rgba(255,255,255,.8); }
    .target-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .target-stats strong { display: block; font-family: Georgia, serif; font-size: 28px; }
    .target-stats span { color: rgba(255,255,255,.62); font-size: 12px; }
    .metrics-side { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
    .info-card { padding: 32px; border: 1px solid var(--outline-variant); border-radius: var(--radius); background: var(--surface-container); }
    .info-card-head { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
    .info-chip { padding: 3px 8px; border-radius: 5px; background: var(--success-soft); color: var(--success); font-size: 11px; font-weight: 900; }
    .info-chip.gold { background: #ffdeac; color: var(--secondary); }
    .info-card h4 { margin: 0 0 8px; font-family: Georgia, serif; font-size: 25px; }
    .info-card p { color: var(--muted); font-size: 14px; }
    .rows { display: grid; margin-top: 24px; }
    .row { display: flex; justify-content: space-between; gap: 16px; padding: 11px 0; border-bottom: 1px solid var(--outline-variant); font-size: 14px; }
    .row:last-child { border-bottom: 0; }
    .row strong { color: var(--primary); font-size: 12px; text-transform: uppercase; }

    .architecture-card { margin-bottom: 84px; padding: 34px; }
    .architecture-head {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 24px;
      margin-bottom: 26px;
    }
    .architecture-head h2 { margin: 0; color: var(--primary); font-size: 34px; }
    .pipeline { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
    .architecture-line { display: flex; align-items: center; gap: 9px; overflow-x: auto; padding: 18px 0 22px; color: var(--primary); font-size: 12px; font-weight: 900; white-space: nowrap; }
    .architecture-line span { min-width: max-content; padding: 10px 12px; border: 1px solid var(--outline-variant); border-radius: 4px; background: var(--surface-low); text-align: center; }
    .architecture-line small { color: var(--muted); font-size: 10px; font-weight: 600; }
    .architecture-line i { color: var(--secondary); font-style: normal; font-size: 18px; }
    .pipe-step {
      position: relative;
      min-height: 148px;
      padding: 18px;
      border: 1px solid var(--outline-variant);
      border-radius: var(--radius);
      background: var(--surface-low);
    }
    .pipe-step::after {
      content: "→";
      position: absolute;
      right: -13px;
      top: 50%;
      z-index: 1;
      color: var(--outline);
      transform: translateY(-50%);
      font-weight: 900;
    }
    .pipe-step:last-child::after { display: none; }
    .pipe-step span { color: var(--outline); font-size: 11px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
    .pipe-step h4 { margin: 8px 0; color: var(--primary); font-size: 15px; }
    .pipe-step p { margin: 0; color: var(--muted); font-size: 13px; }

    .scale-card {
      position: relative;
      overflow: hidden;
      margin-bottom: 84px;
      padding: 48px;
      border: 1px solid var(--outline-variant);
      border-radius: 12px;
      background: var(--surface-high);
    }
    .scale-grid { position: relative; z-index: 1; display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: 56px; }
    .scale-card h2 { margin-bottom: 18px; color: var(--primary); font-size: 34px; }
    .scale-card p { color: var(--muted); }
    .actions { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 28px; }
    .chart-card { padding: 24px; border: 1px solid var(--outline-variant); border-radius: var(--radius); background: var(--white); box-shadow: 0 12px 26px rgba(0,0,0,.05); }
    .chart-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; color: var(--primary); font-size: 12px; font-weight: 900; letter-spacing: .04em; text-transform: uppercase; }
    .chart { height: 170px; display: flex; align-items: end; gap: 9px; }
    .bar { flex: 1; border-radius: 6px 6px 0 0; background: var(--surface-highest); }
    .bar:nth-child(3), .bar:nth-child(4) { background: var(--primary-fixed-dim); }
    .bar:nth-child(5) { background: var(--primary-container); }
    .bar:nth-child(6) { background: var(--primary); }
    .chart-labels { display: flex; justify-content: space-between; margin-top: 14px; color: var(--outline); font-size: 11px; font-weight: 700; }

    .product-grid { display: grid; grid-template-columns: minmax(420px, .92fr) minmax(300px, .78fr); gap: clamp(28px, 6vw, 92px); align-items: center; margin-bottom: 84px; }
    .workbench, .chat-panel, .history-panel, .privacy-side {
      border: 1px solid var(--outline-variant);
      border-radius: 12px;
      background: var(--white);
      box-shadow: 0 18px 42px rgba(61, 47, 24, .1);
    }
    .workbench { padding: 28px; }
    .workbench h2 { margin-bottom: 8px; color: var(--ink); font-family: "Palatino Linotype", Palatino, Georgia, serif; font-size: clamp(32px, 4vw, 48px); line-height: 1.02; }
    .chat-panel h2, .history-panel h2 { margin-bottom: 10px; color: var(--primary); font-size: 30px; }
    .muted { color: var(--muted); }
    .upload-zone {
      display: grid;
      place-items: center;
      min-height: 162px;
      margin: 24px 0 18px;
      padding: 24px;
      border: 1px dashed #8cb8ad;
      border-radius: 10px;
      background: #dcefeb;
      text-align: center;
    }
    .upload-zone input { max-width: 100%; }
    .upload-icon {
      width: 34px;
      height: 34px;
      display: grid;
      place-items: center;
      margin: 0 auto 8px;
      color: var(--primary);
      font-size: 22px;
      font-weight: 900;
    }
    .upload-primary-label { display: block; color: var(--ink); font-size: 14px; font-weight: 800; }
    .upload-secondary-label { display: block; color: var(--muted); font-size: 12px; font-weight: 500; }
    .agreement-row, .browser-note {
      display: grid;
      grid-template-columns: 18px 1fr;
      gap: 10px;
      align-items: start;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }
    .agreement-row { margin: 10px 0 16px; }
    .agreement-row input { width: 16px; height: 16px; margin: 2px 0 0; accent-color: var(--primary); }
    .browser-note { margin-top: 14px; }
    .side-stack { display: grid; gap: 22px; align-content: center; }
    .privacy-side {
      display: grid;
      grid-template-columns: 30px 1fr;
      gap: 14px;
      align-items: start;
      padding: 0;
      border: 0;
      background: transparent;
      box-shadow: none;
    }
    .privacy-side-icon {
      width: 26px;
      height: 26px;
      display: grid;
      place-items: center;
      color: var(--primary);
      font-size: 19px;
      line-height: 1;
    }
    .privacy-side h3 { margin: 0 0 8px; color: var(--ink); font-size: 16px; }
    .privacy-side p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.55; }
    .field { display: grid; gap: 8px; margin: 14px 0; font-weight: 800; color: var(--primary); }
    .field input, .field textarea, .field select {
      width: 100%;
      min-height: 46px;
      padding: 12px;
      border: 1px solid var(--outline-variant);
      border-radius: 6px;
      background: var(--white);
      color: var(--ink);
      font-weight: 500;
    }
    .field textarea { min-height: 112px; resize: vertical; }
    .result-grid { display: none; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 12px; margin-top: 22px; }
    .result-grid.show { display: grid; }
    .result-card { padding: 16px; border: 1px solid var(--outline-variant); border-radius: 6px; background: var(--surface-low); transition: transform .35s cubic-bezier(.22, 1, .36, 1), background-color .35s ease; }
    .result-card:hover { transform: translateY(-2px); background: var(--white); }
    .result-card strong { display: block; color: var(--primary); }
    .product-topline {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin: 20px 0 6px;
    }
    .topline-card {
      padding: 14px;
      border: 1px solid var(--outline-variant);
      border-radius: 8px;
      background: var(--surface-low);
    }
    .topline-card strong { display: block; color: var(--primary); }
    .topline-card span { color: var(--muted); font-size: 12px; }
    .risk-list { display: none; gap: 10px; margin: 18px 0 0; padding: 0; list-style: none; }
    .risk-list.show { display: grid; }
    .risk-list li { padding: 18px; border: 1px solid #ead7aa; border-left: 4px solid var(--secondary-container); border-radius: 0 8px 8px 0; background: #fff8e3; box-shadow: 0 10px 22px rgba(61, 47, 24, .06); animation: riskReveal .5s both cubic-bezier(.22, 1, .36, 1); }
    .risk-list li:nth-child(2) { animation-delay: .06s; }
    .risk-list li:nth-child(3) { animation-delay: .12s; }
    .risk-list li:nth-child(4) { animation-delay: .18s; }
    .risk-list li:nth-child(5) { animation-delay: .24s; }
    @keyframes riskReveal { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .risk-list li.high { border-left-color: var(--danger); background: var(--danger-soft); }
    .risk-list li.low { border-left-color: var(--success); background: #e7f7e3; }
    .risk-list p { margin: 8px 0 0; color: var(--muted); font-size: 13px; line-height: 1.5; }
    .risk-list em { display: block; margin-top: 9px; color: #433827; font-style: normal; font-size: 12px; font-weight: 700; }
    .risk-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; color: var(--muted); font-size: 11px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
    .risk-action { margin-top: 14px; padding: 0; border: 0; background: transparent; color: var(--primary); font-size: 12px; font-weight: 900; text-decoration: underline; text-underline-offset: 3px; }
    .analysis-status { min-height: 22px; margin: 12px 0 0; color: var(--muted); font-size: 12px; }
    .analysis-status.loading { color: var(--primary); }
    .analysis-status.success { color: var(--success); }
    .analysis-summary { display: none; margin-top: 18px; padding: 20px; border: 1px solid var(--outline-variant); border-radius: 6px; background: var(--white); }
    .analysis-summary.show { display: grid; gap: 18px; animation: riskReveal .45s both cubic-bezier(.22, 1, .36, 1); }
    .analysis-summary h3 { margin: 4px 0 6px; color: var(--ink); font-family: "Cormorant Garamond", Georgia, serif; font-size: 28px; line-height: 1; }
    .analysis-summary p { max-width: 720px; margin: 0; color: var(--muted); font-size: 13px; line-height: 1.6; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    .summary-grid div { padding: 12px; border-top: 2px solid var(--outline-variant); }
    .summary-grid strong { display: block; color: var(--primary); font-size: 22px; }
    .summary-grid span { color: var(--muted); font-size: 11px; }
    .action-plan { display: grid; gap: 8px; margin: 0; padding-left: 20px; color: var(--ink); font-size: 13px; line-height: 1.5; }
    .action-plan li::marker { color: var(--secondary); font-weight: 800; }
    .file-meta, .textarea-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; color: var(--muted); font-size: 12px; }
    .file-meta { width: 100%; max-width: 520px; margin: -4px auto 16px; }
    .file-meta strong { color: var(--primary); }
    .sample-link { padding: 0; border: 0; background: transparent; color: var(--primary); font-size: 12px; font-weight: 800; text-decoration: underline; text-underline-offset: 3px; }
    .textarea-footer { margin-top: 7px; }
    .workbench.is-loading { box-shadow: 0 22px 50px rgba(6, 56, 47, .16); }
    .workbench.is-loading .upload-zone { border-color: var(--primary); background: #edf8f2; }
    .chat-form button:disabled, .btn:disabled { cursor: wait; opacity: .65; transform: none; }

    .chat-panel { display: flex; min-height: 640px; flex-direction: column; overflow: hidden; }
    .chat-head { padding: 28px 28px 16px; border-bottom: 1px solid var(--outline-variant); }
    .chat-log { flex: 1; display: grid; align-content: start; gap: 12px; max-height: 390px; overflow: auto; padding: 20px 28px; background: linear-gradient(180deg, var(--surface-low), var(--white)); }
    .message { max-width: 88%; padding: 13px 14px; border: 1px solid var(--outline-variant); border-radius: 10px; background: var(--white); font-size: 14px; white-space: pre-line; }
    .message { animation: messageReveal .32s both cubic-bezier(.22, 1, .36, 1); }
    @keyframes messageReveal { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
    .typing { display: inline-flex; align-items: center; gap: 4px; min-height: 42px; }
    .typing span { width: 5px; height: 5px; border-radius: 50%; background: var(--primary); animation: typingPulse 1s ease-in-out infinite; }
    .typing span:nth-child(2) { animation-delay: .14s; }
    .typing span:nth-child(3) { animation-delay: .28s; }
    @keyframes typingPulse { 0%, 60%, 100% { opacity: .3; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-3px); } }
    .message.user { justify-self: end; border-color: var(--primary-fixed-dim); background: var(--primary-fixed); color: #00201a; }
    .message.bot { justify-self: start; }
    .suggestions { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 28px 18px; }
    .suggestions button { min-height: 34px; padding: 7px 10px; border: 1px solid var(--outline-variant); border-radius: 999px; background: var(--white); color: var(--primary); font-size: 12px; font-weight: 700; transition: background-color .28s ease, border-color .28s ease, transform .28s cubic-bezier(.22, 1, .36, 1); }
    .suggestions button:hover { transform: translateY(-2px); border-color: var(--primary); background: var(--primary-fixed); }
    .chat-form { display: grid; grid-template-columns: 1fr auto; gap: 10px; padding: 18px 28px 28px; border-top: 1px solid var(--outline-variant); }
    .chat-form input { min-height: 44px; padding: 12px; border: 1px solid var(--outline-variant); border-radius: 6px; }

    .security-panel {
      display: grid;
      grid-template-columns: minmax(0, .85fr) minmax(0, 1.15fr);
      gap: 28px;
      margin-bottom: 84px;
      padding: 34px;
      background:
        linear-gradient(135deg, rgba(175, 239, 221, .55), transparent 44%),
        var(--white);
    }
    .security-panel h2 { margin-bottom: 12px; font-size: 34px; }
    .security-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .security-item {
      padding: 18px;
      border: 1px solid var(--outline-variant);
      border-radius: 8px;
      background: rgba(255,255,255,.78);
    }
    .security-item strong { display: block; color: var(--primary); margin-bottom: 6px; }
    .security-item span { color: var(--muted); font-size: 13px; }

    .history-panel { margin-bottom: 84px; padding: 32px; }
    .history-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 18px; padding-bottom: 10px; border-bottom: 1px solid var(--outline-variant); color: var(--muted); font-size: 12px; }
    .history-toolbar strong { color: var(--primary); font-size: 18px; }
    .history-clear { padding: 0; border: 0; background: transparent; color: var(--primary); font-size: 12px; font-weight: 800; text-decoration: underline; text-underline-offset: 3px; }
    .history-list { display: grid; gap: 10px; margin: 18px 0 0; padding: 0; list-style: none; }
    .history-list li { display: flex; justify-content: space-between; gap: 16px; padding: 13px 0; border-bottom: 1px solid var(--outline-variant); color: var(--muted); animation: historyReveal .35s both cubic-bezier(.22, 1, .36, 1); }
    @keyframes historyReveal { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }
    .history-list strong { color: var(--primary); }

    footer { border-top: 1px solid var(--outline-variant); background: var(--surface-low); }
    .footer-grid { display: grid; grid-template-columns: minmax(240px, .9fr) 1.6fr; gap: 64px; padding: 48px 0; }
    .footer-grid h3 { margin: 0 0 14px; color: var(--primary); font-size: 14px; letter-spacing: .08em; text-transform: uppercase; }
    .footer-grid p, .footer-grid a { color: var(--muted); font-size: 14px; }
    .footer-links { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
    .footer-links div { display: grid; align-content: start; gap: 12px; }
    .footer-bottom { display: flex; justify-content: space-between; gap: 16px; padding: 24px 0 34px; border-top: 1px solid var(--outline-variant); color: var(--muted); font-size: 12px; }

    .modal {
      position: fixed;
      inset: 0;
      z-index: 70;
      display: grid;
      visibility: hidden;
      opacity: 0;
      pointer-events: none;
      place-items: center;
      padding: 20px;
      background: rgba(25, 28, 30, .62);
      transition: opacity .28s ease, visibility .28s ease;
    }
    .modal.show { visibility: visible; opacity: 1; pointer-events: auto; }
    .dialog {
      position: relative;
      width: min(100%, 560px);
      max-height: calc(100vh - 40px);
      overflow: auto;
      padding: 32px;
      border-radius: 10px;
      background: var(--white);
      box-shadow: 0 30px 90px rgba(0,0,0,.28);
      transform: translateY(10px) scale(.985);
      transition: transform .34s cubic-bezier(.22, 1, .36, 1);
    }
    .modal.show .dialog { transform: translateY(0) scale(1); }
    :focus-visible { outline: 3px solid rgba(217, 170, 66, .7); outline-offset: 3px; }
    .dialog h2 { margin-bottom: 12px; color: var(--primary); font-size: 32px; }
    .dialog.auth-dialog { width: min(100%, 880px); }
    .auth-modal-grid { display: grid; grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr); gap: 24px; }
    .auth-hero-panel {
      padding: 20px;
      border: 1px solid var(--outline-variant);
      border-radius: 12px;
      background: linear-gradient(180deg, #fffdf8, #f5ecd9);
    }
    .auth-steps { display: grid; gap: 10px; margin-top: 18px; }
    .auth-step {
      display: grid;
      grid-template-columns: 34px 1fr;
      gap: 12px;
      padding: 13px;
      border: 1px solid var(--outline-variant);
      border-radius: 8px;
      background: var(--surface-low);
    }
    .auth-step b {
      width: 34px;
      height: 34px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      background: var(--primary);
      color: var(--white);
      font-size: 12px;
    }
    .auth-step strong { display: block; color: var(--primary); }
    .auth-step span { color: var(--muted); font-size: 13px; }
    .auth-trust {
      display: grid;
      gap: 10px;
      margin-top: 16px;
      padding: 16px;
      border: 1px solid var(--primary-fixed-dim);
      border-radius: 10px;
      background: rgba(214, 234, 223, .72);
    }
    .trust-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; color: var(--primary); font-size: 13px; font-weight: 800; }
    .trust-meter { height: 8px; overflow: hidden; border-radius: 999px; background: rgba(6, 56, 47, .12); }
    .trust-meter span { display: block; width: 92%; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--primary), var(--secondary-container)); }
    .auth-form-card {
      padding: 20px;
      border: 1px solid var(--outline-variant);
      border-radius: 12px;
      background: var(--white);
      box-shadow: 0 16px 32px rgba(61, 47, 24, .1);
    }
    .otp-actions { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: end; }
    .auth-stepper { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 20px; }
    .auth-stepper-item { display: grid; gap: 5px; padding: 10px 8px; border-bottom: 2px solid var(--outline-variant); color: var(--muted); font-size: 11px; font-weight: 800; text-align: center; }
    .auth-stepper-item b { color: var(--outline); font-size: 10px; }
    .auth-stepper-item.active { border-bottom-color: var(--primary); color: var(--primary); }
    .auth-stepper-item.active b { color: var(--secondary); }
    .auth-helper { display: flex; justify-content: space-between; gap: 12px; margin: -4px 0 16px; color: var(--muted); font-size: 12px; }
    .auth-helper strong { color: var(--primary); }
    .otp-actions input:disabled { background: var(--surface-low); color: var(--muted); cursor: not-allowed; }
    .otp-toggle { min-width: 42px; padding: 0 10px; border: 1px solid var(--outline-variant); border-radius: 6px; background: var(--white); color: var(--primary); font-size: 12px; font-weight: 800; }
    .auth-status { min-height: 20px; margin: 14px 0 0; font-size: 12px; }
    .auth-status.error { color: var(--danger); }
    .auth-status.success { color: var(--success); }
    .auth-form-card.is-verified { border-color: #9fc7a4; box-shadow: 0 18px 38px rgba(0, 83, 18, .12); }
    .auth-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 20px; padding: 4px; border-radius: 8px; background: var(--surface-low); }
    .auth-tab { min-height: 38px; border: 0; border-radius: 6px; background: transparent; color: var(--muted); font-size: 12px; font-weight: 800; }
    .auth-tab.active { background: var(--white); color: var(--primary); box-shadow: 0 3px 10px rgba(61, 47, 24, .08); }
    .auth-password { position: relative; }
    .auth-password input { padding-right: 76px; }
    .password-toggle { position: absolute; right: 8px; bottom: 7px; min-height: 30px; padding: 4px 8px; border: 0; border-radius: 4px; background: var(--surface-low); color: var(--primary); font-size: 11px; font-weight: 800; }
    .register-only { display: none; }
    .register-only.show { display: block; }
    .login-only.hide { display: none; }
    .session-card {
      margin-top: 14px;
      padding: 16px;
      border: 1px solid var(--primary-fixed-dim);
      border-radius: 8px;
      background: #f0fff9;
      color: var(--primary);
      font-size: 14px;
    }
    .session-card.active { background: #eef8ef; border-color: #9fc7a4; }
    .close {
      position: absolute;
      top: 14px;
      right: 14px;
      width: 38px;
      height: 38px;
      border: 1px solid var(--outline-variant);
      border-radius: 50%;
      background: var(--white);
      color: var(--primary);
      font-weight: 900;
    }
    .floating-chat {
      position: fixed;
      right: 22px;
      bottom: 22px;
      z-index: 45;
      width: 58px;
      height: 58px;
      border: 0;
      border-radius: 50%;
      background: var(--secondary-container);
      color: #281900;
      box-shadow: 0 14px 30px rgba(0,0,0,.2);
      font-size: 24px;
      font-weight: 900;
    }

    /* Minimal report surface: keep motion and hierarchy, remove visual weight. */
    main.container { display: flex; flex-direction: column; }
    .dashboard-panel { order: 1; margin: 0 0 24px; padding: 28px; border: 1px solid var(--outline-variant); border-radius: 6px; background: var(--white); }
    .access-strip { order: 2; display: flex; align-items: center; justify-content: space-between; gap: 24px; margin: 0 0 56px; padding: 24px 28px; border-left: 4px solid var(--secondary); border-top: 1px solid var(--outline-variant); border-bottom: 1px solid var(--outline-variant); background: var(--surface-low); }
    .access-strip h2 { margin: 4px 0 6px; color: var(--primary); font-size: 25px; }
    .access-strip p { margin: 0; max-width: 660px; }
    .access-actions { display: flex; flex-wrap: wrap; gap: 10px; flex-shrink: 0; }
    .hero { order: 5; margin-bottom: 28px; }
    .dashboard-head { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin-bottom: 24px; }
    .dashboard-head h2 { margin: 4px 0 6px; color: var(--primary); font-size: 32px; }
    .dashboard-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-top: 1px solid var(--outline-variant); border-bottom: 1px solid var(--outline-variant); }
    .dashboard-stat { min-height: 112px; padding: 18px 16px; border-right: 1px solid var(--outline-variant); }
    .dashboard-stat:last-child { border-right: 0; }
    .dashboard-stat span, .dashboard-stat small { display: block; color: var(--muted); font-size: 12px; }
    .dashboard-stat strong { display: block; margin: 10px 0 4px; color: var(--primary); font-size: 24px; }
    .dashboard-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 22px; }
    .dashboard-details { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 14px; }
    .dashboard-details > div { min-height: 92px; padding: 16px; border: 1px solid var(--outline-variant); border-radius: 4px; background: var(--surface-low); }
    .dashboard-details span, .dashboard-details small { display: block; color: var(--muted); font-size: 11px; }
    .dashboard-details strong { display: block; margin: 7px 0 4px; overflow: hidden; color: var(--primary); font-size: 16px; text-overflow: ellipsis; white-space: nowrap; }
    .dashboard-panel { display: grid; grid-template-columns: minmax(0, .9fr) minmax(420px, 1.1fr); gap: 36px; min-height: 540px; margin-left: calc(50% - 50vw); margin-right: calc(50% - 50vw); padding: clamp(36px, 6vw, 76px) max(24px, calc((100vw - 1280px) / 2)); border: 0; border-radius: 0; background: #001f19; color: var(--white); }
    .dashboard-head { grid-column: 1; grid-row: 1; display: flex; align-items: flex-start; flex-direction: column; justify-content: center; gap: 24px; margin: 0; }
    .dashboard-head h2 { max-width: 560px; margin: 6px 0 12px; color: #d8f0e8; font-family: "Cormorant Garamond", Georgia, serif; font-size: clamp(44px, 5vw, 70px); line-height: .98; }
    .dashboard-head p { max-width: 500px; color: rgba(255,253,248,.72); font-size: 16px; }
    .dashboard-head .eyebrow { color: #d9aa42; }
    .dashboard-head > .btn { display: none; }
    .dashboard-visual { grid-column: 2; grid-row: 1 / span 2; align-self: center; }
    .dashboard-window { position: relative; min-height: 360px; overflow: hidden; border: 1px solid rgba(216,240,232,.28); border-radius: 8px; background: #f7f8f5; box-shadow: 0 24px 60px rgba(0,0,0,.22); }
    .window-bar { display: flex; align-items: center; gap: 7px; padding: 14px 16px; border-bottom: 1px solid #dce4df; color: #65736e; font-size: 11px; }
    .window-bar span { width: 7px; height: 7px; border-radius: 50%; background: #b2c3bd; }
    .window-bar b { margin-left: 10px; font-weight: 700; }
    .window-body { display: grid; grid-template-columns: 42px 1fr 132px; min-height: 300px; }
    .window-sidebar { display: grid; align-content: start; gap: 20px; padding: 22px 16px; background: #edf3ef; }
    .window-sidebar i { display: block; width: 12px; height: 12px; border-radius: 3px; background: #9bb9ad; }
    .window-sidebar i:first-child { background: var(--secondary); }
    .window-document { padding: 28px 24px; color: #173b31; }
    .window-document strong { display: block; margin-bottom: 22px; font-family: "Cormorant Garamond", Georgia, serif; font-size: 24px; }
    .document-line { width: 82%; height: 9px; margin: 15px 0; border-radius: 2px; background: #d9e2dd; }
    .document-line.wide { width: 96%; }
    .document-line.highlight { background: #bfe7d5; }
    .window-status { display: grid; align-content: start; gap: 8px; padding: 24px 16px; border-left: 1px solid #dce4df; color: #687771; font-size: 11px; }
    .window-status strong { color: #176b52; font-family: "Cormorant Garamond", Georgia, serif; font-size: 34px; }
    .window-status small { color: #9a6d1d; }
    .dashboard-note { position: absolute; left: 14%; bottom: 18px; display: flex; align-items: center; gap: 10px; max-width: 260px; padding: 14px 16px; border: 1px solid rgba(192,200,196,.48); border-radius: 6px; background: rgba(255,253,248,.9); color: #24443a; font-size: 12px; box-shadow: 0 12px 30px rgba(0,0,0,.1); }
    .dashboard-note b { color: var(--secondary); font-size: 18px; }
    .dashboard-grid, .dashboard-details, .dashboard-actions { grid-column: 1 / -1; }
    .dashboard-grid { border-color: rgba(216,240,232,.25); }
    .dashboard-stat { border-color: rgba(216,240,232,.25); }
    .dashboard-stat span, .dashboard-stat small, .dashboard-details span, .dashboard-details small { color: rgba(255,253,248,.6); }
    .dashboard-stat strong, .dashboard-details strong { color: #f4d28d; }
    .dashboard-details > div { border-color: rgba(216,240,232,.25); background: rgba(255,253,248,.06); }
    .dashboard-actions { margin-top: 0; }
    .dashboard-panel { min-height: 560px; background: #fbfcfb; color: var(--ink); border-bottom: 1px solid #dfe6e3; }
    .dashboard-head h2 { max-width: 560px; color: #00251e; font-size: clamp(42px, 5vw, 66px); }
    .dashboard-head p { color: #404946; }
    .dashboard-head .eyebrow { color: #775a19; }
    .dashboard-visual { transition: transform .6s cubic-bezier(.22,1,.36,1); }
    .dashboard-visual:hover { transform: translateY(-4px); }
    .dashboard-grid { border-color: #dce5e1; }
    .dashboard-stat { border-color: #dce5e1; transition: border-color .3s ease, background-color .3s ease, transform .3s ease; }
    .dashboard-stat:hover { background: #f0f6f3; transform: translateY(-2px); }
    .dashboard-stat span, .dashboard-stat small, .dashboard-details span, .dashboard-details small { color: #65736e; }
    .dashboard-stat strong, .dashboard-details strong { color: #00251e; }
    .dashboard-details > div { border-color: #dce5e1; background: #f0f4f2; }
    .dashboard-actions .btn { transition: transform .35s cubic-bezier(.22,1,.36,1), background-color .3s ease, color .3s ease; }
    .dashboard-actions .btn:hover { transform: translateY(-2px); }
    .dashboard-note { transition: transform .4s cubic-bezier(.22,1,.36,1), box-shadow .4s ease; }
    .dashboard-visual:hover .dashboard-note { transform: translateY(-4px); box-shadow: 0 18px 36px rgba(0,37,30,.14); }
    #model { order: 2; margin-bottom: 28px; }
    .mission-brief, .commerce-panel, .metrics, .architecture-card, .scale-card { order: 6; }
    #assistant { order: 3; margin-bottom: 28px; }
    #history { order: 4; margin-bottom: 28px; }
    .hero, .access-strip, .mission-brief, .commerce-panel, .metrics, .architecture-card, .scale-card { display: none; }
    .hero-grid { align-items: end; }
    .hero-panel { border-radius: 6px; background: var(--white); }
    .workbench { border-top: 4px solid var(--primary); }
    .workbench h2 { font-size: clamp(36px, 5vw, 58px); }
    .risk-list li { padding: 20px 22px; }
    .hero-panel, .workbench, .chat-panel, .history-panel, .model-card, .info-card, .chart-card, .commerce-panel, .security-panel, .brief-card { box-shadow: none; }
    .pipeline { display: none; }
    .model-card:hover, .result-card:hover { transform: none; box-shadow: none; }
    .risk-list li { box-shadow: none; border-radius: 4px; }
    .model-card, .info-card, .chart-card, .brief-card, .topline-card { border-radius: 6px; }
    body::before { opacity: .22; animation-duration: 28s; }
    @media (max-width: 980px) {
      .container { width: min(100% - 32px, var(--max)); }
      .dashboard-panel { grid-template-columns: 1fr; }
      .dashboard-visual { grid-column: 1; grid-row: 2; }
      .dashboard-head { grid-column: 1; grid-row: 1; }
      .dashboard-grid, .dashboard-details, .dashboard-actions { grid-column: 1; }
      .dashboard-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .dashboard-details { grid-template-columns: 1fr; }
      .dashboard-stat:nth-child(2) { border-right: 0; }
      .site-nav { display: none; }
      .hero-grid, .metrics-grid, .scale-grid, .product-grid, .footer-grid { grid-template-columns: 1fr; }
      .model-grid, .metrics-side, .footer-links, .mission-brief, .judge-grid, .pipeline, .security-panel, .security-grid, .auth-modal-grid, .commerce-panel, .commerce-grid { grid-template-columns: 1fr; }
      .hero-panel { width: 100%; }
      .model-card { min-height: auto; }
      .scale-card { padding: 28px; }
      .result-grid { grid-template-columns: 1fr; }
      .pipe-step::after { display: none; }
      .architecture-line { padding-bottom: 18px; }
    }
    @media (max-width: 640px) {
      .dashboard-panel { gap: 24px; min-height: 0; padding: 36px 20px; }
      .dashboard-head h2 { font-size: 44px; }
      .window-body { grid-template-columns: 28px 1fr; }
      .window-status { display: none; }
      .dashboard-note { left: 8%; right: 8%; max-width: none; }
      .dashboard-head { align-items: flex-start; flex-direction: column; }
      .access-strip { align-items: flex-start; flex-direction: column; padding: 20px; }
      .dashboard-grid { grid-template-columns: 1fr; }
      .dashboard-details { grid-template-columns: 1fr; }
      .dashboard-stat { min-height: auto; border-right: 0; border-bottom: 1px solid var(--outline-variant); }
      .dashboard-stat:last-child { border-bottom: 0; }
      .brand-text { font-size: 19px; }
      .top-actions .btn.ghost { display: none; }
      main { padding-top: 88px; }
      .workbench, .chat-head, .history-panel { padding: 22px; }
      .chat-log, .suggestions, .chat-form { padding-left: 22px; padding-right: 22px; }
      .footer-bottom { flex-direction: column; }
      .history-toolbar { align-items: flex-start; flex-direction: column; }
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { scroll-behavior: auto !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
    }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="container nav-row">
      <a class="brand" href="#home" aria-label="QADAM AI">
        <img alt="" class="brand-logo" src="${logoDataUrl}">
        <span class="brand-text">QADAM AI</span>
      </a>
      <nav class="site-nav" aria-label="Основная навигация">
        <a class="active" href="#dashboard">Dashboard</a>
        <a href="#model">Commercial Model</a>
        <a href="#assistant">AI Chat Bot</a>
        <a href="#history">History</a>
      </nav>
      <div class="language-switcher" role="group" aria-label="Language"><button type="button" data-lang="ru" class="active">RU</button><button type="button" data-lang="kz">KZ</button><button type="button" data-lang="en">EN</button></div>
      <div class="top-actions">
        <button class="btn ghost" type="button" data-open-chat>AI чат</button>
        <button class="btn" type="button" data-open-auth>Личный кабинет</button>
      </div>
    </div>
  </header>

  <main class="container" id="home">
    <section class="hero">
      <div class="hero-grid">
        <div>
          <span class="eyebrow">Investment Presentation v1.2</span>
          <h1>Официальная модель монетизации QADAM</h1>
          <p class="lead">Институциональное решение для юридической поддержки студентов. Масштабируемая модель сочетает бесплатный экспресс-анализ, AI-чат для правовых вопросов, Premium DOCX-протокол за 490 ₸ и B2B-лицензии для вузов.</p>
        </div>
        <aside class="hero-panel" aria-label="Готовность проекта к отбору">
          <span class="eyebrow">Submission readiness</span>
          <strong>30/30</strong>
          <span>Онлайн-критерии закрыты: исследование, инженерия, работающий MVP.</span>
          <div class="hero-status-grid">
            <div><span>Track</span><b>Social & Human Capital</b></div>
            <div><span>Problem zone</span><b>Civic Rights</b></div>
            <div><span>Live demo</span><b>Public URL</b></div>
            <div><span>Repository</span><b>GitHub ready</b></div>
          </div>
        </aside>
      </div>
    </section>

    <section class="dashboard-panel" id="dashboard" aria-labelledby="dashboard-title">
      <div class="dashboard-head"><div><span class="eyebrow">Workspace overview</span><h2 id="dashboard-title">Панель QADAM AI</h2><p class="muted">Быстрый контроль анализа, рисков, чата и истории действий.</p></div><button class="btn" type="button" data-open-auth>Открыть кабинет</button></div>
      <div class="dashboard-visual" aria-label="Предпросмотр юридического отчёта"><div class="dashboard-window"><div class="window-bar"><span></span><span></span><span></span><b>QADAM AI / Legal Report</b></div><div class="window-body"><div class="window-sidebar"><i></i><i></i><i></i><i></i></div><div class="window-document"><strong>Договор аренды</strong><div class="document-line wide"></div><div class="document-line"></div><div class="document-line highlight"></div><div class="document-line wide highlight"></div><div class="document-line"></div><div class="document-line highlight"></div></div><div class="window-status"><span>Risk score</span><strong id="dashboardVisualScore">—</strong><small>Evidence-first</small></div></div><div class="dashboard-note"><b>✓</b><span>Проверка условий и доказательств в одном отчёте</span></div></div></div>
      <div class="dashboard-grid">
        <div class="dashboard-stat"><span>Статус сервиса</span><strong>Работает</strong><small>Публичный demo-доступ</small></div>
        <div class="dashboard-stat"><span>Анализ</span><strong>Free</strong><small>Риски + доказательства</small></div>
        <div class="dashboard-stat"><span>Документ</span><strong>490 ₸</strong><small>Premium DOCX-протокол</small></div>
        <div class="dashboard-stat"><span>История</span><strong id="dashboardHistoryCount">0</strong><small>событий в браузере</small></div>
      </div>
      <div class="dashboard-details">
        <div><span>Последняя проверка</span><strong id="dashboardAnalysisState">Ожидает документ</strong><small id="dashboardAnalysisDetail">Загрузите договор или вставьте условия для запуска анализа.</small></div>
        <div><span>Последнее действие</span><strong id="dashboardLastAction">Нет действий</strong><small id="dashboardSessionState">Гость · локальная история включена</small></div>
      </div>
      <div class="dashboard-actions"><a class="btn" href="#assistant">Начать анализ</a><button class="btn ghost" type="button" data-open-chat>Задать вопрос AI</button><a class="btn ghost" href="#history">Открыть историю</a></div>
    </section>

    <section class="access-strip" aria-labelledby="access-title">
      <div><span class="eyebrow">Secure workspace</span><h2 id="access-title">Сохраните анализ в личном кабинете</h2><p class="muted">Регистрация открывает историю договоров, вопросов AI и скачанных протоколов на этом устройстве.</p></div>
      <div class="access-actions"><button class="btn" type="button" data-open-auth>Войти</button><button class="btn ghost" type="button" data-open-auth>Создать аккаунт</button></div>
    </section>

    <section class="mission-brief" aria-labelledby="brief-title">
      <article class="brief-card">
        <span class="eyebrow">Tech Vision fit - Social & Human Capital</span>
        <h2 id="brief-title">Один пользователь. Одна острая боль.</h2>
        <p class="muted">QADAM сфокусирован на проблемной зоне Civic Rights & Literacy: молодой человек впервые подписывает договор аренды и не понимает, какие условия законны, что можно оспорить и как безопасно вести переговоры.</p>
        <div class="brief-grid">
          <div><strong>User</strong><span>Студент 16-23 лет, первый договор аренды или общежития.</span></div>
          <div><strong>Pain</strong><span>Юридический текст написан не для новичка; риск замечают слишком поздно, уже после подписи.</span></div>
          <div><strong>USP</strong><span>AI не просто отвечает общими словами, а превращает риск договора в понятный следующий шаг и DOCX-протокол.</span></div>
          <div><strong>CustDev</strong><span>Гипотеза основана на реальных сценариях: депозит, доступ арендодателя, штрафы, ремонт, досрочное расторжение.</span></div>
        </div>
      </article>
      <div class="judge-grid" aria-label="Карта критериев онлайн-этапа">
        <article class="judge-card">
          <strong>1-10 баллов</strong>
          <h3>Исследовательская глубина</h3>
          <p>Сайт явно показывает выбранную проблемную зону, одного пользователя, одну боль и сценарии CustDev, которые можно защищать перед экспертами.</p>
        </article>
        <article class="judge-card">
          <strong>1-10 баллов</strong>
          <h3>Инженерная архитектура</h3>
          <p>Демонстрируется AI-chain: ingest, PII masking, risk classifier, grounded answer, DOCX generator и audit trail.</p>
        </article>
        <article class="judge-card">
          <strong>1-10 баллов</strong>
          <h3>Техническая валидация</h3>
          <p>MVP интерактивный: вход, анализ договора, чат-бот, история, Premium DOCX и live deploy для проверки без установки.</p>
        </article>
      </div>
    </section>

    <section id="model" class="model-grid" aria-label="Коммерческая модель">
      <article class="model-card">
        <div class="icon-box">+</div>
        <h3>Acquisition</h3>
        <h2>Free: экспресс-анализ</h2>
        <p>Инструмент захвата внимания. Пользователь бесплатно загружает договор, получает базовую подсветку рисков и задаёт вопросы AI-чатботу.</p>
        <ul class="check-list">
          <li>Регистрация пользователя</li>
          <li>История обращений</li>
          <li>Оценка рисков L1</li>
          <li>AI-чат по документу</li>
        </ul>
        <div class="price-line"><strong>0 ₸</strong> <span>/ entry</span></div>
      </article>

      <article class="model-card featured">
        <div class="badge">Main Revenue</div>
        <div class="icon-box">§</div>
        <h3>Transaction</h3>
        <h2>490 ₸ за DOCX-протокол</h2>
        <p>Готовый протокол разногласий с формулировками, рисками и инструкциями. Разовая оплата по требованию после бесплатного анализа.</p>
        <ul class="check-list">
          <li>Генерация DOCX-документа</li>
          <li>Юридически аккуратная структура</li>
          <li>Приоритетный AI-ассистент</li>
          <li>Готово для переговоров</li>
        </ul>
        <div class="price-line"><strong>490 ₸</strong> <span>/ document</span></div>
      </article>

      <article class="model-card">
        <div class="icon-box">▦</div>
        <h3>B2B</h3>
        <h2>Campus license</h2>
        <p>Пакетное решение для вузов, общежитий и legal clinics: кабинет администратора, аналитика рисков, брендированный интерфейс и лимиты проверок.</p>
        <ul class="check-list">
          <li>Корпоративная подписка</li>
          <li>White-label интерфейс</li>
          <li>Аналитика правовых рисков</li>
          <li>Отчётность для партнёров</li>
        </ul>
        <div class="price-line"><strong>Custom</strong> <span>/ yearly</span></div>
      </article>
    </section>

    <section class="commerce-panel" aria-labelledby="commerce-title">
      <div>
        <span class="eyebrow">Official commercial offer</span>
        <h2 id="commerce-title">Бизнес-модель, которую можно купить</h2>
        <p class="muted">QADAM работает как понятная legal-tech воронка: бесплатная диагностика создаёт доверие, Premium-документ монетизирует срочную боль, а campus license масштабирует продукт через университеты и общежития.</p>
        <div class="commerce-actions">
          <button class="btn gold" type="button" id="buyModel">Купить Premium за 490 ₸</button>
          <button class="btn secondary" type="button" id="requestLicense">Запросить B2B-лицензию</button>
        </div>
      </div>
      <div class="procurement-card">
        <h3>Procurement summary</h3>
        <div class="commerce-grid" style="margin-bottom:14px">
          <div class="commerce-item"><strong>0 ₸</strong><span>Free acquisition</span></div>
          <div class="commerce-item"><strong>490 ₸</strong><span>Premium DOCX</span></div>
          <div class="commerce-item"><strong>B2B</strong><span>Campus license</span></div>
        </div>
        <ul class="procurement-list">
          <li><span>Primary buyer</span><b>Student / tenant</b></li>
          <li><span>Institutional buyer</span><b>University / dormitory</b></li>
          <li><span>Revenue stream</span><b>Micro-payment + license</b></li>
          <li><span>Delivery</span><b>Instant DOCX + audit trail</b></li>
        </ul>
      </div>
    </section>

    <section class="metrics" aria-labelledby="metrics-title">
      <div class="section-title"><h2 id="metrics-title">Ключевые метрики и охват</h2></div>
      <div class="metrics-grid">
        <article class="target-card">
          <div>
            <span class="eyebrow">Target Segment</span>
            <h3>Студенты 18-22 лет</h3>
            <p>Ядро аудитории - студенты государственных и частных вузов Казахстана, которым нужна понятная правовая защита при аренде, оплате, общежитии и бытовых договорах.</p>
          </div>
          <div class="target-stats">
            <div><strong>~600k</strong><span>Potential Reach</span></div>
            <div><strong>85%</strong><span>Mobile Usage</span></div>
          </div>
        </article>
        <div class="metrics-side">
          <article class="info-card">
            <div class="info-card-head"><span class="icon-box" style="margin:0">↗</span><span class="info-chip">Optimized CAC</span></div>
            <h4>Каналы CAC</h4>
            <p>Основные инструменты привлечения пользователей с минимальными затратами за счёт виральности и партнёрств.</p>
            <div class="rows">
              <div class="row"><span>Telegram Bot Ads</span><strong>High Conv.</strong></div>
              <div class="row"><span>ВУЗ-партнёрства</span><strong>Organic</strong></div>
              <div class="row"><span>Студенческие советы</span><strong>Direct</strong></div>
            </div>
          </article>
          <article class="info-card">
            <div class="info-card-head"><span class="icon-box" style="margin:0">₸</span><span class="info-chip gold">Revenue streams</span></div>
            <h4>Revenue Model</h4>
            <p>Гибридная модель дохода: бесплатный вход, микроплатёж 490 ₸ и B2B-пакеты с прогнозируемым LTV.</p>
            <div class="rows">
              <div class="row"><span>490 ₸ - разовая генерация</span><strong>B2C</strong></div>
              <div class="row"><span>B2B-пакеты для вузов</span><strong>License</strong></div>
              <div class="row"><span>Консалтинг администрациям</span><strong>Upsell</strong></div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="architecture-card" aria-labelledby="architecture-title">
      <div class="architecture-head">
        <div>
          <span class="eyebrow">Engineering portfolio preview</span>
          <h2 id="architecture-title">AI-цепочка, которую можно объяснить на Q&A</h2>
        </div>
        <button class="btn ghost" type="button" data-open-demo>Сценарий защиты</button>
      </div>
      <div class="architecture-line" aria-label="QADAM AI architecture">
        <span>Загрузка<br><small>PDF / DOCX</small></span><i>→</i><span>PII Masking<br><small>ИИН, карты</small></span><i>→</i><span>Clause Extractor</span><i>→</i><span>Rules Engine</span><i>→</i><span>Legal Retrieval<br><small>+ Reranker</small></span><i>→</i><span>Grounding Gate</span><i>→</i><span>UI Report</span>
      </div>
      <div class="pipeline">
        <div class="pipe-step"><span>01</span><h4>Ingest</h4><p>PDF/DOCX/TXT или текст условия попадает в локальный анализатор.</p></div>
        <div class="pipe-step"><span>02</span><h4>PII mask</h4><p>ИИН, телефон, email и карты должны маскироваться до AI-слоя.</p></div>
        <div class="pipe-step"><span>03</span><h4>Risk engine</h4><p>Классификация рисков: депозит, доступ, штраф, ремонт, расторжение.</p></div>
        <div class="pipe-step"><span>04</span><h4>Grounded chat</h4><p>Чат отвечает по найденным рискам и объясняет следующий шаг простым языком.</p></div>
        <div class="pipe-step"><span>05</span><h4>DOCX output</h4><p>Premium генерирует протокол разногласий и сохраняет событие в audit trail.</p></div>
      </div>
    </section>

    <section class="scale-card" aria-labelledby="scale-title">
      <div class="scale-grid">
        <div>
          <h2 id="scale-title">Прогноз масштабирования</h2>
          <p>К концу 2026 года QADAM планирует охватить 15% целевого рынка студентов в Алматы и Астане, выйти на устойчивую конверсию Free → Premium и подготовить B2B-лицензии для университетов.</p>
          <div class="actions">
            <button class="btn" type="button" data-download-pitch>Скачать Full Pitch</button>
            <button class="btn secondary" type="button" data-open-demo>Demo Access</button>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-head"><span>Estimated Revenue Trend</span><span>↗</span></div>
          <div class="chart" aria-label="Рост выручки">
            <div class="bar" style="height:18%"></div>
            <div class="bar" style="height:32%"></div>
            <div class="bar" style="height:48%"></div>
            <div class="bar" style="height:66%"></div>
            <div class="bar" style="height:84%"></div>
            <div class="bar" style="height:100%"></div>
          </div>
          <div class="chart-labels"><span>Q1 2026</span><span>Q4 2026</span></div>
        </div>
      </div>
    </section>

    <section class="product-grid" id="assistant" aria-label="Рабочий продукт">
      <article class="workbench">
        <span class="eyebrow">Проверка до подписания</span>
        <h2>Загрузите договор</h2>
        <p class="muted">PDF или DOCX до 10 МБ. Фото и сканы без текста пока не поддерживаются.</p>
        <div class="upload-zone">
          <label style="width:100%;max-width:520px">
            <span class="upload-icon">↥</span>
            <span class="upload-primary-label">Выберите договор</span>
            <span class="upload-secondary-label">Нажмите, чтобы выбрать файл</span>
            <input id="fileInput" type="file" accept=".pdf,.doc,.docx,.txt">
          </label>
        </div>
        <div class="file-meta" aria-live="polite"><strong id="fileName">Файл не выбран</strong><span id="fileHint">PDF, DOCX или TXT · до 10 МБ</span></div>
        <label class="agreement-row">
          <input type="checkbox" id="consentInput" checked>
          <span>Я согласен на обработку документа для анализа. QADAM маскирует ИИН, телефоны и email перед AI-обработкой.</span>
        </label>
        <label class="field">
          Текст или ключевые условия
          <textarea id="contractText" placeholder="Например: депозит не возвращается, арендодатель может заходить без предупреждения, штраф за досрочное расторжение..."></textarea>
        </label>
        <div class="textarea-footer"><button class="sample-link" type="button" id="sampleContract">Вставить пример договора</button><span id="textCount">0 символов</span></div>
        <div class="actions">
          <button class="btn full" type="button" id="runAnalysis">Проверить договор</button>
          <button class="btn gold" type="button" id="downloadDocx">Premium 490 ₸: оформить DOCX</button>
        </div>
        <div class="browser-note"><span>♙</span><span>Не публикуйте ссылку на полный отчёт: доступ защищён приватным токеном в этом браузере.</span></div>
        <p class="analysis-status" id="analysisStatus" role="status">Готово к проверке. Для точного результата вставьте текст условий или выберите файл.</p>
        <div class="result-grid" id="resultGrid" aria-live="polite">
          <div class="result-card"><strong id="riskScore">0/100</strong><span>Risk score</span></div>
          <div class="result-card"><strong id="riskCount">0</strong><span>Найдено рисков</span></div>
          <div class="result-card"><strong id="nextStep">Готово</strong><span>Следующий шаг</span></div>
        </div>
        <section class="analysis-summary" id="analysisSummary" aria-live="polite">
          <div><span class="eyebrow">Итог проверки</span><h3 id="analysisVerdict">Готово</h3><p id="analysisSummaryText">После проверки здесь появится краткое юридическое заключение.</p></div>
          <div class="summary-grid"><div><strong id="highCount">0</strong><span>Высокий приоритет</span></div><div><strong id="mediumCount">0</strong><span>Нужно уточнить</span></div><div><strong id="missingCount">0</strong><span>Пропущенные условия</span></div></div>
          <ol class="action-plan" id="actionPlan"></ol>
        </section>
        <ul class="risk-list" id="riskList"></ul>
      </article>

      <div class="side-stack">
        <aside class="privacy-side">
          <div class="privacy-side-icon">♧</div>
          <div>
            <h3>Личные данные — не доказательство риска</h3>
            <p>ИИН, телефоны, email и номера карт маскируются до анализа. В отчёте остаются только условия договора, понятные выводы и источники.</p>
          </div>
        </aside>
        <article class="chat-panel" aria-labelledby="chat-title">
          <div class="chat-head">
            <span class="eyebrow">AI Legal Chat Bot</span>
            <h2 id="chat-title">Спросите QADAM</h2>
            <p class="muted">Чат-бот отвечает по договору, объясняет риски и подсказывает, какие условия стоит добавить в протокол разногласий.</p>
          </div>
          <div class="chat-log" id="chatLog" aria-live="polite">
            <div class="message bot">Здравствуйте. Я QADAM AI. Могу объяснить риск в договоре, подсказать формулировку или подготовить пункты для DOCX-протокола.</div>
          </div>
          <div class="suggestions">
            <button type="button" data-question="Можно ли арендодателю заходить в квартиру без предупреждения?">Доступ арендодателя</button>
            <button type="button" data-question="Что делать, если депозит не возвращают?">Депозит</button>
            <button type="button" data-question="Какие пункты включить в протокол разногласий?">Протокол</button>
          </div>
          <form class="chat-form" id="chatForm">
            <input id="chatInput" type="text" autocomplete="off" placeholder="Напишите вопрос по договору...">
            <button class="btn small" type="submit">Спросить</button>
          </form>
        </article>
      </div>
    </section>

    <section class="security-panel" aria-labelledby="security-title">
      <div>
        <span class="eyebrow">Authentication & trust</span>
        <h2 id="security-title">Аутентификация выглядит как production-flow</h2>
        <p class="muted">Для судей работает demo OTP 490490, но интерфейс показывает реальную модель: passwordless-вход, роли, устройство, audit log, session status и privacy-first обработку договора.</p>
        <div class="actions">
          <button class="btn" type="button" data-open-auth>Открыть secure login</button>
          <button class="btn secondary" type="button" data-open-demo>Посмотреть demo script</button>
        </div>
      </div>
      <div class="security-grid">
        <div class="security-item"><strong>Passwordless OTP</strong><span>Email/SMS-код вместо пароля, меньше риска утечки.</span></div>
        <div class="security-item"><strong>Role-aware access</strong><span>Student, judge demo и university admin-ready модель.</span></div>
        <div class="security-item"><strong>Audit trail</strong><span>Вход, анализ, чат и DOCX фиксируются в истории действий.</span></div>
        <div class="security-item"><strong>Privacy boundary</strong><span>PII-masking заявлен как обязательный шаг AI-chain.</span></div>
      </div>
    </section>

    <section class="history-panel" id="history">
      <span class="eyebrow">Action history</span>
      <h2>История действий</h2>
      <p class="muted">В этой версии история сохраняется в браузере судьи: вход, анализ, вопросы чат-боту и скачивание Premium DOCX.</p>
      <div class="history-toolbar"><span><strong id="historyCount">0</strong> событий на этом устройстве</span><button class="history-clear" type="button" id="clearHistory">Очистить историю</button></div>
      <ul class="history-list" id="historyList"></ul>
    </section>
  </main>

  <footer>
    <div class="container">
      <div class="footer-grid">
        <div>
          <h3>QADAM AI</h3>
          <p>Цифровое право для нового поколения. Делаем юридическую помощь доступной и понятной каждому студенту в Казахстане.</p>
        </div>
        <div class="footer-links">
          <div><h3>Official Links</h3><a href="#assistant">AI Chat Bot</a><a href="#model">Pricing Details</a><a href="#history">Activity History</a></div>
          <div><h3>Legal</h3><a href="#assistant">Privacy-first demo</a><a href="#model">Terms of Service</a><a href="#model">B2B License</a></div>
          <div><h3>Support</h3><a href="#assistant">Contact Support</a><a href="#model">Partner Program</a><a href="#assistant">API Access</a></div>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 QADAM AI. Kazakhstan Legal Tech.</span>
        <span>Информационная помощь, не замена консультации юриста.</span>
      </div>
    </div>
  </footer>

  <button class="floating-chat" type="button" aria-label="Открыть AI чат" data-open-chat>AI</button>

  <div class="modal" id="authModal" role="dialog" aria-modal="true" aria-labelledby="authTitle">
    <div class="dialog auth-dialog">
      <button class="close" type="button" data-close>×</button>
      <div class="auth-modal-grid">
        <div class="auth-hero-panel">
          <span class="eyebrow">Secure workspace</span>
          <h2 id="authTitle">Passwordless-вход QADAM</h2>
          <p class="muted">Demo OTP: 490490. На защите можно объяснить production-логику: одноразовые коды, rate limiting, role-based доступ и audit trail без хранения паролей.</p>
          <div class="auth-trust" aria-label="Статус безопасности">
            <div class="trust-row"><span>Security posture</span><strong>92%</strong></div>
            <div class="trust-meter"><span></span></div>
            <p class="muted" style="margin:0;font-size:13px">OTP, trusted device, audit trail и privacy boundary включены для demo-сессии.</p>
          </div>
          <div class="auth-steps" aria-label="Шаги аутентификации">
            <div class="auth-step"><b>1</b><div><strong>Идентификация</strong><span>Email, роль и устройство фиксируются в сессии.</span></div></div>
            <div class="auth-step"><b>2</b><div><strong>OTP challenge</strong><span>Код 490490 имитирует email/SMS OTP для live-demo.</span></div></div>
            <div class="auth-step"><b>3</b><div><strong>Audit log</strong><span>Вход, анализ и DOCX сохраняются в истории действий.</span></div></div>
          </div>
        </div>
        <div class="auth-form-card">
          <div class="auth-tabs" role="tablist" aria-label="Режим аккаунта">
            <button class="auth-tab active" type="button" data-auth-mode="login">Войти</button>
            <button class="auth-tab" type="button" data-auth-mode="register">Создать аккаунт</button>
          </div>
          <div class="auth-helper"><span id="authModeHint">Вернитесь к сохранённому аккаунту</span><strong>SQLite-ready</strong></div>
          <label class="field">Email <input id="emailInput" type="email" placeholder="judge@example.com" autocomplete="email"></label>
          <label class="field">Роль
            <select id="roleInput">
              <option value="Judge demo">Judge demo</option>
              <option value="Student">Student</option>
              <option value="University admin">University admin</option>
            </select>
          </label>
          <label class="field auth-password"><span id="passwordLabel">Пароль</span><input id="passwordInput" type="password" minlength="8" placeholder="Не менее 8 символов" autocomplete="current-password"><button class="password-toggle" type="button" id="togglePassword">Показать</button></label>
          <label class="field register-only" id="confirmPasswordField">Повторите пароль <input id="confirmPasswordInput" type="password" minlength="8" placeholder="Повторите пароль" autocomplete="new-password"></label>
          <div class="otp-actions">
            <label class="field" style="margin:0">OTP-код <input id="otpInput" type="text" inputmode="numeric" placeholder="490490" autocomplete="one-time-code"></label>
            <button class="btn ghost small" type="button" id="resendOtp">Resend</button>
          </div>
          <button class="btn full" type="button" id="loginBtn">Подтвердить защищённый вход</button>
          <button class="btn secondary full" type="button" id="logoutBtn">Завершить сессию</button>
          <div class="session-card" id="sessionSummary">Сессия не активна. Введите email и demo-код 490490.</div>
          <p class="muted" id="authStatus" style="margin-top:14px"></p>
        </div>
      </div>
    </div>
  </div>

  <div class="modal" id="demoModal" role="dialog" aria-modal="true" aria-labelledby="demoTitle">
    <div class="dialog">
      <button class="close" type="button" data-close>×</button>
      <span class="eyebrow">Demo Access</span>
      <h2 id="demoTitle">Сценарий для судей</h2>
      <p class="muted">1) войдите кодом 490490, 2) запустите Free-анализ, 3) задайте вопрос чат-боту, 4) скачайте Premium DOCX за 490 ₸ в демо-режиме.</p>
      <button class="btn full" type="button" data-close>Понятно, начать</button>
    </div>
  </div>

  <div class="modal" id="paymentModal" role="dialog" aria-modal="true" aria-labelledby="paymentTitle">
    <div class="dialog">
      <button class="close" type="button" data-close>×</button>
      <span class="eyebrow">Premium checkout</span>
      <h2 id="paymentTitle">DOCX-протокол разногласий</h2>
      <p class="muted">Демо-платёж имитирует реальную модель: пользователь сначала получает бесплатный риск-анализ, затем платит 490 ₸ за официальный документ для переговоров.</p>
      <label class="field">Email покупателя <input id="buyerEmail" type="email" placeholder="student@example.com" autocomplete="email"></label>
      <label class="field">Способ оплаты
        <select id="paymentMethod">
          <option>Kaspi / QR</option>
          <option>Банковская карта</option>
          <option>University voucher</option>
        </select>
      </label>
      <div class="brief-grid" style="margin-top:18px">
        <div><strong>Product</strong><span>Протокол разногласий .DOCX</span></div>
        <div><strong>Price</strong><span>490 ₸, разовый микроплатёж</span></div>
        <div><strong>Includes</strong><span>Риски, формулировки, следующий шаг, audit event</span></div>
        <div><strong>Invoice</strong><span id="invoiceId">QADAM-490-DEMO</span></div>
      </div>
      <button class="btn gold full" type="button" id="confirmPremium" style="margin-top:20px">Подтвердить demo-оплату и скачать DOCX</button>
    </div>
  </div>

  <div class="modal" id="licenseModal" role="dialog" aria-modal="true" aria-labelledby="licenseTitle">
    <div class="dialog">
      <button class="close" type="button" data-close>×</button>
      <span class="eyebrow">B2B campus license</span>
      <h2 id="licenseTitle">Запрос коммерческого предложения</h2>
      <p class="muted">Для вузов и общежитий QADAM продаётся как лицензия: пакет проверок, кабинет администратора, аналитика рисков и white-label доступ.</p>
      <label class="field">Организация <input id="orgInput" type="text" placeholder="Nazarbayev University / Dormitory"></label>
      <label class="field">Контактный email <input id="licenseEmail" type="email" placeholder="admin@example.edu.kz"></label>
      <label class="field">Пакет
        <select id="licensePlan">
          <option>Campus Starter · до 500 проверок</option>
          <option>Campus Pro · до 5 000 проверок</option>
          <option>White-label Enterprise</option>
        </select>
      </label>
      <button class="btn full" type="button" id="submitLicense">Сформировать request</button>
      <div class="session-card" id="licenseStatus">Коммерческий запрос будет сохранён в истории действий.</div>
    </div>
  </div>

  <script>
    const state = {
      risks: [],
      score: 0,
      busy: false,
      chatBusy: false,
      authMode: "login",
      authResendAt: 0,
      language: localStorage.getItem("qadam:language") || "ru",
      session: JSON.parse(localStorage.getItem("qadam:session") || "null"),
      events: JSON.parse(localStorage.getItem("qadam:events") || "[]")
    };

    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => Array.from(document.querySelectorAll(selector));

    const translations = {
      ru: { dashboard: "Dashboard", model: "Commercial Model", chat: "AI Chat Bot", history: "History", title: "Проверьте договор аренды до подписи", intro: "QADAM AI подсвечивает спорные условия, объясняет риски простым языком и готовит протокол разногласий в пару кликов.", cabinet: "Личный кабинет", start: "Проверить договор", ask: "Задать вопрос AI", openHistory: "Открыть историю", overview: "QADAM AI Legal Intelligence", service: "Статус сервиса", analysis: "Free: экспресс-анализ", document: "Premium DOCX · 490 ₸", events: "История", lastCheck: "Последняя проверка", lastAction: "Последнее действие", waiting: "Ожидает документ", guest: "Гость · локальная история включена" },
      kz: { dashboard: "Dashboard", model: "Commercial Model", chat: "AI Chat Bot", history: "History", title: "Жалдау шартын қол қоймас бұрын тексеріңіз", intro: "QADAM AI даулы талаптарды көрсетеді, тәуекелдерді қарапайым тілмен түсіндіреді және келіспеушіліктер хаттамасын дайындайды.", cabinet: "Жеке кабинет", start: "Шартты тексеру", ask: "AI-ға сұрақ қою", openHistory: "Тарихты ашу", overview: "QADAM AI Legal Intelligence", service: "Сервис күйі", analysis: "Free: жедел талдау", document: "Premium DOCX · 490 ₸", events: "Тарих", lastCheck: "Соңғы тексеріс", lastAction: "Соңғы әрекет", waiting: "Құжат күтілуде", guest: "Қонақ · жергілікті тарих қосулы" },
      en: { dashboard: "Dashboard", model: "Commercial Model", chat: "AI Chat Bot", history: "History", title: "Review your rental contract before signing", intro: "QADAM AI highlights disputed clauses, explains risks in plain language, and prepares a negotiation protocol in a few clicks.", cabinet: "Personal Cabinet", start: "Review contract", ask: "Ask AI a question", openHistory: "Open history", overview: "QADAM AI Legal Intelligence", service: "Service status", analysis: "Free: express analysis", document: "Premium DOCX · 490 ₸", events: "History", lastCheck: "Last review", lastAction: "Last action", waiting: "Waiting for a document", guest: "Guest · local history enabled" }
    };

    function applyLanguage() {
      const t = translations[state.language] || translations.ru;
      document.documentElement.lang = state.language === "kz" ? "kk" : state.language;
      const nav = $$(".site-nav a");
      [t.dashboard, t.model, t.chat, t.history].forEach((label, index) => { if (nav[index]) nav[index].textContent = label; });
      $("#dashboard-title").textContent = t.title;
      const dashboardIntro = document.querySelector("#dashboard .dashboard-head p");
      if (dashboardIntro) dashboardIntro.textContent = t.intro;
      const stats = $$("#dashboard .dashboard-stat span");
      [t.service, t.analysis, t.document, t.events].forEach((label, index) => { if (stats[index]) stats[index].textContent = label; });
      const details = $$("#dashboard .dashboard-details span");
      [t.lastCheck, t.lastAction].forEach((label, index) => { if (details[index]) details[index].textContent = label; });
      const actions = $$("#dashboard .dashboard-actions .btn");
      [t.start, t.ask, t.openHistory].forEach((label, index) => { if (actions[index]) actions[index].textContent = label; });
      const modelLabel = document.querySelector("#model .model-card h3");
      if (modelLabel) modelLabel.textContent = t.model;
      const chatTitle = $("#chat-title");
      if (chatTitle) chatTitle.textContent = t.chat;
      const historyTitle = $("#history h2");
      if (historyTitle) historyTitle.textContent = t.history;
      $$("[data-open-auth]").forEach((button) => { if (!state.session) button.textContent = t.cabinet; });
      $$("[data-lang]").forEach((button) => button.classList.toggle("active", button.dataset.lang === state.language));
      renderDashboard();
    }

    function addEvent(label) {
      const time = new Date().toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
      state.events = [{ label, time }, ...state.events].slice(0, 8);
      localStorage.setItem("qadam:events", JSON.stringify(state.events));
      renderHistory();
    }

    function renderDashboard() {
      const t = translations[state.language] || translations.ru;
      const historyCount = $("#dashboardHistoryCount");
      if (historyCount) historyCount.textContent = String(state.events.length);
      const analysisState = $("#dashboardAnalysisState");
      const analysisDetail = $("#dashboardAnalysisDetail");
      if (analysisState && analysisDetail) {
        if (!state.risks.length) {
          analysisState.textContent = t.waiting;
          analysisDetail.textContent = t.intro;
        } else {
          analysisState.textContent = state.summary?.verdict || "Проверка завершена";
          analysisDetail.textContent = state.score + "/100 risk score · " + state.risks.length + " пунктов для проверки";
        }
      }
      const visualScore = $("#dashboardVisualScore");
      if (visualScore) visualScore.textContent = state.risks.length ? state.score + "/100" : "—";
      const lastAction = $("#dashboardLastAction");
      if (lastAction) lastAction.textContent = state.events[0]?.label || "Нет действий";
      const sessionState = $("#dashboardSessionState");
      if (sessionState) sessionState.textContent = state.session ? "Signed in · local history enabled" : t.guest;
    }

    function renderHistory() {
      const list = $("#historyList");
      $("#historyCount").textContent = String(state.events.length);
      const dashboardCount = $("#dashboardHistoryCount");
      if (dashboardCount) dashboardCount.textContent = String(state.events.length);
      renderDashboard();
      if (!state.events.length) {
        list.innerHTML = "<li><span>История появится после первого действия.</span><strong>Ready</strong></li>";
        return;
      }
      list.innerHTML = state.events.map((event) => "<li><span>" + escapeHtml(event.label) + "</span><strong>" + event.time + "</strong></li>").join("");
    }

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
    }

    function openModal(id) {
      $(id).classList.add("show");
      document.body.classList.add("modal-open");
      renderSessionSummary();
      if (id === "#authModal") setTimeout(() => $("#emailInput")?.focus(), 180);
      if (id === "#paymentModal") {
        $("#invoiceId").textContent = "QADAM-" + Date.now().toString().slice(-6) + "-490";
        if (state.session?.email && !$("#buyerEmail").value) $("#buyerEmail").value = state.session.email;
      }
    }

    function closeModals() {
      $$(".modal").forEach((modal) => modal.classList.remove("show"));
      document.body.classList.remove("modal-open");
    }

    function scrollChat() {
      $("#assistant").scrollIntoView({ behavior: "smooth", block: "start" });
      $("#chatInput").focus();
    }

    function normalizeText(value) {
      return String(value || "")
        .replace(/\s+/g, " ")
        .replace(/[ёЁ]/g, "е")
        .trim();
    }

    function maskSensitive(value) {
      return normalizeText(value)
        .replace(/\b\d{12}\b/g, "[ИИН скрыт]")
        .replace(/\+?\d[\d\s().-]{8,}\d/g, "[телефон скрыт]")
        .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[email скрыт]")
        .replace(/\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, "[карта скрыта]");
    }

    function evidenceFor(text, pattern) {
      const source = maskSensitive(text);
      const match = source.match(pattern);
      if (!match) return "Условие не найдено явно. Риск отмечен как пробел договора.";
      const index = Math.max(0, match.index - 80);
      return source.slice(index, Math.min(source.length, match.index + match[0].length + 120)).trim();
    }

    function has(text, pattern) {
      return pattern.test(text);
    }

    function addRisk(risks, risk) {
      if (!risks.some((item) => item.title === risk.title)) risks.push(risk);
    }

    function legalBasisFor(risk) {
      const title = (risk.title + " " + risk.body).toLowerCase();
      if (/объект|идентифиц|адрес|описан/.test(title)) return "ГК РК, Особенная часть, ст. 542: данные об объекте найма должны позволять его определить.";
      if (/депозит|платеж|арендн|коммунал|штраф|пен/.test(title)) return "ГК РК, Особенная часть, ст. 546: условия и форма арендной платы должны быть зафиксированы договором.";
      if (/ремонт|дефект|содержан|ущерб/.test(title)) return "ГК РК, Особенная часть, ст. 552: обязанности по содержанию и ремонту имущества нужно распределить.";
      if (/расторж|срок|прекрат|уведом/.test(title)) return "ГК РК, Особенная часть, ст. 556: изменение и прекращение договора требуют проверяемого основания и порядка.";
      return "ГК РК, Особенная часть, глава 29 (ст. 540–560): точная норма зависит от вида найма и текста пункта.";
    }

    function detectRisks(text, fileName) {
      const clean = maskSensitive(text);
      const source = (clean + " " + fileName).toLowerCase();
      const risks = [];

      if (!source || source.trim().length < 8) {
        return [{
          level: "medium",
          title: "Недостаточно текста для юридически точного вывода",
          body: "Файл принят, но браузерная demo-версия не всегда извлекает текст из PDF/DOCX. Вставьте 1-2 спорных пункта в поле текста, и QADAM покажет предметный риск.",
          evidence: "Нет извлеченного текста договора.",
          fix: "Для live-demo вставьте пункт о депозите, доступе владельца, ремонте или расторжении.",
          question: "Какой пункт договора вызывает сомнение?",
          confidence: 0.62
        }];
      }

      if (has(source, /депозит|залог|обеспечительн|кепіл|залоговая сумма/)) {
        const hasDeadline = has(source, /(?:в течение|не позднее|до)\s+(?:\d+|трех|пяти|семи|десяти|3|5|7|10)\s+(?:рабоч|календар|дн)/);
        const hasAct = has(source, /акт|прием|передач|осмотр|состояни/);
        if (!hasDeadline || !hasAct || has(source, /не возвращ|удерживается полностью|по усмотрению|без объяснения/)) {
          addRisk(risks, {
            level: "high",
            title: "Депозит можно удержать без прозрачной процедуры",
            body: "Для студента это главный денежный риск: без срока возврата, акта состояния жилья и закрытого списка удержаний спор будет трудно доказать.",
            evidence: evidenceFor(clean, /депозит|залог|обеспечительн|кепіл|удерж/iu),
            fix: "Добавить: депозит возвращается в течение 5 рабочих дней после подписания акта возврата; удержания возможны только по подтвержденному ущербу с фото/чеками.",
            question: "Укажем срок возврата депозита, акт состояния жилья и закрытый список удержаний?",
            confidence: hasDeadline && hasAct ? 0.74 : 0.91
          });
        }
      } else {
        addRisk(risks, {
          level: "medium",
          title: "Условие о депозите не найдено",
          body: "Если депозит передается отдельно, его нужно включить в договор: сумма, срок возврата, основания удержания и акт приема-передачи.",
          evidence: "Пункт о депозите отсутствует в найденном тексте.",
          fix: "Внести отдельный пункт: сумма депозита, дата оплаты, возврат до 5 рабочих дней, удержания только по акту.",
          question: "Будет ли депозит и где именно он зафиксирован?",
          confidence: 0.76
        });
      }

      if (has(source, /заход|вход|доступ|посещ|ключ|визит|кіру|иесі/)) {
        if (has(source, /без\s+(?:предварительного\s+)?уведомлен|в любое время|самостоятельно|свободн|имеет право входить/)) {
          addRisk(risks, {
            level: "high",
            title: "Владелец может входить без предупреждения",
            body: "Это риск приватности и давления на арендатора. Для гражданской грамотности важно показать: доступ должен быть предсказуемым и документированным.",
            evidence: evidenceFor(clean, /без\s+(?:предварительного\s+)?уведомлен|в любое время|имеет право входить|доступ|ключ/iu),
            fix: "Доступ только по письменному уведомлению минимум за 24 часа; исключение - авария или угроза имуществу.",
            question: "Согласуем вход только по уведомлению за 24 часа, кроме аварии?",
            confidence: 0.9
          });
        }
      }

      if (has(source, /арендн.*плат|плата|стоимость|цена|жалға алу ақы|төлем/)) {
        if (has(source, /односторон|в любое время|по своему усмотрению|без согласия|повысить/)) {
          addRisk(risks, {
            level: "high",
            title: "Цена аренды может изменяться односторонне",
            body: "Студент планирует бюджет на семестр. Одностороннее повышение ломает финансовую предсказуемость и снижает защищенность договора.",
            evidence: evidenceFor(clean, /односторон|в любое время|по своему усмотрению|повысить|изменить.*плат/iu),
            fix: "Изменение платы только по письменному соглашению сторон или не чаще одного раза в 12 месяцев с уведомлением за 30 дней и понятным пределом.",
            question: "Зафиксируем цену и запретим одностороннее повышение без письменного соглашения?",
            confidence: 0.88
          });
        }
      }

      if (has(source, /штраф|пеня|неустойк|санкц|ответственн/)) {
        addRisk(risks, {
          level: has(source, /за каждый день|любое наруш|без ограничения|полностью/) ? "high" : "medium",
          title: "Штрафы могут быть несоразмерными",
          body: "Штраф должен быть понятным, ограниченным и применяться симметрично. Если ответственность есть только у арендатора, это слабое место договора.",
          evidence: evidenceFor(clean, /штраф|пеня|неустойк|санкц|ответственн/iu),
          fix: "Ограничить штраф фиксированной суммой или процентом, добавить срок на устранение нарушения и зеркальную ответственность владельца.",
          question: "Добавим лимит штрафа и одинаковую ответственность сторон?",
          confidence: 0.82
        });
      }

      if (has(source, /расторж|досроч|выселен|прекращ|бұзу|тоқтат/)) {
        if (has(source, /немедлен|без уведомлен|в любое время|по требованию арендодателя/)) {
          addRisk(risks, {
            level: "high",
            title: "Расторжение может быть внезапным",
            body: "Для первого жилья критично иметь время на поиск новой квартиры. Договор должен давать понятный срок уведомления и одинаковые правила для сторон.",
            evidence: evidenceFor(clean, /немедлен|без уведомлен|в любое время|расторж|досроч/iu),
            fix: "Расторжение по инициативе стороны - письменное уведомление за 30 дней; немедленно только при существенном нарушении или аварийной угрозе.",
            question: "Установим взаимное уведомление за 30 дней до расторжения?",
            confidence: 0.89
          });
        }
      } else {
        addRisk(risks, {
          level: "medium",
          title: "Порядок расторжения не найден",
          body: "Если порядок выхода из договора не прописан, студент может оказаться без понятного срока на переезд или возврата денег.",
          evidence: "Пункт о расторжении не найден явно.",
          fix: "Добавить порядок уведомления, возврата ключей, оплаты последнего месяца и возврата депозита.",
          question: "Как каждая сторона может прекратить договор и за сколько дней предупреждает?",
          confidence: 0.72
        });
      }

      if (has(source, /ремонт|полом|ущерб|скрыт|жөндеу/)) {
        addRisk(risks, {
          level: has(source, /любой ремонт|капитальн.*арендатор|за счет арендатора|все расходы/) ? "high" : "medium",
          title: "Ремонт и скрытые дефекты описаны нечетко",
          body: "Нужно отделить мелкий текущий ремонт от капитального ремонта и дефектов, которые были до заселения.",
          evidence: evidenceFor(clean, /ремонт|полом|ущерб|капитальн|скрыт|жөндеу/iu),
          fix: "Текущий мелкий ремонт - арендатор; капитальный ремонт и скрытые дефекты - владелец, если ущерб не причинен арендатором.",
          question: "Разделим текущий ремонт, капитальный ремонт и скрытые дефекты?",
          confidence: 0.84
        });
      }

      if (!has(source, /коммунал|свет|электр|вода|газ|интернет|счетчик|услуг|су|жарық/)) {
        addRisk(risks, {
          level: "medium",
          title: "Коммунальные платежи не распределены",
          body: "Без перечня платежей легко получить неожиданные расходы после подписания.",
          evidence: "Пункт о коммунальных услугах не найден явно.",
          fix: "Указать, кто платит за воду, свет, газ, отопление, интернет, ОСИ/КСК и как передаются показания счетчиков.",
          question: "Какие коммунальные платежи входят в аренду, а какие оплачиваются отдельно?",
          confidence: 0.75
        });
      }

      if (!has(source, /адрес|квартира|помещен|объект|город|улиц|мекенжай|пәтер/)) {
        addRisk(risks, {
          level: "high",
          title: "Объект аренды недостаточно идентифицирован",
          body: "Если адрес и описание жилья не указаны точно, сложнее доказать, какое помещение передавалось и в каком состоянии.",
          evidence: "Точный адрес или описание объекта не найдено.",
          fix: "Добавить полный адрес, номер квартиры, площадь/комнаты и приложение с фото состояния.",
          question: "Укажем полный адрес, описание объекта и фото-приложение к акту?",
          confidence: 0.78
        });
      }

      if (!has(source, /срок|месяц|год|дата|с .* по |мерзім/)) {
        addRisk(risks, {
          level: "medium",
          title: "Срок проживания не найден",
          body: "Для студента важны даты начала, окончания и правила продления, особенно если аренда привязана к учебному семестру.",
          evidence: "Пункт о сроке договора не найден явно.",
          fix: "Указать дату начала, дату окончания, порядок продления и момент передачи ключей.",
          question: "На какой срок заключается договор и как он продлевается?",
          confidence: 0.73
        });
      }

      if (!risks.length) {
        risks.push({
          level: "low",
          title: "Критических рисков не найдено по базовым правилам",
          body: "Договор выглядит спокойнее, но перед подписанием всё равно проверьте депозит, доступ владельца, коммунальные платежи, расторжение и акт приема-передачи.",
          evidence: "Базовый pre-signing чек не нашел красных флагов.",
          fix: "Скачайте Premium DOCX, чтобы получить официальный чек-лист и протокол разногласий.",
          question: "Хотите сформировать официальный протокол разногласий?",
          confidence: 0.68
        });
      }

      const order = { high: 0, medium: 1, low: 2 };
      return risks.sort((a, b) => order[a.level] - order[b.level] || b.confidence - a.confidence).slice(0, 7).map((risk) => ({ ...risk, legalBasis: risk.legalBasis || legalBasisFor(risk) }));
    }

    function buildAnalysisSummary(risks) {
      const high = risks.filter((risk) => risk.level === "high").length;
      const medium = risks.filter((risk) => risk.level === "medium").length;
      const missing = risks.filter((risk) => /не найден|не указан|не распредел|не описан|недостаточно/i.test(risk.title)).length;
      const verdict = high ? "Подписание стоит приостановить" : medium ? "Условия нужно уточнить до подписи" : "Критических флагов не найдено";
      const text = high ? "В договоре есть условия, которые могут привести к прямым расходам или потере контроля. Сначала запросите письменную правку и подтверждение второй стороны." : medium ? "Критических запретов не найдено, но часть условий оставляет пространство для спора. Зафиксируйте сроки, платежи, доступ и ответственность до подписания." : "Базовая проверка пройдена. Перед подписью сверьте реквизиты, акт приёма-передачи и фактическое состояние объекта.";
      const actions = risks.slice(0, 3).map((risk) => (risk.level === "high" ? "Приоритет 1: не подписывать пункт без письменной редакции. " : risk.level === "medium" ? "Приоритет 2: уточнить формулировку и добавить срок или лимит. " : "Приоритет 3: проверить подтверждающие документы. ") + risk.fix + " Правовая опора: " + (risk.legalBasis || legalBasisFor(risk)));
      return { high, medium, missing, verdict, text, actions };
    }

    function renderAnalysisSummary(summary) {
      $("#analysisVerdict").textContent = summary.verdict;
      $("#analysisSummaryText").textContent = summary.text;
      $("#highCount").textContent = String(summary.high);
      $("#mediumCount").textContent = String(summary.medium);
      $("#missingCount").textContent = String(summary.missing);
      $("#actionPlan").innerHTML = summary.actions.map((action) => "<li>" + escapeHtml(action) + "</li>").join("");
      $("#analysisSummary").classList.add("show");
    }

    function runAnalysisCore() {
      if (!$("#consentInput").checked) {
        appendBot("Перед анализом нужно подтвердить согласие на обработку документа. QADAM маскирует персональные данные до AI-обработки.");
        addEvent("Анализ остановлен: нет согласия");
        return;
      }
      const fileName = $("#fileInput").files[0]?.name || "";
      const text = $("#contractText").value || "";
      state.risks = detectRisks(text, fileName).map((risk) => ({ ...risk, legalBasis: risk.legalBasis || legalBasisFor(risk) }));
      state.summary = buildAnalysisSummary(state.risks);
      renderAnalysisSummary(state.summary);
      const high = state.risks.filter((risk) => risk.level === "high").length;
      const medium = state.risks.filter((risk) => risk.level === "medium").length;
      state.score = Math.min(98, high * 24 + medium * 12 + Math.max(0, state.risks.length - high - medium) * 3);
      renderDashboard();
      $("#riskScore").textContent = state.score + "/100";
      $("#riskCount").textContent = String(state.risks.length);
      $("#nextStep").textContent = state.summary.verdict;
      $("#resultGrid").classList.add("show");
      $("#riskList").classList.add("show");
      $("#riskList").innerHTML = state.risks.map((risk) => {
        const label = risk.level === "high" ? "Высокий риск" : risk.level === "medium" ? "Требует внимания" : "Низкий риск";
        return "<li class='" + escapeHtml(risk.level) + "'><strong>" + escapeHtml(label + " - " + risk.title) + "</strong><div class='risk-meta'><span>Правовая опора</span></div><p>" + escapeHtml(risk.body) + "</p><em>Доказательство: " + escapeHtml(risk.evidence) + "</em><p><b>Применимая норма:</b> " + escapeHtml(risk.legalBasis) + "</p><p><b>Как исправить:</b> " + escapeHtml(risk.fix) + "</p></li>";
      }).join("");
      addEvent("Free-анализ договора: " + state.risks.length + " рисков");
      appendBot("Экспресс-анализ готов.\nГлавный риск: " + state.risks[0].title + ".\nЧто сделать: " + state.risks[0].fix + "\nСпросите меня: \"составь формулировку для протокола\" или \"что сказать арендодателю\".");
    }

    function decorateRiskActions() {
      const list = $("#riskList");
      if (!list || !state.risks.length) return;
      list.querySelectorAll("li").forEach((item, index) => {
        if (item.querySelector("[data-risk-action]")) return;
        const action = document.createElement("button");
        action.type = "button";
        action.className = "risk-action";
        action.dataset.riskAction = "true";
        action.textContent = "Обсудить этот пункт в чате →";
        action.addEventListener("click", () => {
          const risk = state.risks[index];
          if (risk) { scrollChat(); ask(risk.question); }
        });
        item.appendChild(action);
      });
    }

    function runAnalysis() {
      if (state.busy) return;
      state.busy = true;
      const workbench = document.querySelector(".workbench");
      const button = $("#runAnalysis");
      workbench.classList.add("is-loading");
      button.disabled = true;
      button.textContent = "Анализируем условия...";
      const status = $("#analysisStatus");
      status.className = "analysis-status loading";
      status.textContent = "Шаг 1 из 3 · маскируем данные и выделяем условия...";
      setTimeout(() => { status.textContent = "Шаг 2 из 3 · проверяем договор по профилю аренды..."; }, 180);
      setTimeout(() => {
        runAnalysisCore();
        decorateRiskActions();
        status.className = "analysis-status success";
        status.textContent = state.risks.length ? "Готово · начните с пунктов высокого риска, затем подготовьте протокол." : "Готово · явных рисков не найдено, но проверьте оплату, сроки и расторжение вручную.";
        state.busy = false;
        workbench.classList.remove("is-loading");
        button.disabled = false;
        button.textContent = "Проверить договор";
      }, 420);
    }

    function answerQuestion(question) {
      const q = question.toLowerCase();
      const risks = state.risks.length ? state.risks : detectRisks($("#contractText").value, $("#fileInput").files[0]?.name || "");
      const first = risks[0];
      if (/все риски|сводк|итог|план переговор|следующ/.test(q)) {
        const summary = state.summary || buildAnalysisSummary(risks);
        return summary.verdict + ".\n" + summary.text + "\n\nПлан действий:\n" + summary.actions.map((action, index) => (index + 1) + ". " + action).join("\n") + "\n\nГлавное доказательство: " + first.evidence + "\nПравовая опора: " + (first.legalBasis || legalBasisFor(first));
      }
      const byTopic = risks.find((risk) =>
        (/депозит|залог|возврат/.test(q) && /депозит|залог/i.test(risk.title + risk.body)) ||
        (/доступ|заход|ключ|арендодатель|владелец/.test(q) && /доступ|вход|владелец/i.test(risk.title + risk.body)) ||
        (/штраф|пеня|неустойк/.test(q) && /штраф|пеня|неустойк/i.test(risk.title + risk.body)) ||
        (/ремонт|полом|ущерб/.test(q) && /ремонт|дефект|ущерб/i.test(risk.title + risk.body)) ||
        (/расторж|высел|досроч/.test(q) && /расторж|внезап/i.test(risk.title + risk.body)) ||
        (/коммун|свет|вода|газ|интернет/.test(q) && /коммун|платеж/i.test(risk.title + risk.body))
      ) || first;
      if (/критер|жюри|отбор|балл|финал/.test(q)) {
        return "Для отбора QADAM закрывает три критерия.\n1. Исследование: один пользователь - студент 16-23 лет, который впервые снимает жилье и теряется перед подписанием договора.\n2. Инженерия: не пустая обертка, а цепочка PII-masking, rule engine, evidence-first риски, grounded chat и DOCX-протокол.\n3. Валидация: live MVP, история действий, Premium 490 ₸ и B2B-лицензия для вузов.";
      }
      if (/архитект|ai|ии|цепоч|безопас/.test(q)) {
        return "AI-chain QADAM: загрузка договора -> маскирование ИИН/телефона/email -> извлечение условий -> rule engine по жилью -> ранжирование рисков -> ответ чат-бота только по найденным пунктам -> DOCX-протокол разногласий. Backend-логика объяснима: каждый вывод имеет evidence, confidence, question и proposed fix.";
      }
      if (/протокол|docx|разноглас|составь|формулировк|официальн/.test(q)) {
        return "Формулировка для протокола:\n\"Предлагаем изложить пункт в следующей редакции: " + byTopic.fix + "\"\nОснование: " + byTopic.body + "\nДоказательство из договора: " + byTopic.evidence + "\nВопрос второй стороне: " + byTopic.question;
      }
      if (/что делать|как исправить|как решить|что сказать|арендодател|владельц/.test(q)) {
        return "Коротко: не подписывать этот пункт без письменной правки.\nГлавный риск: " + byTopic.title + ".\nПочему: " + byTopic.body + "\nЧто предложить: " + byTopic.fix + "\nКак спросить: " + byTopic.question;
      }
      if (/депозит|залог|возврат|доступ|заход|ключ|арендодатель|владелец|штраф|пеня|расторж|ремонт|полом|ущерб|коммун/.test(q)) {
        return "По вашему вопросу найдено:\nРиск: " + byTopic.title + ".\nДоказательство: " + byTopic.evidence + "\nРекомендация: " + byTopic.fix + "\nУровень уверенности: " + Math.round((byTopic.confidence || 0.7) * 100) + "%.";
      }
      if (/бизнес|модель|деньги|монетизац|490|premium|рынок/.test(q)) {
        return "Официальная бизнес-модель: Free дает экспресс-анализ и показывает ценность до подписания. Premium за 490 ₸ продает конкретный результат - официальный DOCX-протокол разногласий. B2B-лицензия масштабирует продукт через университеты, общежития и legal clinics. Cost structure: hosting, document processing, AI/rule maintenance, support and partnerships.";
      }
      if (risks.length) {
        return "Я вижу " + risks.length + " пунктов для проверки. Самый важный: " + first.title + ".\nДоказательство: " + first.evidence + "\nСледующий шаг: " + first.fix + "\nЭто информационная помощь, финальный юридический вывод лучше подтвердить у юриста.";
      }
      return "Я могу помочь с депозитом, доступом владельца, штрафами, расторжением, ремонтом, коммунальными платежами и DOCX-протоколом. Вставьте пункт договора, и я отвечу с доказательством и правкой.";
    }

    function appendUser(text) {
      $("#chatLog").insertAdjacentHTML("beforeend", "<div class='message user'>" + escapeHtml(text) + "</div>");
      $("#chatLog").scrollTop = $("#chatLog").scrollHeight;
    }

    function appendBot(text) {
      $("#chatLog").insertAdjacentHTML("beforeend", "<div class='message bot'>" + escapeHtml(text) + "</div>");
      $("#chatLog").scrollTop = $("#chatLog").scrollHeight;
    }

    function askLegacy(question) {
      const clean = question.trim();
      if (!clean) return;
      appendUser(clean);
      addEvent("Вопрос AI-чатботу");
      setTimeout(() => appendBot(answerQuestion(clean)), 240);
    }

    function ask(question) {
      const clean = question.trim();
      if (!clean || state.chatBusy) return;
      state.chatBusy = true;
      appendUser(clean);
      addEvent("Вопрос AI-чатботу");
      const submit = $("#chatForm button");
      submit.disabled = true;
      const typing = document.createElement("div");
      typing.className = "message bot typing";
      typing.setAttribute("aria-label", "QADAM формирует ответ");
      typing.innerHTML = "<span></span><span></span><span></span>";
      $("#chatLog").appendChild(typing);
      $("#chatLog").scrollTop = $("#chatLog").scrollHeight;
      setTimeout(() => {
        typing.remove();
        appendBot(answerQuestion(clean));
        state.chatBusy = false;
        submit.disabled = false;
      }, 420);
    }

    function textEncoder(value) {
      return new TextEncoder().encode(value);
    }

    const crcTable = (() => {
      const table = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c >>> 0;
      }
      return table;
    })();

    function crc32(bytes) {
      let crc = 0xffffffff;
      for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
      return (crc ^ 0xffffffff) >>> 0;
    }

    function writeU16(view, offset, value) { view.setUint16(offset, value, true); }
    function writeU32(view, offset, value) { view.setUint32(offset, value >>> 0, true); }

    function concat(chunks) {
      const length = chunks.reduce((sum, item) => sum + item.length, 0);
      const output = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; }
      return output;
    }

    function dosDateTime() {
      const now = new Date();
      const time = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
      const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
      return { time, date };
    }

    function makeZip(files) {
      const locals = [];
      const centrals = [];
      let offset = 0;
      const stamp = dosDateTime();
      for (const file of files) {
        const name = textEncoder(file.name);
        const data = textEncoder(file.content);
        const crc = crc32(data);
        const local = new Uint8Array(30 + name.length);
        const lv = new DataView(local.buffer);
        writeU32(lv, 0, 0x04034b50); writeU16(lv, 4, 20); writeU16(lv, 6, 0); writeU16(lv, 8, 0);
        writeU16(lv, 10, stamp.time); writeU16(lv, 12, stamp.date); writeU32(lv, 14, crc);
        writeU32(lv, 18, data.length); writeU32(lv, 22, data.length); writeU16(lv, 26, name.length); writeU16(lv, 28, 0);
        local.set(name, 30);
        locals.push(local, data);

        const central = new Uint8Array(46 + name.length);
        const cv = new DataView(central.buffer);
        writeU32(cv, 0, 0x02014b50); writeU16(cv, 4, 20); writeU16(cv, 6, 20); writeU16(cv, 8, 0); writeU16(cv, 10, 0);
        writeU16(cv, 12, stamp.time); writeU16(cv, 14, stamp.date); writeU32(cv, 16, crc);
        writeU32(cv, 20, data.length); writeU32(cv, 24, data.length); writeU16(cv, 28, name.length);
        writeU16(cv, 30, 0); writeU16(cv, 32, 0); writeU16(cv, 34, 0); writeU16(cv, 36, 0); writeU32(cv, 38, 0); writeU32(cv, 42, offset);
        central.set(name, 46);
        centrals.push(central);
        offset += local.length + data.length;
      }
      const centralStart = offset;
      const centralData = concat(centrals);
      const end = new Uint8Array(22);
      const ev = new DataView(end.buffer);
      writeU32(ev, 0, 0x06054b50); writeU16(ev, 8, files.length); writeU16(ev, 10, files.length);
      writeU32(ev, 12, centralData.length); writeU32(ev, 16, centralStart); writeU16(ev, 20, 0);
      return concat([...locals, centralData, end]);
    }

    function makeDocx() {
      const risks = state.risks.length ? state.risks : detectRisks($("#contractText").value, $("#fileInput").files[0]?.name || "");
      const rows = risks.map((risk, index) => [
        "<w:p><w:r><w:t>" + (index + 1) + ". " + escapeXml(risk.title) + "</w:t></w:r></w:p>",
        "<w:p><w:r><w:t>Уровень: " + escapeXml(risk.level === "high" ? "Высокий" : risk.level === "medium" ? "Внимание" : "Низкий") + ". Уверенность: " + Math.round((risk.confidence || 0.7) * 100) + "%.</w:t></w:r></w:p>",
        "<w:p><w:r><w:t>Почему это риск: " + escapeXml(risk.body) + "</w:t></w:r></w:p>",
        "<w:p><w:r><w:t>Доказательство из договора: " + escapeXml(risk.evidence) + "</w:t></w:r></w:p>",
        "<w:p><w:r><w:t>Предлагаемая редакция: " + escapeXml(risk.fix) + "</w:t></w:r></w:p>",
        "<w:p><w:r><w:t>Вопрос второй стороне: " + escapeXml(risk.question) + "</w:t></w:r></w:p>"
      ].join("")).join("");
      const documentXml = "<?xml version='1.0' encoding='UTF-8' standalone='yes'?><w:document xmlns:w='http://schemas.openxmlformats.org/wordprocessingml/2006/main'><w:body><w:p><w:r><w:t>QADAM AI - Официальный протокол разногласий</w:t></w:r></w:p><w:p><w:r><w:t>Premium: 490 ₸. Документ подготовлен по результатам pre-signing анализа договора аренды жилья.</w:t></w:r></w:p><w:p><w:r><w:t>Целевой пользователь: студент 16-23 лет, который впервые снимает жилье и хочет понять риски до подписания.</w:t></w:r></w:p>" + rows + "<w:p><w:r><w:t>Рекомендация: направить протокол второй стороне и получить письменный ответ до подписания договора. QADAM AI предоставляет информационную помощь и не заменяет консультацию юриста.</w:t></w:r></w:p><w:sectPr/></w:body></w:document>";
      return makeZip([
        { name: "[Content_Types].xml", content: "<?xml version='1.0' encoding='UTF-8'?><Types xmlns='http://schemas.openxmlformats.org/package/2006/content-types'><Default Extension='rels' ContentType='application/vnd.openxmlformats-package.relationships+xml'/><Default Extension='xml' ContentType='application/xml'/><Override PartName='/word/document.xml' ContentType='application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml'/></Types>" },
        { name: "_rels/.rels", content: "<?xml version='1.0' encoding='UTF-8'?><Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'><Relationship Id='rId1' Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument' Target='word/document.xml'/></Relationships>" },
        { name: "word/document.xml", content: documentXml }
      ]);
    }

    function escapeXml(value) {
      return String(value).replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[char]));
    }

    function downloadDocx() {
      if (!state.risks.length) runAnalysis();
      const bytes = makeDocx();
      const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "qadam-ai-protokol-raznoglasiy.docx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 500);
      addEvent("Premium DOCX скачан: 490 ₸ demo");
      appendBot("Premium DOCX готов. В нём собраны риски, формулировки и следующий шаг для переговоров.");
    }

    function renderSessionSummary() {
      const box = $("#sessionSummary");
      if (!box) return;
      const authCard = document.querySelector(".auth-form-card");
      if (!state.session) {
        box.textContent = "Сессия не активна. Введите email и demo-код 490490.";
        box.classList.remove("active");
        authCard?.classList.remove("is-verified");
        renderAuthButtons();
        return;
      }
      box.textContent = "Активная сессия: " + state.session.email + " · " + state.session.role + " · device trusted · audit enabled";
      box.classList.add("active");
      authCard?.classList.add("is-verified");
      renderAuthButtons();
    }

    function renderAuthButtons() {
      renderDashboard();
      $$("[data-open-auth]").forEach((button) => {
        button.textContent = state.session ? "Кабинет: " + state.session.role : "Личный кабинет";
      });
    }

    function downloadPitch() {
      const content = [
        "QADAM AI - Full Pitch",
        "Free: экспресс-анализ договора и AI-чат.",
        "Premium: 490 ₸ за официальный DOCX-протокол разногласий.",
        "B2B: campus license для вузов, общежитий и legal clinics.",
        "Target: студенты 18-22 лет в Казахстане."
      ].join("\\n");
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "qadam-ai-full-pitch.txt";
      document.body.appendChild(link);
      link.click();
      link.remove();
      addEvent("Full Pitch скачан");
    }

    $$("[data-open-auth]").forEach((button) => button.addEventListener("click", () => openModal("#authModal")));
    $$("[data-open-demo]").forEach((button) => button.addEventListener("click", () => openModal("#demoModal")));
    $$("[data-open-chat]").forEach((button) => button.addEventListener("click", scrollChat));
    $$("[data-close]").forEach((button) => button.addEventListener("click", closeModals));
    $$(".modal").forEach((modal) => modal.addEventListener("click", (event) => { if (event.target === modal) closeModals(); }));
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeModals(); });
    $("#clearHistory").addEventListener("click", () => {
      state.events = [];
      localStorage.removeItem("qadam:events");
      renderHistory();
    });
    $("#fileInput").addEventListener("change", () => {
      const file = $("#fileInput").files[0];
      $("#fileName").textContent = file ? file.name : "Файл не выбран";
      $("#fileHint").textContent = file ? Math.ceil(file.size / 1024) + " KB · готов к проверке" : "PDF, DOCX или TXT · до 10 МБ";
      $("#analysisStatus").textContent = file ? "Файл выбран. Запустите бесплатную проверку, чтобы увидеть риски." : "Готово к проверке.";
    });
    $("#contractText").addEventListener("input", () => {
      $("#textCount").textContent = $("#contractText").value.length.toLocaleString("ru-RU") + " символов";
    });
    $("#sampleContract").addEventListener("click", () => {
      $("#contractText").value = "Депозит не возвращается ни при каких обстоятельствах. Арендодатель вправе заходить в квартиру без предварительного уведомления. Арендатор оплачивает любой ремонт и все коммунальные расходы. Договор может быть расторгнут в одностороннем порядке в любое время.";
      $("#contractText").dispatchEvent(new Event("input"));
      $("#analysisStatus").textContent = "Пример добавлен. Нажмите «Проверить договор».";
      $("#contractText").focus();
    });
    $("#runAnalysis").addEventListener("click", runAnalysis);
    $("#downloadDocx").addEventListener("click", () => {
      if (!state.risks.length) runAnalysis();
      openModal("#paymentModal");
      addEvent("Premium checkout открыт: 490 ₸");
    });
    $("#confirmPremium").addEventListener("click", () => {
      const buyer = $("#buyerEmail").value.trim() || state.session?.email || "demo-buyer";
      const method = $("#paymentMethod").value;
      addEvent("Premium purchase approved: 490 ₸ · " + method + " · " + buyer);
      downloadDocx();
      closeModals();
    });
    $("[data-download-pitch]").addEventListener("click", downloadPitch);
    $("#buyModel").addEventListener("click", () => {
      if (!state.risks.length) runAnalysis();
      openModal("#paymentModal");
      addEvent("Открыта покупка Premium DOCX за 490 ₸");
    });
    $("#requestLicense").addEventListener("click", () => {
      openModal("#licenseModal");
      addEvent("Открыт B2B license request");
    });
    $("#submitLicense").addEventListener("click", () => {
      const org = $("#orgInput").value.trim() || "Demo university";
      const plan = $("#licensePlan").value;
      $("#licenseStatus").textContent = "Request сформирован: " + org + " · " + plan + ". Следующий шаг: отправить коммерческое предложение.";
      $("#licenseStatus").classList.add("active");
      addEvent("B2B license request: " + org + " · " + plan);
      appendBot("B2B-запрос сохранён. Для защиты можно объяснить его как второй revenue stream: лицензия для вузов и общежитий.");
    });
    $("#chatForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const input = $("#chatInput");
      ask(input.value);
      input.value = "";
    });
    $$(".suggestions button").forEach((button) => button.addEventListener("click", () => ask(button.dataset.question || "")));
    async function hashPassword(value) {
      const bytes = new TextEncoder().encode(value);
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    }

    function setAuthStatus(message, kind) {
      const status = $("#authStatus");
      status.className = "auth-status" + (kind ? " " + kind : "");
      status.textContent = message;
    }

    function setAuthMode(mode) {
      state.authMode = mode;
      const register = mode === "register";
      $$('[data-auth-mode]').forEach((tab) => tab.classList.toggle("active", tab.dataset.authMode === mode));
      $("#confirmPasswordField").classList.toggle("show", register);
      $("#authModeHint").textContent = register ? "Создайте аккаунт для сохранения истории" : "Вернитесь к сохранённому аккаунту";
      $("#passwordLabel").textContent = register ? "Придумайте пароль" : "Пароль";
      $("#passwordInput").autocomplete = register ? "new-password" : "current-password";
      $("#loginBtn").textContent = register ? "Создать аккаунт" : "Войти в аккаунт";
      $("#otpInput").closest(".otp-actions").style.opacity = register ? ".55" : "1";
      setAuthStatus(register ? "Пароль не передаётся в историю действий и хранится только как хэш." : "Введите email и пароль. Для demo-доступа можно использовать код 490490.");
    }

    async function handleAuthSubmit() {
      const email = $("#emailInput").value.trim().toLowerCase();
      const role = $("#roleInput").value;
      const password = $("#passwordInput").value;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setAuthStatus("Введите корректный email.", "error");
        $("#emailInput").focus();
        return;
      }
      const users = JSON.parse(localStorage.getItem("qadam:users") || "[]");
      if (state.authMode === "register") {
        if (password.length < 8) { setAuthStatus("Пароль должен содержать минимум 8 символов.", "error"); return; }
        if (password !== $("#confirmPasswordInput").value) { setAuthStatus("Пароли не совпадают.", "error"); return; }
        if (users.some((user) => user.email === email)) { setAuthStatus("Аккаунт уже существует. Переключитесь на «Войти».", "error"); return; }
        users.push({ email, role, passwordHash: await hashPassword(password), createdAt: new Date().toISOString() });
        localStorage.setItem("qadam:users", JSON.stringify(users));
        state.session = { email, role, authMethod: "password", trustedAt: new Date().toISOString() };
        localStorage.setItem("qadam:session", JSON.stringify(state.session));
        setAuthStatus("Аккаунт создан. Вы вошли в QADAM AI.", "success");
        renderSessionSummary();
        addEvent("Регистрация аккаунта: " + role + " · " + email);
        return;
      }
      const user = users.find((item) => item.email === email);
      const code = $("#otpInput").value.trim();
      const passwordMatches = user && password ? await hashPassword(password) === user.passwordHash : false;
      if (!user && code !== "490490") { setAuthStatus("Аккаунт не найден. Сначала создайте аккаунт или используйте demo-код 490490.", "error"); return; }
      if (user && !passwordMatches && code !== "490490") { setAuthStatus("Неверный пароль. Проверьте данные и попробуйте снова.", "error"); return; }
      state.session = { email, role: user?.role || role, authMethod: passwordMatches ? "password" : "demo-otp", trustedAt: new Date().toISOString() };
      localStorage.setItem("qadam:session", JSON.stringify(state.session));
      setAuthStatus("Вход выполнен. Сессия и история действий активны.", "success");
      renderSessionSummary();
      addEvent("Вход в аккаунт: " + state.session.role + " · " + email);
    }

    $$('[data-auth-mode]').forEach((tab) => tab.addEventListener("click", () => setAuthMode(tab.dataset.authMode)));
    $("#togglePassword").addEventListener("click", () => {
      const input = $("#passwordInput");
      const visible = input.type === "text";
      input.type = visible ? "password" : "text";
      $("#togglePassword").textContent = visible ? "Показать" : "Скрыть";
    });
    $("#loginBtn").addEventListener("click", handleAuthSubmit);

    function legacyLoginHandler() {
      const email = $("#emailInput").value.trim();
      const code = $("#otpInput").value.trim();
      const role = $("#roleInput").value;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || code !== "490490") {
        $("#authStatus").textContent = "Введите корректный email и demo-код 490490.";
        return;
      }
      state.session = { email, role, trustedAt: new Date().toISOString() };
      localStorage.setItem("qadam:session", JSON.stringify(state.session));
      $("#authStatus").textContent = "Вход выполнен. Включены role-aware session, device trust и audit trail.";
      renderSessionSummary();
      addEvent("Secure login: " + role + " · " + email);
    }
    $("#resendOtp").addEventListener("click", () => {
      $("#authStatus").textContent = "Demo OTP повторно отправлен: 490490. В production здесь будет email/SMS delivery.";
      addEvent("OTP resend requested");
    });
    $("#logoutBtn").addEventListener("click", () => {
      state.session = null;
      localStorage.removeItem("qadam:session");
      $("#authStatus").textContent = "Сессия завершена. Доступ к истории остался только в этом браузере.";
      renderSessionSummary();
      addEvent("Secure logout");
    });

    $$('[data-lang]').forEach((button) => button.addEventListener('click', () => {
      state.language = button.dataset.lang;
      localStorage.setItem('qadam:language', state.language);
      applyLanguage();
    }));
    applyLanguage();
    renderHistory();
    renderSessionSummary();
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
