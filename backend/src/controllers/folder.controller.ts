import { authUserId } from "../middleware/auth.middleware.js";
import { getValidated } from "../middleware/validation.middleware.js";
import * as folderService from "../services/folder.service.js";
import { sendCreated, sendNoContent, sendSuccess } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createFolderSchema, folderIdSchema, renameFolderSchema } from "../validators/folder.validator.js";

export const list = asyncHandler(async (req, res) => {
  sendSuccess(res, await folderService.listFolders(authUserId(req)));
});

export const create = asyncHandler(async (req, res) => {
  const { body } = getValidated(req, createFolderSchema);
  sendCreated(res, await folderService.createFolder(authUserId(req), body.name));
});

export const rename = asyncHandler(async (req, res) => {
  const { params, body } = getValidated(req, renameFolderSchema);
  sendSuccess(res, await folderService.renameFolder(authUserId(req), params.id, body.name));
});

export const remove = asyncHandler(async (req, res) => {
  const { params } = getValidated(req, folderIdSchema);
  await folderService.deleteFolder(authUserId(req), params.id);
  sendNoContent(res);
});
