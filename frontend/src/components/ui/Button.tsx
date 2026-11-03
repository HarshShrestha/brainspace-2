import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "@/components/common/Icon";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  icon,
  loading = false,
  disabled,
  className = "",
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`button button--${variant} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner /> : icon && <Icon name={icon} />}
      <span>{children}</span>
    </button>
  );
}
