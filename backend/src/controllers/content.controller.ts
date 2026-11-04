import { authUserId } from "../middleware/auth.middleware.js";
import { getValidated } from "../middleware/validation.middleware.js";
import * as contentService from "../services/content.service.js";
import { listTags } from "../services/tag.service.js";
import { sendCreated, sendNoContent, sendSuccess } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  contentIdSchema,
  createContentSchema,
  listContentSchema,
  updateContentSchema,
} from "../validators/content.validator.js";

export const list = asyncHandler(async (req, res) => {
  const { query } = getValidated(req, listContentSchema);
  sendSuccess(res, await contentService.listContent(authUserId(req), query));
});

export const get = asyncHandler(async (req, res) => {
  const { params } = getValidated(req, contentIdSchema);
  sendSuccess(res, await contentService.getContent(authUserId(req), params.id));
});

export const create = asyncHandler(async (req, res) => {
  const { body } = getValidated(req, createContentSchema);
  sendCreated(res, await contentService.createContent(authUserId(req), body));
});

export const update = asyncHandler(async (req, res) => {
  const { params, body } = getValidated(req, updateContentSchema);
  sendSuccess(res, await contentService.updateContent(authUserId(req), params.id, body));
});

export const remove = asyncHandler(async (req, res) => {
  const { params } = getValidated(req, contentIdSchema);
  await contentService.deleteContent(authUserId(req), params.id);
  sendNoContent(res);
});

export const tags = asyncHandler(async (req, res) => {
  sendSuccess(res, await listTags(authUserId(req)));
});
