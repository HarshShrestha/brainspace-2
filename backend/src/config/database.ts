import type { ConnectOptions } from "mongoose";

/**
 * Indexes are created explicitly at startup by `ensureIndexes` (src/db/indexes.ts),
 * so Mongoose's implicit background auto-indexing is turned off.
 */
export const databaseOptions: ConnectOptions = {
  autoIndex: false,
  maxPoolSize: 20,
  serverSelectionTimeoutMS: 10_000,
  socketTimeoutMS: 45_000,
};
