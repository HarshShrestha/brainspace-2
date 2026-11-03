import { authUserId } from "../middleware/auth.middleware.js";
import { getValidated } from "../middleware/validation.middleware.js";
import * as receivedShareService from "../services/received-share.service.js";
import { sendNoContent, sendSuccess } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  receivedShareIdSchema,
  saveReceivedShareSchema,
  viewReceivedShareSchema,
} from "../validators/share.validator.js";

export const list = asyncHandler(async (req, res) => {
  sendSuccess(res, await receivedShareService.listReceivedShares(authUserId(req)));
});

/** Idempotent: saving the same link twice returns the existing entry. */
export const save = asyncHandler(async (req, res) => {
  const { body } = getValidated(req, saveReceivedShareSchema);
  sendSuccess(res, await receivedShareService.saveReceivedShare(authUserId(req), body.link));
});

export const view = asyncHandler(async (req, res) => {
  const { params, query } = getValidated(req, viewReceivedShareSchema);
  sendSuccess(res, await receivedShareService.viewReceivedShare(authUserId(req), params.id, query));
});

export const remove = asyncHandler(async (req, res) => {
  const { params } = getValidated(req, receivedShareIdSchema);
  await receivedShareService.removeReceivedShare(authUserId(req), params.id);
  sendNoContent(res);
});
