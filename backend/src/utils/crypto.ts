import { createHash, randomBytes } from "node:crypto";

/** 32 random bytes encoded as 43 URL-safe characters. */
export function generateBearerToken() {
  return randomBytes(32).toString("base64url");
}

export const BEARER_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** Bearer tokens are high-entropy, so an unsalted SHA-256 digest is an appropriate at-rest form. */
export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
