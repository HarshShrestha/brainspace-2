import { z } from "zod";
import { newPasswordSchema } from "@/features/authentication/validation/auth.validation";

export const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords don't match" })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ["newPassword"],
    message: "Choose a password different from your current one",
  });
