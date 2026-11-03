import { useState, type FormEvent } from "react";
import { Alert } from "@/components/common/Alert";
import { Button } from "@/components/ui/Button";
import { errorMessage } from "@/utils/errorMessage";

export function AddSharedSpaceForm({ onAdd }: { onAdd: (link: string) => Promise<void> }) {
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!link.trim()) return setError("Paste a share link first.");
    setBusy(true);
    setError("");
    try {
      await onAdd(link.trim());
      setLink("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel stack" onSubmit={submit} noValidate>
      <label htmlFor="shared-link" className="field__label">
        Add a shared space
      </label>
      <div className="copy-field__row">
        <input
          id="shared-link"
          className="input"
          type="url"
          value={link}
          placeholder="Paste a BrainSpace share link"
          onChange={(e) => setLink(e.target.value)}
        />
        <Button type="submit" loading={busy}>
          Add
        </Button>
      </div>
      <p className="field__hint">Read-only. If the owner turns sharing off, the space becomes unavailable.</p>
      {error && <Alert>{error}</Alert>}
    </form>
  );
}
