import { Schema, model } from "mongoose";

/** At most one active public link per user. Only the SHA-256 digest of the bearer token is stored. */
const shareLinkSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    tokenHash: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

export const ShareLink = model("ShareLink", shareLinkSchema);
