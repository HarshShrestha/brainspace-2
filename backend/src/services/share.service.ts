import { ShareLink } from "../models/share-link.model.js";
import { User } from "../models/user.model.js";
import type { SharedSpaceDto, ShareStatusDto } from "../types/api.types.js";
import { ApiError } from "../utils/ApiError.js";
import { BEARER_TOKEN_PATTERN, generateBearerToken, sha256 } from "../utils/crypto.js";
import { listContent, toPublicContentDto } from "./content.service.js";

const NOT_FOUND = "This shared space doesn't exist or is no longer shared";

export async function getShareStatus(userId: string): Promise<ShareStatusDto> {
  const link = await ShareLink.findOne({ userId }).lean();
  return { active: Boolean(link), createdAt: link ? link.updatedAt.toISOString() : null };
}

/** Creates a link, or replaces the existing one (the old token stops working immediately). */
export async function rotateShareLink(userId: string) {
  const token = generateBearerToken();
  const link = await ShareLink.findOneAndUpdate(
    { userId },
    { $set: { tokenHash: sha256(token) } },
    { upsert: true, returnDocument: "after" },
  ).lean();
  // The raw token is returned exactly once and never stored.
  return { token, createdAt: link!.updatedAt.toISOString() };
}

export async function revokeShareLink(userId: string) {
  const { deletedCount } = await ShareLink.deleteOne({ userId });
  if (!deletedCount) throw ApiError.notFound("You don't have an active share link");
}

/** Resolves a token digest to its owner, or null if revoked/rotated or the owner no longer exists. */
export async function resolveShareHash(tokenHash: string) {
  const link = await ShareLink.findOne({ tokenHash }).lean();
  if (!link) return null;
  const owner = await User.findById(link.userId).select("username").lean();
  return owner ? { ownerId: owner._id.toString(), username: owner.username } : null;
}

export async function viewSharedSpaceByHash(
  tokenHash: string,
  page: { cursor?: string | undefined; limit: number },
): Promise<SharedSpaceDto> {
  const share = await resolveShareHash(tokenHash);
  if (!share) throw ApiError.notFound(NOT_FOUND);
  const result = await listContent(share.ownerId, page);
  return {
    owner: { username: share.username },
    items: result.items.map(toPublicContentDto),
    nextCursor: result.nextCursor,
  };
}

export async function viewSharedSpace(token: string, page: { cursor?: string | undefined; limit: number }) {
  if (!BEARER_TOKEN_PATTERN.test(token)) throw ApiError.notFound(NOT_FOUND);
  return viewSharedSpaceByHash(sha256(token), page);
}
