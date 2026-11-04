import { authUserId } from "../middleware/auth.middleware.js";
import { getValidated } from "../middleware/validation.middleware.js";
import * as shareService from "../services/share.service.js";
import { sendCreated, sendNoContent, sendSuccess } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { publicShareSchema } from "../validators/share.validator.js";

export const status = asyncHandler(async (req, res) => {
  sendSuccess(res, await shareService.getShareStatus(authUserId(req)));
});

export const rotate = asyncHandler(async (req, res) => {
  sendCreated(res, await shareService.rotateShareLink(authUserId(req)));
});

export const revoke = asyncHandler(async (req, res) => {
  await shareService.revokeShareLink(authUserId(req));
  sendNoContent(res);
});

export const viewPublic = asyncHandler(async (req, res) => {
  const { params, query } = getValidated(req, publicShareSchema);
  sendSuccess(res, await shareService.viewSharedSpace(params.token, query));
});
