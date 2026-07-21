import { Check, Circle, LoaderCircle } from "lucide-react";

import { Icon } from "@/components/ui/icon";
import type { AnalysisStatus } from "@/lib/report-types";

const stages = [
  { key: "extracting", label: "Извлекаем условия договора" },
  { key: "analyzing", label: "Сопоставляем с официальными источниками" },
  { key: "completed", label: "Проверяем выводы и ссылки" },
] as const;

const order: Record<AnalysisStatus, number> = {
  queued: -1,
  extracting: 0,
  analyzing: 1,
  completed: 3,
  failed: -1,
};

export function ProcessingStatus({ status }: { status: AnalysisStatus }) {
  const current = order[status];
  return (
    <section className="processing" aria-labelledby="processing-title" aria-live="polite">
      <p className="eyebrow">Анализ договора</p>
      <h1 id="processing-title">Проверяем пункты и основания</h1>
      <p>Не закрывайте вкладку. Обычно это занимает меньше минуты.</p>
      <ol className="processing__stages">
        {stages.map((stage, index) => {
          const complete = current > index;
          const active = current === index || (status === "queued" && index === 0);
          return (
            <li className={active ? "is-active" : ""} key={stage.key}>
              <span className="processing__icon">
                <Icon
                  icon={complete ? Check : active ? LoaderCircle : Circle}
                  size={20}
                />
              </span>
              <span>{stage.label}</span>
              {active ? <span className="visually-hidden"> — выполняется</span> : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
