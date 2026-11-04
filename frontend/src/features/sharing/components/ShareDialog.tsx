import { useEffect, useState } from "react";
import { Alert } from "@/components/common/Alert";
import { LoadingState } from "@/components/common/LoadingState";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { errorMessage } from "@/utils/errorMessage";
import { formatDate } from "@/utils/formatDate";
import { shareService, shareUrl } from "../services/share.service";
import type { ShareStatus } from "../types/share.types";

/** Create, rotate, copy and revoke the user's read-only public link. */
export function ShareDialog({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<ShareStatus | null>(null);
  const [link, setLink] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    shareService
      .status()
      .then(setStatus)
      .catch((e: unknown) => setError(errorMessage(e)));
  }, []);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const rotate = () =>
    run(async () => {
      const result = await shareService.rotate();
      setLink(shareUrl(result.token));
      setStatus({ active: true, createdAt: result.createdAt });
      setMessage(status?.active ? "New link created. The previous link no longer works." : "Link created.");
    });

  const revoke = () =>
    run(async () => {
      await shareService.revoke();
      setLink("");
      setStatus({ active: false, createdAt: null });
      setMessage("Sharing turned off. The link no longer works.");
    });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setMessage("Link copied to clipboard.");
    } catch {
      setMessage("Select the link and copy it manually.");
    }
  };

  return (
    <Modal title="Share your space" eyebrow="Read-only link" onClose={onClose}>
      <p className="muted">
        Anyone with the link can view every item in your space (titles, links and tags), but not your folders or AI
        index. Creating a new link turns off the old one.
      </p>
      {!status && !error ? (
        <LoadingState label="Checking your link…" />
      ) : (
        <div className="stack">
          {status?.active && !link && (
            <Alert tone="info">
              Sharing is on since {formatDate(status.createdAt!)}. For security the link is only shown when it is
              created — create a new one to copy it again.
            </Alert>
          )}
          {link && (
            <div className="copy-field">
              <label htmlFor="share-link" className="field__label">
                Your share link
              </label>
              <div className="copy-field__row">
                <input id="share-link" className="input" readOnly value={link} onFocus={(e) => e.target.select()} />
                <Button variant="secondary" icon="content_copy" onClick={() => void copy()}>
                  Copy
                </Button>
              </div>
            </div>
          )}
          {message && <Alert tone="success">{message}</Alert>}
          {error && <Alert>{error}</Alert>}
        </div>
      )}
      <div className="dialog__actions">
        {status?.active && (
          <Button variant="danger" onClick={() => void revoke()} disabled={busy}>
            Turn off sharing
          </Button>
        )}
        <Button onClick={() => void rotate()} loading={busy} disabled={!status}>
          {status?.active ? "Create new link" : "Create link"}
        </Button>
      </div>
    </Modal>
  );
}
