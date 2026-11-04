import { ERROR_CODES, type ErrorCode } from "../constants/errorCodes.js";

/** An expected, client-safe failure. Its message is returned to the client verbatim. */
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, ERROR_CODES.validation, message, details);
  }
  static unauthenticated(message = "Please sign in") {
    return new ApiError(401, ERROR_CODES.unauthenticated, message);
  }
  static forbidden(message = "You do not have access to this resource") {
    return new ApiError(403, ERROR_CODES.forbidden, message);
  }
  static notFound(message = "Not found") {
    return new ApiError(404, ERROR_CODES.notFound, message);
  }
  static conflict(message: string) {
    return new ApiError(409, ERROR_CODES.conflict, message);
  }
}
