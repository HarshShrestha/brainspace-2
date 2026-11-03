import type { Request } from "express";
import { rateLimit, type Options } from "express-rate-limit";
import { ERROR_CODES } from "../constants/errorCodes.js";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

/**
 * In-memory stores are per process. Factories are called once per app instance (see routes/),
 * so tests get fresh counters. Use a shared store (e.g. Redis) before running multiple instances.
 */
function limiter(limit: number, message: string, extra: Partial<Options> = {}) {
  return rateLimit({
    windowMs: FIFTEEN_MINUTES,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { success: false, error: { code: ERROR_CODES.rateLimited, message } },
    ...extra,
  });
}

/** Baseline protection for the whole API, keyed by client IP. */
export const createApiLimiter = () => limiter(1000, "Too many requests. Please slow down.");

/** Separate buckets so failed sign-ins cannot block account creation, and vice versa. */
export const createLoginLimiter = () =>
  limiter(20, "Too many sign-in attempts. Try again later.", { skipSuccessfulRequests: true });
export const createRegisterLimiter = () => limiter(10, "Too many accounts created. Try again later.");

/** Sensitive account operations that require the password. */
export const createAccountLimiter = () => limiter(10, "Too many attempts. Try again later.");

/** Public share-link lookups are unauthenticated; limit token guessing. */
export const createPublicShareLimiter = () => limiter(120, "Too many requests. Try again later.");

/** Paid AI operations, keyed by user rather than IP. Must run after requireAuth. */
export const createAiLimiter = () =>
  limiter(30, "Too many AI requests. Try again later.", {
    keyGenerator: (req: Request) => `user:${req.userId ?? "anonymous"}`,
  });
