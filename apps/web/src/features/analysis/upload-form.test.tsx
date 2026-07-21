import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UploadForm } from "@/features/analysis/upload-form";
import { ApiProblem, type AcceptedAnalysis } from "@/lib/api-client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const accepted: AcceptedAnalysis = {
  analysisId: "9f63ee97-e132-4a69-a2df-a66bbdd4b369",
  accessToken: "private-token-123",
  status: "completed",
};

describe("UploadForm", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("labels the native file field and explains limits", () => {
    render(<UploadForm onUpload={vi.fn()} onNavigate={vi.fn()} />);

    expect(screen.getByLabelText("Выберите договор")).toHaveAttribute(
      "accept",
      ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    expect(screen.getByText(/PDF или DOCX, до 10 МБ/)).toBeVisible();
    expect(screen.getByRole("checkbox", { name: /согласен на обработку/ })).toBeRequired();
  });

  it("requires consent before sending a selected PDF", async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn().mockResolvedValue(accepted);
    render(<UploadForm onUpload={onUpload} onNavigate={vi.fn()} />);
    await user.upload(
      screen.getByLabelText("Выберите договор"),
      new File(["%PDF-contract"], "lease.pdf", { type: "application/pdf" }),
    );

    await user.click(screen.getByRole("button", { name: "Проверить договор" }));

    expect(onUpload).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Подтвердите согласие");
  });

  it("rejects an oversized DOCX on the client", async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn();
    render(<UploadForm onUpload={onUpload} onNavigate={vi.fn()} />);
    const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "lease.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    await user.upload(screen.getByLabelText("Выберите договор"), file);

    expect(screen.getByRole("alert")).toHaveTextContent("Файл больше 10 МБ");
    expect(onUpload).not.toHaveBeenCalled();
  });

  it("keeps its label and announces loading while the API is pending", async () => {
    const user = userEvent.setup();
    let resolveUpload: (value: AcceptedAnalysis) => void = () => undefined;
    const pending = new Promise<AcceptedAnalysis>((resolve) => {
      resolveUpload = resolve;
    });
    render(<UploadForm onUpload={() => pending} onNavigate={vi.fn()} />);
    await user.upload(
      screen.getByLabelText("Выберите договор"),
      new File(["%PDF-contract"], "lease.pdf", { type: "application/pdf" }),
    );
    await user.click(screen.getByRole("checkbox", { name: /согласен на обработку/ }));
    await user.click(screen.getByRole("button", { name: "Проверить договор" }));

    expect(screen.getByRole("button", { name: "Проверить договор" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.getByRole("status")).toHaveTextContent("Загружаем и проверяем файл");

    resolveUpload(accepted);
  });

  it("shows a safe API problem and allows retry", async () => {
    const user = userEvent.setup();
    const onUpload = vi
      .fn()
      .mockRejectedValueOnce(
        new ApiProblem("unsupported_type", "Поддерживаются только PDF и DOCX."),
      )
      .mockResolvedValueOnce(accepted);
    render(<UploadForm onUpload={onUpload} onNavigate={vi.fn()} />);
    await user.upload(
      screen.getByLabelText("Выберите договор"),
      new File(["contract"], "lease.pdf", { type: "application/pdf" }),
    );
    await user.click(screen.getByRole("checkbox", { name: /согласен на обработку/ }));

    await user.click(screen.getByRole("button", { name: "Проверить договор" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Поддерживаются только PDF");
    await user.click(screen.getByRole("button", { name: "Проверить договор" }));

    expect(onUpload).toHaveBeenCalledTimes(2);
  });

  it("supports keyboard focus order and navigates after success", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<UploadForm onUpload={vi.fn().mockResolvedValue(accepted)} onNavigate={onNavigate} />);

    await user.tab();
    expect(screen.getByLabelText("Выберите договор")).toHaveFocus();
    await user.upload(
      screen.getByLabelText("Выберите договор"),
      new File(["contract"], "lease.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
    );
    await user.click(screen.getByRole("checkbox", { name: /согласен на обработку/ }));
    await user.click(screen.getByRole("button", { name: "Проверить договор" }));

    expect(onNavigate).toHaveBeenCalledWith(
      "/analysis/9f63ee97-e132-4a69-a2df-a66bbdd4b369",
    );
    expect(localStorage.getItem("qadam:analysis:9f63ee97-e132-4a69-a2df-a66bbdd4b369:token")).toBe(
      "private-token-123",
    );
  });
});
