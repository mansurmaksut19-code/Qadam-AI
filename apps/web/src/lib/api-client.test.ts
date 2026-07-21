import { afterEach, describe, expect, it, vi } from "vitest";

import { askQuestion, createNegotiation, getAnalysis, uploadContract } from "@/lib/api-client";

describe("uploadContract", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the file as multipart form data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          analysis_id: "9f63ee97-e132-4a69-a2df-a66bbdd4b369",
          access_token: "private-token-with-enough-entropy",
          status: "completed",
        }),
        { status: 202, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(["contract"], "contract.pdf", { type: "application/pdf" });

    const result = await uploadContract(file);

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/v1/analyses");
    expect(options.method).toBe("POST");
    expect(options.body).toBeInstanceOf(FormData);
    expect((options.body as FormData).get("file")).toBe(file);
    expect(options.headers).toBeUndefined();
    expect(result.analysisId).toBe("9f63ee97-e132-4a69-a2df-a66bbdd4b369");
  });

  it("turns problem details into a safe typed error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            type: "https://qadam.ai/problems/unsupported_type",
            title: "Файл не принят",
            status: 415,
            detail: "Поддерживаются только PDF и DOCX.",
            code: "unsupported_type",
          }),
          { status: 415, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    );

    await expect(
      uploadContract(new File(["x"], "notes.txt", { type: "text/plain" })),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "unsupported_type",
        message: "Поддерживаются только PDF и DOCX.",
      }),
    );
  });
});

describe("getAnalysis", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("authenticates with the private token and maps the API report", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "9f63ee97-e132-4a69-a2df-a66bbdd4b369",
          status: "completed",
          language: "ru",
          summary: "Один риск",
          findings: [
            {
              id: "b33f2455-d6af-4a95-9635-b510e1a05bd7",
              severity: "high",
              category: "deposit",
              title: "Депозит",
              explanation: "Неясный возврат",
              action: "Уточнить срок",
              landlord_question: "Когда вернёте депозит?",
              confidence: 0.9,
              clause: {
                title: "Возврат",
                text: "Депозит не возвращается",
                span: { page_start: 2 },
              },
              citations: [
                {
                  source_id: "civil-552",
                  source_title: "ГК РК",
                  reference: "Статья 552",
                  url: "https://adilet.zan.kz/rus/docs/K990000409_",
                  excerpt: "Официальный фрагмент",
                },
              ],
            },
          ],
          missing_terms: ["utilities"],
          question_suggestions: ["Как изменить условие о депозите?"],
          failure_code: null,
          severity_counts: { high: 1, attention: 0, info: 0 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const report = await getAnalysis(
      "9f63ee97-e132-4a69-a2df-a66bbdd4b369",
      "private-token",
    );

    expect(fetchMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({ headers: { "X-Analysis-Token": "private-token" } }),
    );
    expect(report.missingTerms).toEqual(["utilities"]);
    expect(report.questionSuggestions).toEqual(["Как изменить условие о депозите?"]);
    expect(report.findings[0].landlordQuestion).toBe("Когда вернёте депозит?");
    expect(report.findings[0].clause?.pageStart).toBe(2);
    expect(report.findings[0].citations[0].sourceId).toBe("civil-552");
  });
});

describe("report interactions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps grounded question answers and negotiation messages", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            answer: "Ответ по договору",
            mode: "document",
            supported: true,
            confidence: 0.86,
            evidence: [
              {
                block_index: 0,
                page: 1,
                excerpt: "Объект аренды: квартира в городе Караганда.",
                score: 0.86,
              },
            ],
            citations: [
              {
                source_id: "civil-552",
                source_title: "ГК РК",
                reference: "Статья 552",
                url: "https://adilet.zan.kz/rus/docs/K990000409_",
                excerpt: "Фрагмент",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ finding_id: "finding-1", message: "Уточните условие" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const answer = await askQuestion("analysis-1", "token-1", "Когда вернут депозит?");
    const message = await createNegotiation("analysis-1", "token-1", "finding-1", "polite");

    expect(answer.citations[0].sourceId).toBe("civil-552");
    expect(answer.mode).toBe("document");
    expect(answer.confidence).toBe(0.86);
    expect(answer.evidence[0]).toEqual({
      blockIndex: 0,
      page: 1,
      excerpt: "Объект аренды: квартира в городе Караганда.",
      score: 0.86,
    });
    expect(message).toEqual({ findingId: "finding-1", message: "Уточните условие" });
    expect(fetchMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "X-Analysis-Token": "token-1" }),
      }),
    );
  });
});
