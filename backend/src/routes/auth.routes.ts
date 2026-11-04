import { Router } from "express";
import * as auth from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { noStore } from "../middleware/cache.middleware.js";
import { createLoginLimiter, createRegisterLimiter } from "../middleware/rateLimit.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import { loginSchema, registerSchema } from "../validators/auth.validator.js";

export function createAuthRouter() {
  const router = Router();
  router.use(noStore);
  router.post("/register", createRegisterLimiter(), validate(registerSchema), auth.register);
  router.post("/login", createLoginLimiter(), validate(loginSchema), auth.login);
  // Not behind requireAuth: a stale session must still be able to clear its cookie.
  router.post("/logout", auth.logout);
  router.get("/session", requireAuth, auth.session);
  return router;
}
