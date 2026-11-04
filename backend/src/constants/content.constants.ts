export const CONTENT_TYPES = ["article", "video", "audio", "image"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_LIMITS = {
  titleMaxLength: 200,
  linkMaxLength: 2048,
  maxTags: 20,
  tagMaxLength: 40,
  folderNameMaxLength: 100,
  searchMaxLength: 200,
} as const;

export const PAGINATION = {
  defaultLimit: 24,
  maxLimit: 100,
} as const;
