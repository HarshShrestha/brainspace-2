import type { RequestHandler } from "express";

/** Private or bearer-token responses must never be stored by browsers or shared caches. */
export const noStore: RequestHandler = (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
};
