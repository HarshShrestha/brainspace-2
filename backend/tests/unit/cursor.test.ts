import { Types } from "mongoose";
import { describe, expect, it } from "vitest";
import { ApiError } from "../../src/utils/ApiError.js";
import { decodeCursor, encodeCursor } from "../../src/utils/cursor.js";

describe("pagination cursor", () => {
  it("round-trips createdAt and id", () => {
    const _id = new Types.ObjectId();
    const createdAt = new Date("2026-01-02T03:04:05.678Z");
    const decoded = decodeCursor(encodeCursor({ _id, createdAt }));
    expect(decoded.id.equals(_id)).toBe(true);
    expect(decoded.createdAt.toISOString()).toBe(createdAt.toISOString());
  });

  it.each(["", "garbage", Buffer.from("not-a-date|123").toString("base64url")])("rejects %j", (value) => {
    expect(() => decodeCursor(value)).toThrow(ApiError);
  });
});
