import { z } from "zod";
import { CONTENT_LIMITS } from "@/constants/content.constants";

export const folderNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a folder name")
  .max(CONTENT_LIMITS.folderNameMaxLength, "That name is too long");
