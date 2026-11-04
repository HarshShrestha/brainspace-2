import { useState, type FormEvent } from "react";
import { Alert } from "@/components/common/Alert";
import { CheckboxField } from "@/components/forms/CheckboxField";
import { TextAreaField } from "@/components/forms/TextAreaField";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ASSISTANT_LIMITS } from "@/constants/assistant.constants";
import type { ContentItem } from "@/features/content/types/content.types";
import { errorMessage } from "@/utils/errorMessage";
import { formatDate } from "@/utils/formatDate";
import { assistantService } from "../services/assistant.service";

/** Indexes (or reindexes / un-indexes) one item. Requires explicit consent every time. */
export function IndexSourceDialog({
  item,
  onChanged,
  onClose,
}: {
  item: ContentItem;
  onChanged: (item: ContentItem) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState<"index" | "remove" | null>(null);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy("index");
    setError("");
    try {
      onChanged(await assistantService.index(item.id, text));
      onClose();
    } catch (e) {
      setError(errorMessage(e, "Couldn't index this source."));
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("remove");
    setError("");
    try {
      await assistantService.removeIndex(item.id);
      onChanged({ ...item, ai: null });
      onClose();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(null);
    }
  }

  return (
    <Modal title={item.ai ? "Update AI index" : "Index for AI"} eyebrow={item.title} onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        {item.ai && (
          <Alert tone="info">
            Indexed {formatDate(item.ai.indexedAt)} from {item.ai.sourceType === "pasted" ? "pasted text" : "the page"}{" "}
            ({item.ai.chunkCount} excerpts).
          </Alert>
        )}
        <p className="muted">
          Leave the box empty to read the public web page, or paste the text yourself for private pages, PDFs, videos or
          audio transcripts. Up to {ASSISTANT_LIMITS.maxSourceChars.toLocaleString()} characters are indexed.
        </p>
        <TextAreaField
          label="Source text"
          optional
          rows={7}
          value={text}
          maxLength={ASSISTANT_LIMITS.maxSourceChars}
          placeholder="Paste text here…"
          onChange={(e) => setText(e.target.value)}
        />
        <CheckboxField checked={consent} onChange={(e) => setConsent(e.target.checked)}>
          I understand this text will be sent to the configured AI provider for processing, which may incur charges.
        </CheckboxField>
        {error && <Alert>{error}</Alert>}
        <div className="dialog__actions">
          {item.ai && (
            <Button variant="danger" onClick={() => void remove()} loading={busy === "remove"} disabled={busy !== null}>
              Remove index
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy === "index"} disabled={!consent || busy !== null}>
            {item.ai ? "Reindex" : "Index source"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
