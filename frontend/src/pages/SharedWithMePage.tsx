import { useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/common/Alert";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { LoadingState } from "@/components/common/LoadingState";
import { AddSharedSpaceForm } from "@/features/sharing/components/AddSharedSpaceForm";
import { ReceivedShareList } from "@/features/sharing/components/ReceivedShareList";
import { shareService } from "@/features/sharing/services/share.service";
import type { ReceivedShare } from "@/features/sharing/types/share.types";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useNotify } from "@/hooks/useNotify";
import { errorMessage } from "@/utils/errorMessage";

export function SharedWithMePage() {
  useDocumentTitle("Shared with me");
  const notify = useNotify();
  const [entries, setEntries] = useState<ReceivedShare[] | null>(null);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<ReceivedShare | null>(null);

  const load = useCallback(async () => {
    try {
      setEntries(await shareService.listReceived());
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);
  useEffect(() => {
    let active = true;
    shareService
      .listReceived()
      .then((list) => active && setEntries(list))
      .catch((e: unknown) => active && setError(errorMessage(e)));
    return () => {
      active = false;
    };
  }, []);

  async function add(link: string) {
    const entry = await shareService.saveReceived(link);
    await load();
    notify(`Added ${entry.ownerUsername}’s space`);
  }

  return (
    <div className="stack stack--loose">
      <header className="page-header">
        <div>
          <p className="eyebrow">Your network</p>
          <h1>Shared with me</h1>
          <p className="muted">Keep the BrainSpace links other people have shared with you.</p>
        </div>
      </header>
      <AddSharedSpaceForm onAdd={add} />
      {error && <Alert>{error}</Alert>}
      {entries === null ? !error && <LoadingState /> : <ReceivedShareList entries={entries} onRemove={setRemoving} />}
      {removing && (
        <ConfirmDialog
          title="Remove this shared space?"
          message="It will be removed from your list. You can add it again if you still have the link."
          confirmLabel="Remove"
          onConfirm={async () => {
            await shareService.removeReceived(removing.id);
            setEntries((list) => list?.filter((e) => e.id !== removing.id) ?? null);
          }}
          onClose={() => setRemoving(null)}
        />
      )}
    </div>
  );
}
