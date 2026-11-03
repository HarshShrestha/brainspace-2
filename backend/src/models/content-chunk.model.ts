import { Schema, model } from "mongoose";

/** One embedded excerpt of an indexed source. Always queried with the owner's userId. */
const contentChunkSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  contentId: { type: Schema.Types.ObjectId, ref: "Content", required: true },
  generation: { type: String, required: true },
  model: { type: String, required: true },
  ordinal: { type: Number, required: true },
  text: { type: String, required: true },
  embedding: { type: [Number], required: true },
});
contentChunkSchema.index({ userId: 1, model: 1 });
contentChunkSchema.index({ contentId: 1, generation: 1 });

export const ContentChunk = model("ContentChunk", contentChunkSchema);
