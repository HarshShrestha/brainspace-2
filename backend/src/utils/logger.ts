import { pino } from "pino";
import { env } from "../config/environment.js";

/** Share tokens are bearer secrets that appear in URL paths; never log them. */
export function redactUrl(url: string) {
  return url.replace(/\/shared\/[^/?#]+/g, "/shared/[REDACTED]");
}

export const logger = pino({
  level: env.nodeEnv === "test" ? "silent" : env.logLevel,
  base: { service: "brainspace-api" },
  redact: {
    paths: [
      "req.headers.cookie",
      "req.headers.authorization",
      'res.headers["set-cookie"]',
      "*.password",
      "*.currentPassword",
      "*.newPassword",
      "*.token",
    ],
    censor: "[REDACTED]",
  },
});
