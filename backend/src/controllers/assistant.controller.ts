import { authUserId } from "../middleware/auth.middleware.js";
import { getValidated } from "../middleware/validation.middleware.js";
import * as assistantService from "../services/assistant/assistant.service.js";
import { sendNoContent, sendSuccess } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { askSchema, indexSourceSchema, sourceIdSchema } from "../validators/assistant.validator.js";

export const status = asyncHandler(async (req, res) => {
  sendSuccess(res, await assistantService.getStatus(authUserId(req)));
});

export const indexSource = asyncHandler(async (req, res) => {
  const { params, body } = getValidated(req, indexSourceSchema);
  sendSuccess(res, await assistantService.indexSource(authUserId(req), params.id, body.text || undefined));
});

export const removeSource = asyncHandler(async (req, res) => {
  const { params } = getValidated(req, sourceIdSchema);
  await assistantService.removeSource(authUserId(req), params.id);
  sendNoContent(res);
});

export const ask = asyncHandler(async (req, res) => {
  const { body } = getValidated(req, askSchema);
  sendSuccess(res, await assistantService.ask(authUserId(req), body.question));
});
