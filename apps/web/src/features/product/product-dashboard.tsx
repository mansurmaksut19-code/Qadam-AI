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
  const [password, setPassword] = useState("");

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
    if (password.length < 8) return;
    const nextSession = { email: email.trim().toLowerCase() };
    setSession(nextSession);
    localStorage.setItem("qadam:session", JSON.stringify(nextSession));
    addEvent("Вход в аккаунт");
    setPassword("");
  }

  function logout() {
    localStorage.removeItem("qadam:session");
    setSession(null);
    addEvent("Выход из аккаунта");
  }

  return (
    <section className="auth-section" aria-labelledby="auth-title">
      <div className="section-heading">
        <p className="eyebrow">Личный кабинет</p>
        <h2 id="auth-title">Проверки, протоколы и история действий</h2>
      </div>
      <div className="auth-grid">
        <div className="auth-panel">
          <Icon icon={ShieldCheck} size={24} />
          {session ? (
            <>
              <h3>{session.email}</h3>
              <p>Подтверждённая demo-сессия. Проверки, скачивания и история сохраняются в этом браузере.</p>
              <Button onClick={logout} variant="secondary">
                <Icon icon={LogOut} size={17} />
                Завершить сессию
              </Button>
            </>
          ) : (
            <form className="auth-form" onSubmit={submitAuth}>
              <h3>Безопасный вход по email и паролю</h3>
              <p className="auth-security-note">
                Аккаунт открывает доступ к истории проверок, скачиваниям и журналу действий.
              </p>
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
              <label>
                Пароль
                <input
                  autoComplete="current-password"
                  minLength={8}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </label>
              <Button type="submit">
                <Icon icon={LogIn} size={17} />
                Войти
              </Button>
            </form>
          )}
        </div>
        <div className="auth-panel">
          <Icon icon={Clock3} size={24} />
          <h3>Журнал действий</h3>
          <ul className="activity-list">
            {events.length ? events.map((item) => <li key={`${item.time}-${item.label}`}>{item.time} · {item.label}</li>) : <li>История появится после входа и первой проверки.</li>}
          </ul>
        </div>
      </div>
    </section>
  );
}
