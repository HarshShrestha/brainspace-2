import { useId, type SelectHTMLAttributes } from "react";
import { describedBy, Field } from "./Field";

export interface SelectOption {
  value: string;
  label: string;
}

export function SelectField({
  label,
  options,
  hint,
  error,
  ...props
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
  label: string;
  options: readonly SelectOption[];
  hint?: string;
  error?: string | undefined;
}) {
  const id = useId();
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <select id={id} className="input" aria-describedby={describedBy(id, error, hint)} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
