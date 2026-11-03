import type { ReactNode } from "react";
import { Alert } from "@/components/common/Alert";
import { LoadingState } from "@/components/common/LoadingState";
import { Button } from "@/components/ui/Button";
import type { ContentItem, PublicContentItem } from "../types/content.types";
import { ContentCard, type ContentCardActions } from "./ContentCard";

/** Loading, error, empty and paginated states for a list of content cards. */
export function ContentGrid<T extends PublicContentItem | ContentItem>({
  items,
  status,
  error,
  hasMore,
  loadingMore,
  onLoadMore,
  onRetry,
  empty,
  actions,
  onTagClick,
}: {
  items: T[];
  status: "loading" | "ready" | "error";
  error: string;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  empty: ReactNode;
  actions?: ContentCardActions;
  onTagClick?: (tag: string) => void;
}) {
  if (status === "loading") return <LoadingState label="Loading your items…" />;
  if (status === "error")
    return (
      <div className="stack">
        <Alert>{error}</Alert>
        <Button variant="secondary" icon="refresh" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  if (!items.length) return <>{empty}</>;
  return (
    <div className="stack">
      {error && <Alert>{error}</Alert>}
      <div className="grid">
        {items.map((item) => (
          <ContentCard key={item.id} item={item} actions={actions} onTagClick={onTagClick} />
        ))}
      </div>
      {hasMore && (
        <div className="load-more">
          <Button variant="secondary" onClick={onLoadMore} loading={loadingMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
