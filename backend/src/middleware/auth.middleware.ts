import type { Request, RequestHandler } from "express";
import { SESSION_COOKIE_NAME } from "../config/session.js";
import { resolveSession } from "../services/auth.service.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/** Session token from the HTTP-only cookie, or an `Authorization: Bearer` header for non-browser clients. */
export function readSessionToken(req: Request): string | null {
  const cookie: unknown = req.cookies?.[SESSION_COOKIE_NAME];
  if (typeof cookie === "string" && cookie) return cookie;
  return req.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1] ?? null;
}

export const requireAuth: RequestHandler = asyncHandler(async (req, _res, next) => {
  const token = readSessionToken(req);
  if (!token) throw ApiError.unauthenticated();
  const userId = await resolveSession(token);
  if (!userId) throw ApiError.unauthenticated("Your session has expired. Please sign in again.");
  req.userId = userId;
  next();
});

/** The authenticated user's ID. Only valid on routes behind `requireAuth`. */
export function authUserId(req: Request): string {
  if (!req.userId) throw ApiError.unauthenticated();
  return req.userId;
}
