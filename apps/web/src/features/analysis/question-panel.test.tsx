import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { QuestionPanel } from "@/features/analysis/question-panel";
import type { QuestionAnswer } from "@/lib/api-client";

const citedAnswer: QuestionAnswer = {
  answer: "По договору срок возврата депозита не указан.",
  mode: "document",
  supported: true,
  confidence: 0.86,
  evidence: [
    {
      blockIndex: 0,
      page: 1,
      excerpt: "Депозит возвращается в течение семи рабочих дней.",
      score: 0.86,
    },
  ],
  citations: [
    {
      sourceId: "civil-552",
      sourceTitle: "Гражданский кодекс Республики Казахстан",
      reference: "Статья 552",
      url: "https://adilet.zan.kz/rus/docs/K990000409_",
      excerpt: "Официальный фрагмент",
    },
  ],
};

describe("QuestionPanel", () => {
  it("offers only report-specific suggested questions", async () => {
    const user = userEvent.setup();
    render(
      <QuestionPanel
        analysisId="analysis-1"
        onAsk={vi.fn()}
        suggestions={["Какая ежемесячная плата?"]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Какая ежемесячная плата?" }));

    expect(screen.getByLabelText("Вопрос по договору")).toHaveValue("Какая ежемесячная плата?");
    expect(screen.queryByRole("button", { name: "Кто оплачивает ремонт?" })).not.toBeInTheDocument();
  });

  it("hides suggestion controls when the report has no grounded templates", () => {
    render(<QuestionPanel analysisId="analysis-1" onAsk={vi.fn()} suggestions={[]} />);

    expect(screen.queryByLabelText("Примеры вопросов")).not.toBeInTheDocument();
  });

  it("keeps the submit label while pending and renders a cited answer", async () => {
    const user = userEvent.setup();
    let resolve: (answer: QuestionAnswer) => void = () => undefined;
    const pending = new Promise<QuestionAnswer>((done) => {
      resolve = done;
    });
    render(<QuestionPanel analysisId="analysis-1" onAsk={() => pending} suggestions={[]} />);
    await user.type(screen.getByLabelText("Вопрос по договору"), "Когда вернут депозит?");
    await user.click(screen.getByRole("button", { name: "Получить ответ" }));

    expect(screen.getByRole("button", { name: "Получить ответ" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.getByRole("status")).toHaveTextContent("Ищем ответ");

    resolve(citedAnswer);
    expect(await screen.findByText(citedAnswer.answer)).toBeVisible();
    expect(screen.getByText("Фрагмент договора")).toBeVisible();
    expect(screen.getByText(/семи рабочих дней/)).toBeVisible();
    expect(screen.getByText("Страница 1")).toBeVisible();
    expect(screen.getByRole("link", { name: /Статья 552/ })).toHaveAttribute(
      "href",
      "https://adilet.zan.kz/rus/docs/K990000409_",
    );
  });

  it("clearly refuses an unsupported answer", async () => {
    const user = userEvent.setup();
    render(
      <QuestionPanel
        analysisId="analysis-1"
        suggestions={[]}
        onAsk={vi.fn().mockResolvedValue({
          answer: "Не могу подтвердить ответ материалами договора.",
          mode: "unsupported",
          supported: false,
          confidence: 0,
          evidence: [],
          citations: [],
        })}
      />,
    );
    await user.type(screen.getByLabelText("Вопрос по договору"), "Какие акции купить?");
    await user.click(screen.getByRole("button", { name: "Получить ответ" }));

    expect(await screen.findByText(/Не могу подтвердить/)).toBeVisible();
    expect(screen.getByText("Ответ не найден в тексте договора")).toBeVisible();
  });

  it("labels grounded finding actions separately from document facts", async () => {
    const user = userEvent.setup();
    render(
      <QuestionPanel
        analysisId="analysis-1"
        suggestions={[]}
        onAsk={vi.fn().mockResolvedValue({
          ...citedAnswer,
          answer: "1. Депозит: Зафиксируйте срок возврата.",
          mode: "action",
        })}
      />,
    );
    await user.type(screen.getByLabelText("Вопрос по договору"), "Как решить проблемы?");
    await user.click(screen.getByRole("button", { name: "Получить ответ" }));

    expect(await screen.findByText("Действия основаны на найденных пунктах")).toBeVisible();
  });

  it("uses a block label when the source has no page number", async () => {
    const user = userEvent.setup();
    render(
      <QuestionPanel
        analysisId="analysis-1"
        suggestions={[]}
        onAsk={vi.fn().mockResolvedValue({
          ...citedAnswer,
          evidence: [{ ...citedAnswer.evidence[0], blockIndex: 2, page: null }],
        })}
      />,
    );
    await user.type(screen.getByLabelText("Вопрос по договору"), "Какой срок?");
    await user.click(screen.getByRole("button", { name: "Получить ответ" }));

    expect(await screen.findByText("Блок 3")).toBeVisible();
  });

  it("recovers after a network error", async () => {
    const user = userEvent.setup();
    const onAsk = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(citedAnswer);
    render(<QuestionPanel analysisId="analysis-1" onAsk={onAsk} suggestions={[]} />);
    await user.type(screen.getByLabelText("Вопрос по договору"), "Когда вернут депозит?");

    await user.click(screen.getByRole("button", { name: "Получить ответ" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось получить ответ");
    await user.click(screen.getByRole("button", { name: "Получить ответ" }));

    expect(await screen.findByText(citedAnswer.answer)).toBeVisible();
    expect(onAsk).toHaveBeenCalledTimes(2);
  });
});
