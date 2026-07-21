import { z } from "zod";

import type { AnalysisReport } from "@/lib/report-types";

const acceptedAnalysisSchema = z.object({
  analysis_id: z.string().uuid(),
  access_token: z.string().min(20),
  status: z.enum(["queued", "extracting", "analyzing", "completed", "failed"]),
});

const problemSchema = z.object({
  code: z.string(),
  detail: z.string(),
});

const citationSchema = z.object({
  source_id: z.string(),
  source_title: z.string(),
  reference: z.string(),
  url: z.string().url(),
  excerpt: z.string(),
});

const documentEvidenceSchema = z.object({
  block_index: z.number().int().nonnegative(),
  page: z.number().int().positive().nullable(),
  excerpt: z.string().min(1),
  score: z.number().min(0).max(1),
});

const clauseSchema = z.object({
  title: z.string(),
  text: z.string(),
  span: z.object({ page_start: z.number().nullable() }),
});

const findingSchema = z.object({
  id: z.string().uuid(),
  severity: z.enum(["high", "attention", "info"]),
  category: z.string(),
  title: z.string(),
  explanation: z.string(),
  action: z.string(),
  landlord_question: z.string(),
  clause: clauseSchema.nullable(),
  citations: z.array(citationSchema),
  confidence: z.number().min(0).max(1),
});

const reportSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["queued", "extracting", "analyzing", "completed", "failed"]),
  language: z.enum(["ru", "kz", "mixed"]),
  summary: z.string(),
  findings: z.array(findingSchema),
  missing_terms: z.array(z.string()),
  question_suggestions: z.array(z.string().min(1)).max(4),
  failure_code: z.string().nullable(),
  severity_counts: z.object({ high: z.number(), attention: z.number(), info: z.number() }),
});

export interface AcceptedAnalysis {
  analysisId: string;
  accessToken: string;
  status: "queued" | "extracting" | "analyzing" | "completed" | "failed";
}

export interface QuestionEvidence {
  blockIndex: number;
  page: number | null;
  excerpt: string;
  score: number;
}

export interface QuestionAnswer {
  answer: string;
  mode: "document" | "action" | "unsupported";
  supported: boolean;
  confidence: number;
  evidence: QuestionEvidence[];
  citations: AnalysisReport["findings"][number]["citations"];
}

export interface NegotiationMessage {
  findingId: string;
  message: string;
}

export class ApiProblem extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiProblem";
  }
}

function apiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  return `${base.replace(/\/$/, "")}${path}`;
}

export async function uploadContract(file: File): Promise<AcceptedAnalysis> {
  const form = new FormData();
  form.set("file", file);
  const response = await fetch(apiUrl("/api/v1/analyses"), {
    method: "POST",
    body: form,
  });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const parsed = problemSchema.safeParse(payload);
    if (parsed.success) {
      throw new ApiProblem(parsed.data.code, parsed.data.detail);
    }
    throw new ApiProblem("request_failed", "Не удалось загрузить договор. Попробуйте ещё раз.");
  }
  const accepted = acceptedAnalysisSchema.parse(payload);
  return {
    analysisId: accepted.analysis_id,
    accessToken: accepted.access_token,
    status: accepted.status,
  };
}

export async function getAnalysis(analysisId: string, accessToken: string): Promise<AnalysisReport> {
  const response = await fetch(apiUrl(`/api/v1/analyses/${analysisId}`), {
    headers: { "X-Analysis-Token": accessToken },
    cache: "no-store",
  });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const parsed = problemSchema.safeParse(payload);
    throw new ApiProblem(
      parsed.success ? parsed.data.code : "request_failed",
      parsed.success ? parsed.data.detail : "Не удалось получить отчёт.",
    );
  }
  const parsed = reportSchema.parse(payload);
  return {
    id: parsed.id,
    status: parsed.status,
    language: parsed.language,
    summary: parsed.summary,
    questionSuggestions: parsed.question_suggestions,
    missingTerms: parsed.missing_terms,
    failureCode: parsed.failure_code,
    severityCounts: parsed.severity_counts,
    findings: parsed.findings.map((finding) => ({
      id: finding.id,
      severity: finding.severity,
      category: finding.category,
      title: finding.title,
      explanation: finding.explanation,
      action: finding.action,
      landlordQuestion: finding.landlord_question,
      confidence: finding.confidence,
      clause: finding.clause
        ? {
            title: finding.clause.title,
            text: finding.clause.text,
            pageStart: finding.clause.span.page_start,
          }
        : null,
      citations: finding.citations.map((citation) => ({
        sourceId: citation.source_id,
        sourceTitle: citation.source_title,
        reference: citation.reference,
        url: citation.url,
        excerpt: citation.excerpt,
      })),
    })),
  };
}

function mapCitation(citation: z.infer<typeof citationSchema>) {
  return {
    sourceId: citation.source_id,
    sourceTitle: citation.source_title,
    reference: citation.reference,
    url: citation.url,
    excerpt: citation.excerpt,
  };
}

export async function askQuestion(
  analysisId: string,
  accessToken: string,
  question: string,
): Promise<QuestionAnswer> {
  const response = await fetch(apiUrl(`/api/v1/analyses/${analysisId}/questions`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Analysis-Token": accessToken,
    },
    body: JSON.stringify({ question }),
  });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const parsed = problemSchema.safeParse(payload);
    throw new ApiProblem(
      parsed.success ? parsed.data.code : "request_failed",
      parsed.success ? parsed.data.detail : "Не удалось получить ответ.",
    );
  }
  const parsed = z
    .object({
      answer: z.string(),
      mode: z.enum(["document", "action", "unsupported"]),
      supported: z.boolean(),
      confidence: z.number().min(0).max(1),
      evidence: z.array(documentEvidenceSchema),
      citations: z.array(citationSchema),
    })
    .parse(payload);
  return {
    answer: parsed.answer,
    mode: parsed.mode,
    supported: parsed.supported,
    confidence: parsed.confidence,
    evidence: parsed.evidence.map((item) => ({
      blockIndex: item.block_index,
      page: item.page,
      excerpt: item.excerpt,
      score: item.score,
    })),
    citations: parsed.citations.map(mapCitation),
  };
}

export async function createNegotiation(
  analysisId: string,
  accessToken: string,
  findingId: string,
  tone: "polite" | "direct",
): Promise<NegotiationMessage> {
  const response = await fetch(apiUrl(`/api/v1/analyses/${analysisId}/negotiation`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Analysis-Token": accessToken,
    },
    body: JSON.stringify({ finding_id: findingId, tone }),
  });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const parsed = problemSchema.safeParse(payload);
    throw new ApiProblem(
      parsed.success ? parsed.data.code : "request_failed",
      parsed.success ? parsed.data.detail : "Не удалось составить сообщение.",
    );
  }
  const parsed = z.object({ finding_id: z.string(), message: z.string() }).parse(payload);
  return { findingId: parsed.finding_id, message: parsed.message };
}

export function storeAnalysisToken(analysisId: string, accessToken: string): void {
  localStorage.setItem(`qadam:analysis:${analysisId}:token`, accessToken);
}

export function readAnalysisToken(analysisId: string): string | null {
  return localStorage.getItem(`qadam:analysis:${analysisId}:token`);
}
