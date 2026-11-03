import { Icon } from "@/components/common/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { CONTENT_TYPE_META } from "@/constants/content.constants";
import type { Folder } from "@/features/folders/types/folder.types";
import { formatDate } from "@/utils/formatDate";
import { displayHost } from "@/utils/url";
import type { ContentItem, PublicContentItem } from "../types/content.types";

export interface ContentCardActions {
  folders: Folder[];
  canIndex: boolean;
  onEdit: (item: ContentItem) => void;
  onMove: (item: ContentItem, folderId: string | null) => void;
  onIndex: (item: ContentItem) => void;
  onDelete: (item: ContentItem) => void;
}

/** One saved item. Read-only unless `actions` is provided (owners only). */
export function ContentCard({
  item,
  actions,
  onTagClick,
}: {
  item: PublicContentItem | ContentItem;
  actions?: ContentCardActions;
  onTagClick?: (tag: string) => void;
}) {
  const meta = CONTENT_TYPE_META[item.type];
  const owned = actions && "folderId" in item ? item : null;

  return (
    <article className="card">
      <div className="card__top">
        <span className={`card__type card__type--${item.type}`}>
          <Icon name={meta.icon} />
          {meta.label}
        </span>
        {owned?.ai && (
          <span className={`badge ${owned.ai.stale ? "badge--warning" : "badge--ai"}`}>
            <Icon name="auto_awesome" />
            {owned.ai.stale ? "Reindex needed" : "AI ready"}
          </span>
        )}
      </div>
      <a className="card__title" href={item.link} target="_blank" rel="noopener noreferrer">
        {item.title}
      </a>
      <p className="card__host">{displayHost(item.link)}</p>
      {item.tags.length > 0 && (
        <ul className="tags" aria-label="Tags">
          {item.tags.map((tag) => (
            <li key={tag}>
              {onTagClick ? (
                <button type="button" className="tag" onClick={() => onTagClick(tag)}>
                  #{tag}
                </button>
              ) : (
                <span className="tag">#{tag}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="card__footer">
        <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
        {owned && actions && (
          <div className="card__actions">
            <label className="sr-only" htmlFor={`move-${owned.id}`}>
              Move {owned.title} to folder
            </label>
            <select
              id={`move-${owned.id}`}
              className="card__move"
              value={owned.folderId ?? ""}
              onChange={(e) => actions.onMove(owned, e.target.value || null)}
            >
              <option value="">No folder</option>
              {actions.folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
            {actions.canIndex && (
              <IconButton
                icon="auto_awesome"
                label={owned.ai ? `Manage AI index for ${owned.title}` : `Index ${owned.title} for AI`}
                onClick={() => actions.onIndex(owned)}
              />
            )}
            <IconButton icon="edit" label={`Edit ${owned.title}`} onClick={() => actions.onEdit(owned)} />
            <IconButton
              icon="delete"
              label={`Delete ${owned.title}`}
              className="icon-button--danger"
              onClick={() => actions.onDelete(owned)}
            />
          </div>
        )}
      </div>
    </article>
  );
}
