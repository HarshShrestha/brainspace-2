import { z } from "zod";
import { CONTENT_LIMITS, CONTENT_TYPES } from "../constants/content.constants.js";
import { idParams, objectId, paginationQuery } from "./common.validator.js";

const title = z.string().trim().min(1, "Title is required").max(CONTENT_LIMITS.titleMaxLength);

const link = z
  .string()
  .trim()
  .max(CONTENT_LIMITS.linkMaxLength)
  .refine((value) => {
    try {
      const url = new URL(value);
      return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password;
    } catch {
      return false;
    }
  }, "Enter a valid http(s) link without embedded credentials");

const tags = z
  .array(z.string().trim().toLowerCase().min(1).max(CONTENT_LIMITS.tagMaxLength))
  .max(CONTENT_LIMITS.maxTags, `Use at most ${CONTENT_LIMITS.maxTags} tags`)
  .transform((values) => [...new Set(values)]);

const folderId = objectId("folder ID").nullable();

export const createContentSchema = {
  body: z.object({
    title,
    link,
    type: z.enum(CONTENT_TYPES),
    tags: tags.default([]),
    folderId: folderId.default(null),
  }),
};

export const updateContentSchema = {
  params: idParams("content ID"),
  body: z
    .object({ title, link, type: z.enum(CONTENT_TYPES), tags, folderId })
    .partial()
    .refine((body) => Object.keys(body).length > 0, "Provide at least one field to update"),
};

export const contentIdSchema = { params: idParams("content ID") };

export const listContentSchema = {
  query: paginationQuery.extend({
    /** A folder ID, or `root` for items outside any folder. Omit for everything. */
    folder: z.union([z.literal("root"), objectId("folder ID")]).optional(),
    type: z.enum(CONTENT_TYPES).optional(),
    tag: z.string().trim().toLowerCase().min(1).max(CONTENT_LIMITS.tagMaxLength).optional(),
    q: z.string().trim().max(CONTENT_LIMITS.searchMaxLength).optional(),
  }),
};
