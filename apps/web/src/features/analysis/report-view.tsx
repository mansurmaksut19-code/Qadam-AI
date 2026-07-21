import { AlertOctagon, CheckCircle2, FileQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { CitationPanel } from "@/features/analysis/citation-panel";
import { FindingCard } from "@/features/analysis/finding-card";
import { NegotiationDialog } from "@/features/analysis/negotiation-dialog";
import { ProcessingStatus } from "@/features/analysis/processing-status";
import { QuestionPanel } from "@/features/analysis/question-panel";
import type { AnalysisReport, Severity } from "@/lib/report-types";

const severityOrder: Record<Severity, number> = { high: 0, attention: 1, info: 2 };
const termLabels: Record<string, string> = {
  property: "Описание жилья",
  term: "Срок договора",
  rent: "Арендная плата",
  deposit: "Депозит и возврат",
  utilities: "Коммунальные платежи",
  handover: "Акт приёма-передачи",
  repairs: "Ремонт и поломки",
  termination: "Расторжение договора",
  eviction: "Порядок выселения",
  occupancy: "Проживающие лица",
  landlord_access: "Доступ арендодателя",
  penalties: "Штрафы",
  rent_change: "Изменение цены",
};

interface ReportViewProps {
  onRetry: () => void;
  report: AnalysisReport;
}

export function ReportView({ onRetry, report }: ReportViewProps) {
  if (["queued", "extracting", "analyzing"].includes(report.status)) {
    return <ProcessingStatus status={report.status} />;
  }

  if (report.status === "failed") {
    const ocr = report.failureCode === "ocr_required";
    return (
      <section className="analysis-failure" role="alert">
        <Icon icon={AlertOctagon} size={30} />
        <h1>{ocr ? "В файле не удалось распознать текст" : "Не удалось завершить анализ"}</h1>
        <p>
          {ocr
            ? "Загрузите PDF с текстовым слоем или DOCX. Фото и сканы можно предварительно распознать."
            : "Попробуйте загрузить документ ещё раз. Если ошибка повторится, выберите другую копию."}
        </p>
        <Button onClick={onRetry}>Загрузить другую копию</Button>
      </section>
    );
  }

  const findings = [...report.findings].sort(
    (left, right) => severityOrder[left.severity] - severityOrder[right.severity],
  );
  const citations = findings.flatMap((finding) => finding.citations);

  return (
    <div className="report">
      <header className="report__header">
        <p className="eyebrow">Отчёт готов</p>
        <h1>Что проверить до подписания</h1>
        <p>{report.summary}</p>
        <div className="report__counts" aria-label="Сводка находок">
          <span className="count count--high">{report.severityCounts.high} высокий</span>
          <span className="count count--attention">
            {report.severityCounts.attention} требует внимания
          </span>
          <span className="count count--info">{report.severityCounts.info} информация</span>
        </div>
      </header>

      <div className="report__layout">
        <main className="report__findings" id="report-findings">
          {findings.length ? (
            findings.map((finding) => <FindingCard finding={finding} key={finding.id} />)
          ) : (
            <section className="empty-findings">
              <Icon icon={CheckCircle2} size={28} />
              <h2>Не найдено условий высокого приоритета</h2>
              <p>
                Это не означает, что договор юридически безопасен. Проверьте стороны, адрес, суммы,
                даты и финальную редакцию вручную.
              </p>
            </section>
          )}

          {report.missingTerms.length ? (
            <section className="missing-terms" aria-labelledby="missing-title">
              <Icon icon={FileQuestion} size={25} />
              <div>
                <h2 id="missing-title">Что не удалось найти в договоре</h2>
                <p>Уточните эти условия и закрепите ответы письменно:</p>
                <ul>
                  {report.missingTerms.map((term) => (
                    <li key={term}>{termLabels[term] ?? term}</li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}
        </main>

        <CitationPanel citations={citations} />
      </div>
      <section className="report__tools" aria-label="Помощь по отчёту">
        <QuestionPanel analysisId={report.id} suggestions={report.questionSuggestions} />
        {findings.length ? (
          <div className="negotiation-launcher">
            <p className="eyebrow">Подготовьтесь к разговору</p>
            <h2>Обсудите спорный пункт письменно</h2>
            <p>QADAM соберёт вежливое сообщение из конкретного вопроса и следующего шага.</p>
            <NegotiationDialog analysisId={report.id} findings={findings} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
