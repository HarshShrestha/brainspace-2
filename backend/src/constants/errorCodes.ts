/** Stable, machine-readable error codes returned in `error.code`. Clients branch on these, not on messages. */
export const ERROR_CODES = {
  validation: "VALIDATION_ERROR",
  invalidJson: "INVALID_JSON",
  payloadTooLarge: "PAYLOAD_TOO_LARGE",
  unauthenticated: "UNAUTHENTICATED",
  invalidCredentials: "INVALID_CREDENTIALS",
  forbidden: "FORBIDDEN",
  originNotAllowed: "ORIGIN_NOT_ALLOWED",
  notFound: "NOT_FOUND",
  conflict: "CONFLICT",
  rateLimited: "RATE_LIMITED",
  limitExceeded: "LIMIT_EXCEEDED",
  aiNotConfigured: "AI_NOT_CONFIGURED",
  aiUnavailable: "AI_UNAVAILABLE",
  aiSourceUnreadable: "AI_SOURCE_UNREADABLE",
  serviceUnavailable: "SERVICE_UNAVAILABLE",
  internal: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
