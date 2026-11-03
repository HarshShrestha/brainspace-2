import mongoose from "mongoose";
import { databaseOptions } from "../config/database.js";
import { logger } from "../utils/logger.js";

export async function connectDatabase(uri: string) {
  mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected"));
  mongoose.connection.on("reconnected", () => logger.info("MongoDB reconnected"));
  await mongoose.connect(uri, databaseOptions);
  logger.info("MongoDB connected");
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}

/** Readiness check: an open connection that answers a ping. */
export async function isDatabaseReady() {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) return false;
  try {
    await mongoose.connection.db.admin().ping();
    return true;
  } catch {
    return false;
  }
}
