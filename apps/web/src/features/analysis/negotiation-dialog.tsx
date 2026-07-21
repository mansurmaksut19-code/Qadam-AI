"use client";

import { Copy, MessageSquareText, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  ApiProblem,
  type NegotiationMessage,
  createNegotiation,
  readAnalysisToken,
} from "@/lib/api-client";
import type { Finding } from "@/lib/report-types";

interface NegotiationDialogProps {
  analysisId: string;
  findings: Finding[];
  onGenerate?: (
    findingId: string,
    tone: "polite" | "direct",
  ) => Promise<NegotiationMessage>;
}

export function NegotiationDialog({
  analysisId,
  findings,
  onGenerate,
}: NegotiationDialogProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(findings[0]?.id ?? "");
  const [tone, setTone] = useState<"polite" | "direct">("polite");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    queueMicrotask(() => triggerRef.current?.focus());
  }

  async function defaultGenerate(findingId: string, selectedTone: "polite" | "direct") {
    const token = readAnalysisToken(analysisId);
    if (!token) throw new ApiProblem("access_token_required", "Токен отчёта не найден.");
    return createNegotiation(analysisId, token, findingId, selectedTone);
  }

  async function generate() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      const result = await (onGenerate ?? defaultGenerate)(selected, tone);
      setMessage(result.message);
    } catch (caught) {
      setError(
        caught instanceof ApiProblem
          ? caught.message
          : "Не удалось составить сообщение. Попробуйте ещё раз.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyMessage() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} ref={triggerRef} variant="secondary">
        <Icon icon={MessageSquareText} size={18} />
        Подготовить сообщение арендодателю
      </Button>
      {open ? (
        <div className="dialog-backdrop">
          <dialog
            aria-labelledby="negotiation-title"
            aria-modal="true"
            className="negotiation-dialog"
            onKeyDown={(event) => {
              if (event.key === "Escape") close();
            }}
            open
          >
            <button
              aria-label="Закрыть диалог"
              className="dialog-close"
              onClick={close}
              ref={closeRef}
              type="button"
            >
              <Icon icon={X} size={20} />
            </button>
            <p className="eyebrow">Следующий шаг</p>
            <h2 id="negotiation-title">Сообщение арендодателю</h2>
            <p>Выберите спорный пункт. Текст можно отредактировать перед отправкой.</p>

            <label htmlFor="negotiation-finding">Пункт для обсуждения</label>
            <select
              id="negotiation-finding"
              onChange={(event) => setSelected(event.target.value)}
              value={selected}
            >
              {findings.map((finding) => (
                <option key={finding.id} value={finding.id}>
                  {finding.title}
                </option>
              ))}
            </select>

            <fieldset>
              <legend>Тон сообщения</legend>
              <label>
                <input
                  checked={tone === "polite"}
                  name="tone"
                  onChange={() => setTone("polite")}
                  type="radio"
                />
                Вежливо
              </label>
              <label>
                <input
                  checked={tone === "direct"}
                  name="tone"
                  onChange={() => setTone("direct")}
                  type="radio"
                />
                Прямо
              </label>
            </fieldset>

            <Button loading={loading} onClick={generate} type="button">
              Составить сообщение
            </Button>
            {error ? (
              <p className="form-message form-message--error" role="alert">
                {error}
              </p>
            ) : null}
            {message ? (
              <div className="negotiation-result">
                <label htmlFor="negotiation-message">Готовое сообщение</label>
                <textarea
                  id="negotiation-message"
                  onChange={(event) => setMessage(event.target.value)}
                  rows={5}
                  value={message}
                />
                <Button onClick={copyMessage} type="button" variant="secondary">
                  <Icon icon={Copy} size={17} />
                  Скопировать сообщение
                </Button>
                {copied ? <span role="status">Скопировано</span> : null}
              </div>
            ) : null}
          </dialog>
        </div>
      ) : null}
    </>
  );
}
