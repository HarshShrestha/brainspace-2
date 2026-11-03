import { useCallback } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { Alert } from "@/components/common/Alert";
import { LoadingState } from "@/components/common/LoadingState";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { ContentGrid } from "@/features/content/components/ContentGrid";
import type { PublicContentItem } from "@/features/content/types/content.types";
import type { SharedSpacePage } from "../types/share.types";

/** Read-only, paginated view of another user's space (public link or saved received share). */
export function SharedSpaceView({
  sourceKey,
  fetchPage,
}: {
  sourceKey: string;
  fetchPage: (cursor?: string) => Promise<SharedSpacePage>;
}) {
  const fetcher = useCallback((cursor: string | undefined) => fetchPage(cursor), [fetchPage]);
  const list = usePaginatedList<PublicContentItem, SharedSpacePage>(fetcher, sourceKey);
  const owner = list.page?.owner.username;
  useDocumentTitle(owner ? `${owner}’s space` : "Shared space");

  if (list.status === "loading") return <LoadingState label="Opening shared space…" />;
  if (list.status === "error" && !list.page) return <Alert>{list.error}</Alert>;

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Shared space · read only</p>
          <h1>{owner}’s space</h1>
          <p className="muted">A collection of things worth remembering.</p>
        </div>
      </header>
      <ContentGrid
        items={list.items}
        status={list.status}
        error={list.error}
        hasMore={list.hasMore}
        loadingMore={list.loadingMore}
        onLoadMore={() => void list.loadMore()}
        onRetry={list.reload}
        empty={<EmptyState title="Nothing here yet">This space doesn't have any items yet.</EmptyState>}
      />
    </section>
  );
}
