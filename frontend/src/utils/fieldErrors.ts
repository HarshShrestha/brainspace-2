import type { ZodError } from "zod";

export type FieldErrors = Partial<Record<string, string>>;

/** Flattens a Zod error into the first message for each top-level field. */
export function fieldErrors(error: ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}
