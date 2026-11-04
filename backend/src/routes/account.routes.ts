import { Router } from "express";
import * as account from "../controllers/account.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { noStore } from "../middleware/cache.middleware.js";
import { createAccountLimiter } from "../middleware/rateLimit.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import { changePasswordSchema, deleteAccountSchema } from "../validators/auth.validator.js";

export function createAccountRouter() {
  const router = Router();
  router.use(requireAuth, noStore, createAccountLimiter());
  router.patch("/password", validate(changePasswordSchema), account.changePassword);
  router.delete("/", validate(deleteAccountSchema), account.deleteAccount);
  return router;
}
