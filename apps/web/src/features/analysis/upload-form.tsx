"use client";

import { FileCheck2, LockKeyhole, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  ApiProblem,
  type AcceptedAnalysis,
  storeAnalysisToken,
  uploadContract,
} from "@/lib/api-client";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".pdf", ".docx"];

interface UploadFormProps {
  onNavigate?: (path: string) => void;
  onUpload?: (file: File) => Promise<AcceptedAnalysis>;
}

function validateFile(file: File): string | null {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!ACCEPTED_EXTENSIONS.includes(extension)) {
    return "Выберите файл PDF или DOCX.";
  }
  if (file.size > MAX_FILE_BYTES) {
    return "Файл больше 10 МБ. Сожмите документ или выберите другую копию.";
  }
  return null;
}

export function UploadForm({ onNavigate, onUpload = uploadContract }: UploadFormProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setError(selected ? validateFile(selected) : null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Сначала выберите договор в PDF или DOCX.");
      return;
    }
    const fileError = validateFile(file);
    if (fileError) {
      setError(fileError);
      return;
    }
    if (!consent) {
      setError("Подтвердите согласие на обработку документа для проведения анализа.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const accepted = await onUpload(file);
      storeAnalysisToken(accepted.analysisId, accepted.accessToken);
      const destination = `/analysis/${accepted.analysisId}`;
      if (onNavigate) {
        onNavigate(destination);
      } else {
        router.push(destination);
      }
    } catch (caught) {
      setError(
        caught instanceof ApiProblem
          ? caught.message
          : "Не удалось связаться с сервисом. Проверьте соединение и попробуйте ещё раз.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="upload-form" noValidate onSubmit={handleSubmit}>
      <div className="upload-form__heading">
        <div className="eyebrow">
          <Icon icon={FileCheck2} size={18} />
          Проверка до подписания
        </div>
        <h2>Загрузите договор</h2>
        <p id="file-help">PDF или DOCX, до 10 МБ. Фото и сканы без текста пока не поддерживаются.</p>
      </div>

      <label className="file-field">
        <span className="file-field__icon" aria-hidden="true">
          <Icon icon={Upload} size={28} />
        </span>
        <span className="file-field__label">Выберите договор</span>
        <span className="file-field__selection">
          {file ? file.name : "Нажмите, чтобы выбрать файл"}
        </span>
        <input
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          aria-label="Выберите договор"
          aria-describedby="file-help"
          disabled={loading}
          name="contract"
          onChange={handleFile}
          type="file"
        />
      </label>

      <label className="consent-field">
        <input
          checked={consent}
          disabled={loading}
          onChange={(event) => setConsent(event.target.checked)}
          required
          type="checkbox"
        />
        <span>
          Я согласен на обработку документа для анализа. QADAM маскирует ИИН, телефоны и email
          перед AI-обработкой.
        </span>
      </label>

      {error ? (
        <p className="form-message form-message--error" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p className="form-message" role="status">
          Загружаем и проверяем файл…
        </p>
      ) : null}

      <Button fullWidth loading={loading} type="submit">
        Проверить договор
      </Button>
      <p className="upload-form__privacy">
        <Icon icon={LockKeyhole} size={16} />
        Не публикуйте ссылку на готовый отчёт: доступ защищён приватным токеном в этом браузере.
      </p>
    </form>
  );
}
