import { useCallback } from "react";
import { useRecoilValue } from "recoil";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { contentRevisionState } from "@/store/library.atoms";
import { contentService } from "../services/content.service";
import type { ContentFilters, ContentItem } from "../types/content.types";

/** The signed-in user's content for the given filters, with local helpers for optimistic list updates. */
export function useContentList(filters: ContentFilters) {
  const revision = useRecoilValue(contentRevisionState);
  const key = JSON.stringify({ ...filters, revision });
  const list = usePaginatedList<ContentItem>((cursor, signal) => contentService.list(filters, cursor, signal), key);
  const { setItems } = list;

  const replaceItem = useCallback(
    (item: ContentItem) => setItems((items) => items.map((i) => (i.id === item.id ? item : i))),
    [setItems],
  );
  const removeItem = useCallback((id: string) => setItems((items) => items.filter((i) => i.id !== id)), [setItems]);

  return { ...list, replaceItem, removeItem };
}
