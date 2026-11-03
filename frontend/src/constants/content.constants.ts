import type { IconName } from "@/components/common/Icon";

export const CONTENT_TYPES = ["article", "video", "audio", "image"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_TYPE_META: Record<ContentType, { label: string; plural: string; icon: IconName }> = {
  article: { label: "Article or document", plural: "Articles", icon: "article" },
  video: { label: "Video", plural: "Videos", icon: "smart_display" },
  audio: { label: "Audio", plural: "Audio", icon: "headphones" },
  image: { label: "Image", plural: "Images", icon: "image" },
};

/** Mirrors backend/src/constants/content.constants.ts. The server remains the source of truth. */
export const CONTENT_LIMITS = {
  titleMaxLength: 200,
  linkMaxLength: 2048,
  maxTags: 20,
  tagMaxLength: 40,
  folderNameMaxLength: 100,
  pageSize: 24,
} as const;
