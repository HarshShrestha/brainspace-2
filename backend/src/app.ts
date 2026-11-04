import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { createCorsOptions } from "./config/cors.js";
import { env } from "./config/environment.js";
import { originGuard } from "./middleware/csrf.middleware.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { createApiLimiter } from "./middleware/rateLimit.middleware.js";
import { requestLogger } from "./middleware/requestLogger.middleware.js";
import { createApiRouter } from "./routes/index.js";

/** Builds a fully configured Express app without opening a port or a database connection. */
export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  if (env.trustProxyHops) app.set("trust proxy", env.trustProxyHops);

  app.use(requestLogger);
  // The API only serves JSON, so the strictest CSP applies.
  app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } } }));
  app.use(cors(createCorsOptions(env.corsOrigins)));
  app.use(originGuard(env.corsOrigins));
  // 24,000 pasted characters can be up to ~96 KB of UTF-8; leave headroom for JSON escaping.
  app.use(express.json({ limit: "256kb" }));
  app.use(cookieParser());

  app.use("/api/v1", createApiLimiter(), createApiRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
