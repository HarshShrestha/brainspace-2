import type { Response } from "express";
import { clearSessionCookieOptions, SESSION_COOKIE_NAME, sessionCookieOptions } from "../config/session.js";
import { authUserId, readSessionToken } from "../middleware/auth.middleware.js";
import { getValidated } from "../middleware/validation.middleware.js";
import * as authService from "../services/auth.service.js";
import { sendCreated, sendNoContent, sendSuccess } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { loginSchema, registerSchema } from "../validators/auth.validator.js";

export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions());
}

export const register = asyncHandler(async (req, res) => {
  const { body } = getValidated(req, registerSchema);
  const { user, token } = await authService.register(body.username, body.password);
  setSessionCookie(res, token);
  sendCreated(res, user);
});

export const login = asyncHandler(async (req, res) => {
  const { body } = getValidated(req, loginSchema);
  const { user, token } = await authService.login(body.username, body.password);
  setSessionCookie(res, token);
  sendSuccess(res, user);
});

/** Always clears the cookie, so a client with an expired or revoked session can still sign out. */
export const logout = asyncHandler(async (req, res) => {
  const token = readSessionToken(req);
  const userId = token ? await authService.resolveSession(token) : null;
  if (userId) await authService.revokeAllSessions(userId);
  res.clearCookie(SESSION_COOKIE_NAME, clearSessionCookieOptions());
  sendNoContent(res);
});

export const session = asyncHandler(async (req, res) => {
  sendSuccess(res, await authService.getUser(authUserId(req)));
});
