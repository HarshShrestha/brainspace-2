export {};

declare global {
  namespace Express {
    interface Request {
      /** Set by `requireAuth` once the session is verified. Read it with `authUserId(req)`. */
      userId?: string;
      /** Parsed output of the route's Zod schemas, set by `validate()`. Read it with `getValidated()`. */
      validated?: { body?: unknown; params?: unknown; query?: unknown };
    }
  }
}
