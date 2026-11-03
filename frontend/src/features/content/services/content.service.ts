import { CONTENT_LIMITS } from "@/constants/content.constants";
import { apiClient, withQuery } from "@/services/apiClient";
import type { Page } from "@/types/api.types";
import type { ContentFilters, ContentInput, ContentItem, TagSummary } from "../types/content.types";

const item = (id: string) => `/content/${encodeURIComponent(id)}`;

export const contentService = {
  list: (filters: ContentFilters, cursor?: string, signal?: AbortSignal) =>
    apiClient.get<Page<ContentItem>>(
      withQuery("/content", { ...filters, cursor, limit: CONTENT_LIMITS.pageSize }),
      signal,
    ),
  create: (input: ContentInput) => apiClient.post<ContentItem>("/content", input),
  update: (id: string, input: Partial<ContentInput>) => apiClient.patch<ContentItem>(item(id), input),
  remove: (id: string) => apiClient.delete(item(id)),
  tags: () => apiClient.get<TagSummary[]>("/tags"),
};
