import { mkdir } from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";

const appUrl = process.env.QADAM_CAPTURE_URL ?? "http://127.0.0.1:3000";
const outputDir = path.resolve(process.cwd(), "../../docs/assets");
const demoPdf = path.resolve(process.cwd(), "../../demo/contracts/qadam-risky-contract.pdf");

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

try {
  await page.goto(appUrl, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(outputDir, "qadam-landing.png") });

  await page.getByLabel("Выберите договор").setInputFiles(demoPdf);
  await page.getByRole("checkbox", { name: /согласен на обработку/i }).check();
  await page.getByRole("button", { name: "Проверить договор" }).click();
  await page.getByRole("heading", { name: "Что проверить до подписания" }).waitFor({
    timeout: 20_000,
  });
  await page.screenshot({ path: path.join(outputDir, "qadam-report.png") });

  await page.getByRole("button", { name: "Подготовить сообщение арендодателю" }).click();
  await page.getByRole("dialog").waitFor();
  await page.screenshot({ path: path.join(outputDir, "qadam-negotiation.png") });
} finally {
  await browser.close();
}
