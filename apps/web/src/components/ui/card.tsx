import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  tone?: "paper" | "muted" | "accent";
}

export function Card({ children, className = "", tone = "paper", ...props }: CardProps) {
  return (
    <section {...props} className={["card", `card--${tone}`, className].filter(Boolean).join(" ")}>
      {children}
    </section>
  );
}
