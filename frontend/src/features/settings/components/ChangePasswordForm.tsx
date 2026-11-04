import { useState, type FormEvent } from "react";
import { Alert } from "@/components/common/Alert";
import { TextField } from "@/components/forms/TextField";
import { Button } from "@/components/ui/Button";
import { errorMessage } from "@/utils/errorMessage";
import { fieldErrors, type FieldErrors } from "@/utils/fieldErrors";
import { accountService } from "../services/account.service";
import { changePasswordFormSchema } from "../validation/settings.validation";

const EMPTY = { currentPassword: "", newPassword: "", confirmPassword: "" };

export function ChangePasswordForm() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setResult(null);
    const parsed = changePasswordFormSchema.safeParse(values);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setBusy(true);
    try {
      await accountService.changePassword(parsed.data.currentPassword, parsed.data.newPassword);
      setValues(EMPTY);
      setResult({ tone: "success", message: "Password changed. You've been signed out on your other devices." });
    } catch (e) {
      setResult({ tone: "error", message: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  const set = (field: keyof typeof EMPTY) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [field]: e.target.value }));

  return (
    <form className="panel stack" onSubmit={submit} noValidate aria-labelledby="password-title">
      <h2 id="password-title">Change password</h2>
      <TextField
        label="Current password"
        type="password"
        autoComplete="current-password"
        value={values.currentPassword}
        onChange={set("currentPassword")}
        error={errors.currentPassword}
      />
      <TextField
        label="New password"
        type="password"
        autoComplete="new-password"
        value={values.newPassword}
        onChange={set("newPassword")}
        error={errors.newPassword}
        hint="At least 8 characters"
      />
      <TextField
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        value={values.confirmPassword}
        onChange={set("confirmPassword")}
        error={errors.confirmPassword}
      />
      {result && <Alert tone={result.tone}>{result.message}</Alert>}
      <div>
        <Button type="submit" loading={busy}>
          Update password
        </Button>
      </div>
    </form>
  );
}
