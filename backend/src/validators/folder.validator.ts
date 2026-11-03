import { z } from "zod";
import { CONTENT_LIMITS } from "../constants/content.constants.js";
import { idParams } from "./common.validator.js";

const name = z.string().trim().min(1, "Folder name is required").max(CONTENT_LIMITS.folderNameMaxLength);

export const createFolderSchema = { body: z.object({ name }) };
export const renameFolderSchema = { params: idParams("folder ID"), body: z.object({ name }) };
export const folderIdSchema = { params: idParams("folder ID") };
