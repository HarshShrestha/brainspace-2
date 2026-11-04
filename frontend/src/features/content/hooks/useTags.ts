import { useEffect, useState } from "react";
import { useRecoilValue } from "recoil";
import { contentRevisionState } from "@/store/library.atoms";
import { contentService } from "../services/content.service";
import type { TagSummary } from "../types/content.types";

/** Tags in use, for filter controls. Failures are non-critical and leave the list empty. */
export function useTags() {
  const revision = useRecoilValue(contentRevisionState);
  const [tags, setTags] = useState<TagSummary[]>([]);
  useEffect(() => {
    let active = true;
    contentService
      .tags()
      .then((result) => active && setTags(result))
      .catch(() => active && setTags([]));
    return () => {
      active = false;
    };
  }, [revision]);
  return tags;
}
