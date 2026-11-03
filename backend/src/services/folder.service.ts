import { Types } from "mongoose";
import { Content } from "../models/content.model.js";
import { Folder } from "../models/folder.model.js";
import type { FolderDto } from "../types/api.types.js";
import { ApiError } from "../utils/ApiError.js";

const DUPLICATE_NAME = "A folder with this name already exists";

function toFolderDto(folder: { _id: Types.ObjectId; name: string; createdAt: Date }, itemCount: number): FolderDto {
  return { id: folder._id.toString(), name: folder.name, itemCount, createdAt: folder.createdAt.toISOString() };
}

function isDuplicateKey(err: unknown) {
  return (err as { code?: number }).code === 11000;
}

async function countItems(userId: string, folderId: string) {
  return Content.countDocuments({ userId, folderId });
}

export async function listFolders(userId: string): Promise<FolderDto[]> {
  const [folders, counts] = await Promise.all([
    Folder.find({ userId }).sort({ nameKey: 1 }).lean(),
    Content.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { userId: new Types.ObjectId(userId), folderId: { $ne: null } } },
      { $group: { _id: "$folderId", count: { $sum: 1 } } },
    ]),
  ]);
  const byFolder = new Map(counts.map((c) => [c._id.toString(), c.count]));
  return folders.map((folder) => toFolderDto(folder, byFolder.get(folder._id.toString()) ?? 0));
}

export async function createFolder(userId: string, name: string) {
  try {
    const folder = await Folder.create({ userId, name, nameKey: name.toLowerCase() });
    return toFolderDto(folder, 0);
  } catch (err) {
    if (isDuplicateKey(err)) throw ApiError.conflict(DUPLICATE_NAME);
    throw err;
  }
}

export async function renameFolder(userId: string, id: string, name: string) {
  // Fast, explicit check; the unique index still guards against a concurrent rename (E11000 below).
  if (await Folder.exists({ userId, nameKey: name.toLowerCase(), _id: { $ne: id } }))
    throw ApiError.conflict(DUPLICATE_NAME);
  try {
    const folder = await Folder.findOneAndUpdate(
      { _id: id, userId },
      { $set: { name, nameKey: name.toLowerCase() } },
      { returnDocument: "after" },
    ).lean();
    if (!folder) throw ApiError.notFound("Folder not found");
    return toFolderDto(folder, await countItems(userId, id));
  } catch (err) {
    if (isDuplicateKey(err)) throw ApiError.conflict(DUPLICATE_NAME);
    throw err;
  }
}

/** Only empty folders can be deleted, so deleting a folder never deletes or hides content. */
export async function deleteFolder(userId: string, id: string) {
  if (!(await Folder.exists({ _id: id, userId }))) throw ApiError.notFound("Folder not found");
  if (await Content.exists({ userId, folderId: id }))
    throw ApiError.conflict("Move all items out of this folder before deleting it");
  await Folder.deleteOne({ _id: id, userId });
  // An item moved in concurrently, after the emptiness check, returns to the root.
  await Content.updateMany({ userId, folderId: id }, { $set: { folderId: null } });
}
