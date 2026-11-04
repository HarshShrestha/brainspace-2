import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Alert } from "@/components/common/Alert";
import { TextField } from "@/components/forms/TextField";
import { Button } from "@/components/ui/Button";
import { paths } from "@/routes/paths";
import { errorMessage } from "@/utils/errorMessage";
import { useAuthActions } from "../hooks/useAuthActions";
import { fieldErrors, type FieldErrors } from "@/utils/fieldErrors";
import { loginFormSchema, registerFormSchema } from "../validation/auth.validation";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isRegister = mode === "register";
  const { login, register } = useAuthActions();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ username: "", password: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setServerError("");
    const parsed = (isRegister ? registerFormSchema : loginFormSchema).safeParse(values);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setBusy(true);
    try {
      await (isRegister ? register : login)(parsed.data);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from.startsWith("/") ? from : paths.library(), { replace: true });
    } catch (e) {
      setServerError(errorMessage(e));
      setBusy(false);
    }
  }

  const set = (field: keyof typeof values) => (event: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [field]: event.target.value }));

  return (
    <div className="auth-card">
      <p className="eyebrow">{isRegister ? "Start your second brain" : "Welcome back"}</p>
      <h1>{isRegister ? "Create your space" : "Sign in"}</h1>
      <p className="muted">
        {isRegister
          ? "A calm home for everything you want to remember."
          : "Your collection is right where you left it."}
      </p>
      <form onSubmit={submit} noValidate className="stack">
        <TextField
          label="Username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={values.username}
          onChange={set("username")}
          error={errors.username}
          hint={isRegister ? "3–30 letters, numbers or underscores" : undefined}
          autoFocus
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          value={values.password}
          onChange={set("password")}
          error={errors.password}
          hint={isRegister ? "At least 8 characters" : undefined}
        />
        {serverError && <Alert>{serverError}</Alert>}
        <Button type="submit" loading={busy} className="button--wide">
          {isRegister ? "Create account" : "Sign in"}
        </Button>
      </form>
      <p className="auth-card__switch">
        {isRegister ? "Already have an account?" : "New to BrainSpace?"}{" "}
        <Link to={isRegister ? paths.login() : paths.register()} state={location.state}>
          {isRegister ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}
