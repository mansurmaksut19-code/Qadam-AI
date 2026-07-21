import path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "@playwright/test";

const source = path.resolve(process.cwd(), "../../pitch/QADAM_AI_Pitch_Deck.html");
const output = path.resolve(process.cwd(), "../../pitch/QADAM_AI_Pitch_Deck.pdf");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

try {
  await page.goto(pathToFileURL(source).href, { waitUntil: "networkidle" });
  await page.pdf({
    path: output,
    printBackground: true,
    preferCSSPageSize: true,
    tagged: true,
  });
} finally {
  await browser.close();
}
