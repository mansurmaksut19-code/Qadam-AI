"use client";

import { ExternalLink, HelpCircle, SearchCheck } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  ApiProblem,
  type QuestionAnswer,
  askQuestion,
  readAnalysisToken,
} from "@/lib/api-client";

interface QuestionPanelProps {
  analysisId: string;
  suggestions: string[];
  onAsk?: (question: string) => Promise<QuestionAnswer>;
}

const answerTitles: Record<QuestionAnswer["mode"], string> = {
  document: "Ответ подтверждён текстом договора",
  action: "Действия основаны на найденных пунктах",
  unsupported: "Ответ не найден в тексте договора",
};

export function QuestionPanel({ analysisId, onAsk, suggestions }: QuestionPanelProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<QuestionAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function defaultAsk(value: string) {
    const token = readAnalysisToken(analysisId);
    if (!token) throw new ApiProblem("access_token_required", "Токен отчёта не найден.");
    return askQuestion(analysisId, token, value);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = question.trim();
    if (value.length < 3) {
      setError("Введите вопрос по условиям договора.");
      return;
    }
    setError(null);
    setAnswer(null);
    setLoading(true);
    try {
      setAnswer(await (onAsk ?? defaultAsk)(value));
    } catch (caught) {
      setError(
        caught instanceof ApiProblem
          ? caught.message
          : "Не удалось получить ответ. Проверьте соединение и повторите.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="question-panel" aria-labelledby="question-title">
      <div className="question-panel__heading">
        <div className="eyebrow">
          <Icon icon={HelpCircle} size={18} />
          Вопрос по этому документу
        </div>
        <h2 id="question-title">Что ещё непонятно?</h2>
        <p>Ответ ограничен условиями договора и найденными официальными источниками.</p>
      </div>

      {suggestions.length ? (
        <div className="suggestions" aria-label="Примеры вопросов">
          {suggestions.map((suggestion) => (
            <button key={suggestion} onClick={() => setQuestion(suggestion)} type="button">
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}

      <form className="question-form" onSubmit={handleSubmit}>
        <label htmlFor="contract-question">Вопрос по договору</label>
        <textarea
          disabled={loading}
          id="contract-question"
          maxLength={500}
          onChange={(event) => setQuestion(event.target.value)}
          rows={3}
          value={question}
        />
        <Button loading={loading} type="submit">
          Получить ответ
        </Button>
      </form>

      {loading ? (
        <p className="form-message" role="status">
          Ищем ответ в договоре и источниках…
        </p>
      ) : null}
      {error ? (
        <p className="form-message form-message--error" role="alert">
          {error}
        </p>
      ) : null}
      {answer ? (
        <div
          aria-live="polite"
          className={`question-answer ${answer.mode === "unsupported" ? "question-answer--limited" : ""}`}
        >
          <strong>
            <Icon icon={SearchCheck} size={18} />
            {answerTitles[answer.mode]}
          </strong>
          <p>{answer.answer}</p>
          {answer.evidence.map((item) => (
            <blockquote
              className="question-evidence"
              key={`${item.blockIndex}-${item.score}`}
            >
              <strong>Фрагмент договора</strong>
              <p>{item.excerpt}</p>
              <footer>{item.page ? `Страница ${item.page}` : `Блок ${item.blockIndex + 1}`}</footer>
            </blockquote>
          ))}
          {answer.citations.map((citation) => (
            <a href={citation.url} key={citation.sourceId} rel="noreferrer" target="_blank">
              {citation.reference} · {citation.sourceTitle}
              <Icon icon={ExternalLink} size={15} />
            </a>
          ))}
        </div>
      ) : null}
    </section>
  );
}
