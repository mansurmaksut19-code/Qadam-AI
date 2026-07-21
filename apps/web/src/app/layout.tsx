import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QADAM AI — проверка договора аренды",
  description:
    "Проверка договора аренды жилья в Казахстане: рискованные условия, официальные источники и понятные следующие шаги.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html data-scroll-behavior="smooth" lang="ru">
      <body>
        <a className="skip-link" href="#main-content">
          Перейти к содержанию
        </a>
        {children}
      </body>
    </html>
  );
}
