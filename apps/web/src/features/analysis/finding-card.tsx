import { AlertTriangle, CheckCircle2, CircleAlert, ExternalLink, Quote } from "lucide-react";

import { Icon } from "@/components/ui/icon";
import type { Finding, Severity } from "@/lib/report-types";

const severityMeta: Record<
  Severity,
  { label: string; icon: typeof AlertTriangle; className: string }
> = {
  high: { label: "Высокий приоритет", icon: AlertTriangle, className: "finding--high" },
  attention: {
    label: "Требует внимания",
    icon: CircleAlert,
    className: "finding--attention",
  },
  info: { label: "Информация", icon: CheckCircle2, className: "finding--info" },
};

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.85) return "Высокая уверенность";
  if (confidence >= 0.65) return "Средняя уверенность";
  return "Низкая уверенность — перепроверьте вручную";
}

export function FindingCard({ finding }: { finding: Finding }) {
  const meta = severityMeta[finding.severity];
  return (
    <article className={`finding ${meta.className}`}>
      <header className="finding__header">
        <span className="severity-label">
          <Icon icon={meta.icon} size={18} />
          {meta.label}
        </span>
        <span className="confidence-label">{confidenceLabel(finding.confidence)}</span>
      </header>
      <h3>{finding.title}</h3>
      <p>{finding.explanation}</p>

      {finding.clause ? (
        <details className="evidence-disclosure">
          <summary>
            <Icon icon={Quote} size={17} />
            Фрагмент договора
          </summary>
          <blockquote>
            {finding.clause.text}
            {finding.clause.pageStart ? <cite>Страница {finding.clause.pageStart}</cite> : null}
          </blockquote>
        </details>
      ) : null}

      <div className="finding__action">
        <strong>Что сделать</strong>
        <p>{finding.action}</p>
      </div>

      {finding.citations.length ? (
        <div className="finding__sources">
          <strong>Основание</strong>
          {finding.citations.map((citation) => (
            <a href={citation.url} key={citation.sourceId} rel="noreferrer" target="_blank">
              {citation.reference} · {citation.sourceTitle}
              <Icon icon={ExternalLink} size={15} />
            </a>
          ))}
        </div>
      ) : (
        <p className="finding__no-source">
          Вывод основан на полноте формулировки договора; прямое правовое основание не заявляется.
        </p>
      )}
    </article>
  );
}
