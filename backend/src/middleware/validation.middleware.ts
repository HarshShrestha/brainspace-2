import type { Request, RequestHandler } from "express";
import type { z, ZodType } from "zod";

export interface RequestSchema {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

export type ValidatedInput<S extends RequestSchema> = {
  [K in keyof S]: S[K] extends ZodType ? z.output<S[K]> : never;
};

/**
 * Parses the request parts named in `schema`. Validation errors (ZodError) are formatted by
 * the error middleware. Parsed values are stored separately because Express 5's `req.query` is read-only.
 */
export function validate(schema: RequestSchema): RequestHandler {
  return (req, _res, next) => {
    req.validated = {
      body: schema.body?.parse(req.body ?? {}),
      params: schema.params?.parse(req.params),
      query: schema.query?.parse(req.query),
    };
    next();
  };
}

/** Typed access to the values produced by `validate(schema)` for the same schema. */
export function getValidated<S extends RequestSchema>(req: Request, _schema: S): ValidatedInput<S> {
  if (!req.validated) throw new Error("getValidated() called on a route without validate()");
  return req.validated as ValidatedInput<S>;
}
