import type { Page } from "@/types/api.types";
import type { PublicContentItem } from "@/features/content/types/content.types";

export interface ShareStatus {
  active: boolean;
  createdAt: string | null;
}

export interface SharedSpacePage extends Page<PublicContentItem> {
  owner: { username: string };
}

export interface ReceivedShare {
  id: string;
  ownerUsername: string | null;
  available: boolean;
  createdAt: string;
}
