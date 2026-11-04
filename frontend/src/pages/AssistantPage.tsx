import { useState } from "react";
import { AssistantChat } from "@/features/assistant/components/AssistantChat";
import { IndexSourceDialog } from "@/features/assistant/components/IndexSourceDialog";
import { SourceList } from "@/features/assistant/components/SourceList";
import { useAssistantStatus } from "@/features/assistant/hooks/useAssistantStatus";
import { useContentList } from "@/features/content/hooks/useContentList";
import type { ContentItem } from "@/features/content/types/content.types";
import { LoadingState } from "@/components/common/LoadingState";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export function AssistantPage() {
  useDocumentTitle("Ask your space");
  const { status, error, refresh } = useAssistantStatus();
  const sources = useContentList({});
  const [indexing, setIndexing] = useState<ContentItem | null>(null);

  return (
    <div className="assistant">
      <AssistantChat status={status} statusError={error} />
      <aside className="assistant__sources panel" aria-labelledby="sources-title">
        <h2 id="sources-title">Your sources</h2>
        <p className="muted">Only indexed sources are used to answer.</p>
        {sources.status === "loading" ? (
          <LoadingState />
        ) : (
          <SourceList
            items={sources.items}
            hasMore={sources.hasMore}
            loadingMore={sources.loadingMore}
            onLoadMore={() => void sources.loadMore()}
            onIndex={setIndexing}
            canIndex={Boolean(status?.enabled)}
          />
        )}
      </aside>
      {indexing && (
        <IndexSourceDialog
          item={indexing}
          onChanged={(item) => {
            sources.replaceItem(item);
            void refresh();
          }}
          onClose={() => setIndexing(null)}
        />
      )}
    </div>
  );
}
