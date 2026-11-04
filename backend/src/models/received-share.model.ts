import { Schema, model } from "mongoose";

/**
 * A share link another user gave the recipient. Stores the token digest, so the entry
 * stops resolving the moment the owner rotates or revokes their link.
 */
const receivedShareSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true },
  },
  { timestamps: true },
);
receivedShareSchema.index({ userId: 1, tokenHash: 1 }, { unique: true });
receivedShareSchema.index({ userId: 1, createdAt: -1 });

export const ReceivedShare = model("ReceivedShare", receivedShareSchema);
