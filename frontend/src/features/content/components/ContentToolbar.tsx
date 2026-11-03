import { Icon } from "@/components/common/Icon";
import { CONTENT_TYPE_META, CONTENT_TYPES, type ContentType } from "@/constants/content.constants";
import type { TagSummary } from "../types/content.types";

export interface ToolbarValues {
  q: string;
  type: ContentType | "";
  tag: string;
}

/** Search and filter controls. Values are owned by the page (kept in the URL). */
export function ContentToolbar({
  values,
  tags,
  onChange,
}: {
  values: ToolbarValues;
  tags: TagSummary[];
  onChange: (values: ToolbarValues) => void;
}) {
  const active = values.q || values.type || values.tag;
  return (
    <div className="toolbar" role="search">
      <label className="search">
        <Icon name="search" />
        <span className="sr-only">Search titles, links and tags</span>
        <input
          type="search"
          value={values.q}
          placeholder="Search titles, links and tags"
          maxLength={200}
          onChange={(e) => onChange({ ...values, q: e.target.value })}
        />
      </label>
      <label>
        <span className="sr-only">Filter by type</span>
        <select
          className="input input--compact"
          value={values.type}
          onChange={(e) => onChange({ ...values, type: e.target.value as ContentType | "" })}
        >
          <option value="">All types</option>
          {CONTENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {CONTENT_TYPE_META[type].plural}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="sr-only">Filter by tag</span>
        <select
          className="input input--compact"
          value={values.tag}
          onChange={(e) => onChange({ ...values, tag: e.target.value })}
        >
          <option value="">All tags</option>
          {values.tag && !tags.some((t) => t.title === values.tag) && <option value={values.tag}>#{values.tag}</option>}
          {tags.map((tag) => (
            <option key={tag.title} value={tag.title}>
              #{tag.title} ({tag.count})
            </option>
          ))}
        </select>
      </label>
      {active && (
        <button type="button" className="link-button" onClick={() => onChange({ q: "", type: "", tag: "" })}>
          Clear filters
        </button>
      )}
    </div>
  );
}
