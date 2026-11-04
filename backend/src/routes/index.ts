import { Router } from "express";
import { createAccountRouter } from "./account.routes.js";
import { createAssistantRouter } from "./assistant.routes.js";
import { createAuthRouter } from "./auth.routes.js";
import { createContentRouter, createTagRouter } from "./content.routes.js";
import { createFolderRouter } from "./folder.routes.js";
import { createHealthRouter } from "./health.routes.js";
import { createPublicShareRouter, createReceivedShareRouter, createShareLinkRouter } from "./share.routes.js";

/** Version 1 of the HTTP API, mounted at /api/v1. */
export function createApiRouter() {
  const router = Router();
  router.use("/health", createHealthRouter());
  router.use("/auth", createAuthRouter());
  router.use("/account", createAccountRouter());
  router.use("/content", createContentRouter());
  router.use("/tags", createTagRouter());
  router.use("/folders", createFolderRouter());
  router.use("/share-link", createShareLinkRouter());
  router.use("/shared", createPublicShareRouter());
  router.use("/received-shares", createReceivedShareRouter());
  router.use("/assistant", createAssistantRouter());
  return router;
}
