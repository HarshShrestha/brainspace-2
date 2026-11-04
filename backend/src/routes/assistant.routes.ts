import { Router } from "express";
import * as assistant from "../controllers/assistant.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { noStore } from "../middleware/cache.middleware.js";
import { createAiLimiter } from "../middleware/rateLimit.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import { askSchema, indexSourceSchema, sourceIdSchema } from "../validators/assistant.validator.js";

export function createAssistantRouter() {
  const router = Router();
  const aiLimiter = createAiLimiter();
  router.use(requireAuth, noStore);
  router.get("/status", assistant.status);
  router.put("/sources/:id", aiLimiter, validate(indexSourceSchema), assistant.indexSource);
  router.delete("/sources/:id", validate(sourceIdSchema), assistant.removeSource);
  router.post("/ask", aiLimiter, validate(askSchema), assistant.ask);
  return router;
}
