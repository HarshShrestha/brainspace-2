import { describe, expect, it } from "vitest";
import { extractShareToken } from "../../src/services/received-share.service.js";
import { ApiError } from "../../src/utils/ApiError.js";
import { generateBearerToken } from "../../src/utils/crypto.js";

const token = generateBearerToken();

describe("extractShareToken", () => {
  it.each([token, `https://brain.example.com/shared/${token}`, `http://localhost:5173/shared/${token}/`])(
    "accepts %s",
    (input) => expect(extractShareToken(input)).toBe(token),
  );

  it.each([
    "not a link",
    `ftp://example.com/shared/${token}`,
    `https://example.com/shared/${token}?x=1`,
    `https://example.com/shared/${token}#frag`,
    `https://user:pw@example.com/shared/${token}`,
    `https://example.com/other/${token}`,
    "https://example.com/shared/short",
  ])("rejects %s", (input) => expect(() => extractShareToken(input)).toThrow(ApiError));
});
