import { describe, expect, it } from "vitest";
import { redactUrl } from "../../src/utils/logger.js";

describe("redactUrl", () => {
  it("removes share tokens from logged paths", () => {
    expect(redactUrl("/api/v1/shared/abcDEF123_-xyz?limit=5")).toBe("/api/v1/shared/[REDACTED]?limit=5");
    expect(redactUrl("/api/v1/content")).toBe("/api/v1/content");
  });
});
