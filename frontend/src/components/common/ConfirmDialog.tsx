import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { errorMessage } from "@/utils/errorMessage";
import { Alert } from "./Alert";

/** Asks before a destructive action; keeps the dialog open and shows the error if the action fails. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function confirm() {
    setBusy(true);
    setError("");
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }
  return (
    <Modal title={title} onClose={onClose} size="small">
      <p className="muted">{message}</p>
      {error && <Alert>{error}</Alert>}
      <div className="dialog__actions">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" onClick={() => void confirm()} loading={busy} autoFocus>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
