import { Content } from "../models/content.model.js";
import { ContentChunk } from "../models/content-chunk.model.js";
import { Folder } from "../models/folder.model.js";
import { ReceivedShare } from "../models/received-share.model.js";
import { ShareLink } from "../models/share-link.model.js";
import { Tag } from "../models/tag.model.js";
import { User } from "../models/user.model.js";

const models = [User, Tag, Folder, Content, ContentChunk, ShareLink, ReceivedShare];

/**
 * Creates every declared index. `createIndexes` is idempotent and never drops indexes,
 * so it is safe to run on each start. Unique indexes fail loudly if existing data violates them.
 */
export async function ensureIndexes() {
  for (const model of models) await model.createIndexes();
}
