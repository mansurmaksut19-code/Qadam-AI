import {
  ArrowDown,
  BookOpenCheck,
  Download,
  FileSearch,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Image from "next/image";

import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { UploadForm } from "@/features/analysis/upload-form";
import { ProductDashboard } from "@/features/product/product-dashboard";

export default function Home() {
  return (
    <>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="QADAM AI — на главную">
          <Image alt="" className="brand__logo" height={48} priority src="/qadam-logo.png" width={48} />
          <span className="brand__text">
            <strong>QADAM AI</strong>
            <small>Legal AI Platform</small>
          </span>
        </a>
        <nav className="site-nav" aria-label="Основная навигация">
          <a href="#upload">Анализ</a>
          <a href="#pricing-title">Модель</a>
          <a href="#auth-title">Кабинет</a>
        </nav>
      </header>

      <main id="main-content">
        <section className="hero" id="top" aria-labelledby="hero-title">
          <div className="hero__copy">
            <p className="eyebrow">Один договор. Понятный следующий шаг.</p>
            <h1 id="hero-title">Поймите договор аренды до того, как поставите подпись</h1>
            <p className="hero__lead">
              QADAM находит спорные и пропущенные условия, объясняет их простым языком и показывает
              связанные нормы права Казахстана.
            </p>
            <a className="hero__jump" href="#upload">
              Проверить свой договор
              <Icon icon={ArrowDown} size={18} />
            </a>
            <div className="hero__proof" aria-label="Ключевые условия продукта">
              <span>Free: экспресс-анализ</span>
              <span>Premium: DOCX за 490 ₸</span>
              <span>PDF/DOCX до 10 МБ</span>
            </div>
            <p className="hero__boundary">
              Информационная помощь, не замена консультации юриста и не юридическое заключение.
            </p>
          </div>

          <aside className="stat-note" aria-label="Почему это важно студентам">
            <Image
              alt="QADAM AI Legal AI Platform"
              className="stat-note__logo"
              height={86}
              priority
              src="/qadam-logo.png"
              width={86}
            />
            <span className="stat-note__number">364,5 тыс.</span>
            <p>студентов в Казахстане учатся не в своём населённом пункте.</p>
            <a
              href="https://stat.gov.kz/ru/news/vysshee-i-poscclevuzovskoe-obrazovanie-v-respublike-kazakhstan-/"
              rel="noreferrer"
              target="_blank"
            >
              Данные Бюро национальной статистики, 2025–2026
            </a>
            <div className="document-preview" aria-hidden="true">
              <span className="document-preview__bar" />
              <span className="document-preview__line document-preview__line--wide" />
              <span className="document-preview__risk" />
              <span className="document-preview__line" />
              <span className="document-preview__line document-preview__line--short" />
            </div>
          </aside>
        </section>

        <section className="upload-section" id="upload" aria-label="Загрузка договора">
          <Card className="upload-card">
            <UploadForm />
          </Card>
          <div className="privacy-note">
            <Icon icon={ShieldCheck} size={24} />
            <div>
              <h2>Личные данные — не доказательство риска</h2>
              <p>
                ИИН, телефоны, email и номера карт маскируются до анализа. В отчёте остаются только
                условия договора, понятные выводы и источники.
              </p>
            </div>
          </div>
        </section>

        <section className="pricing-section" aria-labelledby="pricing-title">
          <div className="section-heading">
            <p className="eyebrow">Коммерческая модель</p>
            <h2 id="pricing-title">Официальная модель монетизации QADAM</h2>
          </div>
          <div className="pricing-grid">
            <article className="pricing-plan">
              <Icon icon={Sparkles} size={24} />
              <span className="pricing-plan__price">Acquisition</span>
              <h3>Free: экспресс-анализ</h3>
              <p>Бесплатный вход в продукт: регистрация, загрузка договора, подсветка рисков и сохранение истории.</p>
            </article>
            <article className="pricing-plan pricing-plan--premium">
              <Icon icon={Download} size={24} />
              <span className="pricing-plan__price">490 ₸</span>
              <h3>Transaction: DOCX-протокол</h3>
              <p>Разовая оплата за готовый протокол разногласий .DOCX после того, как пользователь увидел риск.</p>
            </article>
            <article className="pricing-plan">
              <Icon icon={ShieldCheck} size={24} />
              <span className="pricing-plan__price">B2B</span>
              <h3>Campus license</h3>
              <p>Лицензии для вузов, общежитий и legal clinics: пакет проверок, отчётность и поддержка студентов.</p>
            </article>
          </div>
          <div className="startup-funnel" aria-label="Коммерческие метрики">
            <div>
              <strong>Target</strong>
              <span>студенты 18–22 и первые арендаторы</span>
            </div>
            <div>
              <strong>CAC</strong>
              <span>органический трафик, Telegram, партнёрства с вузами</span>
            </div>
            <div>
              <strong>Revenue</strong>
              <span>490 ₸ за документ + B2B-пакеты</span>
            </div>
            <div>
              <strong>Retention</strong>
              <span>личный кабинет, история и повторные проверки</span>
            </div>
          </div>
        </section>

        <ProductDashboard />

        <section className="steps" aria-labelledby="steps-title">
          <div className="section-heading">
            <p className="eyebrow">Как работает проверка</p>
            <h2 id="steps-title">От файла к разговору с арендодателем</h2>
          </div>
          <ol className="steps__grid">
            <li>
              <span className="step-number">01</span>
              <Icon icon={FileSearch} size={26} />
              <h3>Разбираем условия</h3>
              <p>Извлекаем депозит, оплату, ремонт, доступ хозяина и порядок расторжения.</p>
            </li>
            <li>
              <span className="step-number">02</span>
              <Icon icon={BookOpenCheck} size={26} />
              <h3>Проверяем основания</h3>
              <p>Сопоставляем найденные пункты с версионированной базой официальных актов.</p>
            </li>
            <li>
              <span className="step-number">03</span>
              <Icon icon={MessageSquareText} size={26} />
              <h3>Готовим следующий шаг</h3>
              <p>Даём вопрос арендодателю и формулировку, которую стоит закрепить письменно.</p>
            </li>
          </ol>
        </section>
      </main>

      <footer className="site-footer">
        <span>QADAM AI · Tech Vision 2026</span>
        <span>Проверяйте источник и финальную редакцию договора до подписания.</span>
      </footer>
    </>
  );
}
