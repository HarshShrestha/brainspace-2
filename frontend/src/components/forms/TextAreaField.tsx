import { useId, type TextareaHTMLAttributes } from "react";
import { describedBy, Field } from "./Field";

export function TextAreaField({
  label,
  hint,
  error,
  optional,
  ...props
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & {
  label: string;
  hint?: string;
  error?: string | undefined;
  optional?: boolean;
}) {
  const id = useId();
  return (
    <Field id={id} label={label} hint={hint} error={error} optional={optional}>
      <textarea
        id={id}
        className="input input--textarea"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        {...props}
      />
    </Field>
  );
}
