import type { RequestHandler } from "express";
import { isDatabaseReady } from "../db/connection.js";
import { ERROR_CODES } from "../constants/errorCodes.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/** Liveness: the process is running and serving requests. */
export const live: RequestHandler = (_req, res) => {
  sendSuccess(res, { status: "ok" });
};

/** Readiness: dependencies (MongoDB) are reachable. Load balancers should route only to ready instances. */
export const ready = asyncHandler(async (_req, res) => {
  if (await isDatabaseReady()) {
    sendSuccess(res, { status: "ready" });
    return;
  }
  res.status(503).json({
    success: false,
    error: { code: ERROR_CODES.serviceUnavailable, message: "Database is not reachable" },
  });
});
