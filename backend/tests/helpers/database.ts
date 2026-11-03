import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { ensureIndexes } from "../../src/db/indexes.js";

let memoryServer: MongoMemoryServer | undefined;

/**
 * Connects to an isolated, randomly named database. Uses TEST_MONGODB_URI when provided
 * (the account must be allowed to create and drop databases), otherwise an in-memory MongoDB.
 */
export async function startTestDatabase() {
  const uri = process.env.TEST_MONGODB_URI ?? (memoryServer = await MongoMemoryServer.create()).getUri();
  await mongoose.connect(uri, { dbName: `brainspace_test_${randomUUID().replaceAll("-", "")}`, autoIndex: false });
  await ensureIndexes();
}

export async function stopTestDatabase() {
  if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await memoryServer?.stop();
  memoryServer = undefined;
}
