import type { CookieOptions } from "express";
import { env } from "./environment.js";

export const SESSION_COOKIE_NAME = "bs_session";

/** HTTP-only, SameSite=Lax session cookie; Secure in production (requires HTTPS). */
export function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: env.auth.sessionTtlDays * 24 * 60 * 60 * 1000,
  };
}

export function clearSessionCookieOptions(): CookieOptions {
  const { maxAge: _maxAge, ...options } = sessionCookieOptions();
  return options;
}
