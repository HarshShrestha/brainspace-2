import type { RequestHandler } from "express";
import { isAllowedOrigin } from "../config/cors.js";
import { ERROR_CODES } from "../constants/errorCodes.js";
import { ApiError } from "../utils/ApiError.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Defense in depth on top of SameSite=Lax cookies: browsers always send `Origin` on cross-origin
 * state-changing requests, so any unsafe request from an origin outside the allow-list is refused.
 * Requests without `Origin` (same-origin GET-less tools, server-to-server clients) are allowed.
 */
export function originGuard(allowedOrigins: readonly string[]): RequestHandler {
  return (req, _res, next) => {
    if (SAFE_METHODS.has(req.method) || isAllowedOrigin(req.get("origin"), allowedOrigins)) return next();
    next(new ApiError(403, ERROR_CODES.originNotAllowed, "Origin not allowed"));
  };
}
