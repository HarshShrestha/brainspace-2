import type { ContentType } from "@/constants/content.constants";

export interface AiIndex {
  indexedAt: string;
  sourceType: "page" | "pasted";
  chunkCount: number;
  stale: boolean;
}

export interface ContentItem {
  id: string;
  title: string;
  link: string;
  type: ContentType;
  tags: string[];
  folderId: string | null;
  ai: AiIndex | null;
  createdAt: string;
  updatedAt: string;
}

/** Read-only view of someone else's item (no folder or AI metadata). */
export type PublicContentItem = Pick<ContentItem, "id" | "title" | "link" | "type" | "tags" | "createdAt">;

export interface ContentInput {
  title: string;
  link: string;
  type: ContentType;
  tags: string[];
  folderId: string | null;
}

export interface ContentFilters {
  folder?: string;
  type?: ContentType;
  tag?: string;
  q?: string;
}

export interface TagSummary {
  title: string;
  count: number;
}
