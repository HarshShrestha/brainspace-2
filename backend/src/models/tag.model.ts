import { Schema, model } from "mongoose";
import { CONTENT_LIMITS } from "../constants/content.constants.js";

/** Tags are owned by one account so one user's vocabulary never leaks to another. */
const tagSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true, lowercase: true, maxlength: CONTENT_LIMITS.tagMaxLength },
  },
  { timestamps: true },
);
tagSchema.index({ userId: 1, title: 1 }, { unique: true });

export const Tag = model("Tag", tagSchema);
