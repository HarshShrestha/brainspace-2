import { describe, expect, it } from "vitest";
import { contentFormSchema, parseTags } from "./content.validation";

describe("parseTags", () => {
  it("trims, lowercases and de-duplicates", () => {
    expect(parseTags(" Design, ideas ,design,, ")).toEqual(["design", "ideas"]);
    expect(parseTags("")).toEqual([]);
  });
});

describe("contentFormSchema", () => {
  const valid = { title: "Notes", link: "https://example.com", type: "article", tags: "a, b", folderId: null };

  it("accepts valid input and converts tags", () => {
    expect(contentFormSchema.parse(valid)).toEqual({ ...valid, tags: ["a", "b"] });
  });

  it.each(["javascript:alert(1)", "example.com", "ftp://example.com"])("rejects the link %s", (link) => {
    expect(contentFormSchema.safeParse({ ...valid, link }).success).toBe(false);
  });

  it("rejects empty titles and too many tags", () => {
    expect(contentFormSchema.safeParse({ ...valid, title: "  " }).success).toBe(false);
    const tags = Array.from({ length: 21 }, (_, i) => `t${i}`).join(",");
    expect(contentFormSchema.safeParse({ ...valid, tags }).success).toBe(false);
  });
});
