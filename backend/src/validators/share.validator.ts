import { z } from "zod";
import { idParams, paginationQuery } from "./common.validator.js";

/** Malformed tokens are reported as "not found" by the service so their shape reveals nothing. */
export const publicShareSchema = {
  params: z.object({ token: z.string().max(200) }),
  query: paginationQuery,
};

export const saveReceivedShareSchema = {
  body: z.object({ link: z.string().trim().min(1, "Paste a share link").max(2048) }),
};

export const receivedShareIdSchema = { params: idParams("shared space ID") };

export const viewReceivedShareSchema = { params: idParams("shared space ID"), query: paginationQuery };
