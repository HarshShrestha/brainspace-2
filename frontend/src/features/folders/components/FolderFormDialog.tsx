import { useState, type FormEvent } from "react";
import { Alert } from "@/components/common/Alert";
import { TextField } from "@/components/forms/TextField";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { CONTENT_LIMITS } from "@/constants/content.constants";
import { errorMessage } from "@/utils/errorMessage";
import type { Folder } from "../types/folder.types";
import { folderNameSchema } from "../validation/folder.validation";

/** Creates a folder, or renames `folder` when provided. */
export function FolderFormDialog({
  folder,
  onSubmit,
  onClose,
}: {
  folder?: Folder;
  onSubmit: (name: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(folder?.name ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = folderNameSchema.safeParse(name);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Invalid name");
    setBusy(true);
    setError("");
    try {
      await onSubmit(parsed.data);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Modal title={folder ? "Rename folder" : "New folder"} onClose={onClose} size="small">
      <form className="stack" onSubmit={submit} noValidate>
        <TextField
          label="Folder name"
          value={name}
          maxLength={CONTENT_LIMITS.folderNameMaxLength}
          placeholder="e.g. Research"
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        {error && <Alert>{error}</Alert>}
        <div className="dialog__actions">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {folder ? "Rename" : "Create folder"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
