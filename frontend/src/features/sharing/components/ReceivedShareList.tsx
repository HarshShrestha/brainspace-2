import { Link } from "react-router";
import { EmptyState } from "@/components/common/EmptyState";
import { Icon } from "@/components/common/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { paths } from "@/routes/paths";
import { formatDate } from "@/utils/formatDate";
import type { ReceivedShare } from "../types/share.types";

export function ReceivedShareList({
  entries,
  onRemove,
}: {
  entries: ReceivedShare[];
  onRemove: (entry: ReceivedShare) => void;
}) {
  if (!entries.length)
    return (
      <EmptyState icon="group" title="Nothing shared with you yet">
        When someone sends you their BrainSpace link, paste it above to keep it here.
      </EmptyState>
    );
  return (
    <ul className="list">
      {entries.map((entry) => (
        <li key={entry.id} className="list__item">
          <span className="list__icon">
            <Icon name={entry.available ? "group" : "link_off"} />
          </span>
          <div className="list__body">
            {entry.available ? (
              <Link to={paths.receivedSpace(entry.id)} className="list__title">
                {entry.ownerUsername}’s space
              </Link>
            ) : (
              <span className="list__title">Unavailable space</span>
            )}
            <p className="muted">
              {entry.available
                ? `Read-only · added ${formatDate(entry.createdAt)}`
                : "The owner turned off or replaced this link."}
            </p>
          </div>
          <IconButton
            icon="delete"
            label={`Remove ${entry.ownerUsername ?? "unavailable"} shared space`}
            className="icon-button--danger"
            onClick={() => onRemove(entry)}
          />
        </li>
      ))}
    </ul>
  );
}
