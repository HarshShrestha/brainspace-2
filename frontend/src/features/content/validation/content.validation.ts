import { z } from "zod";
import { CONTENT_LIMITS, CONTENT_TYPES } from "@/constants/content.constants";
import { isHttpUrl } from "@/utils/url";

/** "Design, ideas , design" -> ["design", "ideas"] */
export function parseTags(value: string) {
  return [
    ...new Set(
      value
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

export const contentFormSchema = z.object({
  title: z.string().trim().min(1, "Give it a title").max(CONTENT_LIMITS.titleMaxLength, "That title is too long"),
  link: z
    .string()
    .trim()
    .max(CONTENT_LIMITS.linkMaxLength, "That link is too long")
    .refine(isHttpUrl, "Enter a full link starting with http:// or https://"),
  type: z.enum(CONTENT_TYPES),
  tags: z
    .string()
    .transform(parseTags)
    .pipe(
      z
        .array(
          z.string().max(CONTENT_LIMITS.tagMaxLength, `Tags can be up to ${CONTENT_LIMITS.tagMaxLength} characters`),
        )
        .max(CONTENT_LIMITS.maxTags, `Use at most ${CONTENT_LIMITS.maxTags} tags`),
    ),
  folderId: z.string().nullable(),
});
