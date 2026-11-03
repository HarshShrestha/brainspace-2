import { Router } from "express";
import * as received from "../controllers/received-share.controller.js";
import * as share from "../controllers/share.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { noStore } from "../middleware/cache.middleware.js";
import { createPublicShareLimiter } from "../middleware/rateLimit.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import {
  publicShareSchema,
  receivedShareIdSchema,
  saveReceivedShareSchema,
  viewReceivedShareSchema,
} from "../validators/share.validator.js";

/** The signed-in user's own public link. */
export function createShareLinkRouter() {
  const router = Router();
  router.use(requireAuth, noStore);
  router.get("/", share.status);
  router.post("/", share.rotate);
  router.delete("/", share.revoke);
  return router;
}

/** Unauthenticated, read-only access by bearer token. */
export function createPublicShareRouter() {
  const router = Router();
  router.use(noStore, createPublicShareLimiter());
  router.get("/:token", validate(publicShareSchema), share.viewPublic);
  return router;
}

/** Links other users shared with the signed-in user. */
export function createReceivedShareRouter() {
  const router = Router();
  router.use(requireAuth, noStore);
  router.get("/", received.list);
  router.post("/", validate(saveReceivedShareSchema), received.save);
  router.get("/:id", validate(viewReceivedShareSchema), received.view);
  router.delete("/:id", validate(receivedShareIdSchema), received.remove);
  return router;
}
