import type { ButtonHTMLAttributes } from "react";
import { Icon, type IconName } from "@/components/common/Icon";

/** Icon-only button; `label` is required because it is the accessible name. */
export function IconButton({
  icon,
  label,
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string }) {
  return (
    <button type={type} className={`icon-button ${className}`.trim()} aria-label={label} title={label} {...props}>
      <Icon name={icon} />
    </button>
  );
}
