import { Schema, model } from "mongoose";
import { CONTENT_LIMITS } from "../constants/content.constants.js";

const folderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: CONTENT_LIMITS.folderNameMaxLength },
    /** Lowercased name; the unique index makes names case-insensitively unique per user without regex checks. */
    nameKey: { type: String, required: true },
  },
  { timestamps: true },
);
folderSchema.index({ userId: 1, nameKey: 1 }, { unique: true });

export const Folder = model("Folder", folderSchema);
