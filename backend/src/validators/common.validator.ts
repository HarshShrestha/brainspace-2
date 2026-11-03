import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { PAGINATION } from "../constants/content.constants.js";

export const objectId = (label = "ID") =>
  z.string().refine((value) => isValidObjectId(value) && /^[a-f0-9]{24}$/i.test(value), `Invalid ${label}`);

export const idParams = (label?: string) => z.object({ id: objectId(label) });

export const paginationQuery = z.object({
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(PAGINATION.maxLimit).default(PAGINATION.defaultLimit),
});
