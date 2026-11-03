import type { CorsOptions } from "cors";

export function isAllowedOrigin(origin: string | undefined, allowedOrigins: readonly string[]) {
  return origin === undefined || allowedOrigins.includes(origin);
}

/** Credentialed CORS restricted to an explicit origin allow-list. CORS is not authorization. */
export function createCorsOptions(allowedOrigins: readonly string[]): CorsOptions {
  return {
    origin(origin, callback) {
      callback(null, isAllowedOrigin(origin, allowedOrigins));
    },
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
  };
}
