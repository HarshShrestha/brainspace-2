import { Router } from "express";
import * as health from "../controllers/health.controller.js";
import { noStore } from "../middleware/cache.middleware.js";

export function createHealthRouter() {
  const router = Router();
  router.use(noStore);
  router.get("/live", health.live);
  router.get("/ready", health.ready);
  return router;
}
