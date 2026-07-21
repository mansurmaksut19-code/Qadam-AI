import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ProcessingStatus } from "@/features/analysis/processing-status";
import { ReportView } from "@/features/analysis/report-view";
import type { AnalysisReport } from "@/lib/report-types";

const report: AnalysisReport = {
  id: "9f63ee97-e132-4a69-a2df-a66bbdd4b369",
  status: "completed",
  language: "ru",
  summary: "Найдено: высокий приоритет — 1, требует внимания — 1.",
  questionSuggestions: ["Как изменить условие о депозите?"],
  missingTerms: ["utilities"],
  failureCode: null,
  severityCounts: { high: 1, attention: 1, info: 1 },
  findings: [
    {
      id: "info-finding",
      severity: "info",
      category: "term",
      title: "Срок договора указан",
      explanation: "Договор действует один год.",
      action: "Сверьте даты перед подписанием.",
      landlordQuestion: "Верно ли указаны даты?",
      confidence: 0.72,
      clause: {
        text: "Срок найма — с 1 сентября 2026 года по 31 августа 2027 года.",
        title: "Срок договора",
        pageStart: 1,
      },
      citations: [],
    },
    {
      id: "high-finding",
      severity: "high",
      category: "deposit",
      title: "Депозит не возвращается",
      explanation: "Не указан расчёт удержаний и срок возврата.",
      action: "Укажите срок возврата и подтверждение каждого удержания.",
      landlordQuestion: "Когда и на каких основаниях возвращается депозит?",
      confidence: 0.94,
      clause: {
        text: "Депозит не возвращается ни при каких обстоятельствах.",
        title: "Возврат депозита",
        pageStart: 2,
      },
      citations: [
        {
          sourceId: "civil-lease-552",
          sourceTitle: "Гражданский кодекс Республики Казахстан",
          reference: "Статья 552",
          url: "https://adilet.zan.kz/rus/docs/K990000409_",
          excerpt: "Наниматель обязан возвратить имущество в надлежащем состоянии.",
        },
      ],
    },
    {
      id: "attention-finding",
      severity: "attention",
      category: "rent_change",
      title: "Цена может измениться",
      explanation: "Не указан срок уведомления.",
      action: "Добавьте письменное уведомление минимум за 30 дней.",
      landlordQuestion: "За сколько дней вы предупредите об изменении цены?",
      confidence: 0.84,
      clause: null,
      citations: [],
    },
  ],
};

describe("ProcessingStatus", () => {
  it("shows real stages without inventing a percentage", () => {
    const { container } = render(<ProcessingStatus status="analyzing" />);

    expect(screen.getByText("Извлекаем условия договора")).toBeVisible();
    expect(screen.getByText("Сопоставляем с официальными источниками")).toBeVisible();
    expect(container.textContent).not.toContain("%");
  });
});

describe("ReportView", () => {
  it("sorts severity, shows counts, confidence, evidence, sources, and next actions", async () => {
    const user = userEvent.setup();
    render(<ReportView report={report} onRetry={vi.fn()} />);

    const articles = screen.getAllByRole("article");
    expect(within(articles[0]).getByText("Высокий приоритет")).toBeVisible();
    expect(within(articles[1]).getByText("Требует внимания")).toBeVisible();
    expect(within(articles[2]).getByText("Информация")).toBeVisible();
    expect(screen.getByText("1 высокий")).toBeVisible();
    expect(screen.getByText("1 требует внимания")).toBeVisible();
    expect(screen.getByText("Высокая уверенность")).toBeVisible();
    expect(screen.getAllByText(/Укажите срок возврата/).length).toBeGreaterThan(0);

    await user.click(within(articles[0]).getByText("Фрагмент договора"));
    expect(screen.getByText("Депозит не возвращается ни при каких обстоятельствах.")).toBeVisible();
    const officialLink = screen.getAllByRole("link", { name: /Статья 552/ })[0];
    expect(officialLink).toHaveAttribute("href", "https://adilet.zan.kz/rus/docs/K990000409_");
    expect(officialLink).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("button", { name: "Как изменить условие о депозите?" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Кто оплачивает ремонт?" })).not.toBeInTheDocument();
  });

  it("names missing terms and does not equate an empty report with legal safety", () => {
    const emptyReport: AnalysisReport = {
      ...report,
      findings: [],
      missingTerms: ["utilities", "termination"],
      severityCounts: { high: 0, attention: 0, info: 0 },
    };

    render(<ReportView report={emptyReport} onRetry={vi.fn()} />);

    expect(screen.getByText("Не найдено условий высокого приоритета")).toBeVisible();
    expect(screen.getByText(/это не означает, что договор юридически безопасен/i)).toBeVisible();
    expect(screen.getByText("Коммунальные платежи")).toBeVisible();
    expect(screen.getByText("Расторжение договора")).toBeVisible();
  });

  it("shows a retryable OCR failure", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <ReportView
        onRetry={onRetry}
        report={{
          ...report,
          status: "failed",
          findings: [],
          missingTerms: [],
          failureCode: "ocr_required",
          severityCounts: { high: 0, attention: 0, info: 0 },
        }}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("не удалось распознать текст");
    await user.click(screen.getByRole("button", { name: "Загрузить другую копию" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
