import { Schema, model, type InferSchemaType } from "mongoose";
import { CONTENT_LIMITS, CONTENT_TYPES } from "../constants/content.constants.js";
import { SOURCE_TYPES } from "../constants/assistant.constants.js";

/** Index metadata only; chunk text and vectors live in the ContentChunk collection. */
const aiIndexSchema = new Schema(
  {
    indexedAt: { type: Date, required: true },
    model: { type: String, required: true },
    sourceType: { type: String, enum: SOURCE_TYPES, required: true },
    chunkCount: { type: Number, required: true },
    /** Identifies the current chunk set; chunks from any other generation are ignored and garbage-collected. */
    generation: { type: String, required: true },
  },
  { _id: false },
);

const contentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true, maxlength: CONTENT_LIMITS.titleMaxLength },
    link: { type: String, required: true, maxlength: CONTENT_LIMITS.linkMaxLength },
    type: { type: String, enum: CONTENT_TYPES, required: true },
    tags: [{ type: Schema.Types.ObjectId, ref: "Tag" }],
    folderId: { type: Schema.Types.ObjectId, ref: "Folder", default: null },
    ai: { type: aiIndexSchema, default: null },
  },
  { timestamps: true },
);
contentSchema.index({ userId: 1, createdAt: -1, _id: -1 });
contentSchema.index({ userId: 1, folderId: 1, createdAt: -1 });
contentSchema.index({ userId: 1, tags: 1 });
contentSchema.index({ userId: 1, "ai.model": 1 });

export type ContentDocument = InferSchemaType<typeof contentSchema>;
export const Content = model("Content", contentSchema);
