import { Types } from "mongoose";
import { ApiError } from "./ApiError.js";

/** Opaque keyset cursor over (createdAt desc, _id desc). Stable under concurrent inserts. */
export interface Cursor {
  createdAt: Date;
  id: Types.ObjectId;
}

export function encodeCursor(cursor: { createdAt: Date; _id: Types.ObjectId }) {
  return Buffer.from(`${cursor.createdAt.toISOString()}|${cursor._id.toHexString()}`).toString("base64url");
}

export function decodeCursor(value: string): Cursor {
  const [iso, id] = Buffer.from(value, "base64url").toString("utf8").split("|");
  const createdAt = new Date(iso ?? "");
  if (!id || !Types.ObjectId.isValid(id) || Number.isNaN(createdAt.getTime()))
    throw ApiError.badRequest("Invalid pagination cursor");
  return { createdAt, id: new Types.ObjectId(id) };
}

/** MongoDB filter selecting documents strictly after the cursor in (createdAt desc, _id desc) order. */
export function afterCursor(cursor: Cursor) {
  return {
    $or: [{ createdAt: { $lt: cursor.createdAt } }, { createdAt: cursor.createdAt, _id: { $lt: cursor.id } }],
  };
}
