import { useId, type InputHTMLAttributes } from "react";
import { describedBy, Field } from "./Field";

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  hint?: string;
  error?: string | undefined;
  optional?: boolean;
}

export function TextField({ label, hint, error, optional, ...props }: TextFieldProps) {
  const id = useId();
  return (
    <Field id={id} label={label} hint={hint} error={error} optional={optional}>
      <input
        id={id}
        className="input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        {...props}
      />
    </Field>
  );
}
