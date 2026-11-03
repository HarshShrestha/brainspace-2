import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { ERROR_CODES, type ErrorCode } from "../constants/errorCodes.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";

interface ErrorBody {
  success: false;
  error: { code: ErrorCode; message: string; details?: unknown; requestId?: string };
}

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(ApiError.notFound("Route not found"));
};

function toApiError(err: unknown): ApiError | null {
  if (err instanceof ApiError) return err;
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
    return ApiError.badRequest(details.map((d) => d.message).join("; "), details);
  }
  const e = err as { type?: string; code?: number; name?: string } | null;
  if (e?.type === "entity.parse.failed")
    return new ApiError(400, ERROR_CODES.invalidJson, "Request body is not valid JSON");
  if (e?.type === "entity.too.large")
    return new ApiError(413, ERROR_CODES.payloadTooLarge, "Request body is too large");
  if (e?.code === 11000) return ApiError.conflict("A record with this value already exists");
  if (e?.name === "CastError") return ApiError.badRequest("Invalid identifier");
  return null;
}

/** Converts every error to the standard envelope. Unexpected errors are logged and never leak internals. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const known = toApiError(err);
  const requestId = typeof req.id === "string" ? req.id : undefined;
  if (!known) (req.log ?? logger).error({ err }, "Unhandled request error");
  const apiError = known ?? new ApiError(500, ERROR_CODES.internal, "Something went wrong. Please try again.");
  const body: ErrorBody = {
    success: false,
    error: {
      code: apiError.code,
      message: apiError.message,
      ...(apiError.details === undefined ? {} : { details: apiError.details }),
      ...(requestId ? { requestId } : {}),
    },
  };
  res.status(apiError.statusCode).json(body);
};
