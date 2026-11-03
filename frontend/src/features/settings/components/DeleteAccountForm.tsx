import { useState, type FormEvent } from "react";
import { Alert } from "@/components/common/Alert";
import { TextField } from "@/components/forms/TextField";
import { Button } from "@/components/ui/Button";
import { useAuthActions } from "@/features/authentication/hooks/useAuthActions";
import { errorMessage } from "@/utils/errorMessage";
import { accountService } from "../services/account.service";

/** Permanently deletes the account after re-entering the password and typing the username. */
export function DeleteAccountForm({ username }: { username: string }) {
  const { signOutLocally } = useAuthActions();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const confirmed = confirmation.trim().toLowerCase() === username;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!confirmed || !password) return;
    setBusy(true);
    setError("");
    try {
      await accountService.deleteAccount(password);
      signOutLocally();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <form className="panel panel--danger stack" onSubmit={submit} aria-labelledby="delete-title">
      <h2 id="delete-title">Delete account</h2>
      <p className="muted">
        This permanently deletes your account, every saved item, folder, tag, AI index and share link. It can't be
        undone.
      </p>
      <TextField
        label={`Type “${username}” to confirm`}
        value={confirmation}
        autoComplete="off"
        onChange={(e) => setConfirmation(e.target.value)}
      />
      <TextField
        label="Password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <Alert>{error}</Alert>}
      <div>
        <Button type="submit" variant="danger" loading={busy} disabled={!confirmed || !password}>
          Delete my account
        </Button>
      </div>
    </form>
  );
}
