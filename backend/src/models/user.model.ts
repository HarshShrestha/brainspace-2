import { Schema, model, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    /** Stored lowercase; uniqueness is therefore case-insensitive. */
    username: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 30 },
    passwordHash: { type: String, required: true, select: false },
    /** Embedded in every session token; incrementing it revokes all of the user's sessions. */
    tokenVersion: { type: Number, required: true, default: 0, select: false },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof userSchema>;
export const User = model("User", userSchema);
