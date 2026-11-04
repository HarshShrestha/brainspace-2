import { CONTENT_LIMITS } from "@/constants/content.constants";
import { apiClient, withQuery } from "@/services/apiClient";
import type { ReceivedShare, SharedSpacePage, ShareStatus } from "../types/share.types";

const page = (cursor?: string) => ({ cursor, limit: CONTENT_LIMITS.pageSize });

/** Builds the URL a user can send to others. The token itself is only shown once, when created. */
export function shareUrl(token: string) {
  return `${window.location.origin}/shared/${token}`;
}

export const shareService = {
  status: () => apiClient.get<ShareStatus>("/share-link"),
  rotate: () => apiClient.post<{ token: string; createdAt: string }>("/share-link"),
  revoke: () => apiClient.delete("/share-link"),
  viewPublic: (token: string, cursor?: string) =>
    apiClient.get<SharedSpacePage>(withQuery(`/shared/${encodeURIComponent(token)}`, page(cursor))),

  listReceived: () => apiClient.get<ReceivedShare[]>("/received-shares"),
  saveReceived: (link: string) => apiClient.post<ReceivedShare>("/received-shares", { link }),
  viewReceived: (id: string, cursor?: string) =>
    apiClient.get<SharedSpacePage>(withQuery(`/received-shares/${encodeURIComponent(id)}`, page(cursor))),
  removeReceived: (id: string) => apiClient.delete(`/received-shares/${encodeURIComponent(id)}`),
};
