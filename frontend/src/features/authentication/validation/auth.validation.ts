import { z } from "zod";

/** Mirrors backend/src/validators/auth.validator.ts for instant feedback; the server re-validates. */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,30}$/, "Use 3–30 letters, numbers or underscores");

export const newPasswordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .refine((value) => new TextEncoder().encode(value).length <= 72, "Password is too long");

export const registerFormSchema = z.object({ username: usernameSchema, password: newPasswordSchema });
export const loginFormSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, "Enter your username"),
  password: z.string().min(1, "Enter your password"),
});
