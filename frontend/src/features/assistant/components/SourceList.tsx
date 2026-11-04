import { Icon } from "@/components/common/Icon";
import { Button } from "@/components/ui/Button";
import { CONTENT_TYPE_META } from "@/constants/content.constants";
import type { ContentItem } from "@/features/content/types/content.types";

/** The user's items with their AI index state, shown beside the chat. */
export function SourceList({
  items,
  hasMore,
  loadingMore,
  onLoadMore,
  onIndex,
  canIndex,
}: {
  items: ContentItem[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onIndex: (item: ContentItem) => void;
  canIndex: boolean;
}) {
  if (!items.length) return <p className="muted">Save an item to your library first.</p>;
  return (
    <div className="stack">
      <ul className="sources">
        {items.map((item) => (
          <li key={item.id} className="sources__item">
            <Icon name={CONTENT_TYPE_META[item.type].icon} />
            <div className="sources__body">
              <a href={item.link} target="_blank" rel="noopener noreferrer">
                {item.title}
              </a>
              <span className={item.ai && !item.ai.stale ? "sources__state sources__state--ready" : "sources__state"}>
                {item.ai ? (item.ai.stale ? "Needs reindex" : "Indexed") : "Not indexed"}
              </span>
            </div>
            {canIndex && (
              <button type="button" className="link-button" onClick={() => onIndex(item)}>
                {item.ai ? "Manage" : "Index"}
                <span className="sr-only"> {item.title}</span>
              </button>
            )}
          </li>
        ))}
      </ul>
      {hasMore && (
        <Button variant="ghost" onClick={onLoadMore} loading={loadingMore}>
          Show more sources
        </Button>
      )}
    </div>
  );
}
