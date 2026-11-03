import { Content } from "../models/content.model.js";
import { ContentChunk } from "../models/content-chunk.model.js";
import { Folder } from "../models/folder.model.js";
import { ReceivedShare } from "../models/received-share.model.js";
import { ShareLink } from "../models/share-link.model.js";
import { Tag } from "../models/tag.model.js";
import { User } from "../models/user.model.js";
import { hashPassword, issueSessionToken, verifyPassword } from "./auth.service.js";

/** Changes the password and revokes all other sessions; returns a fresh token for the current device. */
export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await verifyPassword(userId, currentPassword);
  user.passwordHash = await hashPassword(newPassword);
  user.tokenVersion += 1;
  await user.save();
  return issueSessionToken(user.id, user.tokenVersion);
}

/**
 * Permanently deletes the account and everything it owns. The share link goes first so the
 * public view stops immediately; the user record goes last so a partial failure can be retried.
 */
export async function deleteAccount(userId: string, password: string) {
  await verifyPassword(userId, password);
  await ShareLink.deleteMany({ userId });
  await ContentChunk.deleteMany({ userId });
  await Content.deleteMany({ userId });
  await Promise.all([Tag.deleteMany({ userId }), Folder.deleteMany({ userId }), ReceivedShare.deleteMany({ userId })]);
  await User.deleteOne({ _id: userId });
}
