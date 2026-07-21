import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { NegotiationDialog } from "@/features/analysis/negotiation-dialog";
import type { Finding } from "@/lib/report-types";

const findings: Finding[] = [
  {
    id: "deposit-finding",
    severity: "high",
    category: "deposit",
    title: "Депозит не возвращается",
    explanation: "Не указан срок возврата.",
    action: "Уточните срок.",
    landlordQuestion: "Когда возвращается депозит?",
    confidence: 0.9,
    clause: null,
    citations: [],
  },
  {
    id: "rent-finding",
    severity: "attention",
    category: "rent_change",
    title: "Изменение цены",
    explanation: "Нет срока уведомления.",
    action: "Добавьте 30 дней.",
    landlordQuestion: "Когда предупредите об изменении цены?",
    confidence: 0.8,
    clause: null,
    citations: [],
  },
];

describe("NegotiationDialog", () => {
  it("generates a message for the selected finding and copies it", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    const onGenerate = vi.fn().mockResolvedValue({
      findingId: "rent-finding",
      message: "Здравствуйте! За сколько дней вы предупредите об изменении цены?",
    });
    render(
      <NegotiationDialog analysisId="analysis-1" findings={findings} onGenerate={onGenerate} />,
    );
    await user.click(screen.getByRole("button", { name: "Подготовить сообщение арендодателю" }));
    await user.selectOptions(screen.getByLabelText("Пункт для обсуждения"), "rent-finding");
    await user.click(screen.getByRole("button", { name: "Составить сообщение" }));

    const message = await screen.findByLabelText("Готовое сообщение");
    expect(message).toHaveValue("Здравствуйте! За сколько дней вы предупредите об изменении цены?");
    expect(onGenerate).toHaveBeenCalledWith("rent-finding", "polite");
    await user.click(screen.getByRole("button", { name: "Скопировать сообщение" }));
    expect(writeText).toHaveBeenCalledWith(
      "Здравствуйте! За сколько дней вы предупредите об изменении цены?",
    );
    expect(screen.getByRole("status")).toHaveTextContent("Скопировано");
  });

  it("has an accessible close control and restores trigger focus", async () => {
    const user = userEvent.setup();
    render(
      <NegotiationDialog analysisId="analysis-1" findings={findings} onGenerate={vi.fn()} />,
    );
    const trigger = screen.getByRole("button", { name: "Подготовить сообщение арендодателю" });

    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: "Сообщение арендодателю" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Закрыть диалог" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
