import { Router } from "express";
import * as content from "../controllers/content.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { noStore } from "../middleware/cache.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import {
  contentIdSchema,
  createContentSchema,
  listContentSchema,
  updateContentSchema,
} from "../validators/content.validator.js";

export function createContentRouter() {
  const router = Router();
  router.use(requireAuth, noStore);
  router.get("/", validate(listContentSchema), content.list);
  router.post("/", validate(createContentSchema), content.create);
  router.get("/:id", validate(contentIdSchema), content.get);
  router.patch("/:id", validate(updateContentSchema), content.update);
  router.delete("/:id", validate(contentIdSchema), content.remove);
  return router;
}

export function createTagRouter() {
  const router = Router();
  router.use(requireAuth, noStore);
  router.get("/", content.tags);
  return router;
}
