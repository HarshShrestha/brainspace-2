import { Router } from "express";
import * as folders from "../controllers/folder.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { noStore } from "../middleware/cache.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import { createFolderSchema, folderIdSchema, renameFolderSchema } from "../validators/folder.validator.js";

export function createFolderRouter() {
  const router = Router();
  router.use(requireAuth, noStore);
  router.get("/", folders.list);
  router.post("/", validate(createFolderSchema), folders.create);
  router.patch("/:id", validate(renameFolderSchema), folders.rename);
  router.delete("/:id", validate(folderIdSchema), folders.remove);
  return router;
}
