import type { InputHTMLAttributes, ReactNode } from "react";

export function CheckboxField({
  children,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { children: ReactNode }) {
  return (
    <label className="checkbox">
      <input type="checkbox" {...props} />
      <span>{children}</span>
    </label>
  );
}
