import { useCallback } from "react";
import { useParams } from "react-router";
import { SharedSpaceView } from "@/features/sharing/components/SharedSpaceView";
import { shareService } from "@/features/sharing/services/share.service";

export function PublicSharePage() {
  const { token = "" } = useParams();
  const fetchPage = useCallback((cursor?: string) => shareService.viewPublic(token, cursor), [token]);
  return <SharedSpaceView sourceKey={token} fetchPage={fetchPage} />;
}
