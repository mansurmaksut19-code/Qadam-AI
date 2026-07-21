"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ProcessingStatus } from "@/features/analysis/processing-status";
import { ReportView } from "@/features/analysis/report-view";
import { ApiProblem, getAnalysis, readAnalysisToken } from "@/lib/api-client";
import type { AnalysisReport } from "@/lib/report-types";

export function AnalysisScreen({ analysisId }: { analysisId: string }) {
  const router = useRouter();
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function load() {
      const token = readAnalysisToken(analysisId);
      if (!token) {
        setError("Токен этого отчёта не найден в браузере. Загрузите договор заново.");
        return;
      }
      try {
        const nextReport = await getAnalysis(analysisId, token);
        if (cancelled) return;
        setReport(nextReport);
        if (["queued", "extracting", "analyzing"].includes(nextReport.status)) {
          timer = setTimeout(load, 1200);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof ApiProblem
              ? caught.message
              : "Не удалось получить отчёт. Проверьте соединение.",
          );
        }
      }
    }

    timer = setTimeout(load, 300);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [analysisId]);

  return (
    <>
      <header className="report-header">
        <Link className="brand" href="/" aria-label="QADAM AI — на главную">
          <span className="brand__mark">Q</span>
          <span>QADAM AI</span>
        </Link>
        <span>Приватный отчёт</span>
      </header>
      <main className="analysis-page" id="main-content">
        {error ? (
          <section className="analysis-failure" role="alert">
            <h1>Отчёт недоступен</h1>
            <p>{error}</p>
            <Button onClick={() => router.push("/#upload")}>Загрузить договор заново</Button>
          </section>
        ) : report ? (
          <ReportView onRetry={() => router.push("/#upload")} report={report} />
        ) : (
          <ProcessingStatus status="queued" />
        )}
      </main>
    </>
  );
}
