import { ReceivedShare } from "../models/received-share.model.js";
import { ShareLink } from "../models/share-link.model.js";
import { User } from "../models/user.model.js";
import type { ReceivedShareDto } from "../types/api.types.js";
import { ApiError } from "../utils/ApiError.js";
import { BEARER_TOKEN_PATTERN, sha256 } from "../utils/crypto.js";
import { resolveShareHash, viewSharedSpaceByHash } from "./share.service.js";

const INVALID_LINK = "Paste a valid BrainSpace share link";

/** Accepts a full share URL (`https://host/shared/<token>`) or the bare token. */
export function extractShareToken(input: string): string {
  if (BEARER_TOKEN_PATTERN.test(input)) return input;
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw ApiError.badRequest(INVALID_LINK);
  }
  const token = url.pathname.match(/^\/shared\/([A-Za-z0-9_-]{43})\/?$/)?.[1];
  const clean = !url.search && !url.hash && !url.username && !url.password;
  if (!token || !clean || !["http:", "https:"].includes(url.protocol)) throw ApiError.badRequest(INVALID_LINK);
  return token;
}

export async function saveReceivedShare(userId: string, input: string) {
  const tokenHash = sha256(extractShareToken(input));
  const share = await resolveShareHash(tokenHash);
  if (!share) throw ApiError.notFound("This shared space doesn't exist or is no longer shared");
  if (share.ownerId === userId) throw ApiError.badRequest("This is your own space");
  const entry = await ReceivedShare.findOneAndUpdate(
    { userId, tokenHash },
    { $setOnInsert: { userId, tokenHash } },
    { upsert: true, returnDocument: "after" },
  ).lean();
  return {
    id: entry!._id.toString(),
    ownerUsername: share.username,
    available: true,
    createdAt: entry!.createdAt.toISOString(),
  } satisfies ReceivedShareDto;
}

export async function listReceivedShares(userId: string): Promise<ReceivedShareDto[]> {
  const entries = await ReceivedShare.find({ userId }).sort({ createdAt: -1 }).lean();
  const links = await ShareLink.find({ tokenHash: { $in: entries.map((e) => e.tokenHash) } }).lean();
  const owners = await User.find({ _id: { $in: links.map((l) => l.userId) } })
    .select("username")
    .lean();
  const ownerByHash = new Map(
    links.map((link) => [link.tokenHash, owners.find((o) => o._id.equals(link.userId))?.username ?? null]),
  );
  return entries.map((entry) => {
    const ownerUsername = ownerByHash.get(entry.tokenHash) ?? null;
    return {
      id: entry._id.toString(),
      ownerUsername,
      available: ownerUsername !== null,
      createdAt: entry.createdAt.toISOString(),
    };
  });
}

export async function viewReceivedShare(
  userId: string,
  id: string,
  page: { cursor?: string | undefined; limit: number },
) {
  const entry = await ReceivedShare.findOne({ _id: id, userId }).lean();
  if (!entry) throw ApiError.notFound("Shared space not found");
  return viewSharedSpaceByHash(entry.tokenHash, page);
}

export async function removeReceivedShare(userId: string, id: string) {
  const { deletedCount } = await ReceivedShare.deleteOne({ _id: id, userId });
  if (!deletedCount) throw ApiError.notFound("Shared space not found");
}
