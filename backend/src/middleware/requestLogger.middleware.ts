import { randomUUID } from "node:crypto";
import { pinoHttp } from "pino-http";
import { logger, redactUrl } from "../utils/logger.js";

/** One structured log line per request, with a request ID echoed in `X-Request-Id`. */
export const requestLogger = pinoHttp({
  logger,
  genReqId(req, res) {
    const incoming = req.headers["x-request-id"];
    const id = typeof incoming === "string" && /^[\w-]{1,64}$/.test(incoming) ? incoming : randomUUID();
    res.setHeader("X-Request-Id", id);
    return id;
  },
  customLogLevel(_req, res, err) {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  autoLogging: { ignore: (req) => req.url?.startsWith("/api/v1/health") ?? false },
  serializers: {
    req: (req: { id: string; method: string; url: string }) => ({
      id: req.id,
      method: req.method,
      url: redactUrl(req.url),
    }),
    res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
  },
});
