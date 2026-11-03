import { useCallback } from "react";
import { Link, useParams } from "react-router";
import { Icon } from "@/components/common/Icon";
import { SharedSpaceView } from "@/features/sharing/components/SharedSpaceView";
import { shareService } from "@/features/sharing/services/share.service";
import { paths } from "@/routes/paths";

export function ReceivedSpacePage() {
  const { id = "" } = useParams();
  const fetchPage = useCallback((cursor?: string) => shareService.viewReceived(id, cursor), [id]);
  return (
    <div className="stack">
      <Link to={paths.sharedWithMe()} className="back-link">
        <Icon name="arrow_back" /> Shared with me
      </Link>
      <SharedSpaceView sourceKey={id} fetchPage={fetchPage} />
    </div>
  );
}
