import { clearSessionCookieOptions, SESSION_COOKIE_NAME } from "../config/session.js";
import { authUserId } from "../middleware/auth.middleware.js";
import { getValidated } from "../middleware/validation.middleware.js";
import * as accountService from "../services/account.service.js";
import { sendNoContent } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { changePasswordSchema, deleteAccountSchema } from "../validators/auth.validator.js";
import { setSessionCookie } from "./auth.controller.js";

export const changePassword = asyncHandler(async (req, res) => {
  const { body } = getValidated(req, changePasswordSchema);
  const token = await accountService.changePassword(authUserId(req), body.currentPassword, body.newPassword);
  setSessionCookie(res, token);
  sendNoContent(res);
});

export const deleteAccount = asyncHandler(async (req, res) => {
  const { body } = getValidated(req, deleteAccountSchema);
  await accountService.deleteAccount(authUserId(req), body.password);
  res.clearCookie(SESSION_COOKIE_NAME, clearSessionCookieOptions());
  sendNoContent(res);
});
