import { Types } from "mongoose";
import { Content } from "../models/content.model.js";
import { Tag } from "../models/tag.model.js";
import type { TagDto } from "../types/api.types.js";

/** Returns tag IDs for the given (already normalized) titles, creating missing tags for the user. */
export async function resolveTagIds(userId: string, titles: readonly string[]) {
  const tags = await Promise.all(
    titles.map((title) =>
      Tag.findOneAndUpdate(
        { userId, title },
        { $setOnInsert: { userId, title } },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
      ).lean(),
    ),
  );
  return tags.map((tag) => tag!._id);
}

/** Tags currently in use by the user's content, most used first. Unused tags are omitted. */
export async function listTags(userId: string): Promise<TagDto[]> {
  const counts = await Content.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { userId: new Types.ObjectId(userId) } },
    { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
  ]);
  const tags = await Tag.find({ userId, _id: { $in: counts.map((c) => c._id) } }).lean();
  const titles = new Map(tags.map((tag) => [tag._id.toString(), tag.title]));
  return counts
    .flatMap((c) => {
      const title = titles.get(c._id.toString());
      return title ? [{ title, count: c.count }] : [];
    })
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
}
