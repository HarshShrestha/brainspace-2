import { z } from "zod";
import { ASSISTANT_LIMITS } from "@/constants/assistant.constants";

export const questionSchema = z
  .string()
  .trim()
  .min(ASSISTANT_LIMITS.questionMinLength, "Ask a slightly longer question")
  .max(ASSISTANT_LIMITS.questionMaxLength, "That question is too long");
