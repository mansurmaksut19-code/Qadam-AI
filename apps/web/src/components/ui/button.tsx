import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "quiet";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  fullWidth?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className = "",
    disabled,
    fullWidth = false,
    loading = false,
    type = "button",
    variant = "primary",
    ...props
  },
  ref,
) {
  const classes = [
    "button",
    `button--${variant}`,
    fullWidth ? "button--full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...props}
      aria-busy={loading || undefined}
      className={classes}
      disabled={disabled || loading}
      ref={ref}
      type={type}
    >
      {loading ? <span aria-hidden="true" className="button__spinner" /> : null}
      <span>{children}</span>
    </button>
  );
});
