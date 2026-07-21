"use client";

import { Clock3, LogIn, LogOut, ShieldCheck } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

interface Session {
  email: string;
}

interface ProductEvent {
  label: string;
  time: string;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(localStorage.getItem(key) ?? "") as T;
  } catch {
    return fallback;
  }
}

export function ProductDashboard() {
  const [session, setSession] = useState<Session | null>(() => readJson<Session | null>("qadam:session", null));
  const [events, setEvents] = useState<ProductEvent[]>(() => readJson<ProductEvent[]>("qadam:events", []));
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pendingCode, setPendingCode] = useState<string | null>(null);

  function addEvent(label: string) {
    const nextEvents = [
      {
        label,
        time: new Date().toLocaleString("ru-RU", {
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          month: "2-digit",
        }),
      },
      ...events,
    ].slice(0, 5);
    setEvents(nextEvents);
    localStorage.setItem("qadam:events", JSON.stringify(nextEvents));
  }

  function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingCode) {
      setPendingCode("490490");
      return;
    }
    if (code !== pendingCode) return;
    const nextSession = { email: email.trim().toLowerCase() };
    setSession(nextSession);
    localStorage.setItem("qadam:session", JSON.stringify(nextSession));
    addEvent("Вход в аккаунт");
    setCode("");
    setPendingCode(null);
  }

  function logout() {
    localStorage.removeItem("qadam:session");
    setSession(null);
    addEvent("Выход из аккаунта");
  }

  return (
    <section className="auth-section" aria-labelledby="auth-title">
      <div className="section-heading">
        <p className="eyebrow">Аккаунт и история</p>
        <h2 id="auth-title">Сессия, проверки и покупки в одном месте</h2>
      </div>
      <div className="auth-grid">
        <div className="auth-panel">
          <Icon icon={ShieldCheck} size={24} />
          {session ? (
            <>
              <h3>{session.email}</h3>
              <p>Аккаунт активен. Проверки и скачивания сохраняются в истории этого браузера.</p>
              <Button onClick={logout} variant="secondary">
                <Icon icon={LogOut} size={17} />
                Выйти
              </Button>
            </>
          ) : (
            <form className="auth-form" onSubmit={submitAuth}>
              <h3>Вход по email-коду</h3>
              <label>
                Email
                <input
                  autoComplete="email"
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  type="email"
                  value={email}
                />
              </label>
              {pendingCode ? (
                <label>
                  Код подтверждения
                  <input
                    autoComplete="one-time-code"
                    onChange={(event) => setCode(event.target.value)}
                    placeholder={pendingCode}
                    required
                    type="text"
                    value={code}
                  />
                </label>
              ) : null}
              <Button type="submit">
                <Icon icon={LogIn} size={17} />
                {pendingCode ? "Войти" : "Получить код"}
              </Button>
              {pendingCode ? <p className="premium-note">Демо-код: {pendingCode}</p> : null}
            </form>
          )}
        </div>
        <div className="auth-panel">
          <Icon icon={Clock3} size={24} />
          <h3>История действий</h3>
          <ul className="activity-list">
            {events.length ? events.map((item) => <li key={`${item.time}-${item.label}`}>{item.time} · {item.label}</li>) : <li>История появится после входа и первой проверки.</li>}
          </ul>
        </div>
      </div>
    </section>
  );
}
