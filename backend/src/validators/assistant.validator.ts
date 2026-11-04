import { z } from "zod";
import { ASSISTANT_LIMITS } from "../constants/assistant.constants.js";
import { idParams } from "./common.validator.js";

export const indexSourceSchema = {
  params: idParams("content ID"),
  body: z.object({
    consent: z.literal(true, { error: "Explicit consent is required before indexing" }),
    /** Optional pasted text; when omitted the worker fetches the public page. */
    text: z.string().trim().max(ASSISTANT_LIMITS.maxSourceChars).optional(),
  }),
};

export const sourceIdSchema = { params: idParams("content ID") };

export const askSchema = {
  body: z.object({
    question: z.string().trim().min(ASSISTANT_LIMITS.questionMinLength).max(ASSISTANT_LIMITS.questionMaxLength),
  }),
};
