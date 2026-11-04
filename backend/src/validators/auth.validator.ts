import { z } from "zod";
import { PASSWORD_LIMITS, USERNAME_PATTERN } from "../constants/auth.constants.js";

const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(USERNAME_PATTERN, "Username must be 3–30 letters, numbers or underscores");

const password = z
  .string()
  .min(PASSWORD_LIMITS.minLength, `Password must be at least ${PASSWORD_LIMITS.minLength} characters`)
  .refine((value) => Buffer.byteLength(value, "utf8") <= PASSWORD_LIMITS.maxBytes, "Password is too long");

/** Login accepts any non-empty password so that rule changes never lock out existing users. */
const anyPassword = z.string().min(1, "Password is required").max(1024);

export const registerSchema = { body: z.object({ username, password }) };
export const loginSchema = { body: z.object({ username, password: anyPassword }) };
export const changePasswordSchema = {
  body: z.object({ currentPassword: anyPassword, newPassword: password }),
};
export const deleteAccountSchema = { body: z.object({ password: anyPassword }) };
