import path from "node:path";

import { expect, test } from "@playwright/test";

test("student checks a risky contract and prepares a landlord message", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Поймите договор аренды до того, как поставите подпись" }),
  ).toBeVisible();
  await expect(page.getByText(/не замена консультации юриста/i)).toBeVisible();

  const demoPdf = path.resolve(process.cwd(), "../../demo/contracts/qadam-risky-contract.pdf");
  await page.getByLabel("Выберите договор").setInputFiles(demoPdf);
  await page.getByRole("checkbox", { name: /согласен на обработку/i }).check();
  await page.getByRole("button", { name: "Проверить договор" }).click();

  await expect(page).toHaveURL(/\/analysis\/[0-9a-f-]+/);
  await expect(page.getByText("Извлекаем условия договора")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Что проверить до подписания" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText("Высокий приоритет").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /депозит/i }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /немедленн.*расторж/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Статья/ }).first()).toHaveAttribute(
    "href",
    /^https:\/\/adilet\.zan\.kz\//,
  );

  await page.getByLabel("Вопрос по договору").fill("Когда мне должны вернуть депозит?");
  await page.getByRole("button", { name: "Получить ответ" }).click();
  await expect(page.getByText("Ответ подтверждён текстом договора")).toBeVisible();
  await expect(page.getByLabel("Помощь по отчёту").getByText("Фрагмент договора")).toBeVisible();

  await page.getByRole("button", { name: "Подготовить сообщение арендодателю" }).click();
  const findingSelect = page.getByLabel("Пункт для обсуждения");
  const terminationValue = await findingSelect
    .locator("option")
    .filter({ hasText: /расторж/i })
    .getAttribute("value");
  await findingSelect.selectOption(terminationValue ?? "");
  await page.getByRole("button", { name: "Составить сообщение" }).click();
  await expect(page.getByLabel("Готовое сообщение")).toHaveValue(/расторгнуть|уведомлен/i);
});

test("answers non-catalogue questions from a previously unseen contract", async ({ page }) => {
  await page.goto("/");
  const challengePdf = path.resolve(
    process.cwd(),
    "../../demo/contracts/qadam-qa-challenge-contract.pdf",
  );
  await page.getByLabel("Выберите договор").setInputFiles(challengePdf);
  await page.getByRole("checkbox", { name: /согласен на обработку/i }).check();
  await page.getByRole("button", { name: "Проверить договор" }).click();

  await expect(page.getByRole("heading", { name: "Что проверить до подписания" })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByLabel("Вопрос по договору").fill("В каком городе находится квартира?");
  await page.getByRole("button", { name: "Получить ответ" }).click();

  await expect(page.getByText("Ответ подтверждён текстом договора")).toBeVisible();
  await expect(page.getByText(/Караганда/).last()).toBeVisible();
  await expect(page.getByLabel("Помощь по отчёту").getByText("Фрагмент договора")).toBeVisible();
  await expect(page.getByText("Страница 1")).toBeVisible();

  await page.getByLabel("Вопрос по договору").fill("Можно ли жить с кошкой?");
  await page.getByRole("button", { name: "Получить ответ" }).click();
  await expect(page.getByText(/домашней кошкой/).last()).toBeVisible();
});

test("answers mixed-language facts and grounded actions", async ({ page }) => {
  await page.goto("/");
  const mixedPdf = path.resolve(
    process.cwd(),
    "../../demo/contracts/qadam-mixed-language-contract.pdf",
  );
  await page.getByLabel("Выберите договор").setInputFiles(mixedPdf);
  await page.getByRole("checkbox", { name: /согласен на обработку/i }).check();
  await page.getByRole("button", { name: "Проверить договор" }).click();

  await expect(page.getByRole("heading", { name: "Что проверить до подписания" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("button", { name: "Какая ежемесячная плата?" })).toBeVisible();
  await expect(page.getByRole("button", { name: /повысить|изменить цену/i })).toHaveCount(0);

  await page.getByLabel("Вопрос по договору").fill("Какая арендная плата?");
  await page.getByRole("button", { name: "Получить ответ" }).click();
  await expect(page.getByText("Ответ подтверждён текстом договора")).toBeVisible();
  await expect(page.getByText(/160 000/).last()).toBeVisible();

  await page.getByLabel("Вопрос по договору").fill("Как решить найденные проблемы?");
  await page.getByRole("button", { name: "Получить ответ" }).click();
  await expect(page.getByText("Действия основаны на найденных пунктах")).toBeVisible();
  await expect(page.getByText(/письменный срок уведомления/i).last()).toBeVisible();
});
