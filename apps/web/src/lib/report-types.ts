export type AnalysisStatus = "queued" | "extracting" | "analyzing" | "completed" | "failed";
export type Severity = "high" | "attention" | "info";

export interface Citation {
  sourceId: string;
  sourceTitle: string;
  reference: string;
  url: string;
  excerpt: string;
}

export interface FindingClause {
  text: string;
  title: string;
  pageStart: number | null;
}

export interface Finding {
  id: string;
  severity: Severity;
  category: string;
  title: string;
  explanation: string;
  action: string;
  landlordQuestion: string;
  clause: FindingClause | null;
  citations: Citation[];
  confidence: number;
}

export interface AnalysisReport {
  id: string;
  status: AnalysisStatus;
  language: "ru" | "kz" | "mixed";
  summary: string;
  questionSuggestions: string[];
  findings: Finding[];
  missingTerms: string[];
  failureCode: string | null;
  severityCounts: Record<Severity, number>;
}
