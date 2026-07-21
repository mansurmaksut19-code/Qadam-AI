import { ExternalLink, Landmark } from "lucide-react";

import { Icon } from "@/components/ui/icon";
import type { Citation } from "@/lib/report-types";

export function CitationPanel({ citations }: { citations: Citation[] }) {
  const unique = [...new Map(citations.map((citation) => [citation.sourceId, citation])).values()];
  return (
    <aside className="citation-panel" aria-labelledby="sources-title">
      <div className="eyebrow">
        <Icon icon={Landmark} size={18} />
        Проверяемые основания
      </div>
      <h2 id="sources-title">Официальные источники</h2>
      {unique.length ? (
        <ol>
          {unique.map((citation) => (
            <li key={citation.sourceId}>
              <a href={citation.url} rel="noreferrer" target="_blank">
                {citation.reference}
                <Icon icon={ExternalLink} size={15} />
              </a>
              <span>{citation.sourceTitle}</span>
              <blockquote>{citation.excerpt}</blockquote>
            </li>
          ))}
        </ol>
      ) : (
        <p>Для этого отчёта прямые правовые цитаты не использовались.</p>
      )}
      <p className="citation-panel__note">
        Ссылка ведёт на официальный банк «Әділет». Сверьте актуальную редакцию перед решением.
      </p>
    </aside>
  );
}
