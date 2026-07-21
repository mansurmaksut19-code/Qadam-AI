import { ArrowDown, BookOpenCheck, FileSearch, MessageSquareText, ShieldCheck } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { UploadForm } from "@/features/analysis/upload-form";

export default function Home() {
  return (
    <>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="QADAM AI — на главную">
          <span className="brand__mark">Q</span>
          <span>QADAM AI</span>
        </a>
        <span className="site-header__note">Для аренды жилья в Казахстане</span>
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
            <p className="hero__boundary">
              Информационная помощь, не замена консультации юриста и не юридическое заключение.
            </p>
          </div>

          <aside className="stat-note" aria-label="Почему это важно студентам">
            <span className="stat-note__number">364,5 тыс.</span>
            <p>студентов в Казахстане учатся не в своём населённом пункте.</p>
            <a
              href="https://stat.gov.kz/ru/news/vysshee-i-poscclevuzovskoe-obrazovanie-v-respublike-kazakhstan-/"
              rel="noreferrer"
              target="_blank"
            >
              Данные Бюро национальной статистики, 2025–2026
            </a>
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
