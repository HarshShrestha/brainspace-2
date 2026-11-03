import type { ContentType } from "../constants/content.constants.js";
import type { SourceType } from "../constants/assistant.constants.js";

/** Public API contracts. Services return these shapes; Mongoose documents never leave the service layer. */

export interface UserDto {
  id: string;
  username: string;
  createdAt: string;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface AiIndexDto {
  indexedAt: string;
  sourceType: SourceType;
  chunkCount: number;
  /** True when indexed with a different embedding model than the one configured now. */
  stale: boolean;
}

export interface ContentDto {
  id: string;
  title: string;
  link: string;
  type: ContentType;
  tags: string[];
  folderId: string | null;
  ai: AiIndexDto | null;
  createdAt: string;
  updatedAt: string;
}

/** What a share-link viewer sees: no folders, no AI metadata. */
export type PublicContentDto = Pick<ContentDto, "id" | "title" | "link" | "type" | "tags" | "createdAt">;

export interface SharedSpaceDto {
  owner: { username: string };
  items: PublicContentDto[];
  nextCursor: string | null;
}

export interface FolderDto {
  id: string;
  name: string;
  itemCount: number;
  createdAt: string;
}

export interface TagDto {
  title: string;
  count: number;
}

export interface ShareStatusDto {
  active: boolean;
  createdAt: string | null;
}

export interface ReceivedShareDto {
  id: string;
  ownerUsername: string | null;
  available: boolean;
  createdAt: string;
}

export interface AssistantStatusDto {
  enabled: boolean;
  indexedSources: number;
  readySources: number;
  staleSources: number;
  sourceLimit: number;
}

export interface AnswerSourceDto {
  contentId: string;
  title: string;
  link: string;
  quote: string;
  sourceType: SourceType;
  indexedAt: string;
}

export interface AnswerDto {
  answer: string;
  abstained: boolean;
  sources: AnswerSourceDto[];
}
