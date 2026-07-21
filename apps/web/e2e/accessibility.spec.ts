import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

type AxeViolation = {
  id: string;
  impact: string | null;
  nodes: Array<{ target: string[] }>;
};

async function expectNoSeriousAxeViolations(page: Page): Promise<void> {
  const axePath = path.resolve(process.cwd(), "node_modules/axe-core/axe.min.js");
  await page.addScriptTag({ path: axePath });
  const violations = await page.evaluate(async () => {
    const axe = (
      window as unknown as {
        axe: { run: (root: Document) => Promise<{ violations: AxeViolation[] }> };
      }
    ).axe;
    const result = await axe.run(document);
    return result.violations.filter(({ impact }) => impact === "serious" || impact === "critical");
  });

  expect(violations).toEqual([]);
}

test("landing and completed report have no serious or critical axe violations", async ({ page }) => {
  await page.goto("/");
  await expectNoSeriousAxeViolations(page);

  const demoPdf = path.resolve(process.cwd(), "../../demo/contracts/qadam-risky-contract.pdf");
  await page.getByLabel("Выберите договор").setInputFiles(demoPdf);
  await page.getByRole("checkbox", { name: /согласен на обработку/i }).check();
  await page.getByRole("button", { name: "Проверить договор" }).click();
  await page.getByRole("heading", { name: "Что проверить до подписания" }).waitFor({
    timeout: 20_000,
  });

  await expectNoSeriousAxeViolations(page);
});
