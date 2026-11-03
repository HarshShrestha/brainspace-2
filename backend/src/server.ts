import type { Server } from "node:http";
import { createApp } from "./app.js";
import { env } from "./config/environment.js";
import { connectDatabase, disconnectDatabase } from "./db/connection.js";
import { ensureIndexes } from "./db/indexes.js";
import { logger } from "./utils/logger.js";

const SHUTDOWN_GRACE_MS = 10_000;

async function start() {
  await connectDatabase(env.mongodbUri);
  await ensureIndexes();
  const server = createApp().listen(env.port, () => {
    logger.info({ port: env.port, env: env.nodeEnv, ai: env.rag.enabled }, "BrainSpace API listening");
  });
  registerShutdown(server);
}

/** Stops accepting connections, lets in-flight requests finish, then closes MongoDB. */
function registerShutdown(server: Server) {
  let stopping = false;
  const shutdown = (signal: string) => {
    if (stopping) return;
    stopping = true;
    logger.info({ signal }, "Shutting down");
    const force = setTimeout(() => {
      logger.error("Graceful shutdown timed out; forcing exit");
      process.exit(1);
    }, SHUTDOWN_GRACE_MS);
    force.unref();
    server.close(async () => {
      await disconnectDatabase().catch((err: unknown) => logger.error({ err }, "Error closing MongoDB"));
      process.exit(0);
    });
    server.closeIdleConnections();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "Unhandled promise rejection");
  process.exit(1);
});

start().catch((err: unknown) => {
  logger.fatal({ err }, "API failed to start");
  process.exit(1);
});
