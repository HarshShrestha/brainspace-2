import type { QueryFilter, Types } from "mongoose";
import { env } from "../config/environment.js";
import type { ContentType } from "../constants/content.constants.js";
import { Content, type ContentDocument } from "../models/content.model.js";
import { ContentChunk } from "../models/content-chunk.model.js";
import { Folder } from "../models/folder.model.js";
import { Tag } from "../models/tag.model.js";
import type { ContentDto, Page, PublicContentDto } from "../types/api.types.js";
import { ApiError } from "../utils/ApiError.js";
import { afterCursor, decodeCursor, encodeCursor } from "../utils/cursor.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { resolveTagIds } from "./tag.service.js";

type PopulatedContent = Omit<ContentDocument, "tags"> & {
  _id: Types.ObjectId;
  tags: { title: string }[];
  createdAt: Date;
  updatedAt: Date;
};

export interface ContentFilters {
  folder?: "root" | string | undefined;
  type?: ContentType | undefined;
  tag?: string | undefined;
  q?: string | undefined;
  cursor?: string | undefined;
  limit: number;
}

export interface ContentInput {
  title: string;
  link: string;
  type: ContentType;
  tags: string[];
  folderId: string | null;
}

export function toContentDto(item: PopulatedContent): ContentDto {
  return {
    id: item._id.toString(),
    title: item.title,
    link: item.link,
    type: item.type,
    tags: item.tags.map((tag) => tag.title),
    folderId: item.folderId ? item.folderId.toString() : null,
    ai: item.ai
      ? {
          indexedAt: item.ai.indexedAt.toISOString(),
          sourceType: item.ai.sourceType,
          chunkCount: item.ai.chunkCount,
          stale: item.ai.model !== env.rag.embeddingModel,
        }
      : null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export function toPublicContentDto(item: ContentDto): PublicContentDto {
  const { id, title, link, type, tags, createdAt } = item;
  return { id, title, link, type, tags, createdAt };
}

async function buildFilter(userId: string, filters: ContentFilters): Promise<QueryFilter<ContentDocument> | null> {
  const clauses: QueryFilter<ContentDocument>[] = [{ userId }];
  if (filters.folder === "root") clauses.push({ folderId: null });
  else if (filters.folder) clauses.push({ folderId: filters.folder });
  if (filters.type) clauses.push({ type: filters.type });
  if (filters.tag) {
    const tag = await Tag.findOne({ userId, title: filters.tag }).lean();
    if (!tag) return null;
    clauses.push({ tags: tag._id });
  }
  if (filters.q) {
    const pattern = new RegExp(escapeRegex(filters.q), "i");
    const tagIds = (await Tag.find({ userId, title: pattern }).select("_id").lean()).map((t) => t._id);
    clauses.push({ $or: [{ title: pattern }, { link: pattern }, { tags: { $in: tagIds } }] });
  }
  if (filters.cursor) clauses.push(afterCursor(decodeCursor(filters.cursor)));
  return { $and: clauses };
}

/** Newest-first page of the user's content. Every query is scoped to `userId`. */
export async function listContent(userId: string, filters: ContentFilters): Promise<Page<ContentDto>> {
  const filter = await buildFilter(userId, filters);
  if (!filter) return { items: [], nextCursor: null };
  const rows = await Content.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(filters.limit + 1)
    .populate<{ tags: { title: string }[] }>("tags", "title")
    .lean<PopulatedContent[]>();
  const hasMore = rows.length > filters.limit;
  const page = hasMore ? rows.slice(0, filters.limit) : rows;
  const last = page.at(-1);
  return { items: page.map(toContentDto), nextCursor: hasMore && last ? encodeCursor(last) : null };
}

async function findOwned(userId: string, id: string) {
  const item = await Content.findOne({ _id: id, userId })
    .populate<{ tags: { title: string }[] }>("tags", "title")
    .lean<PopulatedContent>();
  if (!item) throw ApiError.notFound("Content not found");
  return item;
}

export async function getContent(userId: string, id: string) {
  return toContentDto(await findOwned(userId, id));
}

async function assertFolderOwned(userId: string, folderId: string | null) {
  if (folderId && !(await Folder.exists({ _id: folderId, userId }))) throw ApiError.notFound("Folder not found");
}

/**
 * A folder can be deleted between the ownership check and the write. If that happened,
 * move the item back to the root so it is never attached to a missing folder.
 */
async function undoIfFolderVanished(userId: string, id: string, folderId: string | null) {
  if (folderId && !(await Folder.exists({ _id: folderId, userId }))) {
    await Content.updateOne({ _id: id, userId, folderId }, { $set: { folderId: null } });
    throw ApiError.notFound("Folder not found");
  }
}

export async function createContent(userId: string, input: ContentInput) {
  await assertFolderOwned(userId, input.folderId);
  const tags = await resolveTagIds(userId, input.tags);
  const created = await Content.create({ ...input, tags, userId });
  await undoIfFolderVanished(userId, created.id, input.folderId);
  return getContent(userId, created.id);
}

export async function updateContent(userId: string, id: string, input: Partial<ContentInput>) {
  const { tags, ...fields } = input;
  if (fields.folderId !== undefined) await assertFolderOwned(userId, fields.folderId);
  const update: Record<string, unknown> = { ...fields };
  if (tags) update.tags = await resolveTagIds(userId, tags);
  // A changed link means the AI index no longer describes this source.
  const current = await findOwned(userId, id);
  const linkChanged = fields.link !== undefined && fields.link !== current.link;
  const result = await Content.updateOne(
    { _id: id, userId },
    linkChanged ? { $set: { ...update, ai: null } } : { $set: update },
  );
  if (!result.matchedCount) throw ApiError.notFound("Content not found");
  if (linkChanged) await ContentChunk.deleteMany({ userId, contentId: id });
  if (fields.folderId !== undefined) await undoIfFolderVanished(userId, id, fields.folderId);
  return getContent(userId, id);
}

/** Removes AI chunks first, so a partial failure can never leave searchable text for deleted content. */
export async function deleteContent(userId: string, id: string) {
  if (!(await Content.exists({ _id: id, userId }))) throw ApiError.notFound("Content not found");
  await ContentChunk.deleteMany({ userId, contentId: id });
  await Content.deleteOne({ _id: id, userId });
}
